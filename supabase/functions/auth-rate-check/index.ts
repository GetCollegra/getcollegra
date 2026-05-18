import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WINDOW_MS = 5 * 60 * 1000; // 5 minute window
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_SIGNUP_ATTEMPTS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json(); // "login" or "signup"
    if (!action || !["login", "signup"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
      "unknown";


    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const functionName = `auth_${action}`;
    const maxAttempts = action === "login" ? MAX_LOGIN_ATTEMPTS : MAX_SIGNUP_ATTEMPTS;
    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

    const { count } = await sb
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", clientIp)
      .eq("function_name", functionName)
      .gte("window_start", windowStart);

    if ((count ?? 0) >= maxAttempts) {
      const retryAfterSecs = Math.ceil(WINDOW_MS / 1000);
      return new Response(
        JSON.stringify({
          allowed: false,
          error: `Too many ${action} attempts. Please wait ${Math.ceil(retryAfterSecs / 60)} minutes.`,
          retryAfter: retryAfterSecs,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfterSecs) },
        }
      );
    }

    // Record the attempt
    await sb.from("rate_limits").insert({ ip_address: clientIp, function_name: functionName });

    // Opportunistic cleanup
    if (Math.random() < 0.05) {
      await sb.rpc("cleanup_rate_limits");
    }

    return new Response(JSON.stringify({ allowed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auth-rate-check error:", e);
    // Fail open — don't block users if rate limiter errors
    return new Response(JSON.stringify({ allowed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
