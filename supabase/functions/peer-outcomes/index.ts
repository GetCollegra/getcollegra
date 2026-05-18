// Generates "Students Like You Got Into..." peer outcome groups using Lovable AI
// Output is grounded in the user's own profile (GPA, state, major, interests)
// Clearly labeled as "estimated peer trends" — not real student records.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProfileInput {
  gpa?: string;
  state?: string;
  major?: string;
  testScore?: string;
  campusSize?: string;
  locationType?: string;
  academicImportance?: string;
  idealSchoolType?: string;
  topPriorities?: string[];
  interests?: string[];
}

Deno.serve(async (req) => {
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const profile: ProfileInput = body?.profile || {};

    const cleanArr = (a: unknown): string[] =>
      Array.isArray(a) ? a.filter((x) => typeof x === "string" && x.trim()).map((x) => String(x).slice(0, 80)).slice(0, 8) : [];

    const safeProfile = {
      gpa: String(profile.gpa || "").slice(0, 20) || "unknown",
      state: String(profile.state || "").slice(0, 80) || "unknown",
      major: String(profile.major || "").slice(0, 80) || "Undecided",
      testScore: String(profile.testScore || "").slice(0, 40) || "not submitted",
      campusSize: String(profile.campusSize || "").slice(0, 40) || "no preference",
      locationType: String(profile.locationType || "").slice(0, 40) || "no preference",
      academicImportance: String(profile.academicImportance || "").slice(0, 40) || "no preference",
      idealSchoolType: String(profile.idealSchoolType || "").slice(0, 200) || "",
      topPriorities: cleanArr(profile.topPriorities),
      interests: cleanArr(profile.interests),
    };

    const interestsLine = safeProfile.interests.length
      ? `- Academic / personal interests: ${safeProfile.interests.join(", ")}`
      : "";
    const prioritiesLine = safeProfile.topPriorities.length
      ? `- Top priorities (from quiz): ${safeProfile.topPriorities.join(", ")}`
      : "";
    const idealLine = safeProfile.idealSchoolType ? `- Ideal school type: ${safeProfile.idealSchoolType}` : "";

    const prompt = `Generate 3 short "students like you got into..." trend groups grounded in this US high schooler's actual quiz responses.

PROFILE (from their quiz):
- GPA: ${safeProfile.gpa}
- Home state: ${safeProfile.state}
- Intended major / area of study: ${safeProfile.major}
- Test score: ${safeProfile.testScore}
- Campus size preference: ${safeProfile.campusSize}
- Location preference: ${safeProfile.locationType}
- Academic intensity preference: ${safeProfile.academicImportance}
${idealLine}
${prioritiesLine}
${interestsLine}

REQUIREMENTS — make groups DIRECTLY reflect the user's quiz inputs:
1. ONLY use real colleges and universities located in the United States. Never include schools outside the US.
2. At least one group MUST be specific to the intended major "${safeProfile.major}" (e.g. "Students with a ${safeProfile.gpa} GPA pursuing ${safeProfile.major}"). Pick US colleges with strong programs in that major.
3. At least one group should reflect their top priorities or ideal school type (e.g. campus size, location, academic intensity).
4. The third group can vary the angle (geography, GPA band, or test score profile).

For each group return:
- "headline": short anonymous descriptor that names a concrete dimension from the profile (GPA, major, state, priorities). Avoid generic phrasing.
- "colleges": 4 realistic US colleges this profile would plausibly get into — mix of safety/match/reach. Use real US college names only. Colleges in major-focused groups must actually be known for that major.
- "note": one short, specific confidence-building line that references the user's profile (e.g. "Strong match for ${safeProfile.major} programs in the ${safeProfile.state} region.").

These represent estimated community trends, not real student records. No gendered pronouns.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a college admissions data analyst. Be realistic and student-friendly. No gendered pronouns." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_peer_outcomes",
            description: "Return 3 peer outcome groups",
            parameters: {
              type: "object",
              properties: {
                groups: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      headline: { type: "string" },
                      colleges: { type: "array", items: { type: "string" } },
                      note: { type: "string" },
                    },
                    required: ["headline", "colleges", "note"],
                  },
                },
              },
              required: ["groups"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_peer_outcomes" } },
        temperature: 0.5,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    const parsed = typeof args === "string" ? JSON.parse(args) : args || {};

    return new Response(JSON.stringify({ groups: parsed.groups || [], label: "Estimated peer trends" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("peer-outcomes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
