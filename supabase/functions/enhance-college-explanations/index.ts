import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_EXPLANATION_SYSTEM = `You are an advanced college matching assistant and admissions expert. You generate highly personalized, accurate college recommendations with vivid explanations.

STEP 1 — CLASSIFY USER TYPE
Based on the student's quiz responses, categorize them into one (or a blend) of these personality types:
- Career-Focused Achiever: goal-oriented, competitive, prestige-driven
- Balanced Explorer: wants academics + social life balance
- Social Campus Seeker: cares about community, fun, school spirit
- Independent Urban Learner: prefers cities, internships, independence
- Budget-Conscious Planner: focused on affordability and value
- Support-Oriented Student: needs strong academic support/resources

STEP 2 — PRIORITIZE FACTORS
Dynamically weight these factors based on the student's answers:
- Major fit, Cost, Location, Campus size, Social environment, Selectivity, Support systems

STEP 3 — For each matched college, evaluate how well it aligns with the weighted priorities and personality type. Assign a fit category (Reach/Match/Likely).

STEP 4 — EXPLAIN THE MATCH
For each college, write 2-3 sentence personalized explanations covering:
- Why it fits their personality type
- How it aligns with their goals
- Key strengths (academics, location, cost, culture)
Use the tone: "This school is a great fit for you because..."

STEP 5 — PERSONALIZED SUMMARY
Write a summary of who the student is, what they value most, and what environment suits them.
Example: "You are a balanced explorer who values strong academics while still wanting an active social environment..."

RULES:
- Address the student directly as "you/your". Use their first name if provided. NEVER use "he/she/they/the student".
- Quote the student's own words from their preferences when relevant.
- Be specific, not generic. Avoid repeating the same explanation across colleges.
- Make recommendations feel tailored and human.
- Prioritize realism — don't oversell impossible schools.
- Use EXACT data values — do not fabricate statistics.
- Reference athletics (divisions, teams, traditions) and admissions strategies (academic benchmarking, extracurriculars, essays, timing, demonstrated interest).

Return a JSON object with this exact structure:
{
  "userType": "e.g. Balanced Explorer / Career-Focused Achiever blend",
  "studentProfile": {
    "summary": "3-4 sentences about who the student is, what they value, and what environment suits them. Lead with their personality type.",
    "topPriorities": ["Priority 1", "Priority 2", "Priority 3"],
    "idealSchoolType": "Brief description of their ideal school environment"
  },
  "colleges": [
    {
      "name": "Exact college name as given",
      "whyFit": "2-3 sentences — lead with personality-type match, then campus culture, then academics. Quote student's words. Explain WHY this school fits THEM specifically.",
      "realismNote": "1-2 sentences about admissions realism. For Reach: 'Great fit for your preferences, but a reach academically — [specific reason].' For Likely: highlight why admission is strong. For Match: note competitive alignment. Always reference GPA/scores vs school's profile.",
      "prosForStudent": ["Pro 1: personality/culture match", "Pro 2: academic/major fit", "Pro 3: practical benefit (cost, location, outcomes)"],
      "consForStudent": ["Con 1: specific to this student", "Con 2: honest trade-off"],
      "challengesForStudent": ["Challenge specific to this student's profile at this school"],
      "howToGetIn": "5-7 detailed, actionable sentences: (1) GPA/test score comparison with school averages, (2) extracurriculars to strengthen app, (3) essay topic suggestions, (4) ED/EA strategy, (5) demonstrated interest steps.",
      "campusVibe": "3-4 vivid sentences about the social scene, sports culture (mention specific teams/divisions), Greek life, weekend activities, nearby amenities.",
      "notableFeature": "One unique thing about this school for THIS student based on their personality type",
      "studentFacultyRatio": "e.g. '12:1' — if known, or null",
      "campusSize": "e.g. 'Medium (8,500 students)' — refine with student count if known",
      "avgFinancialAid": "e.g. '~$35,000' — estimated average if known, or null"
    }
  ],
  "comparisonInsight": "5-8 sentences comparing all matched schools. Lead with how each serves the student's personality type differently. Reference their specific preferences and trade-offs between schools."
}

IMPORTANT: Only return the JSON object, no markdown formatting or code blocks.`;

// Failover model chain — lead with GPT-5 for highest-quality personalization
const AI_MODELS = [
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview",
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
        if (idx !== -1) {
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
