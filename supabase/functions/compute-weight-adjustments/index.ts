import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Analyzes a user's feedback_responses and saved_colleges to compute
 * small weight adjustments (+/- up to 3 pts) for the scoring engine.
 *
 * Signals used:
 * - saved_colleges statuses: "Applying" or "Applied" = strong positive signal
 * - saved_colleges with notes = engaged user
 * - feedback_responses: satisfaction ratings, feature preferences
 *
 * The adjustments are capped at ±3 to prevent wild swings.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => null);
    const userId = body?.userId;

    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather signals
    const [savedRes, feedbackRes, matchesRes] = await Promise.all([
      sb.from("saved_colleges").select("college_data, status, notes").eq("user_id", userId),
      sb.from("feedback_responses").select("response_data").eq("user_id", userId).limit(5),
      sb.from("college_matches").select("college_data, raw_preferences").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
    ]);

    const saved = savedRes.data || [];
    const feedback = feedbackRes.data || [];
    const matches = matchesRes.data || [];

    // Initialize adjustments (all 0 = no change)
    const adj = { culture: 0, academic: 0, cost: 0, distance: 0, admission: 0, size: 0, support: 0 };

    // --- Signal 1: Saved colleges analysis ---
    const appliedColleges = saved.filter(s => 
      s.status === "Applying" || s.status === "Applied" || s.status === "Accepted"
    );
    const consideredColleges = saved.filter(s => s.status === "Considering");

    if (appliedColleges.length > 0) {
      // Analyze what applied colleges have in common vs. what we recommended
      const appliedData = appliedColleges.map(s => s.college_data as any).filter(Boolean);
      
      // If users are applying to schools with high fit scores → our weights are good
      // If users are applying to schools with lower fit scores → we're missing something
      const avgFitScore = appliedData.reduce((sum: number, c: any) => sum + (c.fitScore || 70), 0) / appliedData.length;
      
      if (avgFitScore < 60) {
        // User is choosing schools we scored low — our weights may be off
        // Check common traits of applied schools
        const appliedCategories = appliedData.map((c: any) => c.fitCategory);
        const reachCount = appliedCategories.filter((c: string) => c === "Reach").length;
        if (reachCount > appliedCategories.length / 2) {
          // User prefers more ambitious choices — boost admission weight slightly
          adj.admission += -1; // reduce penalty for reaches
        }
      }
    }

    // --- Signal 2: Feedback analysis ---
    for (const fb of feedback) {
      const data = fb.response_data as any;
      if (!data || typeof data !== "object") continue;

      // Look for satisfaction with match quality
      const satisfaction = data.match_satisfaction || data.satisfaction || data.rating;
      if (typeof satisfaction === "number") {
        if (satisfaction <= 2) {
          // Low satisfaction — boost culture and academic weights
          adj.culture += 1;
          adj.academic += 1;
        } else if (satisfaction >= 4) {
          // High satisfaction — minor boost to support
          adj.support += 1;
        }
      }

      // Look for specific feedback about what mattered most
      const priorities = data.most_important || data.priorities || "";
      const priStr = typeof priorities === "string" ? priorities.toLowerCase() : "";
      if (priStr.includes("cost") || priStr.includes("afford") || priStr.includes("price")) adj.cost += 2;
      if (priStr.includes("location") || priStr.includes("close") || priStr.includes("distance")) adj.distance += 2;
      if (priStr.includes("culture") || priStr.includes("vibe") || priStr.includes("campus life")) adj.culture += 1;
      if (priStr.includes("major") || priStr.includes("program") || priStr.includes("academic")) adj.academic += 1;
    }

    // --- Signal 3: If user has many saved colleges with notes → they're engaged and thoughtful ---
    const withNotes = saved.filter(s => s.notes && s.notes.trim().length > 10);
    if (withNotes.length >= 3) {
      // Engaged user — trust their saved selections more
      adj.support += 1;
    }

    // --- Clamp all adjustments to ±3 ---
    const clamp = (v: number) => Math.max(-3, Math.min(3, v));
    const finalAdj = {
      culture_adj: clamp(adj.culture),
      academic_adj: clamp(adj.academic),
      cost_adj: clamp(adj.cost),
      distance_adj: clamp(adj.distance),
      admission_adj: clamp(adj.admission),
      size_adj: clamp(adj.size),
      support_adj: clamp(adj.support),
      computed_from: {
        savedCount: saved.length,
        appliedCount: appliedColleges.length,
        feedbackCount: feedback.length,
        computedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    // Upsert
    const { error: upsertErr } = await sb.from("scoring_weight_adjustments").upsert({
      user_id: userId,
      ...finalAdj,
    }, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("[compute-weights] Upsert failed:", upsertErr);
      return new Response(JSON.stringify({ error: "Failed to save adjustments" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[compute-weights] Updated adjustments for user ${userId}:`, finalAdj);
    return new Response(JSON.stringify({ success: true, adjustments: finalAdj }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[compute-weights] Error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
