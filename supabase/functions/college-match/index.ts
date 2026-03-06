import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // max requests per IP per minute (stricter — expensive function)

async function checkRateLimit(ip: string, functionName: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { count } = await sb
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("function_name", functionName)
    .gte("window_start", windowStart);

  if ((count ?? 0) >= RATE_LIMIT_MAX) return false;

  await sb.from("rate_limits").insert({ ip_address: ip, function_name: functionName });

  if (Math.random() < 0.05) {
    await sb.rpc("cleanup_rate_limits");
  }

  return true;
}

// Map area of study to Scorecard program fields for sorting
const studyProgramMap: Record<string, string> = {
  "computer": "latest.academics.program_percentage.computer",
  "engineering": "latest.academics.program_percentage.engineering",
  "business": "latest.academics.program_percentage.business_marketing",
  "health": "latest.academics.program_percentage.health",
  "biology": "latest.academics.program_percentage.biological",
  "social": "latest.academics.program_percentage.social_science",
  "psychology": "latest.academics.program_percentage.psychology",
  "education": "latest.academics.program_percentage.education",
  "art": "latest.academics.program_percentage.visual_performing",
  "communication": "latest.academics.program_percentage.communication",
};

function findProgramField(areaOfStudy: string): string | null {
  const lower = (areaOfStudy || "").toLowerCase();
  for (const [keyword, field] of Object.entries(studyProgramMap)) {
    if (lower.includes(keyword)) return field;
  }
  return null;
}

// Map state names/abbreviations to Scorecard state FIPS codes
const stateFipsMap: Record<string, string> = {
  "alabama": "1", "alaska": "2", "arizona": "4", "arkansas": "5",
  "california": "6", "colorado": "8", "connecticut": "9", "delaware": "10",
  "florida": "12", "georgia": "13", "hawaii": "15", "idaho": "16",
  "illinois": "17", "indiana": "18", "iowa": "19", "kansas": "20",
  "kentucky": "21", "louisiana": "22", "maine": "23", "maryland": "24",
  "massachusetts": "25", "michigan": "26", "minnesota": "27", "mississippi": "28",
  "missouri": "29", "montana": "30", "nebraska": "31", "nevada": "32",
  "new hampshire": "33", "new jersey": "34", "new mexico": "35", "new york": "36",
  "north carolina": "37", "north dakota": "38", "ohio": "39", "oklahoma": "40",
  "oregon": "41", "pennsylvania": "42", "rhode island": "44", "south carolina": "45",
  "south dakota": "46", "tennessee": "47", "texas": "48", "utah": "49",
  "vermont": "50", "virginia": "51", "washington": "53", "west virginia": "54",
  "wisconsin": "55", "wyoming": "56",
};

// State abbreviation map
const stateAbbrMap: Record<string, string> = {
  "al": "1", "ak": "2", "az": "4", "ar": "5", "ca": "6", "co": "8",
  "ct": "9", "de": "10", "fl": "12", "ga": "13", "hi": "15", "id": "16",
  "il": "17", "in": "18", "ia": "19", "ks": "20", "ky": "21", "la": "22",
  "me": "23", "md": "24", "ma": "25", "mi": "26", "mn": "27", "ms": "28",
  "mo": "29", "mt": "30", "ne": "31", "nv": "32", "nh": "33", "nj": "34",
  "nm": "35", "ny": "36", "nc": "37", "nd": "38", "oh": "39", "ok": "40",
  "or": "41", "pa": "42", "ri": "44", "sc": "45", "sd": "46", "tn": "47",
  "tx": "48", "ut": "49", "vt": "50", "va": "51", "wa": "53", "wv": "54",
  "wi": "55", "wy": "56",
};

function getStateFips(cityState: string): string[] {
  const lower = cityState.toLowerCase().trim();
  const fipsList: string[] = [];
  
  // Check full state names
  for (const [name, fips] of Object.entries(stateFipsMap)) {
    if (lower.includes(name)) fipsList.push(fips);
  }
  
  // Check abbreviations (e.g. "NY", "CA")
  if (fipsList.length === 0) {
    const parts = lower.split(/[,\s]+/);
    for (const part of parts) {
      const fips = stateAbbrMap[part];
      if (fips) fipsList.push(fips);
    }
  }
  
  return fipsList;
}

