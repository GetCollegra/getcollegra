import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_EXPLANATION_SYSTEM = `You are a college admissions expert writing personalized advice for a student. You will be given the student's preferences and their matched colleges with their data.

Your job is to write compelling, personalized explanations for EACH of the colleges plus an overall student profile and comparison.

TONE: Address the student directly as "you" / "your". If their first name is provided, use it naturally. NEVER use "he/she/they/the student".

Quote the student's own words from their preferences when relevant (e.g., "You said you want a 'spirited' campus…").

Use EXACT data values — do not fabricate statistics.

Return a JSON object with this exact structure:
{
  "studentProfile": {
    "summary": "2-3 sentences about the student's preferences and what drives their ideal school choice. Lead with campus culture.",
    "topPriorities": ["Priority 1", "Priority 2", "Priority 3"],
    "idealSchoolType": "Brief description of their ideal school environment"
  },
  "colleges": [
    {
      "name": "Exact college name as given",
      "whyFit": "2-3 sentences — lead with campus culture match, then academics. Quote student's words.",
      "realismNote": "1-2 sentences about admissions realism. For Reach schools with strong preference fit, say 'Great fit for your preferences, but a reach academically — [specific reason].' For Safety schools, highlight why admission is likely. For Match schools, note the competitive alignment. Always reference the student's GPA/scores vs the school's profile.",
      "prosForStudent": ["Pro 1: culture/vibe match", "Pro 2: academic fit", "Pro 3: practical benefit"],
      "consForStudent": ["Con 1", "Con 2"],
      "challengesForStudent": ["Challenge specific to this student's profile"],
      "howToGetIn": "5-7 detailed, actionable sentences: (1) GPA/test score comparison, (2) extracurriculars to strengthen app, (3) essay topic suggestions, (4) ED/EA strategy, (5) demonstrated interest steps.",
      "campusVibe": "3-4 vivid sentences about the social scene, sports culture, Greek life, weekend activities, nearby amenities.",
      "notableFeature": "One unique thing about this school for THIS student",
      "studentFacultyRatio": "e.g. '12:1' — the student-to-faculty ratio if you know it, or null if unsure",
      "campusSize": "e.g. 'Medium (8,500 students)' — refine the campus size description with student count if known",
      "avgFinancialAid": "e.g. '~$35,000' — estimated average financial aid package if you know it, or null if unsure"
    }
  ],
  "comparisonInsight": "5-8 sentences comparing all the student's matched schools. Lead with campus culture differences. Reference their specific preferences."
}

IMPORTANT: Only return the JSON object, no markdown formatting or code blocks.`;

// Failover model chain
const AI_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "openai/gpt-5-mini",
  "google/gemini-2.5-flash-lite",
];

