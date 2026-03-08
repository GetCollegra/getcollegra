import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }

    const collegeData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ college: collegeData }), {
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
