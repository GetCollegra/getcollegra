import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a college admissions expert with encyclopedic knowledge of US colleges and universities. Given a student's preferences, provide deeply personalized recommendations with REAL, ACCURATE data.

Return a JSON object with this exact structure:
{
  "studentProfile": {
    "summary": "2-3 sentence personalized overview of this student's priorities",
    "topPriorities": ["Priority 1", "Priority 2", "Priority 3"],
    "idealSchoolType": "Brief description of ideal school archetype"
  },
  "colleges": [
    {
      "name": "Full College Name",
      "location": "City, State",
      "acceptanceRate": "XX%",
      "ranking": "#XX National Universities - US News",
      "tuitionInState": "$XX,XXX",
      "tuitionOutOfState": "$XX,XXX",
      "avgFinancialAid": "$XX,XXX",
      "netPrice": "$XX,XXX",
      "topPrograms": ["Program 1", "Program 2", "Program 3"],
      "campusSize": "XXX acres",
      "studentBody": "XX,XXX students",
      "studentFacultyRatio": "XX:1",
      "setting": "Urban/Suburban/Rural",
      "graduationRate": "XX%",
      "avgStartingSalary": "$XX,XXX",
      "fitScore": 95,
      "fitCategory": "Safety/Match/Reach",
      "whyFit": "2-3 sentences specific to this student",
      "prosForStudent": ["Pro 1 specific to student", "Pro 2", "Pro 3"],
      "consForStudent": ["Con 1 specific to student", "Con 2"],
      "campusVibe": "Brief 1 sentence campus culture description",
      "notableFeature": "One unique thing about this school"
    }
  ],
  "comparisonInsight": "2-3 sentence AI insight comparing the top recommendations and helping the student think about their decision"
}

Provide exactly 5 college recommendations sorted by fitScore descending. Include a mix of fitCategories (at least one Safety, one Reach). Use real, accurate, up-to-date data. All monetary values should be realistic.

IMPORTANT: Only return the JSON object, no markdown formatting or code blocks.`;

    const userPrompt = `Student preferences:
- Intended major/field of interest: ${preferences.major || "Undecided"}
- Preferred campus size: ${preferences.campusSize || "No preference"}
- Preferred location/setting: ${preferences.location || "No preference"}
- Budget considerations: ${preferences.budget || "No preference"}
- Academic interests: ${preferences.academicInterests || "General"}
- Extracurricular interests: ${preferences.extracurriculars || "Various"}
- Preferred climate/region: ${preferences.region || "No preference"}
- Importance of financial aid: ${preferences.financialAid || "Important"}
- Additional notes: ${preferences.additionalNotes || "None"}

Please recommend 5 colleges that best match this student's profile with real data.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("college-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
