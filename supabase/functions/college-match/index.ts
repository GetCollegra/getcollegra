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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROVIDER: College Scorecard  (Primary)
// Docs: https://collegescorecard.ed.gov/data/documentation/
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * All Scorecard fields we request.  Grouped logically so it's easy to see
 * what data the quiz results page depends on.
 */
const SCORECARD_FIELDS = [
  // Identity
  "id", "school.name", "school.city", "school.state", "school.school_url",
  "school.ownership", "school.locale",

  // Enrollment
  "latest.student.size",

  // Admissions — overall + SAT/ACT ranges for fit category
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

  // Cost
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.cost.avg_net_price.overall",

  // Aid & Outcomes
  "latest.aid.median_debt.completers.overall",
  "latest.aid.pell_grant_rate",
  "latest.completion.rate_suppressed.overall",
  "latest.earnings.10_yrs_after_entry.median",

  // Programs (% of students in each major family)
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
  p.set("school.degrees_awarded.predominant", "3"); // bachelor's
  p.set("latest.admissions.admission_rate.overall__range", "0..1");

  // Campus size filter
  const size = (prefs.campusSize || "").toLowerCase();
  if (size.includes("small")) p.set("latest.student.size__range", "..5000");
  else if (size.includes("medium")) p.set("latest.student.size__range", "5000..15000");
  else if (size.includes("very large") || size.includes("30,000")) p.set("latest.student.size__range", "30000..");
  else if (size.includes("large")) p.set("latest.student.size__range", "15000..30000");

  // Location type
  const loc = (prefs.locationType || "").toLowerCase();
  if (loc.includes("urban") || loc.includes("city")) p.set("school.locale__range", "11..13");
  else if (loc.includes("suburban")) p.set("school.locale__range", "21..23");
  else if (loc.includes("rural") || loc.includes("small town")) p.set("school.locale__range", "31..43");

  // Max cost
  const cost = (prefs.maxCost || "").toLowerCase().replace(/[,$]/g, "");
  if (cost.includes("under 10") || cost.includes("less than 10")) p.set("latest.cost.avg_net_price.overall__range", "..10000");
  else if (cost.includes("10") && cost.includes("20")) p.set("latest.cost.avg_net_price.overall__range", "..20000");
  else if (cost.includes("20") && cost.includes("30")) p.set("latest.cost.avg_net_price.overall__range", "..30000");
  else if (cost.includes("30") && cost.includes("45")) p.set("latest.cost.avg_net_price.overall__range", "..45000");

  // Acceptance rate
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

  // Geographic filter
  const cityState = (prefs.cityState || "").toLowerCase();
  if (cityState && cityState !== "no preference" && cityState !== "not specified") {
    const fips = getStateFips(cityState);
    if (fips.length > 0) {
      const states = getNearbyStates(fips[0], prefs.distanceFromHome || "");
      if (states.length > 0) p.set("school.state_fips", states.join(","));
    }
  }

  p.set("sort", "latest.completion.rate_suppressed.overall:desc");
  p.set("per_page", "30");
  return p.toString();
}

