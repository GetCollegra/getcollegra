import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Events that confirm a paid/active state and should grant access.
const ACTIVATING_EVENTS = new Set([
  "checkout.session.completed",
  "invoice.payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.resumed",
]);

// Events that revoke access.
const DEACTIVATING_EVENTS = new Set([
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "invoice.payment_failed",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("Missing config", { stripeKey: !!stripeKey, webhookSecret: !!webhookSecret });
    return new Response("Server not configured", { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // 1. Verify the signature — reject any request that isn't signed by Stripe.
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    logStep("Missing signature header");
    return new Response("Missing signature", { status: 400, headers: corsHeaders });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("Signature verification FAILED", { error: msg });
    return new Response(`Webhook signature verification failed: ${msg}`, {
      status: 400,
      headers: corsHeaders,
    });
  }

  logStep("Event received", { type: event.type, id: event.id });

  // 2. Only act on events that represent a confirmed paid/state-change event.
  if (!ACTIVATING_EVENTS.has(event.type) && !DEACTIVATING_EVENTS.has(event.type)) {
    logStep("Ignoring event (not gating access)", { type: event.type });
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  try {
    // 3. Resolve the customer + subscription for this event, then re-query Stripe
    //    as the source of truth. We never trust the event payload to grant access —
    //    we always look up the live subscription state.
    let customerId: string | null = null;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.resumed":
      case "customer.subscription.paused":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
        break;
      }
    }

    if (!customerId) {
      logStep("No customer id on event — skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch the customer (for email lookup) and the live active subscription set.
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      logStep("Customer is deleted, skipping", { customerId });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const email = (customer as Stripe.Customer).email;
    if (!email) {
      logStep("Customer has no email", { customerId });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const activeSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActive = activeSubs.data.length > 0;
    const activeSub = hasActive ? activeSubs.data[0] : null;
    const periodEnd = activeSub
      ? new Date(activeSub.current_period_end * 1000).toISOString()
      : null;

    // Try to map this email to an existing auth user.
    let userId: string | null = null;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      userId = profile?.id ?? null;
    } catch (err) {
      logStep("Profile lookup failed (non-fatal)", { error: String(err) });
    }

    // 4. Upsert cached subscription state. This is the only path that writes here
    //    (RLS blocks everyone else). Service role bypasses RLS.
    const { error: upsertError } = await supabase
      .from("subscribers")
      .upsert(
        {
          email,
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: activeSub?.id ?? null,
          subscribed: hasActive,
          subscription_status: activeSub?.status ?? (hasActive ? "active" : "inactive"),
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );

    if (upsertError) {
      logStep("Upsert failed", { error: upsertError.message });
      return new Response(JSON.stringify({ error: upsertError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Subscription state cached", { email, subscribed: hasActive, type: event.type });

    return new Response(
      JSON.stringify({ received: true, subscribed: hasActive }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("Handler error", { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
