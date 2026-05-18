import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";


/**
 * Hybrid cohort aggregator.
 *
 * Buckets users by quiz answers → for each cohort, scores how engaged users
 * were with each college → writes to cohort_college_signals so the matcher
 * can apply a ±5 behavior boost at scoring time.
 *
 * Two modes:
 *   - default (cron): rebuild ALL cohorts using last 90 days
 *   - { userId }   : on-demand recompute for the cohort that user belongs to
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOOKBACK_DAYS = 90;
const MIN_COHORT_SIZE = 3;          // need at least 3 users for a signal to count
const MAX_BOOST = 5;                // ± clamp
const MIN_DWELL_FOR_INTEREST_MS = 8000; // 8s = real interest

// ── Bucketing helpers ───────────────────────────────────────────────────────

const gpaBucket = (raw: any): string => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "gpa:unk";
  if (n >= 3.9) return "gpa:3.9+";
  if (n >= 3.7) return "gpa:3.7-3.9";
  if (n >= 3.5) return "gpa:3.5-3.7";
  if (n >= 3.2) return "gpa:3.2-3.5";
  if (n >= 2.8) return "gpa:2.8-3.2";
  return "gpa:<2.8";
};

const sizeBucket = (s: any): string => {
  const v = String(s || "").toLowerCase();
  if (v.includes("very large") || v.includes("30,000") || v.includes("30000")) return "size:vlarge";
  if (v.includes("large")) return "size:large";
  if (v.includes("medium")) return "size:medium";
  if (v.includes("small")) return "size:small";
  return "size:any";
};

const locBucket = (s: any): string => {
  const v = String(s || "").toLowerCase();
  if (v.includes("urban") || v.includes("city")) return "loc:urban";
  if (v.includes("suburb")) return "loc:suburban";
  if (v.includes("rural") || v.includes("town")) return "loc:rural";
  return "loc:any";
};

const costBucket = (s: any): string => {
  const v = String(s || "").toLowerCase().replace(/[,$]/g, "");
  if (v.includes("under 10") || v.includes("less than 10")) return "cost:<10k";
  if (v.includes("10") && v.includes("20")) return "cost:10-20k";
  if (v.includes("20") && v.includes("30")) return "cost:20-30k";
  if (v.includes("30") && v.includes("45")) return "cost:30-45k";
  return "cost:any";
};

const studyBucket = (s: any): string => {
  const v = String(s || "").toLowerCase();
  for (const k of ["computer", "engineering", "business", "health", "biology", "social", "psychology", "education", "art", "communication"]) {
    if (v.includes(k)) return `study:${k}`;
  }
  return "study:any";
};

/** Build a cohort key from raw preferences. */
const cohortKeyFor = (prefs: Record<string, any>): string => {
  return [
    gpaBucket(prefs.gpa),
    sizeBucket(prefs.campusSize || prefs.campus_size),
    locBucket(prefs.locationType || prefs.location_type),
    costBucket(prefs.maxCost || prefs.max_cost),
    studyBucket(prefs.areaOfStudy || prefs.area_of_study),
  ].join("|");
};

// ── Boost computation ───────────────────────────────────────────────────────

interface CollegeAgg {
  view_count: number;
  total_dwell_ms: number;
  save_count: number;
  applying_count: number;
  applied_count: number;
  accepted_count: number;
  unique_users: Set<string>;
}

const newAgg = (): CollegeAgg => ({
  view_count: 0,
  total_dwell_ms: 0,
  save_count: 0,
  applying_count: 0,
  applied_count: 0,
  accepted_count: 0,
  unique_users: new Set(),
});

/**
 * Score a college within a cohort.
 * Subtle boost (±5 max). Applied = strongest positive, ignored = mild penalty.
 */
