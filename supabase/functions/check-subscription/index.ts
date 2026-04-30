import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Cached subscriber rows are considered fresh for this long. After that, we
// re-query Stripe to be safe — webhooks are reliable but not infallible.
const CACHE_FRESHNESS_MS = 10 * 60 * 1000; // 10 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");

    let userEmail: string | null = null;
    let userId: string | null = null;

    try {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !userData.user?.email) {
        logStep("Auth failed", { message: userError?.message || "No email" });
        return new Response(JSON.stringify({ subscribed: false, error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      userEmail = userData.user.email;
      userId = userData.user.id;
    } catch (authErr) {
      logStep("Auth exception", { message: String(authErr) });
      return new Response(JSON.stringify({ subscribed: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (!userEmail) {
      return new Response(JSON.stringify({ subscribed: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId, email: userEmail });

    // ─── 1. Try the webhook-maintained cache first ──────────────────────────
    const { data: cached } = await supabaseClient
      .from("subscribers")
      .select("subscribed, subscription_status, current_period_end, updated_at")
      .eq("email", userEmail)
      .maybeSingle();

    const cacheAgeMs = cached?.updated_at
      ? Date.now() - new Date(cached.updated_at).getTime()
      : Infinity;
    const cacheFresh = cached && cacheAgeMs < CACHE_FRESHNESS_MS;

    if (cacheFresh) {
      logStep("Serving from cache", {
        subscribed: cached!.subscribed,
        ageSec: Math.round(cacheAgeMs / 1000),
      });
      return new Response(JSON.stringify({
        subscribed: !!cached!.subscribed,
        subscription_end: cached!.current_period_end,
        source: "cache",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ─── 2. Cache stale or missing — query Stripe live and refresh cache ────
    logStep("Cache stale/missing — querying Stripe", { hadCached: !!cached, cacheAgeMs });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      // Refresh cache so next call is fast.
      await supabaseClient.from("subscribers").upsert({
        email: userEmail,
        user_id: userId,
        subscribed: false,
        subscription_status: "no_customer",
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });
      return new Response(JSON.stringify({ subscribed: false, source: "stripe" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    const activeSub = hasActiveSub ? subscriptions.data[0] : null;
    // Stripe API basil moved current_period_end onto subscription items.
    // Fall back through both locations and guard against missing/invalid values.
    const periodEndUnix =
      (activeSub as any)?.current_period_end ??
      activeSub?.items?.data?.[0]?.current_period_end ??
      null;
    const subscriptionEnd =
      typeof periodEndUnix === "number" && Number.isFinite(periodEndUnix)
        ? new Date(periodEndUnix * 1000).toISOString()
        : null;

    // Refresh cache.
    await supabaseClient.from("subscribers").upsert({
      email: userEmail,
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: activeSub?.id ?? null,
      subscribed: hasActiveSub,
      subscription_status: activeSub?.status ?? "inactive",
      current_period_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });

    logStep("Stripe queried + cache refreshed", { subscribed: hasActiveSub });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_end: subscriptionEnd,
      source: "stripe",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
