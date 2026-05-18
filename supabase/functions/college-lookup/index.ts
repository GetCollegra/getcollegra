import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCORECARD_FIELDS = [
  "school.name",
  "school.city",
  "school.state",
  "school.locale",
  "latest.student.size",
  "latest.admissions.admission_rate.overall",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.cost.avg_net_price.overall",
  "latest.completion.rate_suppressed.overall",
  "latest.earnings.10_yrs_after_entry.median",
  "latest.student.students_with_pell_grant",
  "latest.aid.median_debt.completers.overall",
];

const localeMap: Record<number, string> = {
  11: "Urban", 12: "Urban", 13: "Urban",
  21: "Suburban", 22: "Suburban", 23: "Suburban",
  31: "Town", 32: "Town", 33: "Town",
  41: "Rural", 42: "Rural", 43: "Rural",
};

function fmt$(n: number | null): string | null {
  if (n == null) return null;
  return `$${Math.round(n).toLocaleString("en-US")}/yr`;
}

function fmtPct(n: number | null): string | null {
  if (n == null) return null;
  return `${Math.round(n * 100)}%`;
}

function fmtStudents(n: number | null): string | null {
  if (n == null) return null;
  return `${n.toLocaleString("en-US")} students`;
}

/** Query the College Scorecard API by school name */
async function fetchScorecardData(collegeName: string): Promise<Record<string, any> | null> {
  const apiKey = Deno.env.get("COLLEGE_SCORECARD_API_KEY");
  if (!apiKey || apiKey.trim().length < 10) {
    console.warn("COLLEGE_SCORECARD_API_KEY missing — skipping validation");
    return null;
  }

  const p = new URLSearchParams();
  p.set("api_key", apiKey);
  p.set("fields", SCORECARD_FIELDS.join(","));
  p.set("school.name", collegeName);
  p.set("per_page", "5");

  const url = `https://api.data.gov/ed/collegescorecard/v1/schools?${p.toString()}`;
  console.log("Scorecard lookup URL:", url.replace(apiKey, "***"));

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Scorecard API error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const results = data?.results || [];

    if (results.length === 0) {
      console.log("No Scorecard results for:", collegeName);
      return null;
    }

    // Find the best match by name similarity
    const nameLower = collegeName.toLowerCase();
    const best = results.find((r: any) =>
      r["school.name"]?.toLowerCase() === nameLower
    ) || results.find((r: any) =>
      r["school.name"]?.toLowerCase().includes(nameLower) ||
      nameLower.includes(r["school.name"]?.toLowerCase() || "")
    ) || results[0];

    console.log("Scorecard matched:", best["school.name"]);
    return best;
  } catch (e) {
    console.error("Scorecard fetch error:", e);
    return null;
  }
}

