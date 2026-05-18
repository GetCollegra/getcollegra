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
  outline_personalized:
    "Create a personalized 7-section application outline using the student's profile. Sections (use these exact H3 headings): 1) Hook / Personal Introduction, 2) Why This Scholarship Fits Me, 3) My Academic Strengths, 4) My Leadership & Activities, 5) My Future Goals, 6) Why I Deserve This Opportunity, 7) Closing Statement. Under each heading provide 3 specific bullet points that reference the student's actual GPA, major, activities, leadership, volunteer work, sports, and career goals where given. End with a 1-line note: 'This outline is guidance — your authentic voice matters most.'",
  best_angle:
    "Read the student's profile and produce a SHORT personalized recommendation (3-5 sentences) titled '**Your Best Angle**' that names their 1-2 strongest themes (e.g. leadership, athletics, service, academics, entrepreneurship) and explains how to weave them into this scholarship application. Be concrete, encouraging, and never invent facts not in the profile.",
  improve:
    "Improve the student's draft to sound more personal, vivid, and specific while keeping their voice. Return: (1) the improved version, (2) 3 bullets explaining what you changed and why.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require authenticated user
  const _authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!_authHeader || !_authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  let _userId: string | null = null;
  let _userEmail: string | null = null;
  {
    const _token = _authHeader.slice(7).trim();
    const _resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${_token}`, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
    });
    if (!_resp.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _u = await _resp.json().catch(() => null);
    _userId = _u?.id ?? null;
    _userEmail = _u?.email ?? null;
  }

  // Require premium subscription (admins bypass)
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sbAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let allowed = false;
    if (_userId) {
      const { data: roleData } = await sbAdmin.rpc("has_role", { _user_id: _userId, _role: "admin" });
      if (roleData) allowed = true;
    }
    if (!allowed && _userId) {
      const { data: sub } = await sbAdmin
        .from("subscribers")
        .select("subscribed")
        .eq("user_id", _userId)
        .maybeSingle();
      if (sub?.subscribed) allowed = true;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Premium subscription required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("[essay-helper] premium check failed:", e);
    return new Response(JSON.stringify({ error: "Subscription check failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
    const studentProfile = body.studentProfile && typeof body.studentProfile === "object" ? body.studentProfile : null;

    if (!MODES[mode]) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const promptOptional = mode === "proofread" || mode === "best_angle" || mode === "outline_personalized" || mode === "improve";
    if (!prompt && !promptOptional) {
      return new Response(JSON.stringify({ error: "Prompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((mode === "proofread" || mode === "improve") && !draft) {
      return new Response(JSON.stringify({ error: "Draft required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let profileBlock = "";
    if (studentProfile) {
      const fields = [
        ["GPA", studentProfile.gpa],
        ["Intended major", studentProfile.intended_major],
        ["Grade level", studentProfile.grade_level],
        ["State", studentProfile.state],
        ["Activities", Array.isArray(studentProfile.activities) ? studentProfile.activities.join(", ") : studentProfile.activities],
        ["Leadership", studentProfile.leadership],
        ["Volunteer work", studentProfile.volunteer],
        ["Sports", Array.isArray(studentProfile.sports) ? studentProfile.sports.join(", ") : studentProfile.sports],
        ["Career goals", studentProfile.career_goals],
      ].filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "");
      if (fields.length) {
        profileBlock = "Student profile:\n" + fields.map(([k, v]) => `- ${k}: ${v}`).join("\n");
      }
    }

    const userMsg = [
      scholarship ? `Scholarship: ${scholarship}` : "",
      prompt ? `Essay prompt: ${prompt}` : "",
      profileBlock,
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