const computeBoost = (a: CollegeAgg, cohortSize: number): number => {
  if (cohortSize < MIN_COHORT_SIZE) return 0;

  const interestRate = a.unique_users.size / cohortSize;       // 0..1
  const meaningfulDwellRate = a.view_count > 0
    ? Math.min(1, a.total_dwell_ms / (a.view_count * MIN_DWELL_FOR_INTEREST_MS))
    : 0;
  const conversionRate = (a.save_count + a.applying_count + a.applied_count + a.accepted_count) / cohortSize;

  // Positive components
  let boost = 0;
  boost += interestRate * 1.5;            // up to +1.5 if everyone in cohort viewed
  boost += meaningfulDwellRate * 1.0;     // up to +1.0 for sustained attention
  boost += Math.min(2, a.save_count * 0.3 + a.applying_count * 0.6 + a.applied_count * 1.0 + a.accepted_count * 1.5);
  boost += conversionRate * 1.5;          // up to +1.5 from action density

  // Penalty: appeared in matches but no engagement
  if (a.view_count === 0 && a.unique_users.size === 0) boost -= 1.5;
  else if (interestRate < 0.1 && cohortSize > 10) boost -= 0.5;

  return Math.max(-MAX_BOOST, Math.min(MAX_BOOST, Number(boost.toFixed(2))));
};

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body?.userId;
    console.log(`[aggregate-cohort] start mode=${targetUserId ? "on-demand" : "full"}`);

    // ── 1. Pull all users + their cohort key from college_matches (most recent per user) ──
    const { data: allMatches, error: matchErr } = await sb
      .from("college_matches")
      .select("user_id, raw_preferences, college_data, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (matchErr) throw matchErr;
    if (!allMatches || allMatches.length === 0) {
      return new Response(JSON.stringify({ ok: true, cohorts: 0, msg: "no matches yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // most recent match per user
    const userToCohort = new Map<string, string>();
    const userToMatchedColleges = new Map<string, string[]>();
    for (const m of allMatches) {
      if (userToCohort.has(m.user_id)) continue;
      const key = cohortKeyFor((m.raw_preferences as any) || {});
      userToCohort.set(m.user_id, key);
      const cd = m.college_data as any;
      const names = Array.isArray(cd) ? cd.map((c: any) => c?.name).filter(Boolean) : [];
      userToMatchedColleges.set(m.user_id, names);
    }

    // If on-demand, restrict to the cohort that user belongs to
    let cohortFilter: string | null = null;
    if (targetUserId) {
      cohortFilter = userToCohort.get(targetUserId) || null;
      if (!cohortFilter) {
        return new Response(JSON.stringify({ ok: true, msg: "user has no quiz match yet" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Group user IDs by cohort
    const cohortUsers = new Map<string, Set<string>>();
    for (const [uid, key] of userToCohort) {
      if (cohortFilter && key !== cohortFilter) continue;
      if (!cohortUsers.has(key)) cohortUsers.set(key, new Set());
      cohortUsers.get(key)!.add(uid);
    }

    const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();

    // ── 2. For each cohort, fetch behavior signals and aggregate per college ──
    let totalRows = 0;
    for (const [cohortKey, userSet] of cohortUsers) {
      if (userSet.size < MIN_COHORT_SIZE) continue;
      const userIds = Array.from(userSet);
      const collegeMap = new Map<string, CollegeAgg>();

      // Seed: every matched college appearing for cohort users (so we can penalize ignored ones)
      for (const uid of userIds) {
        for (const name of userToMatchedColleges.get(uid) || []) {
          if (!collegeMap.has(name)) collegeMap.set(name, newAgg());
        }
      }

      // 2a. user_actions
      const { data: actions } = await sb
        .from("user_actions")
        .select("user_id, college_name, action_type, dwell_ms")
        .in("user_id", userIds)
        .gte("created_at", sinceIso);

      for (const a of actions || []) {
        if (!collegeMap.has(a.college_name)) collegeMap.set(a.college_name, newAgg());
        const agg = collegeMap.get(a.college_name)!;
        agg.unique_users.add(a.user_id);
        if (a.action_type === "view") agg.view_count += 1;
        else if (a.action_type === "dwell" && a.dwell_ms) agg.total_dwell_ms += a.dwell_ms;
        else if (a.action_type === "click_save") agg.save_count += 1;
      }

      // 2b. saved_colleges (status signals)
      const { data: saved } = await sb
        .from("saved_colleges")
        .select("user_id, college_name, status")
        .in("user_id", userIds);

      for (const s of saved || []) {
        if (!collegeMap.has(s.college_name)) collegeMap.set(s.college_name, newAgg());
        const agg = collegeMap.get(s.college_name)!;
        agg.unique_users.add(s.user_id);
        if (s.status === "Applying") agg.applying_count += 1;
        else if (s.status === "Applied") agg.applied_count += 1;
        else if (s.status === "Accepted") agg.accepted_count += 1;
        else if (s.status === "Considering") agg.save_count += 1;
      }

      // 2c. compute boost rows
      const upserts = Array.from(collegeMap.entries()).map(([college_name, agg]) => ({
        cohort_key: cohortKey,
        college_name,
        view_count: agg.view_count,
        total_dwell_ms: agg.total_dwell_ms,
        save_count: agg.save_count,
        applying_count: agg.applying_count,
        applied_count: agg.applied_count,
        accepted_count: agg.accepted_count,
        cohort_size: userSet.size,
        behavior_boost: computeBoost(agg, userSet.size),
        computed_at: new Date().toISOString(),
      }));

      if (upserts.length > 0) {
        const { error: upErr } = await sb
          .from("cohort_college_signals")
          .upsert(upserts, { onConflict: "cohort_key,college_name" });
        if (upErr) console.error(`[aggregate-cohort] upsert error for ${cohortKey}:`, upErr.message);
        else totalRows += upserts.length;
      }
      console.log(`[aggregate-cohort] cohort=${cohortKey} users=${userSet.size} colleges=${upserts.length}`);
    }

    return new Response(JSON.stringify({
      ok: true,
      cohorts: cohortUsers.size,
      rows: totalRows,
      mode: targetUserId ? "on-demand" : "full",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[aggregate-cohort] error:", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
