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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const profile: ProfileInput = body?.profile || {};

    const safeProfile = {
      gpa: String(profile.gpa || "").slice(0, 20) || "unknown",
      state: String(profile.state || "").slice(0, 80) || "unknown",
      major: String(profile.major || "").slice(0, 80) || "Undecided",
      testScore: String(profile.testScore || "").slice(0, 40) || "not submitted",
      campusSize: String(profile.campusSize || "").slice(0, 40) || "no preference",
      locationType: String(profile.locationType || "").slice(0, 40) || "no preference",
    };

    const prompt = `Generate 3 short "students like you got into..." trend groups based on this US high schooler's profile.

PROFILE:
- GPA: ${safeProfile.gpa}
- Home state: ${safeProfile.state}
- Intended major: ${safeProfile.major}
- Test score: ${safeProfile.testScore}
- Campus size preference: ${safeProfile.campusSize}
- Location preference: ${safeProfile.locationType}

For each group:
- "headline": short anonymous descriptor (e.g. "Students with a 3.6 GPA interested in Business")
- "colleges": 4 realistic US colleges this profile would plausibly get into (mix of safety/match/reach). Use real college names.
- "note": one short confidence-building line.

Make groups feel different — vary the angle (GPA, geography, major, profile type). These represent estimated community trends, not real student records.`;

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