/** Turn raw Scorecard JSON rows into a human-readable string the AI can parse */
function formatScorecardResults(results: any[]): string {
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

    // SAT
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

    // ACT
    const actMid = r["latest.admissions.act_scores.midpoint.cumulative"];
    const act25 = r["latest.admissions.act_scores.25th_percentile.cumulative"];
    const act75 = r["latest.admissions.act_scores.75th_percentile.cumulative"];
    let actDisplay = "N/A";
    if (actMid) {
      actDisplay = `Mid: ${actMid}`;
      if (act25 && act75) actDisplay += ` (25th-75th: ${act25}-${act75})`;
    }

    // Programs
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

/**
 * Fetch colleges from Scorecard.  Automatically retries with a broader
 * geographic query when the initial result set is small.
 */
async function fetchFromScorecard(prefs: Record<string, any>): Promise<{ data: string; count: number }> {
  const apiKey = Deno.env.get("COLLEGE_SCORECARD_API_KEY");
  if (!apiKey || apiKey.trim().length < 10) {
    console.error("COLLEGE_SCORECARD_API_KEY missing or too short");
    return { data: "", count: 0 };
  }
  console.log("COLLEGE_SCORECARD_API_KEY present:", true, "length:", apiKey.length, "starts:", apiKey.substring(0, 4));

  const query = buildScorecardQuery(prefs);
  const url = `https://api.data.gov/ed/collegescorecard/v1/schools?${query}`;
  console.log("Scorecard query params:", query);

  const resp = await fetch(url);
  let data = "";
  let count = 0;

  if (resp.ok) {
    const json = await resp.json();
    const results = json.results || [];
    count = results.length;
    console.log(`Got ${count} colleges from Scorecard API`);
    if (count > 0) data = formatScorecardResults(results);
  } else {
    console.error("Scorecard API error:", resp.status, await resp.text());
  }

  // Broaden if few results (drop state filter)
  if (count > 0 && count < 10) {
    console.log("Few results, trying broader query without state filter...");
    const broaderQuery = query.replace(/&school\.state_fips=[^&]*/g, "");
    const broaderResp = await fetch(`https://api.data.gov/ed/collegescorecard/v1/schools?${broaderQuery}`);
    if (broaderResp.ok) {
      const bJson = await broaderResp.json();
      const bResults = bJson.results || [];
      if (bResults.length > count) {
        console.log(`Broader query got ${bResults.length} results`);
        data = formatScorecardResults(bResults);
        count = bResults.length;
      }
    }
  }

  return { data, count };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROVIDER PLACEHOLDER: Backup Source
// To add a second data source (IPEDS, Niche API, Peterson's, etc.):
//
//   async function fetchFromBackup(prefs): Promise<{ data: string; count: number }> {
//     // 1. Call the backup API
//     // 2. Format results into a plain-text block like formatScorecardResults
//     // 3. Return { data, count }
//   }
//
// Then in the main handler, merge:
//   if (scorecardResult.count < 5) {
//     const backup = await fetchFromBackup(prefs);
//     realCollegeData += "\n\n--- BACKUP SOURCE ---\n" + backup.data;
//   }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── AI Prompt ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a college admissions expert. You have been given REAL, VERIFIED data from the US Department of Education's College Scorecard database.

Your job is to select the 5 best-fit colleges for this student from the real data provided, and personalize the recommendations.

CRITICAL: Each student is UNIQUE. Their answers MUST directly determine which colleges you pick. Two students with different answers should get COMPLETELY DIFFERENT lists. Here is how to use each preference:

1. **SAT & ACT Scores** → CRITICAL for fitCategory. Compare the student's scores against each school's 25th-75th percentile ranges:
   - Student score ABOVE school's 75th percentile → Safety
   - Student score WITHIN school's 25th-75th range → Match  
   - Student score BELOW school's 25th percentile → Reach
   - If student provides SAT (out of 1600) use SAT data. If ACT (out of 36) use ACT data. If both, use both.
   - A student with SAT 1300 is competitive at schools with avg SAT ~1200-1350, reach for 1400+
   - A student with ACT 30 is competitive at schools with avg ACT ~27-31, reach for 33+
2. **GPA** → Secondary fit factor combined with test scores:
   - GPA 3.8+ with high scores → can include <15% acceptance schools as Match
   - GPA 3.0-3.7 → 25-60% acceptance as Match
   - GPA <3.0 → 50%+ acceptance as Match
2. **Campus Size** → HARD FILTER. Only pick schools matching their size.
3. **Campus Vibe** → Match to known cultures (e.g., "spirited" = strong athletics, "tight knit" = small classes).
4. **Location Type** → HARD FILTER. Urban/Suburban/Rural must match.
5. **Max Cost** → HARD FILTER. Net price must not exceed budget unless labeled as Reach.
6. **Acceptance Rate Comfort** → Drives the Safety/Match/Reach mix.
7. **Financial Aid** → If "Essential", prioritize high Pell grant rate schools.
8. **Campus Life** → Tailor picks (e.g., "Greek life" = schools with strong Greek presence).
9. **Academic Importance** → If "Top priority", favor high graduation rates.
10. **Distance From Home** → Geographic constraint from their home city/state.
11. **Area of Study** → CRITICAL. Prioritize schools with strong programs in their field using program percentage data.

In "whyFit" and "prosForStudent", EXPLICITLY quote the student's own words (e.g., "You said you want a 'spirited' campus — this school's Division I program delivers that").

IMPORTANT: Use EXACT data values from the Scorecard data — do NOT fabricate statistics. You may add context about campus culture and fit reasoning.

Return a JSON object with this exact structure:
{
  "studentProfile": {
    "summary": "2-3 sentence overview referencing their specific answers",
    "topPriorities": ["Priority 1", "Priority 2", "Priority 3"],
    "idealSchoolType": "Brief description based on ALL their answers"
  },
  "colleges": [
    {
      "name": "Full College Name (exactly as in data)",
      "location": "City, State",
      "acceptanceRate": "XX%",
      "ranking": "Category description",
      "tuitionInState": "$XX,XXX",
      "tuitionOutOfState": "$XX,XXX",
      "avgFinancialAid": "Estimated from net price data",
      "netPrice": "$XX,XXX",
      "topPrograms": ["Program 1", "Program 2", "Program 3"],
      "campusSize": "Description",
      "studentBody": "XX,XXX students",
      "studentFacultyRatio": "XX:1",
      "setting": "Urban/Suburban/Rural",
      "graduationRate": "XX%",
      "avgStartingSalary": "$XX,XXX",
      "fitScore": 95,
      "fitCategory": "Safety/Match/Reach",
      "whyFit": "2-3 sentences referencing specific student answers",
      "prosForStudent": ["Pro quoting student preference", "Pro 2", "Pro 3"],
      "consForStudent": ["Con referencing student preference", "Con 2"],
      "campusVibe": "1 sentence campus culture",
      "notableFeature": "One unique relevant thing"
    }
  ],
  "comparisonInsight": "2-3 sentences comparing recommendations referencing key preferences"
}

Provide exactly 5 colleges sorted by fitScore descending. Include at least one Safety and one Reach. Use real data values only.

IMPORTANT: Only return the JSON object, no markdown formatting or code blocks.`;

function buildUserPrompt(prefs: Record<string, any>, collegeData: string): string {
  const allResponses = prefs.allResponses || {};
  const extraFields = Object.entries(allResponses)
    .filter(([key]) => key !== "email")
    .map(([key, val]) => `- ${key.replace(/_/g, " ")}: ${val}`)
    .join("\n");

  const sat = prefs.satScore || "";
  const act = prefs.actScore || "";
  let testDisplay = prefs.testScore || "None";
  if (sat || act) {
    const parts = [];
    if (sat) parts.push(`SAT: ${sat}`);
    if (act) parts.push(`ACT: ${act}`);
    testDisplay = parts.join(", ");
  }

  let prompt = `Student preferences (USE ALL OF THESE to select and rank colleges):
- Home location: ${prefs.cityState || "Not specified"}
- Weighted GPA: ${prefs.gpa || "Not specified"}
- Test Scores: ${testDisplay}
- Campus size: ${prefs.campusSize || "No preference"}
- Campus vibe: ${prefs.campusVibe || "No preference"}
- Location type: ${prefs.locationType || "No preference"}
- Max cost/year: ${prefs.maxCost || "No preference"}
- Acceptance rate comfort: ${prefs.acceptanceRatePref || "No preference"}
- Financial aid importance: ${prefs.financialAid || "Important"}
- Campus life interests: ${prefs.campusLife || "No preference"}
- Academic importance: ${prefs.academicImportance || "No preference"}
- Distance from home: ${prefs.distanceFromHome || "No preference"}
- Area of study: ${prefs.areaOfStudy || "Undecided"}

All survey responses:
${extraFields}`;

  if (collegeData) {
    prompt += `\n\n--- REAL COLLEGE DATA FROM US DEPT OF EDUCATION ---\n${collegeData}\n--- END REAL DATA ---\n\nSelect the 5 best-fit colleges from this real data for this specific student. The selected colleges MUST reflect their unique preferences above.`;
  } else {
    prompt += `\n\nNote: Could not fetch live data. Recommend 5 colleges using your knowledge, ensuring they match this specific student's preferences.`;
  }

  return prompt;
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

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("cf-connecting-ip") || "unknown";
    if (!(await checkRateLimit(clientIp, "college-match"))) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse & validate input
    const body = await req.json();
    const raw = body?.preferences;
    if (!raw || typeof raw !== "object") {
      return new Response(JSON.stringify({ error: "Invalid input: preferences object required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (JSON.stringify(raw).length > 10_000) {
      return new Response(JSON.stringify({ error: "Input too large" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize
    const sanitize = (v: any): string => {
      if (typeof v !== "string") return "";
      const t = v.trim();
      return /^\{.*\}$/.test(t) ? "" : t.substring(0, 500);
    };

    const prefs: Record<string, any> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (key === "allResponses" && typeof val === "object" && val !== null) {
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(val as Record<string, any>)) {
          const s = sanitize(v);
          if (s) cleaned[k] = s;
        }
        prefs[key] = cleaned;
      } else {
        const s = sanitize(val);
        prefs[key] = s || raw[key];
      }
    }
    console.log("Received preferences:", JSON.stringify(prefs, null, 2));

    // Ensure AI key exists
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 1: Fetch college data from primary source ──
    const scorecard = await fetchFromScorecard(prefs);

    // ── (Future) Step 1b: Fetch from backup if primary returned too few ──
    // if (scorecard.count < 5) {
    //   const backup = await fetchFromBackup(prefs);
    //   scorecard.data += "\n\n--- BACKUP SOURCE ---\n" + backup.data;
    // }

    // ── Step 2: AI ranking ──
    const userPrompt = buildUserPrompt(prefs, scorecard.data);
    console.log("Sending to AI with", userPrompt.length, "chars");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", aiResp.status, await aiResp.text());
      return new Response(JSON.stringify({ error: "Failed to generate recommendations" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let recommendations;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      recommendations = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse college recommendations");
    }

    // Mask premium fields for free tier
    recommendations = maskPremiumFields(recommendations);

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("college-match error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
