import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

async function checkRateLimit(ip: string, fn: string): Promise<boolean> {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await sb
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("function_name", fn)
    .gte("window_start", windowStart);

  if ((count ?? 0) >= RATE_LIMIT_MAX) return false;
  await sb.from("rate_limits").insert({ ip_address: ip, function_name: fn });
  if (Math.random() < 0.05) await sb.rpc("cleanup_rate_limits");
  return true;
}

// ─── Reference Data ──────────────────────────────────────────────────────────

const studyProgramMap: Record<string, string> = {
  computer: "latest.academics.program_percentage.computer",
  engineering: "latest.academics.program_percentage.engineering",
  business: "latest.academics.program_percentage.business_marketing",
  health: "latest.academics.program_percentage.health",
  biology: "latest.academics.program_percentage.biological",
  social: "latest.academics.program_percentage.social_science",
  psychology: "latest.academics.program_percentage.psychology",
  education: "latest.academics.program_percentage.education",
  art: "latest.academics.program_percentage.visual_performing",
  communication: "latest.academics.program_percentage.communication",
};

const stateFipsMap: Record<string, string> = {
  alabama:"1",alaska:"2",arizona:"4",arkansas:"5",california:"6",colorado:"8",
  connecticut:"9",delaware:"10",florida:"12",georgia:"13",hawaii:"15",idaho:"16",
  illinois:"17",indiana:"18",iowa:"19",kansas:"20",kentucky:"21",louisiana:"22",
  maine:"23",maryland:"24",massachusetts:"25",michigan:"26",minnesota:"27",
  mississippi:"28",missouri:"29",montana:"30",nebraska:"31",nevada:"32",
  "new hampshire":"33","new jersey":"34","new mexico":"35","new york":"36",
  "north carolina":"37","north dakota":"38",ohio:"39",oklahoma:"40",oregon:"41",
  pennsylvania:"42","rhode island":"44","south carolina":"45","south dakota":"46",
  tennessee:"47",texas:"48",utah:"49",vermont:"50",virginia:"51",washington:"53",
  "west virginia":"54",wisconsin:"55",wyoming:"56",
};

// Region → state FIPS codes for weather/region filtering
const regionStatesMap: Record<string, string[]> = {
  midwest: ["17","18","19","20","26","27","29","31","38","39","46","55"],
  northeast: ["9","23","24","25","33","34","36","42","44","50"],
  south: ["1","5","10","12","13","21","22","28","37","40","45","47","48","51","54"],
  west: ["2","4","6","8","15","16","30","32","35","41","49","53","56"],
};

const stateAbbrMap: Record<string, string> = {
  al:"1",ak:"2",az:"4",ar:"5",ca:"6",co:"8",ct:"9",de:"10",fl:"12",ga:"13",
  hi:"15",id:"16",il:"17","in":"18",ia:"19",ks:"20",ky:"21",la:"22",me:"23",
  md:"24",ma:"25",mi:"26",mn:"27",ms:"28",mo:"29",mt:"30",ne:"31",nv:"32",
  nh:"33",nj:"34",nm:"35",ny:"36",nc:"37",nd:"38",oh:"39",ok:"40",or:"41",
  pa:"42",ri:"44",sc:"45",sd:"46",tn:"47",tx:"48",ut:"49",vt:"50",va:"51",
  wa:"53",wv:"54",wi:"55",wy:"56",
};

const nearbyStatesMap: Record<string, string[]> = {
  "36":["34","9","25","42","24"],"6":["41","32","4"],"48":["40","35","22","5"],
  "12":["13","45","1"],"17":["18","55","26","19","29"],"42":["36","34","24","10","39"],
  "13":["12","45","37","47","1"],"25":["9","44","33","50","36"],
  "39":["42","26","18","21","54"],"51":["24","37","47","21","54","10"],
};

// ─── Geo helpers ─────────────────────────────────────────────────────────────

function getStateFips(cityState: string): string[] {
  const lower = cityState.toLowerCase().trim();
  const list: string[] = [];
  for (const [name, fips] of Object.entries(stateFipsMap)) {
    if (lower.includes(name)) list.push(fips);
  }
  if (list.length === 0) {
    for (const part of lower.split(/[,\s]+/)) {
      const fips = stateAbbrMap[part];
      if (fips) list.push(fips);
    }
  }
  return list;
}

function getNearbyStates(fips: string, distance: string): string[] {
  const d = (distance || "").toLowerCase();
  if (d.includes("anywhere") || d.includes("no preference")) return [];
  if (d.includes("1 hour") || d.includes("under 2")) return [fips];
  if (d.includes("2-4") || d.includes("few hours")) return [fips, ...(nearbyStatesMap[fips] || [])];
  return [];
}

