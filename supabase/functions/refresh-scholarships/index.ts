// Refresh scholarships catalog from Lovable AI (Gemini) using structured tool calling.
// Sources real, currently-open scholarships from reputable public listings:
// CareerOneStop (US Dept of Labor), BigFuture (College Board), Fastweb,
// Scholarships.com, Sallie Mae, Going Merry, Niche.
//
// Admin-only. Replaces the scholarships table contents.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a college scholarships research assistant for U.S. high school students.

Your job: produce a curated list of REAL, currently-open scholarships sourced from reputable public scholarship databases. Use only scholarships you can verify exist on at least one of these reputable sources:
- CareerOneStop Scholarship Finder (US Department of Labor) — careeronestop.org
- BigFuture Scholarship Search (College Board) — bigfuture.collegeboard.org
- Fastweb — fastweb.com
- Scholarships.com — scholarships.com
- Sallie Mae Scholarship Search — salliemae.com
- Going Merry — goingmerry.com
- Niche — niche.com
- Foundation/sponsor official websites (e.g. coca-colascholarsfoundation.org, jkcf.org, gatesscholarship.org, hsf.net, ronaldmcdonaldhousecharities.org, elks.org, davidsongifted.org, ayn-rand.org, doodleforgoogle.com, voiceofdemocracy.com)

CRITICAL ACCURACY RULES:
- Only include well-known, established, recurring scholarships that have run for multiple years.
- Use the application URL of the OFFICIAL sponsor whenever possible.
- Use the typical annual deadline. If the next deadline this cycle has already passed, use the deadline of the next upcoming cycle.
- If you are unsure about any specific number (amount, GPA), prefer a conservative round figure rather than a precise wrong one.
- Never invent scholarship names. Never invent sponsor URLs.
- Do not include scams, "sweepstakes", or pay-to-enter scholarships.

