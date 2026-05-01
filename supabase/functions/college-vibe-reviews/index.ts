// AI-summarizes student vibe reviews for a given college, with rating bars.
// Caches results in college_vibe_reviews table to keep things fast and cheap.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const collegeName = String(body?.collegeName || "").trim().slice(0, 200);
    if (!collegeName) {
      return new Response(JSON.stringify({ error: "collegeName required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Cache check (case-insensitive)
    const { data: cached } = await supabase
      .from("college_vibe_reviews")
      .select("*")
      .ilike("college_name", collegeName)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({
        summary: cached.summary,
        snippets: cached.snippets,
        ratings: cached.ratings,
        sourceNote: cached.source_note,
        cached: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Summarize the campus vibe and student experience at ${collegeName} based on widely-known public information (news articles, college guides, alumni discussions). 

Provide:
- summary: 1 short paragraph (2-3 sentences) capturing the overall vibe
- snippets: 5 short authentic-style insights (each one sentence, sounding like something a student might say). No quotation marks.
- ratings: 1-5 scale on these dimensions: socialLife, campusBeauty, academicPressure, schoolSpirit, careerOpportunities (use realistic values, not all 5s).

Be honest and balanced. Do not invent specific students or specific events.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You write balanced, honest college vibe summaries from public information. Student-friendly tone. No gendered pronouns." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_vibe",
            description: "Return vibe summary",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string" },
                snippets: { type: "array", items: { type: "string" } },
                ratings: {
                  type: "object",
                  properties: {
                    socialLife: { type: "number" },
                    campusBeauty: { type: "number" },
                    academicPressure: { type: "number" },
                    schoolSpirit: { type: "number" },
                    careerOpportunities: { type: "number" },
                  },
                  required: ["socialLife","campusBeauty","academicPressure","schoolSpirit","careerOpportunities"],
                },
              },
              required: ["summary","snippets","ratings"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_vibe" } },
        temperature: 0.4,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    const parsed = typeof args === "string" ? JSON.parse(args) : args || {};

    const summary = parsed.summary || "";
    const snippets = parsed.snippets || [];
    const ratings = parsed.ratings || {};
    const sourceNote = "AI-summarized from public sources";

    // Cache it
    await supabase.from("college_vibe_reviews").upsert({
      college_name: collegeName,
      summary,
      snippets,
      ratings,
      source_note: sourceNote,
      updated_at: new Date().toISOString(),
    }, { onConflict: "college_name" });

    return new Response(JSON.stringify({ summary, snippets, ratings, sourceNote, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e) {
    console.error("college-vibe-reviews error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