// ── Cohort bucketing (must match aggregate-cohort-signals) ──────────────────
function computeCohortKey(prefs: Record<string, any>): string {
  const gpa = Number(prefs.gpa);
  const gpaBucket = !Number.isFinite(gpa) || gpa <= 0 ? "gpa:unk"
    : gpa >= 3.9 ? "gpa:3.9+" : gpa >= 3.7 ? "gpa:3.7-3.9" : gpa >= 3.5 ? "gpa:3.5-3.7"
    : gpa >= 3.2 ? "gpa:3.2-3.5" : gpa >= 2.8 ? "gpa:2.8-3.2" : "gpa:<2.8";
  const sz = String(prefs.campusSize || prefs.campus_size || "").toLowerCase();
  const sizeBucket = sz.includes("very large") || sz.includes("30,000") || sz.includes("30000") ? "size:vlarge"
    : sz.includes("large") ? "size:large" : sz.includes("medium") ? "size:medium"
    : sz.includes("small") ? "size:small" : "size:any";
  const lc = String(prefs.locationType || prefs.location_type || "").toLowerCase();
  const locBucket = lc.includes("urban") || lc.includes("city") ? "loc:urban"
    : lc.includes("suburb") ? "loc:suburban" : lc.includes("rural") || lc.includes("town") ? "loc:rural" : "loc:any";
  const cs = String(prefs.maxCost || prefs.max_cost || "").toLowerCase().replace(/[,$]/g, "");
  const costBucket = cs.includes("under 10") || cs.includes("less than 10") ? "cost:<10k"
    : cs.includes("10") && cs.includes("20") ? "cost:10-20k"
    : cs.includes("20") && cs.includes("30") ? "cost:20-30k"
    : cs.includes("30") && cs.includes("45") ? "cost:30-45k" : "cost:any";
  const sd = String(prefs.areaOfStudy || prefs.area_of_study || "").toLowerCase();
  let studyBucket = "study:any";
  for (const k of ["computer", "engineering", "business", "health", "biology", "social", "psychology", "education", "art", "communication"]) {
    if (sd.includes(k)) { studyBucket = `study:${k}`; break; }
  }
  return [gpaBucket, sizeBucket, locBucket, costBucket, studyBucket].join("|");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROVIDER: College Scorecard  (Primary)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SCORECARD_FIELDS = [
  "id", "school.name", "school.city", "school.state", "school.school_url",
  "school.ownership", "school.locale",
  "latest.student.size",
  "latest.student.demographics.student_faculty_ratio",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.average.overall",
  "latest.admissions.sat_scores.midpoint.critical_reading",
  "latest.admissions.sat_scores.midpoint.math",
  "latest.admissions.act_scores.midpoint.cumulative",
  "latest.admissions.act_scores.midpoint.english",
  "latest.admissions.act_scores.midpoint.math",
  "latest.admissions.act_scores.25th_percentile.cumulative",
  "latest.admissions.act_scores.75th_percentile.cumulative",
  "latest.admissions.sat_scores.25th_percentile.critical_reading",
  "latest.admissions.sat_scores.75th_percentile.critical_reading",
  "latest.admissions.sat_scores.25th_percentile.math",
  "latest.admissions.sat_scores.75th_percentile.math",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.cost.avg_net_price.overall",
  "latest.aid.median_debt.completers.overall",
  "latest.aid.pell_grant_rate",
  "latest.completion.rate_suppressed.overall",
  "latest.earnings.10_yrs_after_entry.median",
  "latest.academics.program_percentage.computer",
  "latest.academics.program_percentage.engineering",
  "latest.academics.program_percentage.business_marketing",
  "latest.academics.program_percentage.health",
  "latest.academics.program_percentage.biological",
  "latest.academics.program_percentage.social_science",
  "latest.academics.program_percentage.psychology",
  "latest.academics.program_percentage.education",
  "latest.academics.program_percentage.visual_performing",
  "latest.academics.program_percentage.communication",
];

function buildScorecardQuery(prefs: Record<string, any>): string {
  const p = new URLSearchParams();
  p.set("api_key", Deno.env.get("COLLEGE_SCORECARD_API_KEY") || "");
  p.set("fields", SCORECARD_FIELDS.join(","));
  p.set("school.degrees_awarded.predominant", "3");
  p.set("latest.admissions.admission_rate.overall__range", "0..1");

  const size = (prefs.campusSize || "").toLowerCase();
  if (size.includes("small")) p.set("latest.student.size__range", "1000..5000");
  else if (size.includes("medium")) p.set("latest.student.size__range", "5000..15000");
  else if (size.includes("very large") || size.includes("30,000")) p.set("latest.student.size__range", "30000..");
  else if (size.includes("large")) p.set("latest.student.size__range", "15000..30000");
  else p.set("latest.student.size__range", "3000.."); // default: exclude small obscure schools

  const loc = (prefs.locationType || "").toLowerCase();
  if (loc.includes("suburban")) p.set("school.locale__range", "21..23");
  else if (loc.includes("urban") || loc.includes("city")) p.set("school.locale__range", "11..13");
  else if (loc.includes("rural") || loc.includes("small town")) p.set("school.locale__range", "31..43");

  const cost = (prefs.maxCost || "").toLowerCase().replace(/[,$]/g, "");
  if (cost.includes("under 10") || cost.includes("less than 10")) p.set("latest.cost.avg_net_price.overall__range", "..10000");
  else if (cost.includes("10") && cost.includes("20")) p.set("latest.cost.avg_net_price.overall__range", "..20000");
  else if (cost.includes("20") && cost.includes("30")) p.set("latest.cost.avg_net_price.overall__range", "..30000");
  else if (cost.includes("30") && cost.includes("45")) p.set("latest.cost.avg_net_price.overall__range", "..45000");

  const acc = (prefs.acceptanceRatePref || "").toLowerCase();
  if (acc.includes("very selective") || acc.includes("under 10"))
    p.set("latest.admissions.admission_rate.overall__range", "0..0.10");
  else if (acc.includes("highly selective") || (acc.includes("10") && acc.includes("25")))
    p.set("latest.admissions.admission_rate.overall__range", "0..0.25");
  else if (acc.includes("selective") && !acc.includes("highly") && !acc.includes("less") && !acc.includes("moderately"))
    p.set("latest.admissions.admission_rate.overall__range", "0..0.50");
  else if (acc.includes("moderately") || acc.includes("moderate"))
    p.set("latest.admissions.admission_rate.overall__range", "0.25..0.75");
  else if (acc.includes("less selective") || acc.includes("open"))
    p.set("latest.admissions.admission_rate.overall__range", "0.50..1");

  const cityState = (prefs.cityState || "").toLowerCase();
  if (cityState && cityState !== "no preference" && cityState !== "not specified") {
    const fips = getStateFips(cityState);
    if (fips.length > 0) {
      const states = getNearbyStates(fips[0], prefs.distanceFromHome || "");
      if (states.length > 0) p.set("school.state_fips", states.join(","));
    }
  }

  // Region/weather preference → restrict to states in that region
  const region = (prefs.weatherRegion || "").toLowerCase();
  if (region && region !== "no preference") {
    const regionFips: string[] = [];
    for (const [rName, rStates] of Object.entries(regionStatesMap)) {
      if (region.includes(rName)) regionFips.push(...rStates);
    }
    // If user selected multiple regions (comma-separated), combine
    if (regionFips.length > 0) {
      // Merge with any existing state filter from distance
      const existingStates = p.get("school.state_fips");
      if (existingStates) {
        const existing = new Set(existingStates.split(","));
        const combined = regionFips.filter(f => existing.has(f));
        if (combined.length > 0) p.set("school.state_fips", combined.join(","));
        // If intersection is empty, keep region filter (broader match)
        else p.set("school.state_fips", regionFips.join(","));
      } else {
        p.set("school.state_fips", regionFips.join(","));
      }
    }
  }

  p.set("sort", "latest.student.size:desc");
  p.set("per_page", "50");
  return p.toString();
}

const MIN_RESULTS = 15;

/**
 * Returns the set of FIPS codes the user explicitly constrained to via region/weather.
 * When non-empty, these are treated as a HARD constraint: results outside these states
 * must be discarded, and broadening steps must not drop the state filter.
 */
function getHardRegionFips(prefs: Record<string, any>): Set<string> {
  const region = String(prefs.weatherRegion || "").toLowerCase();
  if (!region || region.includes("no preference")) return new Set();
  const out: string[] = [];
  for (const [rName, rStates] of Object.entries(regionStatesMap)) {
    if (region.includes(rName)) out.push(...rStates);
  }
  return new Set(out);
}

async function fetchFromScorecard(prefs: Record<string, any>): Promise<{ data: string; count: number; raw: any[] }> {
  const apiKey = Deno.env.get("COLLEGE_SCORECARD_API_KEY");
  if (!apiKey || apiKey.trim().length < 10) {
    console.error("COLLEGE_SCORECARD_API_KEY missing or too short");
    return { data: "", count: 0, raw: [] };
  }

  const baseQuery = buildScorecardQuery(prefs);
  const baseUrl = "https://api.data.gov/ed/collegescorecard/v1/schools";
  console.log("Scorecard query params:", baseQuery.replace(/api_key=[^&]+/, 'api_key=REDACTED'));

  const hardRegionFips = getHardRegionFips(prefs);
  const hasHardRegion = hardRegionFips.size > 0;
  if (hasHardRegion) {
    console.log(`[college-match] HARD region constraint active (${hardRegionFips.size} states): ${[...hardRegionFips].join(",")}`);
  }

  const runQuery = async (q: string): Promise<any[]> => {
    const resp = await fetch(`${baseUrl}?${q}`);
    if (!resp.ok) {
      console.error("Scorecard API error:", resp.status, await resp.text());
      return [];
    }
    const json = await resp.json();
    return json.results || [];
  };

  // Build broadening steps. Skip "drop state filter" if user has a hard region preference.
  const broadeningSteps: Array<{ label: string; transform: (q: string) => string }> = [];
  if (!hasHardRegion) {
    broadeningSteps.push({ label: "drop state filter", transform: (q) => q.replace(/&school\.state_fips=[^&]*/g, "") });
  }
  broadeningSteps.push(
    { label: "drop size filter", transform: (q) => q.replace(/&latest\.student\.size__range=[^&]*/g, "") },
    { label: "widen acceptance rate to 0-50%", transform: (q) => q.replace(/latest\.admissions\.admission_rate\.overall__range=[^&]*/g, "latest.admissions.admission_rate.overall__range=0..0.50") },
    { label: "widen acceptance rate to full range", transform: (q) => q.replace(/latest\.admissions\.admission_rate\.overall__range=[^&]*/g, "latest.admissions.admission_rate.overall__range=0..1") },
    { label: "drop cost filter", transform: (q) => q.replace(/&latest\.cost\.avg_net_price\.overall__range=[^&]*/g, "") },
    { label: "drop locale filter", transform: (q) => q.replace(/&school\.locale__range=[^&]*/g, "") },
  );

  // Filter results to enforce the hard region constraint. The Scorecard `state_fips`
  // param should already restrict, but we double-enforce here in case a broadening
  // step or distance/state intersection produced unexpected outliers.
  const enforceRegion = (rows: any[]): any[] => {
    if (!hasHardRegion) return rows;
    return rows.filter((r) => {
      const stAbbr = String(r["school.state"] || "").toLowerCase();
      const fips = stateAbbrMap[stAbbr];
      return fips ? hardRegionFips.has(fips) : false;
    });
  };

  let results = enforceRegion(await runQuery(baseQuery));
  let currentQuery = baseQuery;
  console.log(`Initial query got ${results.length} colleges${hasHardRegion ? " (after region enforcement)" : ""}`);

  for (const step of broadeningSteps) {
    if (results.length >= MIN_RESULTS) break;
    const broader = step.transform(currentQuery);
    if (broader === currentQuery) continue;
    console.log(`Too few results (${results.length}), broadening: ${step.label}`);
    const broaderResults = enforceRegion(await runQuery(broader));
    if (broaderResults.length > results.length) {
      results = broaderResults;
      currentQuery = broader;
      console.log(`After broadening got ${results.length} results${hasHardRegion ? " (after region enforcement)" : ""}`);
    }
  }

  return { data: results.length > 0 ? formatScorecardForAI(results) : "", count: results.length, raw: results };
}

function formatScorecardForAI(results: any[]): string {
  return results.map((r: any, i: number) => {
    const name = r["school.name"] || "Unknown";
    const city = r["school.city"] || "";
    const state = r["school.state"] || "";
    const admRate = r["latest.admissions.admission_rate.overall"];
    const tuitionIn = r["latest.cost.tuition.in_state"];
    const tuitionOut = r["latest.cost.tuition.out_of_state"];
    const netPrice = r["latest.cost.avg_net_price.overall"];
    const gradRate = r["latest.completion.rate_suppressed.overall"];
    const earnings = r["latest.earnings.10_yrs_after_entry.median"];
    const size = r["latest.student.size"];
    const ownership = r["school.ownership"] === 1 ? "Public" : r["school.ownership"] === 2 ? "Private Nonprofit" : "Private For-Profit";
    const locale = r["school.locale"];
    const localeDesc = locale <= 13 ? "Urban" : locale <= 23 ? "Suburban" : locale <= 33 ? "Town" : "Rural";

    const satAvg = r["latest.admissions.sat_scores.average.overall"];
    const satR25 = r["latest.admissions.sat_scores.25th_percentile.critical_reading"];
    const satR75 = r["latest.admissions.sat_scores.75th_percentile.critical_reading"];
    const satM25 = r["latest.admissions.sat_scores.25th_percentile.math"];
    const satM75 = r["latest.admissions.sat_scores.75th_percentile.math"];
    let satDisplay = "N/A";
    if (satAvg) {
      satDisplay = `Avg: ${satAvg}`;
      if (satR25 && satR75 && satM25 && satM75) {
        satDisplay += ` (25th-75th: ${Number(satR25)+Number(satM25)}-${Number(satR75)+Number(satM75)})`;
      }
    }

    const actMid = r["latest.admissions.act_scores.midpoint.cumulative"];
    const act25 = r["latest.admissions.act_scores.25th_percentile.cumulative"];
    const act75 = r["latest.admissions.act_scores.75th_percentile.cumulative"];
    let actDisplay = "N/A";
    if (actMid) {
      actDisplay = `Mid: ${actMid}`;
      if (act25 && act75) actDisplay += ` (25th-75th: ${act25}-${act75})`;
    }

    const progLabels: Record<string, string> = {
      "Computer Science": r["latest.academics.program_percentage.computer"],
      Engineering: r["latest.academics.program_percentage.engineering"],
      Business: r["latest.academics.program_percentage.business_marketing"],
      Health: r["latest.academics.program_percentage.health"],
      Biology: r["latest.academics.program_percentage.biological"],
      "Social Science": r["latest.academics.program_percentage.social_science"],
      Psychology: r["latest.academics.program_percentage.psychology"],
      Education: r["latest.academics.program_percentage.education"],
      Arts: r["latest.academics.program_percentage.visual_performing"],
      Communications: r["latest.academics.program_percentage.communication"],
    };
    const programs = Object.entries(progLabels)
      .filter(([, pct]) => pct && Number(pct) > 0.05)
      .map(([label, pct]) => `${label} (${(Number(pct) * 100).toFixed(0)}%)`);

    return `${i + 1}. ${name} (${city}, ${state})
   - Type: ${ownership} | Setting: ${localeDesc}
   - Admission Rate: ${admRate !== null ? (admRate * 100).toFixed(1) + "%" : "N/A"}
   - SAT Scores: ${satDisplay}
   - ACT Scores: ${actDisplay}
   - Tuition (In-State): ${tuitionIn ? "$" + tuitionIn.toLocaleString() : "N/A"}
   - Tuition (Out-of-State): ${tuitionOut ? "$" + tuitionOut.toLocaleString() : "N/A"}
   - Avg Net Price: ${netPrice ? "$" + netPrice.toLocaleString() : "N/A"}
   - Graduation Rate: ${gradRate !== null ? (gradRate * 100).toFixed(1) + "%" : "N/A"}
   - Median Earnings (10yr): ${earnings ? "$" + earnings.toLocaleString() : "N/A"}
   - Student Body: ${size ? size.toLocaleString() + " students" : "N/A"}
   - Strong Programs: ${programs.length > 0 ? programs.join(", ") : "General"}`;
  }).join("\n\n");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RULE-BASED MATCHING ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseStudentSAT(prefs: Record<string, any>): number | null {
  const sat = prefs.satScore || prefs.sat_score || "";
  const parsed = parseInt(sat, 10);
  return parsed >= 400 && parsed <= 1600 ? parsed : null;
}

function parseStudentACT(prefs: Record<string, any>): number | null {
  const act = prefs.actScore || prefs.act_score || "";
  const parsed = parseInt(act, 10);
  return parsed >= 1 && parsed <= 36 ? parsed : null;
}

function parseStudentGPA(prefs: Record<string, any>): number {
  const gpa = parseFloat(prefs.gpa || "3.0");
  return isNaN(gpa) ? 3.0 : Math.min(5.0, Math.max(0, gpa));
}

function determineFitCategory(r: any, gpa: number, studentSAT: number | null, studentACT: number | null): "Safety" | "Match" | "Reach" | "unrealistic" {
  const admRate = r["latest.admissions.admission_rate.overall"];

  // Test score comparison
  let scorePosition: "above" | "within" | "below" = "within";
  let scoreDelta = 0; // how far above/below (normalized 0-1 scale)

  if (studentSAT) {
    const sat25 = r["latest.admissions.sat_scores.25th_percentile.critical_reading"] && r["latest.admissions.sat_scores.25th_percentile.math"]
      ? Number(r["latest.admissions.sat_scores.25th_percentile.critical_reading"]) + Number(r["latest.admissions.sat_scores.25th_percentile.math"])
      : null;
    const sat75 = r["latest.admissions.sat_scores.75th_percentile.critical_reading"] && r["latest.admissions.sat_scores.75th_percentile.math"]
      ? Number(r["latest.admissions.sat_scores.75th_percentile.critical_reading"]) + Number(r["latest.admissions.sat_scores.75th_percentile.math"])
      : null;
    if (sat75 && studentSAT > sat75) {
      scorePosition = "above";
      scoreDelta = (studentSAT - sat75) / 1600;
    } else if (sat25 && studentSAT < sat25) {
      scorePosition = "below";
      scoreDelta = (sat25 - studentSAT) / 1600;
    }
  } else if (studentACT) {
    const act25 = r["latest.admissions.act_scores.25th_percentile.cumulative"];
    const act75 = r["latest.admissions.act_scores.75th_percentile.cumulative"];
    if (act75 && studentACT > Number(act75)) {
      scorePosition = "above";
      scoreDelta = (studentACT - Number(act75)) / 36;
    } else if (act25 && studentACT < Number(act25)) {
      scorePosition = "below";
      scoreDelta = (Number(act25) - studentACT) / 36;
    }
  }

  // ── Strict Realistic Reach thresholds ──
  let realisticFloor = 0;
  if (gpa < 2.5) realisticFloor = 0.50;
  else if (gpa < 3.0) realisticFloor = 0.35;
  else if (gpa < 3.3) realisticFloor = 0.20;
  else if (gpa < 3.5) realisticFloor = 0.12;
  else if (gpa < 3.7) realisticFloor = 0.08;
  else if (gpa < 3.9) realisticFloor = 0.04;

  // Ultra-selective schools (<10% acceptance) require exceptional credentials
  if (admRate != null && admRate < 0.10) {
    if (gpa < 3.7) return "unrealistic";
    if (scorePosition === "below") return "unrealistic";
    if (!studentSAT && !studentACT && gpa < 3.9) return "unrealistic";
    return "Reach";
  }

  if (admRate != null && admRate < realisticFloor) {
    if (scorePosition === "below" && scoreDelta > 0.05) return "unrealistic";
    if (scorePosition !== "above") return "unrealistic";
  }

  // Any school with <15% acceptance is at least a Reach
  if (admRate != null && admRate < 0.15) {
    if (scorePosition === "above" && scoreDelta > 0.05 && gpa >= 3.8) return "Match";
    return "Reach";
  }

  // ── Safety: scores above 75th percentile + higher acceptance ──
  if (scorePosition === "above" && admRate != null && admRate > 0.35) return "Safety";

  // ── Reach: scores below OR selective school ──
  let reachThreshold = 0.5;
  if (gpa >= 3.9) reachThreshold = 0.20;
  else if (gpa >= 3.8) reachThreshold = 0.25;
  else if (gpa >= 3.5) reachThreshold = 0.35;
  else if (gpa >= 3.0) reachThreshold = 0.45;

  if (scorePosition === "below" && scoreDelta > 0.03) return "Reach";
  if (admRate != null && admRate <= reachThreshold) return "Reach";

  // ── Safety: high acceptance rate schools ──
  if (admRate != null && admRate > 0.65) return "Safety";
  if (scorePosition === "above" && admRate != null && admRate > 0.30) return "Safety";

  return "Match";
}

/**
 * Compute fitScore (0–100) using weighted factors:
 * - Admission Realism (25%) — heavily penalizes academic mismatches
 * - Academic Major Fit (18%)
 * - Campus Culture & Personality (12%)
 * - Cost & Affordability (15%)
 * - Distance From Home (8%)
 * - School Size (7%)
 * - Recognition & Desirability (15%) — favors well-known, strong-outcome schools
 *
 * Academic Realism Multiplier: further penalizes schools where student
 * profile is far below average admitted student.
 */
/**
 * Map student-described activities (from the final quiz question) to indicators
 * we can score against the College Scorecard data. Returns matched keywords +
 * a 0–8 score component reflecting how well the school supports those interests.
 */
function parseActivities(prefs: Record<string, any>): {
  raw: string;
  tags: string[];
} {
  const raw = String((prefs as any).activities || "").toLowerCase().trim();
  if (!raw || /^(no|none|n\/a|not really)/i.test(raw)) return { raw, tags: [] };
  const tags: string[] = [];
  const add = (t: string) => { if (!tags.includes(t)) tags.push(t); };
  if (/(sport|athlet|soccer|football|basketball|baseball|volleyball|track|tennis|swim|lacrosse|hockey|d1|division\s*[i123])/i.test(raw)) add("athletics");
  if (/(greek|sorority|fraternit|rush)/i.test(raw)) add("greek_life");
  if (/(research|lab|stem)/i.test(raw)) add("research");
  if (/(music|band|orchestra|choir|theatre|theater|drama|dance|art|film|design)/i.test(raw)) add("arts");
  if (/(volunteer|service|community|nonprofit|mission|faith|religious)/i.test(raw)) add("service");
  if (/(club|leadership|student\s*gov|government|debate|model\s*un)/i.test(raw)) add("clubs");
  if (/(intramural|outdoor|hiking|ski|surf|club\s*sport)/i.test(raw)) add("recreation");
  if (/(entrepreneur|startup|business)/i.test(raw)) add("entrepreneurship");
  if (/(intern|career|pre[-\s]?med|pre[-\s]?law|professional)/i.test(raw)) add("career");
  return { raw, tags };
}

function computeActivitiesScore(r: any, prefs: Record<string, any>): number {
  const { tags } = parseActivities(prefs);
  if (tags.length === 0) return 4; // neutral baseline if no answer / "no"
  let s = 0;
  const size = Number(r["latest.student.size"] || 0);
  const locale = r["school.locale"];
  const gradRate = r["latest.completion.rate_suppressed.overall"];

  // Athletics & Greek life → larger schools tend to have more developed programs
  if (tags.includes("athletics") || tags.includes("greek_life")) {
    if (size >= 15000) s += 4;
    else if (size >= 8000) s += 2;
    else s += 1;
  }
  // Clubs / leadership / recreation → mid-to-large campuses
  if (tags.includes("clubs") || tags.includes("recreation")) {
    if (size >= 8000) s += 2;
    else if (size >= 3000) s += 1;
  }
  // Research → favor schools with strong STEM/health program share
  if (tags.includes("research")) {
    const stemPct = Number(r["latest.academics.program_percentage.engineering"] || 0)
      + Number(r["latest.academics.program_percentage.computer"] || 0)
      + Number(r["latest.academics.program_percentage.biological"] || 0)
      + Number(r["latest.academics.program_percentage.health"] || 0);
    if (stemPct > 0.20) s += 3;
    else if (stemPct > 0.10) s += 2;
    else s += 1;
  }
  // Arts → favor schools with notable visual/performing share
  if (tags.includes("arts")) {
    const artsPct = Number(r["latest.academics.program_percentage.visual_performing"] || 0)
      + Number(r["latest.academics.program_percentage.communication"] || 0);
    if (artsPct > 0.08) s += 3;
    else if (artsPct > 0.04) s += 2;
    else s += 1;
  }
  // Service / faith → urban or suburban areas typically richer in opportunities
  if (tags.includes("service") && (locale <= 23)) s += 1;
  // Entrepreneurship / career → favor business share + good outcomes
  if (tags.includes("entrepreneurship") || tags.includes("career")) {
    const bizPct = Number(r["latest.academics.program_percentage.business_marketing"] || 0);
    if (bizPct > 0.15) s += 2;
    else if (bizPct > 0.07) s += 1;
    if (gradRate != null && gradRate > 0.7) s += 1;
  }
  return Math.min(8, s);
}

function computeFitScore(r: any, prefs: Record<string, any>, fitCategory: string, adj?: Record<string, number>): number {
  const a = adj || {};
  let score = 0;

  // 1. Admission Realism (25 pts max)
  const admRate = r["latest.admissions.admission_rate.overall"];
  const gpa = parseStudentGPA(prefs);
  let admissionScore = 12;
  if (fitCategory === "Safety") admissionScore = 25;
  else if (fitCategory === "Match") admissionScore = 20;
  else if (fitCategory === "Reach") {
    if (admRate != null && admRate < 0.15) admissionScore = 5;
    else if (admRate != null && admRate < 0.25) admissionScore = 8;
    else admissionScore = 12;
  }
  score += admissionScore + (a.admission || 0);

  // 2. Academic Major Fit (18 pts max)
  const study = (prefs.areaOfStudy || "").toLowerCase();
  let academicScore = 9;
  if (study && study !== "undecided") {
    let bestProgramPct = 0;
    for (const [keyword, field] of Object.entries(studyProgramMap)) {
      if (study.includes(keyword)) {
        const pct = Number(r[field] || 0);
        if (pct > bestProgramPct) bestProgramPct = pct;
      }
    }
    if (bestProgramPct > 0.15) academicScore = 18;
    else if (bestProgramPct > 0.10) academicScore = 14;
    else if (bestProgramPct > 0.05) academicScore = 10;
    else if (bestProgramPct > 0.02) academicScore = 7;
    else if (bestProgramPct > 0) academicScore = 4;
    else academicScore = 3;
  }
  score += academicScore + (a.academic || 0);

  // 3. Campus Culture (12 pts max)
  const locale = r["school.locale"];
  const localeDesc = locale <= 13 ? "urban" : locale <= 23 ? "suburban" : locale <= 33 ? "town" : "rural";
  const prefLoc = (prefs.locationType || "").toLowerCase();
  let cultureScore = 5;
  if (prefLoc && localeDesc.includes(prefLoc.split(/\s/)[0])) cultureScore = 12;
  else if (prefLoc.includes("city") && localeDesc === "urban") cultureScore = 12;
  else if (!prefLoc || prefLoc.includes("no preference")) cultureScore = 8;
  else cultureScore = 2;

  const vibe = (prefs.campusVibe || "").toLowerCase();
  const size = r["latest.student.size"] || 0;
  if (vibe.includes("spirited") && size > 15000) cultureScore = Math.min(12, cultureScore + 2);
  else if (vibe.includes("tight") && size < 5000) cultureScore = Math.min(12, cultureScore + 2);
  else if (vibe.includes("chill")) cultureScore = Math.min(12, cultureScore + 1);
  score += Math.min(12, cultureScore) + (a.culture || 0);

  // 4. Cost & Affordability (15 pts max)
  const costPref = (prefs.maxCost || "").toLowerCase().replace(/[,$]/g, "");
  const netPrice = r["latest.cost.avg_net_price.overall"];
  let costScore = 7;
  if (netPrice != null) {
    let maxBudget = 50000;
    if (costPref.includes("under 10") || costPref.includes("less than 10")) maxBudget = 10000;
    else if (costPref.includes("10") && costPref.includes("20")) maxBudget = 20000;
    else if (costPref.includes("20") && costPref.includes("30")) maxBudget = 30000;
    else if (costPref.includes("30") && costPref.includes("45")) maxBudget = 45000;

    if (netPrice <= maxBudget * 0.8) costScore = 15;
    else if (netPrice <= maxBudget) costScore = 12;
    else if (netPrice <= maxBudget * 1.2) costScore = 7;
    else costScore = 2;
  }
  score += costScore + (a.cost || 0);

  // 5. Distance From Home (8 pts max)
  const distPref = (prefs.distanceFromHome || "").toLowerCase();
  const cityState = (prefs.cityState || "").toLowerCase();
  const schoolState = (r["school.state"] || "").toLowerCase();
  let distScore = 4;
  if (distPref.includes("anywhere") || distPref.includes("no preference")) {
    distScore = 6;
  } else if (distPref.includes("close") || distPref.includes("1 hour") || distPref.includes("under 2")) {
    if (cityState.includes(schoolState) || schoolState.length === 2 && cityState.includes(schoolState)) distScore = 8;
    else distScore = 1;
  } else if (distPref.includes("2-4") || distPref.includes("few hours")) {
    const fips = getStateFips(cityState);
    const schoolFips = getStateFips(r["school.city"] + ", " + r["school.state"]);
    if (fips.length > 0 && schoolFips.length > 0) {
      const nearby = getNearbyStates(fips[0], distPref);
      distScore = nearby.includes(schoolFips[0]) ? 7 : 2;
    }
  }
  score += distScore + (a.distance || 0);

  // 6. School Size (7 pts max)
  const sizePref = (prefs.campusSize || "").toLowerCase();
  const studentSize = Number(r["latest.student.size"] || 0);
  let sizeScore = 2;
  if (!sizePref || sizePref.includes("no preference")) sizeScore = 4;
  else if (sizePref.includes("small") && studentSize <= 5000) sizeScore = 7;
  else if (sizePref.includes("medium") && studentSize > 5000 && studentSize <= 15000) sizeScore = 7;
  else if ((sizePref.includes("very large") || sizePref.includes("30,000") || sizePref.includes("30000")) && studentSize > 30000) sizeScore = 7;
  else if (sizePref.includes("very large") && studentSize > 15000) sizeScore = 4;
  else if (sizePref.includes("large") && studentSize > 15000 && studentSize <= 30000) sizeScore = 7;
  else if (sizePref.includes("large") && studentSize > 30000) sizeScore = 4;
  // Adjacent-size partial credit
  else if (sizePref.includes("small") && studentSize <= 8000) sizeScore = 4;
  else if (sizePref.includes("medium") && (studentSize <= 20000 || studentSize >= 3000)) sizeScore = 4;
  else sizeScore = 1;
  score += sizeScore + (a.size || 0);

  // 7. Recognition & Desirability (15 pts max)
  // Strongly favors well-known schools with good outcomes
  const gradRate = r["latest.completion.rate_suppressed.overall"];
  const earnings = r["latest.earnings.10_yrs_after_entry.median"];
  const pellRate = r["latest.aid.pell_grant_rate"];
  let recognitionScore = 3; // baseline

  // Student body size → recognition proxy (bigger = more well-known generally)
  if (studentSize > 30000) recognitionScore += 5;
  else if (studentSize > 20000) recognitionScore += 4;
  else if (studentSize > 10000) recognitionScore += 3;
  else if (studentSize > 5000) recognitionScore += 2;
  else if (studentSize > 3000) recognitionScore += 1;

  // Graduation rate → quality signal
  if (gradRate != null && gradRate > 0.75) recognitionScore += 3;
  else if (gradRate != null && gradRate > 0.60) recognitionScore += 2;
  else if (gradRate != null && gradRate > 0.45) recognitionScore += 1;

  // Earnings → desirability signal
  if (earnings != null && earnings > 60000) recognitionScore += 2;
  else if (earnings != null && earnings > 45000) recognitionScore += 1;

  // Pell rate bonus (accessible / diverse)
  if (pellRate != null && pellRate > 0.30) recognitionScore += 1;

  score += Math.min(15, recognitionScore) + (a.support || 0);

  // 8. Activities Continuity (8 pts max) — based on the final quiz question
  score += computeActivitiesScore(r, prefs);

  // ── Academic Realism Multiplier ──
  const realismMultiplier = computeRealismMultiplier(r, prefs, fitCategory);
  score = Math.round(score * realismMultiplier);

  return Math.min(100, Math.max(0, score));
}

/**
 * Compute a 0.3–1.0 multiplier based on how realistic admission is.
 * - Likely at or above 25th percentile → 1.0 (no penalty)
 * - Below 25th percentile → gradual penalty down to 0.4
 * - Far below with very low acceptance → 0.3
 */
function computeRealismMultiplier(r: any, prefs: Record<string, any>, fitCategory: string): number {
  if (fitCategory === "Safety") return 1.0; // no penalty for safety schools

  const gpa = parseStudentGPA(prefs);
  const studentSAT = parseStudentSAT(prefs);
  const studentACT = parseStudentACT(prefs);
  const admRate = r["latest.admissions.admission_rate.overall"];

  let academicGap = 0; // 0 = no gap, higher = bigger gap

  // SAT gap
  if (studentSAT) {
    const sat25 = r["latest.admissions.sat_scores.25th_percentile.critical_reading"] && r["latest.admissions.sat_scores.25th_percentile.math"]
      ? Number(r["latest.admissions.sat_scores.25th_percentile.critical_reading"]) + Number(r["latest.admissions.sat_scores.25th_percentile.math"])
      : null;
    if (sat25 && studentSAT < sat25) {
      academicGap = Math.max(academicGap, (sat25 - studentSAT) / 300); // 300-pt gap = 1.0 (stricter)
    }
  } else if (studentACT) {
    const act25 = r["latest.admissions.act_scores.25th_percentile.cumulative"];
    if (act25 && studentACT < Number(act25)) {
      academicGap = Math.max(academicGap, (Number(act25) - studentACT) / 8); // 8-pt gap = 1.0 (stricter)
    }
  }

  // GPA gap — more aggressive scaling
  if (admRate != null && admRate < 0.15 && gpa < 3.8) {
    academicGap = Math.max(academicGap, (3.8 - gpa) * 1.0);
  } else if (admRate != null && admRate < 0.3 && gpa < 3.5) {
    academicGap = Math.max(academicGap, (3.5 - gpa) * 0.9);
  } else if (admRate != null && admRate < 0.5 && gpa < 3.0) {
    academicGap = Math.max(academicGap, (3.0 - gpa) * 0.7);
  }

  // Convert gap to multiplier: 0 gap → 1.0, gap of 1.0+ → 0.3
  if (academicGap <= 0) return 1.0;
  return Math.max(0.3, 1.0 - academicGap * 0.7);
}

/**
 * Generate a short realism note for each college explaining fit vs. realism.
 */
function generateRealismNote(fitCategory: string, fitScore: number, r: any, prefs: Record<string, any>): string {
  const admRate = r["latest.admissions.admission_rate.overall"];
  const gpa = parseStudentGPA(prefs);
  const studentSAT = parseStudentSAT(prefs);
  const studentACT = parseStudentACT(prefs);
  const schoolName = r["school.name"] || "This school";
  const admPct = admRate != null ? `${(admRate * 100).toFixed(0)}%` : null;

  if (fitCategory === "Safety") {
    if (studentSAT || studentACT) {
      const scoreDesc = studentSAT ? `SAT of ${studentSAT}` : `ACT of ${studentACT}`;
      return `Safety — Your ${scoreDesc} and ${gpa.toFixed(1)} GPA put you above the typical admitted student here. You have a very strong chance of admission.`;
    }
    return `Safety — With a ${gpa.toFixed(1)} GPA${admPct ? ` and a ${admPct} acceptance rate` : ""}, you're well above the bar for admission here.`;
  }

  if (fitCategory === "Reach") {
    const realismMult = computeRealismMultiplier(r, prefs, fitCategory);
    if (admRate != null && admRate < 0.15) {
      return `Reach — ${schoolName} is highly selective at ${admPct} acceptance. This is competitive for almost everyone — apply with strong essays and extracurriculars.`;
    }
    if (realismMult < 0.7) {
      return `Reach — Your academic profile is below the typical admitted student. This is aspirational but worth pursuing if ${schoolName} excites you.`;
    }
    return `Reach — ${admPct ? `With a ${admPct} acceptance rate, this` : "This"} is a stretch for your profile, but still possible with a strong application.`;
  }

  // Match
  if (fitScore >= 75) {
    return `Match — Strong alignment between your profile and ${schoolName}. Your academics are competitive and this is a realistic, exciting option.`;
  }
  return `Match — Your profile is within the competitive range here. You have a realistic shot at admission and this school fits your preferences well.`;
}

function getTopPrograms(r: any): string[] {
  const progLabels: Record<string, any> = {
    "Computer Science": r["latest.academics.program_percentage.computer"],
    Engineering: r["latest.academics.program_percentage.engineering"],
    Business: r["latest.academics.program_percentage.business_marketing"],
    Health: r["latest.academics.program_percentage.health"],
    Biology: r["latest.academics.program_percentage.biological"],
    "Social Science": r["latest.academics.program_percentage.social_science"],
    Psychology: r["latest.academics.program_percentage.psychology"],
    Education: r["latest.academics.program_percentage.education"],
    Arts: r["latest.academics.program_percentage.visual_performing"],
    Communications: r["latest.academics.program_percentage.communication"],
  };
  return Object.entries(progLabels)
    .filter(([, pct]) => pct && Number(pct) > 0.05)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3)
    .map(([label]) => label);
}

/**
 * Rule-based engine: score all colleges, distribute by listMode preference.
 * Default "Balanced" → 1 Safety / 3 Match / 1 Reach
 * "Safe & Practical" → 2 Safety / 2 Match / 1 Reach
 * "Dream Big" → 1 Safety / 2 Match / 2 Reach
 * 
 * Match schools are prioritized as the most important category.
 * Within each pool, schools are sorted by fitScore (which includes recognition bonus).
 */
function ruleBasedMatch(
  rawResults: any[],
  prefs: Record<string, any>,
  excludeColleges: string[] = [],
  weightAdj?: Record<string, number>,
  behaviorBoosts?: Map<string, number>,
): any[] {
  const gpa = parseStudentGPA(prefs);
  const studentSAT = parseStudentSAT(prefs);
  const studentACT = parseStudentACT(prefs);
  const excludeSet = new Set(excludeColleges.map(n => n.toLowerCase()));

  // Determine distribution — Match is always the biggest bucket
  const listMode = (prefs.listMode || "Balanced").toLowerCase();
  let safetyTarget = 1, matchTarget = 3, reachTarget = 1;
  if (listMode.includes("safe") || listMode.includes("practical") || listMode.includes("realistic")) {
    safetyTarget = 2; matchTarget = 2; reachTarget = 1;
  } else if (listMode.includes("dream") || listMode.includes("ambitious")) {
    safetyTarget = 1; matchTarget = 2; reachTarget = 2;
  }

  // Score and categorize all colleges
  const scored = rawResults
    .filter(r => !excludeSet.has((r["school.name"] || "").toLowerCase()))
    .map(r => {
      const fitCategory = determineFitCategory(r, gpa, studentSAT, studentACT);
      const baseScore = computeFitScore(r, prefs, fitCategory, weightAdj);
      // ── Behavior boost from cohort signals (clamped ±5) ──
      const name = r["school.name"] || "";
      const boost = behaviorBoosts?.get(name) ?? 0;
      const fitScore = Math.min(100, Math.max(0, Math.round(baseScore + boost)));
      return { raw: r, fitCategory, fitScore, behaviorBoost: boost };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  // Filter out unrealistic schools
  const realistic = scored.filter(s => s.fitCategory !== "unrealistic");

  const safetyPool = realistic.filter(s => s.fitCategory === "Safety");
  const matchPool = realistic.filter(s => s.fitCategory === "Match");
  const reachPool = realistic.filter(s => s.fitCategory === "Reach");

  // ── Ultra-selective cap: max 1 school with <10% acceptance ──
  const isExceptionalFit = gpa >= 3.8 && (
    (studentSAT && studentSAT >= 1400) || 
    (studentACT && studentACT >= 32) ||
    gpa >= 3.95
  );
  const maxUltraSelective = isExceptionalFit ? 1 : 0;

  const picked: typeof scored = [];
  let ultraSelectiveCount = 0;

  const addFrom = (pool: typeof scored, count: number) => {
    for (const s of pool) {
      if (picked.length >= 5) break;
      if (count <= 0) break;
      if (picked.find(p => p.raw["school.name"] === s.raw["school.name"])) continue;
      const schoolAdmRate = s.raw["latest.admissions.admission_rate.overall"];
      if (schoolAdmRate != null && schoolAdmRate < 0.10) {
        if (ultraSelectiveCount >= maxUltraSelective) continue;
        ultraSelectiveCount++;
      }
      picked.push(s);
      count--;
    }
  };

  // Fill Match first (most important), then Safety, then Reach
  addFrom(matchPool, matchTarget);
  addFrom(safetyPool, safetyTarget);
  addFrom(reachPool, reachTarget);

  // Pad if needed — prefer Match > Safety > Reach
  for (const pool of [matchPool, safetyPool, reachPool]) {
    for (const s of pool) {
      if (picked.length >= 5) break;
      if (picked.find(p => p.raw["school.name"] === s.raw["school.name"])) continue;
      const schoolAdmRate = s.raw["latest.admissions.admission_rate.overall"];
      if (schoolAdmRate != null && schoolAdmRate < 0.10 && ultraSelectiveCount >= maxUltraSelective) continue;
      if (schoolAdmRate != null && schoolAdmRate < 0.10) ultraSelectiveCount++;
      picked.push(s);
    }
  }

  // Sort: Match first, then Safety, then Reach (by fitScore within each)
  const categoryOrder: Record<string, number> = { "Match": 0, "Safety": 1, "Reach": 2 };
  picked.sort((a, b) => {
    const catDiff = (categoryOrder[a.fitCategory] ?? 2) - (categoryOrder[b.fitCategory] ?? 2);
    if (catDiff !== 0) return catDiff;
    return b.fitScore - a.fitScore;
  });

  return picked.slice(0, 5).map(({ raw: r, fitCategory, fitScore, behaviorBoost }) => {
    const admRate = r["latest.admissions.admission_rate.overall"];
    const locale = r["school.locale"];
    const setting = locale <= 13 ? "Urban" : locale <= 23 ? "Suburban" : locale <= 33 ? "Town" : "Rural";
    const gradRate = r["latest.completion.rate_suppressed.overall"];
    const earnings = r["latest.earnings.10_yrs_after_entry.median"];
    const size = r["latest.student.size"];
    const topPrograms = getTopPrograms(r);
    const realismNote = generateRealismNote(fitCategory, fitScore, r, prefs);
    const schoolName = r["school.name"] || "Unknown";

    // Build personalized whyFit explanation
    const whyFitParts: string[] = [];
    whyFitParts.push(`${schoolName} is a ${fitCategory} school for you.`);
    if (fitCategory === "Safety") {
      whyFitParts.push("Your academic profile is above the typical admitted student, giving you a very strong chance of acceptance.");
    } else if (fitCategory === "Match") {
      whyFitParts.push("Your academics are competitive here, making this a realistic and exciting option.");
    } else {
      whyFitParts.push("This is a stretch, but worth applying if this school excites you.");
    }
    // Add preference-based reasons
    const study = (prefs.areaOfStudy || "").toLowerCase();
    if (study && study !== "undecided" && topPrograms.length > 0) {
      whyFitParts.push(`Strong programs in ${topPrograms.slice(0, 2).join(" and ")}.`);
    }
    if (admRate != null) whyFitParts.push(`Acceptance rate: ${(admRate * 100).toFixed(0)}%.`);
    if (gradRate != null && gradRate > 0.65) whyFitParts.push(`Solid ${(gradRate * 100).toFixed(0)}% graduation rate.`);

    // Tie in the student's activities answer (final quiz question)
    const { raw: activitiesRaw, tags: activityTags } = parseActivities(prefs);
    if (activityTags.length > 0) {
      const sizeNum = Number(size || 0);
      const activityBlurbs: string[] = [];
      if (activityTags.includes("athletics") || activityTags.includes("greek_life")) {
        activityBlurbs.push(sizeNum >= 15000
          ? "a large athletic and Greek life scene to continue what you're involved in"
          : "an active student community where you can stay involved in athletics or Greek life");
      }
      if (activityTags.includes("research")) activityBlurbs.push("strong research opportunities tied to your interests");
      if (activityTags.includes("arts")) activityBlurbs.push("an established arts and performance scene");
      if (activityTags.includes("service")) activityBlurbs.push("plenty of service and volunteer outlets");
      if (activityTags.includes("clubs")) activityBlurbs.push("a wide range of student clubs and leadership roles");
      if (activityTags.includes("entrepreneurship") || activityTags.includes("career")) activityBlurbs.push("career and entrepreneurship resources");
      if (activityBlurbs.length > 0) {
        whyFitParts.push(`Based on what you shared about your activities, this school offers ${activityBlurbs.slice(0, 2).join(" and ")}.`);
      }
    } else if (activitiesRaw && /^(no|none|n\/a|not really)/i.test(activitiesRaw)) {
      whyFitParts.push("You said you're open on activities, so we focused on academic and lifestyle fit.");
    }

    return {
      name: schoolName,
      location: `${r["school.city"] || ""}, ${r["school.state"] || ""}`,
      acceptanceRate: admRate != null ? `${(admRate * 100).toFixed(0)}%` : "N/A",
      ranking: "Based on U.S. Dept. of Education data",
      tuitionInState: r["latest.cost.tuition.in_state"] ? `$${Number(r["latest.cost.tuition.in_state"]).toLocaleString()}` : "N/A",
      tuitionOutOfState: r["latest.cost.tuition.out_of_state"] ? `$${Number(r["latest.cost.tuition.out_of_state"]).toLocaleString()}` : "N/A",
      avgFinancialAid: r["latest.cost.avg_net_price.overall"] && r["latest.cost.tuition.out_of_state"]
        ? `~$${Math.max(0, Number(r["latest.cost.tuition.out_of_state"]) - Number(r["latest.cost.avg_net_price.overall"])).toLocaleString()}`
        : "See school website",
      netPrice: r["latest.cost.avg_net_price.overall"] ? `$${Number(r["latest.cost.avg_net_price.overall"]).toLocaleString()}` : "N/A",
      topPrograms: topPrograms.length > 0 ? topPrograms : ["General Studies"],
      campusSize: size ? `${Number(size).toLocaleString()} students` : "N/A",
      studentBody: size ? `${Number(size).toLocaleString()} students` : "N/A",
      studentFacultyRatio: r["latest.student.demographics.student_faculty_ratio"]
        ? `${Math.round(Number(r["latest.student.demographics.student_faculty_ratio"]))}:1`
        : "Not reported",
      setting,
      graduationRate: gradRate != null ? `${(gradRate * 100).toFixed(0)}%` : "N/A",
      avgStartingSalary: earnings ? `$${Number(earnings).toLocaleString()}` : "N/A",
      fitScore,
      fitCategory,
      realismNote,
      whyFit: whyFitParts.join(" "),
      behaviorBoost,
      prosForStudent: ["Meets your stated preferences", "Strong graduation and outcomes data"],
      consForStudent: ["See detailed analysis for more context"],
      challengesForStudent: [],
      howToGetIn: "Visit the school's admissions website for detailed application requirements and deadlines.",
      campusVibe: setting === "Urban" ? "City campus environment" : setting === "Suburban" ? "Suburban campus setting" : "Close-knit campus community",
      notableFeature: gradRate != null && gradRate > 0.8 ? `High graduation rate (${(gradRate * 100).toFixed(0)}%)` : "Accredited institution with diverse programs",
    };
  });
}

// ─── Premium field masking ───────────────────────────────────────────────────

const PREMIUM_FIELDS = [
  "tuitionInState", "tuitionOutOfState", "avgFinancialAid",
  "studentFacultyRatio", "studentBody", "campusSize",
  "avgStartingSalary", "graduationRate",
];

function maskPremiumFields(recommendations: any): any {
  if (!recommendations?.colleges || !Array.isArray(recommendations.colleges)) return recommendations;
  recommendations.colleges = recommendations.colleges.map((c: any) => {
    const masked = { ...c };
    for (const f of PREMIUM_FIELDS) masked[f] = "Premium";
    return masked;
  });
  return recommendations;
}

const preferenceKeyMap: Record<string, string> = {
  first_name: "firstName",
  city_state: "cityState",
  test_score: "testScore",
  sat_score: "satScore",
  act_score: "actScore",
  campus_size: "campusSize",
  campus_vibe: "campusVibe",
  location_type: "locationType",
  max_cost: "maxCost",
  acceptance_rate_pref: "acceptanceRatePref",
  financial_aid: "financialAid",
  campus_life: "campusLife",
  academic_importance: "academicImportance",
  distance_from_home: "distanceFromHome",
  weather_region: "weatherRegion",
  list_mode: "listMode",
  area_of_study: "areaOfStudy",
  custom_major: "customMajor",
};

function normalizePreferenceKeys(input: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    const mappedKey = preferenceKeyMap[key] || key;
    if (
      normalized[mappedKey] === undefined ||
      normalized[mappedKey] === null ||
      normalized[mappedKey] === ""
    ) {
      normalized[mappedKey] = value;
    }
  }
  return normalized;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  console.log("[college-match] ===== FUNCTION START =====", new Date().toISOString());
  console.log("[college-match] Method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  let matchId: string | null = null;

  const updateMatch = async (updates: Record<string, any>) => {
    if (!matchId) return;
    try {
      console.log(`[college-match] DB UPDATE match=${matchId}, status=${updates.ai_status || "data-only"}, keys=${Object.keys(updates).join(",")}`);
      const sb = createClient(supabaseUrl, serviceKey);
      const { error: updateErr } = await sb.from("college_matches").update(updates).eq("id", matchId);
      if (updateErr) {
        console.error(`[college-match] DB UPDATE FAILED for ${matchId}:`, updateErr.message);
      } else {
        console.log(`[college-match] DB UPDATE SUCCESS for ${matchId}`);
      }
    } catch (e) {
      console.error("[college-match] DB update exception:", e);
    }
  };

  try {
    const body = await req.json().catch((e: any) => { console.error("[college-match] Failed to parse request body:", e); return null; });
    console.log("[college-match] Received payload:", JSON.stringify({ hasPreferences: !!body?.preferences, matchId: body?.matchId, hasExclude: !!body?.excludeColleges }));
    const raw = body?.preferences;
    matchId = typeof body?.matchId === "string" ? body.matchId : null;
    console.log("[college-match] matchId:", matchId, "| preferences keys:", raw ? Object.keys(raw).join(",") : "NONE");

    // Rate limit only ad-hoc invocations (discover-more)
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";

    if (!matchId && !(await checkRateLimit(clientIp, "college-match"))) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check premium status (also require auth)
    let isPremiumUser = false;
    let authUserId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const sbAdmin = createClient(supabaseUrl, serviceKey);
      const token = authHeader.replace("Bearer ", "");
      let authUserEmail: string | null = null;
      try {
        const { data: userData, error: userError } = await sbAdmin.auth.getUser(token);
        if (!userError && userData?.user) {
          authUserId = userData.user.id;
          authUserEmail = userData.user.email || null;
        }
      } catch { /* ignore */ }

      if (authUserId) {
        const { data: roleData } = await sbAdmin
          .from("user_roles").select("role").eq("user_id", authUserId).eq("role", "admin").maybeSingle();
        if (roleData) isPremiumUser = true;

        if (!isPremiumUser && authUserEmail) {
          try {
            const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
            if (stripeKey) {
              const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
              const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
              const customers = await stripe.customers.list({ email: authUserEmail, limit: 1 });
              if (customers.data.length > 0) {
                const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active", limit: 1 });
                if (subs.data.length > 0) isPremiumUser = true;
              }
            }
          } catch { /* ignore */ }
        }
      }
    }

    // If a matchId is supplied, require auth and verify ownership before any update.
    if (matchId) {
      if (!authUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sbOwn = createClient(supabaseUrl, serviceKey);
      const { data: ownerRow } = await sbOwn
        .from("college_matches").select("user_id").eq("id", matchId).maybeSingle();
      if (!ownerRow || (ownerRow as any).user_id !== authUserId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    if (!raw || typeof raw !== "object") {
      await updateMatch({ ai_status: "failed", ai_error: "Invalid input: preferences object required" });
      return new Response(JSON.stringify({ error: "Invalid input: preferences object required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (JSON.stringify(raw).length > 10_000) {
      await updateMatch({ ai_status: "failed", ai_error: "Input too large" });
      return new Response(JSON.stringify({ error: "Input too large" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (matchId) {
      console.log("[college-match] Setting match to processing...");
      await updateMatch({ ai_status: "processing", ai_error: null });
    }

    // Sanitize
    const sanitize = (v: any): string => {
      if (typeof v !== "string") return "";
      const t = v.trim();
      return /^\{.*\}$/.test(t) ? "" : t.substring(0, 500);
    };

    const sanitizedPrefs: Record<string, any> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (key === "allResponses" && typeof val === "object" && val !== null) {
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(val as Record<string, any>)) {
          const s = sanitize(v);
          if (s) cleaned[k] = s;
        }
        sanitizedPrefs[key] = cleaned;
      } else {
        const s = sanitize(val);
        sanitizedPrefs[key] = s || raw[key];
      }
    }

    const prefs = normalizePreferenceKeys(sanitizedPrefs);
    console.log("[college-match] Processing:", prefs.areaOfStudy, "campusSize:", prefs.campusSize);

    const excludeColleges: string[] = Array.isArray(body?.excludeColleges)
      ? body.excludeColleges.filter((n: any) => typeof n === "string").slice(0, 20)
      : [];

    // ── Step 1: Fetch college data from Scorecard + weight adjustments in parallel ──
    // (authUserId already resolved above from verified JWT)
    let weightAdj: Record<string, number> | undefined;


    const [scorecard, adjResult, cohortSignals] = await Promise.all([
      fetchFromScorecard(prefs),
      authUserId
        ? (async () => {
            try {
              const { data } = await createClient(supabaseUrl, serviceKey)
                .from("scoring_weight_adjustments")
                .select("culture_adj, academic_adj, cost_adj, distance_adj, admission_adj, size_adj, support_adj")
                .eq("user_id", authUserId)
                .maybeSingle();
              return data;
            } catch {
              return null;
            }
          })()
        : Promise.resolve(null),
      // Fetch behavior boost rows for this user's cohort
      (async () => {
        const cohortKey = computeCohortKey(prefs);
        const { data } = await createClient(supabaseUrl, serviceKey)
          .from("cohort_college_signals")
          .select("college_name, behavior_boost, cohort_size")
          .eq("cohort_key", cohortKey);
        return { cohortKey, rows: data || [] };
      })().catch(() => ({ cohortKey: "", rows: [] })),
    ]);

    if (adjResult) {
      weightAdj = {
        culture: Number(adjResult.culture_adj) || 0,
        academic: Number(adjResult.academic_adj) || 0,
        cost: Number(adjResult.cost_adj) || 0,
        distance: Number(adjResult.distance_adj) || 0,
        admission: Number(adjResult.admission_adj) || 0,
        size: Number(adjResult.size_adj) || 0,
        support: Number(adjResult.support_adj) || 0,
      };
      console.log("[college-match] Applying user weight adjustments:", weightAdj);
    }

    // ── Build behavior boost lookup map ──
    const behaviorBoosts = new Map<string, number>();
    for (const row of cohortSignals.rows) {
      behaviorBoosts.set(row.college_name, Number(row.behavior_boost) || 0);
    }
    console.log(`[college-match] Cohort=${cohortSignals.cohortKey} behaviorBoosts=${behaviorBoosts.size}`);

    // ── If new user has no cohort data yet, trigger on-demand aggregation in background ──
    if (authUserId && behaviorBoosts.size === 0 && cohortSignals.cohortKey) {
      // Fire-and-forget — don't await so quiz response stays fast
      fetch(`${supabaseUrl}/functions/v1/aggregate-cohort-signals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ userId: authUserId }),
      }).catch((err) => console.warn("[college-match] on-demand aggregate failed:", err));
    }

    console.log(`[college-match] Scorecard returned ${scorecard.count} colleges`);

    if (scorecard.raw.length === 0) {
      await updateMatch({ ai_status: "failed", ai_error: "No matching colleges found in database" });
      return new Response(JSON.stringify({ error: "No matching colleges found. Try broadening your preferences." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 2: Rule-based matching (deterministic + user adjustments + cohort behavior) ──
    const matchedColleges = ruleBasedMatch(scorecard.raw, prefs, excludeColleges, weightAdj, behaviorBoosts);
    console.log(`[college-match] Rule engine picked ${matchedColleges.length} colleges:`, matchedColleges.map(c => c.name));

    // ── Step 3: Build student profile (rule-based, grounded in quiz answers) ──
    const priorityCandidates: string[] = [];
    if (prefs.areaOfStudy && !/undecided/i.test(prefs.areaOfStudy)) priorityCandidates.push(prefs.areaOfStudy);
    if (prefs.campusSize && !/no preference/i.test(prefs.campusSize)) priorityCandidates.push(`${prefs.campusSize} campus`);
    if (prefs.locationType && !/no preference/i.test(prefs.locationType)) priorityCandidates.push(`${prefs.locationType} setting`);
    if (prefs.financialAid && /essential|very important/i.test(prefs.financialAid)) priorityCandidates.push("Strong financial aid");
    else if (prefs.maxCost && !/no preference/i.test(prefs.maxCost)) priorityCandidates.push(`Budget ${prefs.maxCost}`);
    if (prefs.academicImportance && /top priority|very important/i.test(prefs.academicImportance)) priorityCandidates.push("Academic rigor");
    if (prefs.campusLife && !/no preference/i.test(prefs.campusLife)) {
      const firstLife = String(prefs.campusLife).split(",")[0]?.trim();
      if (firstLife) priorityCandidates.push(firstLife);
    }
    {
      const { tags: actTags } = parseActivities(prefs);
      const tagLabel: Record<string, string> = {
        athletics: "Continuing athletics",
        greek_life: "Greek life community",
        research: "Research opportunities",
        arts: "Arts & performance",
        service: "Service & volunteering",
        clubs: "Active student clubs",
        recreation: "Outdoor & intramurals",
        entrepreneurship: "Entrepreneurship",
        career: "Career & internships",
      };
      for (const t of actTags) {
        if (tagLabel[t]) priorityCandidates.push(tagLabel[t]);
      }
    }
    while (priorityCandidates.length < 3) priorityCandidates.push("Campus fit");

    const studentProfile = {
      summary: `Based on your preferences, we found ${matchedColleges.length} schools that match your criteria using U.S. Department of Education data.`,
      topPriorities: priorityCandidates.slice(0, 3),
      idealSchoolType: "Schools matching your stated preferences for location, size, and academic focus",
    };
    const comparisonInsight = `These ${matchedColleges.length} schools were selected from U.S. Department of Education data based on your preferences, with a balanced mix of Safety, Match, and Reach schools.`;

    // ── Step 4: Build final result and save as completed (version 1 = rule-based) ──
    console.log("[college-match] Step 4: Building final result...");
    const recommendations = {
      studentProfile,
      colleges: matchedColleges,
      comparisonInsight,
    };

    if (matchId) {
      console.log("[college-match] Saving completed results to DB for match:", matchId);
      await updateMatch({
        college_data: recommendations.colleges,
        student_profile: recommendations.studentProfile,
        comparison_insight: recommendations.comparisonInsight,
        ai_status: "completed",
        ai_error: null,
        results_generated_at: new Date().toISOString(),
        results_version: 1,
      });
    }

    // Mask premium fields for free tier
    const finalResult = isPremiumUser ? recommendations : maskPremiumFields({ ...recommendations });

    console.log("[college-match] ===== RETURNING RESPONSE ===== colleges:", finalResult.colleges?.length, "isPremium:", isPremiumUser);
    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[college-match] ===== CAUGHT ERROR =====", e instanceof Error ? e.message : e, e instanceof Error ? e.stack : "");
    await updateMatch({
      ai_status: "failed",
      ai_error: e instanceof Error ? e.message : "Unexpected error",
    });
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