Distribution requirements (return EXACTLY 25 scholarships):
- 12 nationally-available scholarships open to most US high school students
- 8 major-specific or interest-specific (STEM, business, arts, healthcare, education, environment, etc.)
- 3 demographic / first-gen / minority-serving (e.g. Hispanic Scholarship Fund, Gates, UNCF, Jack Kent Cooke)
- 2 community-service / leadership-focused
- Mix of essay/no-essay, merit/need based, varied amounts ($500-$40,000)
- Deadlines should be realistic upcoming dates within the next 12 months in YYYY-MM-DD format`;

const SCHOLARSHIPS_TOOL = {
  type: "function",
  function: {
    name: "save_scholarships",
    description: "Save a curated list of 25 verified real scholarships",
    parameters: {
      type: "object",
      properties: {
        scholarships: {
          type: "array",
          minItems: 20,
          maxItems: 30,
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Official scholarship name" },
              provider: { type: "string", description: "Sponsoring organization" },
              amount: { type: "integer", description: "Award amount in USD (use the maximum if a range)" },
              deadline: { type: "string", description: "Next upcoming deadline in YYYY-MM-DD format" },
              description: { type: "string", description: "1-2 sentence student-friendly description, no marketing fluff" },
              eligibility_tags: {
                type: "array",
                items: { type: "string" },
                description: "3-4 short tags like 'Merit', 'STEM', 'First-Gen', 'Essay Required', 'No GPA Min'",
              },
              majors: {
                type: "array",
                items: { type: "string" },
                description: "Eligible majors, or ['Any'] if open to all majors",
              },
              state: {
                type: "string",
                description: "Two-letter US state code if state-specific, otherwise empty string",
              },
              merit_based: { type: "boolean" },
              need_based: { type: "boolean" },
              essay_required: { type: "boolean" },
              min_gpa: { type: "number", description: "Minimum required GPA on a 4.0 scale, or 0 if no minimum" },
              grade_levels: {
                type: "array",
                items: { type: "string", enum: ["9", "10", "11", "12"] },
                description: "Eligible grade levels; use ['12'] if seniors only, ['11','12'] if juniors+seniors, etc.",
              },
              application_url: { type: "string", description: "Official application or info URL on sponsor's website" },
              is_local: { type: "boolean", description: "True if state-specific or regional" },
              source: {
                type: "string",
                description: "Which reputable database you verified this from (e.g. 'CareerOneStop', 'BigFuture')",
              },
            },
            required: [
              "name", "provider", "amount", "deadline", "description",
              "eligibility_tags", "majors", "state", "merit_based", "need_based",
              "essay_required", "min_gpa", "grade_levels", "application_url",
              "is_local", "source",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["scholarships"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: require admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway with structured tool calling
    console.log("Calling Lovable AI to research scholarships...");
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              "Research and return a curated list of exactly 25 REAL, currently-open U.S. scholarships for high school students using the reputable sources listed. Verify each one exists. Distribute across categories as instructed. Use accurate sponsor URLs and realistic upcoming deadlines.",
          },
        ],
        tools: [SCHOLARSHIPS_TOOL],
        tool_choice: { type: "function", function: { name: "save_scholarships" } },
        temperature: 0.4,
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "AI rate limit. Try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI service error", detail: t.slice(0, 500) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned:", JSON.stringify(aiData).slice(0, 1000));
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items: any[] = Array.isArray(parsed?.scholarships) ? parsed.scholarships : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "AI returned empty list" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize + map to DB shape
    const today = new Date();
    const rows = items
      .map((s) => {
        const deadline = String(s.deadline ?? "").trim();
        const valid = /^\d{4}-\d{2}-\d{2}$/.test(deadline);
        if (!valid) return null;
        // Push deadlines that are in the past forward by 1 year
        const d = new Date(deadline + "T23:59:59");
        let finalDeadline = deadline;
        if (d < today) {
          const next = new Date(d);
          next.setFullYear(next.getFullYear() + 1);
          finalDeadline = next.toISOString().slice(0, 10);
        }
        const stateRaw = String(s.state ?? "").trim().toUpperCase();
        const state = /^[A-Z]{2}$/.test(stateRaw) ? stateRaw : null;
        return {
          name: String(s.name ?? "").slice(0, 200),
          provider: String(s.provider ?? "").slice(0, 200),
          amount: Math.max(0, Math.min(200000, Math.round(Number(s.amount) || 0))),
          deadline: finalDeadline,
          description: String(s.description ?? "").slice(0, 600),
          eligibility_tags: Array.isArray(s.eligibility_tags)
            ? s.eligibility_tags.slice(0, 6).map((t: any) => String(t).slice(0, 40))
            : [],
          majors: Array.isArray(s.majors) && s.majors.length > 0
            ? s.majors.slice(0, 8).map((m: any) => String(m).slice(0, 60))
            : ["Any"],
          state,
          merit_based: Boolean(s.merit_based),
          need_based: Boolean(s.need_based),
          essay_required: Boolean(s.essay_required),
          min_gpa: Number(s.min_gpa) > 0 ? Number(s.min_gpa) : null,
          grade_levels: Array.isArray(s.grade_levels) && s.grade_levels.length > 0
            ? s.grade_levels.filter((g: any) => ["9", "10", "11", "12"].includes(String(g)))
            : ["11", "12"],
          application_url: String(s.application_url ?? "").slice(0, 500) || null,
          is_local: Boolean(s.is_local) || state !== null,
        };
      })
      .filter((r: any) => r && r.name && r.deadline && r.amount > 0);

    if (rows.length < 5) {
      return new Response(JSON.stringify({ error: "Not enough valid scholarships parsed", count: rows.length }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Replace the catalog atomically
    const { error: delErr } = await supabase.from("scholarships").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) {
      console.error("Delete error:", delErr);
    }

    const { error: insErr, data: inserted } = await supabase
      .from("scholarships")
      .insert(rows)
      .select("id");

    if (insErr) {
      console.error("Insert error:", insErr);
      return new Response(JSON.stringify({ error: "DB insert failed", detail: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Refreshed scholarships: ${inserted?.length ?? 0} rows`);
    return new Response(
      JSON.stringify({ success: true, count: inserted?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("refresh-scholarships error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
