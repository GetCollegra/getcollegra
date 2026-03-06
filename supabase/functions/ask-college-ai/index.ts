import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per IP per minute
const MAX_QUESTION_LENGTH = 2000;
const MAX_CONTEXT_FIELDS = 40;
const MAX_CONTEXT_VALUE_LENGTH = 300;

async function checkRateLimit(ip: string, functionName: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  // Count requests in current window
  const { count } = await sb
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("function_name", functionName)
    .gte("window_start", windowStart);

  if ((count ?? 0) >= RATE_LIMIT_MAX) return false;

  // Insert new request record
  await sb.from("rate_limits").insert({ ip_address: ip, function_name: functionName });

  // Opportunistic cleanup
  if (Math.random() < 0.05) {
    await sb.rpc("cleanup_rate_limits");
  }

  return true;
}

const sanitizeText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const sanitizeSurveyContext = (raw: unknown): Record<string, string> => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const entries = Object.entries(raw as Record<string, unknown>).slice(0, MAX_CONTEXT_FIELDS);
  const cleaned: Record<string, string> = {};

  for (const [rawKey, rawValue] of entries) {
    const key = sanitizeText(rawKey, 100)
      .toLowerCase()
      .replace(/[^a-z0-9_\s-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/^_+|_+$/g, "");

    const value = sanitizeText(rawValue, MAX_CONTEXT_VALUE_LENGTH);
    if (!key || !value || key.startsWith("__") || key === "submission_id") continue;

    cleaned[key] = value;
  }

  return cleaned;
};

const sanitizeCollegeNames = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(0, 20)
    .map((name) => sanitizeText(name, 120))
    .filter(Boolean);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";

    const allowed = await checkRateLimit(clientIp, "ask-college-ai");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const question = sanitizeText(body?.question, MAX_QUESTION_LENGTH);
    const surveyContext = sanitizeSurveyContext(body?.surveyContext);
    const recommendedCollegeNames = sanitizeCollegeNames(body?.recommendedCollegeNames);

    // Input validation
    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const surveyContextLines = Object.entries(surveyContext)
      .map(([key, value]) => `- ${key.replace(/_/g, " ")}: ${value}`)
      .join("\n");

    const recommendedCollegesLine = recommendedCollegeNames.length > 0
      ? recommendedCollegeNames.join(", ")
      : "None provided";

    const contextualPrompt = [
      `Student question:\n${question}`,
      `Student survey answers from Tally (use these as primary context when relevant):\n${surveyContextLines || "None provided"}`,
      `Current recommended colleges (if relevant to the question): ${recommendedCollegesLine}`,
    ].join("\n\n");

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
            content:
              "You are Collegra's college advisor. Always personalize your answer using the student's Tally survey answers when relevant. If context is missing, explicitly say what is missing and give the best possible guidance. Be practical, concise, and actionable. Never invent student preferences that were not provided.",
          },
          { role: "user", content: contextualPrompt },
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
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate an answer.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ask-college-ai error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