// Get nearby states for distance preference
function getNearbyStates(fips: string, distance: string): string[] {
  const nearby: Record<string, string[]> = {
    "36": ["34", "9", "25", "42", "24"], // NY → NJ, CT, MA, PA, MD
    "6": ["41", "32", "4"], // CA → OR, NV, AZ
    "48": ["40", "35", "22", "5"], // TX → OK, NM, LA, AR
    "12": ["13", "45", "1"], // FL → GA, SC, AL
    "17": ["18", "55", "26", "19", "29"], // IL → IN, WI, MI, IA, MO
    "42": ["36", "34", "24", "10", "39"], // PA → NY, NJ, MD, DE, OH
    "13": ["12", "45", "37", "47", "1"], // GA → FL, SC, NC, TN, AL
    "25": ["9", "44", "33", "50", "36"], // MA → CT, RI, NH, VT, NY
    "39": ["42", "26", "18", "21", "54"], // OH → PA, MI, IN, KY, WV
    "51": ["24", "37", "47", "21", "54", "10"], // VA → MD, NC, TN, KY, WV, DC
  };
  
  const distLower = (distance || "").toLowerCase();
  if (distLower.includes("anywhere") || distLower.includes("no preference")) return [];
  if (distLower.includes("1 hour") || distLower.includes("under 2")) return [fips];
  if (distLower.includes("2-4") || distLower.includes("few hours")) return [fips, ...(nearby[fips] || [])];
  // 4+ hours or "willing to fly" = no geographic filter
  return [];
}

function buildScorecardQuery(preferences: any): string {
  const params = new URLSearchParams();
  const apiKey = Deno.env.get("COLLEGE_SCORECARD_API_KEY");
  params.set("api_key", apiKey || "");

  // Fields to retrieve — including SAT/ACT admission scores
  params.set("fields", [
    "id", "school.name", "school.city", "school.state", "school.school_url",
    "school.ownership", "school.locale", "latest.student.size",
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
    "latest.cost.tuition.in_state", "latest.cost.tuition.out_of_state",
    "latest.cost.avg_net_price.overall",
    "latest.aid.median_debt.completers.overall", "latest.aid.pell_grant_rate",
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
  ].join(","));

  // Only degree-granting, primarily bachelor's
  params.set("school.degrees_awarded.predominant", "3");
  params.set("latest.admissions.admission_rate.overall__range", "0..1");

  // Campus size preference
  const size = (preferences.campusSize || "").toLowerCase();
  if (size.includes("small")) {
    params.set("latest.student.size__range", "..5000");
  } else if (size.includes("medium")) {
    params.set("latest.student.size__range", "5000..15000");
  } else if (size.includes("very large") || size.includes("30,000")) {
    params.set("latest.student.size__range", "30000..");
  } else if (size.includes("large")) {
    params.set("latest.student.size__range", "15000..30000");
  }

  // Location type
  const locationType = (preferences.locationType || "").toLowerCase();
  if (locationType.includes("urban") || locationType.includes("city")) {
    params.set("school.locale__range", "11..13");
  } else if (locationType.includes("suburban")) {
    params.set("school.locale__range", "21..23");
  } else if (locationType.includes("rural") || locationType.includes("small town")) {
    params.set("school.locale__range", "31..43");
  }

  // Max cost per year
  const maxCost = (preferences.maxCost || "").toLowerCase().replace(/,/g, "").replace(/\$/g, "");
  if (maxCost.includes("under 10") || maxCost.includes("less than 10")) {
    params.set("latest.cost.avg_net_price.overall__range", "..10000");
  } else if (maxCost.includes("10") && maxCost.includes("20")) {
    params.set("latest.cost.avg_net_price.overall__range", "..20000");
  } else if (maxCost.includes("20") && maxCost.includes("30")) {
    params.set("latest.cost.avg_net_price.overall__range", "..30000");
  } else if (maxCost.includes("30") && maxCost.includes("45")) {
    params.set("latest.cost.avg_net_price.overall__range", "..45000");
  }

  // Acceptance rate preference
  const acceptPref = (preferences.acceptanceRatePref || "").toLowerCase();
  if (acceptPref.includes("very selective") || acceptPref.includes("under 10")) {
    params.set("latest.admissions.admission_rate.overall__range", "0..0.10");
  } else if (acceptPref.includes("highly selective") || (acceptPref.includes("10") && acceptPref.includes("25"))) {
    params.set("latest.admissions.admission_rate.overall__range", "0..0.25");
  } else if (acceptPref.includes("selective") && !acceptPref.includes("highly") && !acceptPref.includes("less") && !acceptPref.includes("moderately")) {
    params.set("latest.admissions.admission_rate.overall__range", "0..0.50");
  } else if (acceptPref.includes("moderately") || acceptPref.includes("moderate")) {
    params.set("latest.admissions.admission_rate.overall__range", "0.25..0.75");
  } else if (acceptPref.includes("less selective") || acceptPref.includes("open")) {
    params.set("latest.admissions.admission_rate.overall__range", "0.50..1");
  }

  // Geographic filtering based on city/state + distance preference
  const cityState = (preferences.cityState || "").toLowerCase();
  const distanceFromHome = preferences.distanceFromHome || "";
  
  if (cityState && cityState !== "no preference" && cityState !== "not specified") {
    const fipsList = getStateFips(cityState);
    if (fipsList.length > 0) {
      const statesForDistance = getNearbyStates(fipsList[0], distanceFromHome);
      if (statesForDistance.length > 0) {
        params.set("school.state_fips", statesForDistance.join(","));
      }
    }
  }

  // Always sort by completion rate — program percentage fields are not supported as sort params
  // The AI will handle program-based ranking using the returned program_percentage data
  params.set("sort", "latest.completion.rate_suppressed.overall:desc");

  params.set("per_page", "30");
  return params.toString();
}