/** Overwrite AI-generated fields with verified Scorecard data where available */
function applyVerifiedData(
  aiData: Record<string, any>,
  scorecard: Record<string, any>
): { verified: Record<string, any>; verifiedFields: string[] } {
  const verified = { ...aiData };
  const verifiedFields: string[] = [];

  const admRate = scorecard["latest.admissions.admission_rate.overall"];
  if (admRate != null) {
    verified.acceptanceRate = fmtPct(admRate)!;
    verifiedFields.push("acceptanceRate");
  }

  const tuitionIn = scorecard["latest.cost.tuition.in_state"];
  if (tuitionIn != null) {
    verified.tuitionInState = fmt$(tuitionIn)!;
    verifiedFields.push("tuitionInState");
  }

  const tuitionOut = scorecard["latest.cost.tuition.out_of_state"];
  if (tuitionOut != null) {
    verified.tuitionOutOfState = fmt$(tuitionOut)!;
    verifiedFields.push("tuitionOutOfState");
  }

  const netPrice = scorecard["latest.cost.avg_net_price.overall"];
  if (netPrice != null) {
    verified.netPrice = fmt$(netPrice)!;
    verifiedFields.push("netPrice");
  }

  const gradRate = scorecard["latest.completion.rate_suppressed.overall"];
  if (gradRate != null) {
    verified.graduationRate = fmtPct(gradRate)!;
    verifiedFields.push("graduationRate");
  }

  const earnings = scorecard["latest.earnings.10_yrs_after_entry.median"];
  if (earnings != null) {
    verified.avgStartingSalary = fmt$(earnings)!;
    verifiedFields.push("avgStartingSalary");
  }

  const studentSize = scorecard["latest.student.size"];
  if (studentSize != null) {
    verified.studentBody = fmtStudents(studentSize)!;
    verifiedFields.push("studentBody");
  }

  const locale = scorecard["school.locale"];
  if (locale != null && localeMap[locale]) {
    verified.setting = localeMap[locale];
    verifiedFields.push("setting");
  }

  const city = scorecard["school.city"];
  const state = scorecard["school.state"];
  if (city && state) {
    verified.location = `${city}, ${state}`;
    verifiedFields.push("location");
  }

  const officialName = scorecard["school.name"];
  if (officialName) {
    verified.name = officialName;
    verifiedFields.push("name");
  }

  return { verified, verifiedFields };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });


  // Require authenticated user
  const _authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!_authHeader || !_authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  {
    const _token = _authHeader.slice(7).trim();
    const _resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${_token}`, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
    });
    if (!_resp.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  try {
    const { collegeName } = await req.json();
    if (!collegeName || typeof collegeName !== "string" || collegeName.trim().length < 2 || collegeName.trim().length > 200) {
      return new Response(JSON.stringify({ error: "Invalid college name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const name = collegeName.trim();

    // Fetch AI data and Scorecard data in parallel
    const [aiResponse, scorecardData] = await Promise.all([
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a college data expert. Given a college/university name, return accurate data about it. If the school doesn't exist or you're unsure, still return your best estimate and set fitScore to 0. Always respond with the tool call.`,
            },
            {
              role: "user",
              content: `Provide comprehensive data for: "${name}"`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_college_data",
                description: "Return structured college information.",
                parameters: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Official college name" },
                    location: { type: "string", description: "City, State" },
                    acceptanceRate: { type: "string", description: "e.g. 5% or 65%" },
                    ranking: { type: "string", description: "e.g. #3 National Universities" },
                    tuitionInState: { type: "string", description: "e.g. $15,000/yr" },
                    tuitionOutOfState: { type: "string", description: "e.g. $55,000/yr" },
                    avgFinancialAid: { type: "string", description: "e.g. $40,000/yr" },
                    netPrice: { type: "string", description: "Average net price e.g. $18,000/yr" },
                    topPrograms: { type: "array", items: { type: "string" }, description: "Top 3-5 academic programs" },
                    campusSize: { type: "string", description: "e.g. 8,180 acres" },
                    studentBody: { type: "string", description: "e.g. 17,500 students" },
                    studentFacultyRatio: { type: "string", description: "e.g. 5:1" },
                    setting: { type: "string", description: "e.g. Suburban, Urban, Rural" },
                    graduationRate: { type: "string", description: "e.g. 96%" },
                    avgStartingSalary: { type: "string", description: "e.g. $80,000" },
                    fitScore: { type: "number", description: "0 if unknown school, otherwise 70-85 as a general score" },
                    fitCategory: { type: "string", enum: ["Safety", "Match", "Reach"] },
                    whyFit: { type: "string", description: "One sentence about what makes this school notable" },
                    prosForStudent: { type: "array", items: { type: "string" }, description: "2-3 pros" },
                    consForStudent: { type: "array", items: { type: "string" }, description: "2-3 cons" },
                    challengesForStudent: { type: "array", items: { type: "string" }, description: "1-2 challenges" },
                    howToGetIn: { type: "string", description: "Brief admissions tip" },
                    campusVibe: { type: "string", description: "e.g. Academic, Social, Athletic" },
                    notableFeature: { type: "string", description: "One standout feature" },
                  },
                  required: [
                    "name", "location", "acceptanceRate", "ranking", "tuitionInState",
                    "tuitionOutOfState", "avgFinancialAid", "netPrice", "topPrograms",
                    "campusSize", "studentBody", "studentFacultyRatio", "setting",
                    "graduationRate", "avgStartingSalary", "fitScore", "fitCategory",
                    "whyFit", "prosForStudent", "consForStudent", "challengesForStudent",
                    "howToGetIn", "campusVibe", "notableFeature",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_college_data" } },
        }),
      }),
      fetchScorecardData(name),
    ]);

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      throw new Error("AI gateway error");
    }

    const result = await aiResponse.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }

    let collegeData = JSON.parse(toolCall.function.arguments);

    // Cross-reference: overwrite AI estimates with verified federal data
    let verifiedFields: string[] = [];
    if (scorecardData) {
      const merged = applyVerifiedData(collegeData, scorecardData);
      collegeData = merged.verified;
      verifiedFields = merged.verifiedFields;
      console.log(`Verified ${verifiedFields.length} fields from Scorecard:`, verifiedFields.join(", "));
    } else {
      console.log("No Scorecard data available — using AI estimates only");
    }

    return new Response(JSON.stringify({
      college: collegeData,
      dataSource: {
        verified: verifiedFields,
        aiOnly: scorecardData ? [] : ["all"],
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("college-lookup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
