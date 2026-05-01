// Scholarship essay helper — premium-only AI assistant
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an experienced college admissions essay coach helping high school students with scholarship essays. Tone: warm, encouraging, student-friendly, no gendered pronouns. Be concrete and actionable. Never invent facts about the student. Format with clear markdown headings and bullet points.`;

const MODES: Record<string, string> = {
  brainstorm:
    "Generate 5 distinct angle ideas the student could take for this prompt. For each: a one-line hook, why it works, and a personal anecdote prompt to develop it.",
  outline:
    "Create a clear 5-paragraph outline (Hook, Setup, Main Story, Reflection, Forward-looking close). Under each paragraph give 2-3 bullet points the student should cover.",
  opening:
    "Write ONE strong, vivid opening paragraph (4-6 sentences) for this scholarship essay. Make it specific, sensory, and emotionally honest. Then briefly explain in 2 bullets why this opening works.",
  proofread:
    "Proofread and improve the student's draft. Return: (1) a polished version, (2) a short bullet list of the most important edits you made and why.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode ?? "").toLowerCase();
    const scholarship = String(body.scholarship ?? "").slice(0, 200);
    const prompt = String(body.prompt ?? "").slice(0, 2000);
    const draft = String(body.draft ?? "").slice(0, 6000);

    if (!MODES[mode]) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!prompt && mode !== "proofread") {
      return new Response(JSON.stringify({ error: "Prompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode === "proofread" && !draft) {
      return new Response(JSON.stringify({ error: "Draft required for proofread" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = [
      scholarship ? `Scholarship: ${scholarship}` : "",
      prompt ? `Essay prompt: ${prompt}` : "",
      draft ? `Student draft:\n${draft}` : "",
      `Task: ${MODES[mode]}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const text = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ result: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scholarship-essay-helper error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