function formatCollegeData(results: any[]): string {
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

    // SAT/ACT scores
    const satAvg = r["latest.admissions.sat_scores.average.overall"];
    const satRead25 = r["latest.admissions.sat_scores.25th_percentile.critical_reading"];
    const satRead75 = r["latest.admissions.sat_scores.75th_percentile.critical_reading"];
    const satMath25 = r["latest.admissions.sat_scores.25th_percentile.math"];
    const satMath75 = r["latest.admissions.sat_scores.75th_percentile.math"];
    const actMid = r["latest.admissions.act_scores.midpoint.cumulative"];
    const act25 = r["latest.admissions.act_scores.25th_percentile.cumulative"];
    const act75 = r["latest.admissions.act_scores.75th_percentile.cumulative"];

    // Program percentages
    const programs: string[] = [];
    const progFields: Record<string, string> = {
      "Computer Science": r["latest.academics.program_percentage.computer"],
      "Engineering": r["latest.academics.program_percentage.engineering"],
      "Business": r["latest.academics.program_percentage.business_marketing"],
      "Health": r["latest.academics.program_percentage.health"],
      "Biology": r["latest.academics.program_percentage.biological"],
      "Social Science": r["latest.academics.program_percentage.social_science"],
      "Psychology": r["latest.academics.program_percentage.psychology"],
      "Education": r["latest.academics.program_percentage.education"],
      "Arts": r["latest.academics.program_percentage.visual_performing"],
      "Communications": r["latest.academics.program_percentage.communication"],
    };
    for (const [name, pct] of Object.entries(progFields)) {
      if (pct && Number(pct) > 0.05) programs.push(`${name} (${(Number(pct) * 100).toFixed(0)}%)`);
    }

    // Build SAT display
    let satDisplay = "N/A";
    if (satAvg) {
      satDisplay = `Avg: ${satAvg}`;
      if (satRead25 && satRead75 && satMath25 && satMath75) {
        const total25 = Number(satRead25) + Number(satMath25);
        const total75 = Number(satRead75) + Number(satMath75);
        satDisplay += ` (25th-75th: ${total25}-${total75})`;
      }
    }

    // Build ACT display
    let actDisplay = "N/A";
    if (actMid) {
      actDisplay = `Mid: ${actMid}`;
      if (act25 && act75) {
        actDisplay += ` (25th-75th: ${act25}-${act75})`;
      }
    }

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "unknown";

    const allowed = await checkRateLimit(clientIp, "college-match");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rawPreferences = body?.preferences;

    // Input validation
    if (!rawPreferences || typeof rawPreferences !== "object") {
      return new Response(JSON.stringify({ error: "Invalid input: preferences object required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit total payload size by checking stringified length
    const rawStr = JSON.stringify(rawPreferences);
    if (rawStr.length > 10000) {
      return new Response(JSON.stringify({ error: "Input too large" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Sanitize preferences: remove Tally placeholder values like {field_id}
    const sanitize = (val: any): string => {
      if (typeof val !== "string") return "";
      const trimmed = val.trim();
      if (/^\{.*\}$/.test(trimmed)) return "";
      return trimmed.substring(0, 500); // Cap individual field length
    };
    
    const preferences: Record<string, any> = {};
    for (const [key, val] of Object.entries(rawPreferences || {})) {
      if (key === "allResponses" && typeof val === "object" && val !== null) {
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(val as Record<string, any>)) {
          const s = sanitize(v);
          if (s) cleaned[k] = s;
        }
        preferences[key] = cleaned;
      } else {
        const s = sanitize(val);
        preferences[key] = s || rawPreferences[key];
      }
    }
    
    console.log("Received preferences:", JSON.stringify(preferences, null, 2));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SCORECARD_KEY = Deno.env.get("COLLEGE_SCORECARD_API_KEY");
    console.log("COLLEGE_SCORECARD_API_KEY present:", Boolean(SCORECARD_KEY), "length:", SCORECARD_KEY?.length, "starts:", SCORECARD_KEY?.substring(0, 4));
    if (!SCORECARD_KEY || SCORECARD_KEY.trim().length < 10) {
      console.error("COLLEGE_SCORECARD_API_KEY is missing or too short");
      return new Response(JSON.stringify({ error: "Service configuration error: college data API key is not set correctly. Please contact support." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Fetch real college data from College Scorecard API
    const query = buildScorecardQuery(preferences);
    const scorecardUrl = `https://api.data.gov/ed/collegescorecard/v1/schools?${query}`;
    
    console.log("Scorecard query params:", query);
    const scorecardResp = await fetch(scorecardUrl);
    
    let realCollegeData = "";
    let resultCount = 0;
    if (scorecardResp.ok) {
      const scorecardData = await scorecardResp.json();
      const results = scorecardData.results || [];
      resultCount = results.length;
      console.log(`Got ${resultCount} colleges from Scorecard API`);
      if (results.length > 0) {
        realCollegeData = formatCollegeData(results);
      }
    } else {
      console.error("Scorecard API error:", scorecardResp.status, await scorecardResp.text());
    }

    // If too few results, retry without geographic filter
    if (resultCount < 10 && realCollegeData) {
      console.log("Few results, trying broader query without state filter...");
      const broaderQuery = query.replace(/&school\.state_fips=[^&]*/g, "");
      const broaderResp = await fetch(`https://api.data.gov/ed/collegescorecard/v1/schools?${broaderQuery}`);
      if (broaderResp.ok) {
        const broaderData = await broaderResp.json();
        const broaderResults = broaderData.results || [];
        if (broaderResults.length > resultCount) {
          console.log(`Broader query got ${broaderResults.length} results`);
          realCollegeData = formatCollegeData(broaderResults);
        }
      }
    }

    // Step 2: Use AI to personalize and rank with real data
    const systemPrompt = `You are a college admissions expert. You have been given REAL, VERIFIED data from the US Department of Education's College Scorecard database.

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

    // Build user prompt from all preferences
    const allResponses = preferences.allResponses || {};
    const extraFields = Object.entries(allResponses)
      .filter(([key]) => !["email"].includes(key))
      .map(([key, val]) => `- ${key.replace(/_/g, " ")}: ${val}`)
      .join("\n");

    // Build test score string from separate SAT/ACT fields or legacy combined field
    const satScore = preferences.satScore || "";
    const actScore = preferences.actScore || "";
    let testScoreDisplay = preferences.testScore || "None";
    if (satScore || actScore) {
      const parts = [];
      if (satScore) parts.push(`SAT: ${satScore}`);
      if (actScore) parts.push(`ACT: ${actScore}`);
      testScoreDisplay = parts.join(", ");
    }

    let userPrompt = `Student preferences (USE ALL OF THESE to select and rank colleges):
- Home location: ${preferences.cityState || "Not specified"}
- Weighted GPA: ${preferences.gpa || "Not specified"}
- Test Scores: ${testScoreDisplay}
- Campus size: ${preferences.campusSize || "No preference"}
- Campus vibe: ${preferences.campusVibe || "No preference"}
- Location type: ${preferences.locationType || "No preference"}
- Max cost/year: ${preferences.maxCost || "No preference"}
- Acceptance rate comfort: ${preferences.acceptanceRatePref || "No preference"}
- Financial aid importance: ${preferences.financialAid || "Important"}
- Campus life interests: ${preferences.campusLife || "No preference"}
- Academic importance: ${preferences.academicImportance || "No preference"}
- Distance from home: ${preferences.distanceFromHome || "No preference"}
- Area of study: ${preferences.areaOfStudy || "Undecided"}

All survey responses:
${extraFields}`;

    if (realCollegeData) {
      userPrompt += `\n\n--- REAL COLLEGE DATA FROM US DEPT OF EDUCATION ---\n${realCollegeData}\n--- END REAL DATA ---\n\nSelect the 5 best-fit colleges from this real data for this specific student. The selected colleges MUST reflect their unique preferences above.`;
    } else {
      userPrompt += `\n\nNote: Could not fetch live data. Recommend 5 colleges using your knowledge, ensuring they match this specific student's preferences.`;
    }

    console.log("Sending to AI with", userPrompt.length, "chars");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate recommendations" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let recommendations;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      recommendations = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse college recommendations");
    }

    // Strip premium fields server-side — only include them for authenticated premium users
    // Since there's no auth/premium system yet, always strip premium fields
    const premiumFields = [
      "tuitionInState", "tuitionOutOfState", "avgFinancialAid",
      "studentFacultyRatio", "studentBody", "campusSize",
      "avgStartingSalary", "graduationRate"
    ];

    if (recommendations?.colleges && Array.isArray(recommendations.colleges)) {
      recommendations.colleges = recommendations.colleges.map((college: any) => {
        const sanitized = { ...college };
        for (const field of premiumFields) {
          sanitized[field] = "Premium";
        }
        return sanitized;
      });
    }

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
