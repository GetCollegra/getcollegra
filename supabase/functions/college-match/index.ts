import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map user preferences to College Scorecard API parameters
function buildScorecardQuery(preferences: any): string {
  const params = new URLSearchParams();
  const apiKey = Deno.env.get("COLLEGE_SCORECARD_API_KEY");
  params.set("api_key", apiKey || "");

  // Fields to retrieve
  params.set("fields", [
    "id",
    "school.name",
    "school.city",
    "school.state",
    "school.school_url",
    "school.ownership", // 1=public, 2=private nonprofit, 3=private for-profit
    "school.locale",
    "latest.student.size",
    "latest.admissions.admission_rate.overall",
    "latest.cost.tuition.in_state",
    "latest.cost.tuition.out_of_state",
    "latest.cost.avg_net_price.overall",
    "latest.aid.median_debt.completers.overall",
    "latest.aid.pell_grant_rate",
    "latest.completion.rate_suppressed.overall",
    "latest.earnings.10_yrs_after_entry.median",
    "latest.student.demographics.race_ethnicity.white",
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

  // Filter: only degree-granting, primarily bachelor's
  params.set("school.degrees_awarded.predominant", "3"); // Bachelor's
  params.set("latest.admissions.admission_rate.overall__range", "0..1");

  // Campus size preference
  const size = (preferences.campusSize || "").toLowerCase();
  if (size.includes("small")) {
    params.set("latest.student.size__range", "..5000");
  } else if (size.includes("medium")) {
    params.set("latest.student.size__range", "5000..15000");
  } else if (size.includes("large")) {
    params.set("latest.student.size__range", "15000..");
  }

  // Location/region preference
  const region = (preferences.region || preferences.location || "").toLowerCase();
  if (region.includes("northeast") || region.includes("new england")) {
    params.set("school.region_id", "1");
  } else if (region.includes("southeast") || region.includes("south")) {
    params.set("school.region_id", "5");
  } else if (region.includes("midwest")) {
    params.set("school.region_id", "3");
  } else if (region.includes("west") || region.includes("california")) {
    params.set("school.region_id", "8");
  } else if (region.includes("southwest")) {
    params.set("school.region_id", "6");
  }

  // Sort by completion rate descending, get top 20 to let AI pick best 5
  params.set("sort", "latest.completion.rate_suppressed.overall:desc");
  params.set("per_page", "20");

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

    return `${i + 1}. ${name} (${city}, ${state})
   - Type: ${ownership}
   - Admission Rate: ${admRate !== null ? (admRate * 100).toFixed(1) + "%" : "N/A"}
   - Tuition (In-State): ${tuitionIn ? "$" + tuitionIn.toLocaleString() : "N/A"}
   - Tuition (Out-of-State): ${tuitionOut ? "$" + tuitionOut.toLocaleString() : "N/A"}
   - Avg Net Price: ${netPrice ? "$" + netPrice.toLocaleString() : "N/A"}
   - Graduation Rate: ${gradRate !== null ? (gradRate * 100).toFixed(1) + "%" : "N/A"}
   - Median Earnings (10yr): ${earnings ? "$" + earnings.toLocaleString() : "N/A"}
   - Student Body: ${size ? size.toLocaleString() + " students" : "N/A"}`;
  }).join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SCORECARD_KEY = Deno.env.get("COLLEGE_SCORECARD_API_KEY");
    if (!SCORECARD_KEY) throw new Error("COLLEGE_SCORECARD_API_KEY is not configured");

    // Step 1: Fetch real college data from College Scorecard API
    const query = buildScorecardQuery(preferences);
    const scorecardUrl = `https://api.data.gov/ed/collegescorecard/v1/schools?${query}`;
    
    console.log("Fetching from College Scorecard API...");
    const scorecardResp = await fetch(scorecardUrl);
    
    let realCollegeData = "";
    if (scorecardResp.ok) {
      const scorecardData = await scorecardResp.json();
      const results = scorecardData.results || [];
      console.log(`Got ${results.length} colleges from Scorecard API`);
      if (results.length > 0) {
        realCollegeData = formatCollegeData(results);
      }
    } else {
      console.error("Scorecard API error:", scorecardResp.status, await scorecardResp.text());
    }

    // Step 2: Use AI to personalize and rank with real data
    const systemPrompt = `You are a college admissions expert. You have been given REAL, VERIFIED data from the US Department of Education's College Scorecard database.

Your job is to select the 5 best-fit colleges for this student from the real data provided, and personalize the recommendations.

IMPORTANT: Use the EXACT data values provided (tuition, acceptance rate, graduation rate, etc.) — do NOT make up or modify any statistics. You may add context like campus vibe, notable features, and fit reasoning based on your knowledge.

Return a JSON object with this exact structure:
{
  "studentProfile": {
    "summary": "2-3 sentence personalized overview of this student's priorities",
    "topPriorities": ["Priority 1", "Priority 2", "Priority 3"],
    "idealSchoolType": "Brief description of ideal school archetype"
  },
  "colleges": [
    {
      "name": "Full College Name (exactly as provided)",
      "location": "City, State",
      "acceptanceRate": "XX%",
      "ranking": "Ranking or category description",
      "tuitionInState": "$XX,XXX",
      "tuitionOutOfState": "$XX,XXX",
      "avgFinancialAid": "Estimated based on net price data",
      "netPrice": "$XX,XXX",
      "topPrograms": ["Program 1", "Program 2", "Program 3"],
      "campusSize": "XX,XXX acres or description",
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
  "comparisonInsight": "2-3 sentence AI insight comparing the top recommendations"
}

Provide exactly 5 colleges sorted by fitScore descending. Include a mix of fitCategories (at least one Safety, one Reach). Use the real data values from the Scorecard data — do NOT fabricate statistics.

IMPORTANT: Only return the JSON object, no markdown formatting or code blocks.`;

    // Build user prompt from all available Tally answers
    const allResponses = preferences.allResponses || {};
    const extraFields = Object.entries(allResponses)
      .filter(([key]) => !["email"].includes(key)) // exclude email from AI prompt
      .map(([key, val]) => `- ${key.replace(/_/g, " ")}: ${val}`)
      .join("\n");

    let userPrompt = `Student preferences:
- Home location (city/state): ${preferences.cityState || "Not specified"}
- Weighted GPA: ${preferences.gpa || "Not specified"}
- SAT/ACT Score: ${preferences.testScore || "None"}
- Intended major/field of interest: ${preferences.major || "Undecided"}
- Preferred campus size: ${preferences.campusSize || "No preference"}
- Preferred location/setting: ${preferences.location || "No preference"}
- Budget considerations: ${preferences.budget || "No preference"}
- Academic interests: ${preferences.academicInterests || "General"}
- Extracurricular interests: ${preferences.extracurriculars || "Various"}
- Preferred climate/region: ${preferences.region || "No preference"}
- Importance of financial aid: ${preferences.financialAid || "Important"}
- Additional notes: ${preferences.additionalNotes || "None"}

All survey responses:
${extraFields}`;

    if (realCollegeData) {
      userPrompt += `\n\n--- REAL COLLEGE DATA FROM US DEPT OF EDUCATION ---\n${realCollegeData}\n--- END REAL DATA ---\n\nSelect the 5 best-fit colleges from this real data for the student above. Use the exact statistics provided.`;
    } else {
      userPrompt += `\n\nNote: Could not fetch live data. Please recommend 5 colleges using your best knowledge with accurate data.`;
    }

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