serve(async (req) => {
  console.log("[enhance] ===== FUNCTION START =====", new Date().toISOString());
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    const body = await req.json().catch(() => null);
    const matchId = body?.matchId;
    const preferences = body?.preferences;
    const colleges = body?.colleges;
    console.log("[enhance] Received:", JSON.stringify({ matchId, hasPrefs: !!preferences, collegeCount: colleges?.length }));

    if (!matchId || !preferences || !colleges || !Array.isArray(colleges)) {
      return new Response(JSON.stringify({ error: "matchId, preferences, and colleges are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured", enhanced: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceKey);

    // Check if already enhanced (version 2+)
    const { data: existing } = await sb
      .from("college_matches")
      .select("results_version")
      .eq("id", matchId)
      .maybeSingle();

    if (existing && (existing as any).results_version >= 2) {
      return new Response(JSON.stringify({ enhanced: true, alreadyDone: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build AI prompt
    const top = colleges.slice(0, 5);
    const prefs = preferences;

    const sat = prefs.satScore || prefs.sat_score || "";
    const act = prefs.actScore || prefs.act_score || "";
    let testDisplay = prefs.testScore || prefs.test_score || "None";
    if (sat || act) {
      const parts = [];
      if (sat) parts.push(`SAT: ${sat}`);
      if (act) parts.push(`ACT: ${act}`);
      testDisplay = parts.join(", ");
    }

    const allResponses = prefs.allResponses || prefs.all_responses || {};
    const extraFields = Object.entries(allResponses)
      .filter(([key]) => key !== "email")
      .map(([key, val]) => `- ${key.replace(/_/g, " ")}: ${val}`)
      .join("\n");

    const aiPrompt = `Student preferences:
- First name: ${prefs.firstName || prefs.first_name || "Not provided"}
- Home location: ${prefs.cityState || prefs.city_state || "Not specified"}
- Weighted GPA: ${prefs.gpa || "Not specified"}
- Test Scores: ${testDisplay}
- Campus size: ${prefs.campusSize || prefs.campus_size || "No preference"}
- Campus vibe: ${prefs.campusVibe || prefs.campus_vibe || "No preference"}
- Location type: ${prefs.locationType || prefs.location_type || "No preference"}
- Max cost/year: ${prefs.maxCost || prefs.max_cost || "No preference"}
- Acceptance rate comfort: ${prefs.acceptanceRatePref || prefs.acceptance_rate_pref || "No preference"}
- Financial aid importance: ${prefs.financialAid || prefs.financial_aid || "Important"}
- Campus life interests: ${prefs.campusLife || prefs.campus_life || "No preference"}
- Academic importance: ${prefs.academicImportance || prefs.academic_importance || "No preference"}
- Distance from home: ${prefs.distanceFromHome || prefs.distance_from_home || "No preference"}
- Area of study: ${prefs.areaOfStudy || prefs.area_of_study || "Undecided"}

All survey responses:
${extraFields}

These ${top.length} colleges were selected by our matching engine (provide explanations for EACH):
${top.map((c: any, i: number) => `
${i + 1}. ${c.name} (${c.location})
   - Fit Category: ${c.fitCategory} | Fit Score: ${c.fitScore}/100
   - Acceptance Rate: ${c.acceptanceRate}
   - Net Price: ${c.netPrice}
   - Graduation Rate: ${c.graduationRate}
   - Top Programs: ${(c.topPrograms || []).join(", ")}
   - Setting: ${c.setting}
   - Student Body: ${c.studentBody}
   - Student:Faculty Ratio: ${c.studentFacultyRatio}
   - Avg Starting Salary: ${c.avgStartingSalary}
`).join("")}

Write personalized, vivid explanations for each school. The "name" field in each college MUST match exactly.`;

    // Try models with failover
    let aiResult: any = null;
    for (const model of AI_MODELS) {
      try {
        console.log(`[enhance] Trying model: ${model}`);
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: AI_EXPLANATION_SYSTEM },
              { role: "user", content: aiPrompt },
            ],
            temperature: 0.4,
          }),
        });

        if (!aiResp.ok) {
          const status = aiResp.status;
          await aiResp.text(); // consume body
          if (status === 429 || status === 402 || status >= 500) {
            console.warn(`[enhance] ${model} returned ${status}, trying next`);
            continue;
          }
          console.error(`[enhance] ${model} client error ${status}`);
          break;
        }

        const aiData = await aiResp.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (!content) { console.warn(`[enhance] ${model} empty content`); continue; }

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        console.log(`[enhance] ${model} success for ${aiResult.colleges?.length} colleges`);
        break;
      } catch (err) {
        console.error(`[enhance] ${model} failed:`, err);
        continue;
      }
    }

    if (!aiResult) {
      return new Response(JSON.stringify({ enhanced: false, error: "All AI models failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure a value is an array of strings
    const ensureArray = (val: any): string[] => {
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === "string" && val.trim()) return [val];
      return [];
    };

    // Merge AI explanations into colleges
    const enhancedColleges = [...colleges];
    const NA_VALUES = new Set(["N/A", "See school website", "—", "", "Not reported", "Premium"]);
    const shouldReplace = (existing: any, aiVal: any) =>
      aiVal && aiVal !== "null" && (NA_VALUES.has(existing) || !existing);

    if (aiResult.colleges && Array.isArray(aiResult.colleges)) {
      for (const aiCollege of aiResult.colleges) {
        const idx = enhancedColleges.findIndex(
          (c: any) => c.name.toLowerCase() === (aiCollege.name || "").toLowerCase()
        );
        if (idx !== -1 && idx < 3) {
          const existing = enhancedColleges[idx];
          const aiPros = ensureArray(aiCollege.prosForStudent);
          const aiCons = ensureArray(aiCollege.consForStudent);
          const aiChallenges = ensureArray(aiCollege.challengesForStudent);
          enhancedColleges[idx] = {
            ...existing,
            whyFit: aiCollege.whyFit || existing.whyFit,
            realismNote: aiCollege.realismNote || existing.realismNote,
            prosForStudent: aiPros.length > 0 ? aiPros : ensureArray(existing.prosForStudent),
            consForStudent: aiCons.length > 0 ? aiCons : ensureArray(existing.consForStudent),
            challengesForStudent: aiChallenges.length > 0 ? aiChallenges : ensureArray(existing.challengesForStudent),
            howToGetIn: aiCollege.howToGetIn || existing.howToGetIn,
            campusVibe: aiCollege.campusVibe || existing.campusVibe,
            notableFeature: aiCollege.notableFeature || existing.notableFeature,
            studentFacultyRatio: shouldReplace(existing.studentFacultyRatio, aiCollege.studentFacultyRatio)
              ? aiCollege.studentFacultyRatio : existing.studentFacultyRatio,
            campusSize: shouldReplace(existing.campusSize, aiCollege.campusSize)
              ? aiCollege.campusSize : existing.campusSize,
            avgFinancialAid: shouldReplace(existing.avgFinancialAid, aiCollege.avgFinancialAid)
              ? aiCollege.avgFinancialAid : existing.avgFinancialAid,
          };
        }
      }
    }

    const studentProfile = aiResult.studentProfile || {};
    const comparisonInsight = aiResult.comparisonInsight || "";

    // Save enhanced results to DB
    console.log(`[enhance] Saving enhanced results for match ${matchId}, ${enhancedColleges.length} colleges`);
    const { error: saveErr } = await sb.from("college_matches").update({
      college_data: enhancedColleges,
      student_profile: studentProfile,
      comparison_insight: comparisonInsight,
      results_version: 2,
    }).eq("id", matchId);

    if (saveErr) {
      console.error(`[enhance] DB save failed:`, saveErr.message);
    } else {
      console.log(`[enhance] Saved enhanced results for match ${matchId} SUCCESS`);
    }

    console.log("[enhance] ===== RETURNING ENHANCED RESPONSE =====");
    return new Response(JSON.stringify({
      enhanced: true,
      colleges: enhancedColleges,
      studentProfile,
      comparisonInsight,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[enhance] ===== CAUGHT ERROR =====", e instanceof Error ? e.message : e, e instanceof Error ? e.stack : "");
    return new Response(JSON.stringify({ enhanced: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
