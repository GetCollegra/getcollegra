// Rate-limited resend of the auth confirmation email.
// Limits per email: 60s cooldown between sends, max 3 sends per hour.
// Uses the existing public.rate_limits table (function_name = 'resend-confirmation:<email>').

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_SECONDS = 60;
const MAX_PER_HOUR = 3;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let email: string;
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Valid email is required" }, 400);
    }
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const key = `resend-confirmation:${email}`;
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const cooldownAgo = new Date(now.getTime() - COOLDOWN_SECONDS * 1000).toISOString();

  // Opportunistic cleanup of stale buckets.
  await admin.rpc("cleanup_rate_limits").catch(() => {});

  // Pull recent attempts in the last hour for this email.
  const { data: attempts, error: readErr } = await admin
    .from("rate_limits")
    .select("id, window_start, request_count")
    .eq("function_name", key)
    .gte("window_start", oneHourAgo)
    .order("window_start", { ascending: false });

  if (readErr) {
    console.error("rate_limits read error", readErr);
    return json({ error: "Internal error" }, 500);
  }

  const totalInHour = (attempts ?? []).reduce((sum, r) => sum + (r.request_count ?? 1), 0);
  const lastAttempt = attempts?.[0];

  // Hourly cap.
  if (totalInHour >= MAX_PER_HOUR) {
    const oldest = attempts![attempts!.length - 1];
    const resetAt = new Date(new Date(oldest.window_start).getTime() + 60 * 60 * 1000);
    const retryAfter = Math.max(0, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
    return json({
      allowed: false,
      reason: "hourly_limit",
      retryAfterSeconds: retryAfter,
      message: `You've reached the hourly resend limit. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
    }, 429);
  }

  // Cooldown between sends.
  if (lastAttempt && lastAttempt.window_start > cooldownAgo) {
    const nextOk = new Date(new Date(lastAttempt.window_start).getTime() + COOLDOWN_SECONDS * 1000);
    const retryAfter = Math.max(0, Math.ceil((nextOk.getTime() - now.getTime()) / 1000));
    return json({
      allowed: false,
      reason: "cooldown",
      retryAfterSeconds: retryAfter,
      message: `Please wait ${retryAfter} second(s) before requesting another email.`,
    }, 429);
  }

  // Trigger Supabase Auth to resend the signup confirmation. This routes
  // through the auth-email-hook + email queue like the original signup email.
  const { error: resendErr } = await admin.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${new URL(req.url).origin.replace("functions.", "")}/survey` },
  });

  // Supabase intentionally returns no error if the user is already confirmed
  // or doesn't exist (to avoid email enumeration). We mirror that behavior.
  if (resendErr) {
    console.error("auth.resend error", resendErr);
    // Still record the attempt so abusers can't bypass via errors.
  }

  // Record the attempt.
  const { error: insertErr } = await admin.from("rate_limits").insert({
    ip_address: "email", // table requires NOT NULL — bucket is keyed by function_name
    function_name: key,
    request_count: 1,
    window_start: now.toISOString(),
  });
  if (insertErr) {
    console.error("rate_limits insert error", insertErr);
  }

  const remaining = Math.max(0, MAX_PER_HOUR - totalInHour - 1);
  return json({
    allowed: true,
    message: "If an unverified account exists for that email, a new confirmation message has been sent.",
    cooldownSeconds: COOLDOWN_SECONDS,
    remainingThisHour: remaining,
  });
});
