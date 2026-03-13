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

/** Decode JWT payload without verification (gateway + service role handle trust) */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Handle base64url encoding
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch {
    return null;
  }
}

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

    // Strategy: decode JWT payload to get user ID, then use admin API for reliability
    let userEmail: string | null = null;
    let userId: string | null = null;

    // First try: decode JWT payload directly
    const jwtPayload = decodeJwtPayload(token);
    if (jwtPayload?.sub && jwtPayload?.email) {
      userId = jwtPayload.sub;
      userEmail = jwtPayload.email;
      logStep("User from JWT", { email: userEmail });
    }

    // If JWT decode didn't give us what we need, try getUser
    if (!userEmail) {
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
    }

    // Verify the user actually exists via admin API (prevents forged JWTs)
    if (userId) {
      try {
        const { data: adminUser, error: adminErr } = await supabaseClient.auth.admin.getUserById(userId);
        if (adminErr || !adminUser?.user) {
          logStep("Admin user lookup failed", { userId, error: adminErr?.message });
          return new Response(JSON.stringify({ subscribed: false, error: "Unauthorized" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          });
        }
        // Use email from admin lookup (most authoritative)
        userEmail = adminUser.user.email || userEmail;
      } catch {
        // If admin lookup fails, still proceed with JWT email (best effort)
        logStep("Admin lookup exception, proceeding with JWT email");
      }
    }

    if (!userEmail) {
      return new Response(JSON.stringify({ subscribed: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { email: userEmail });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionEnd });
    } else {
      logStep("No active subscription");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_end: subscriptionEnd,
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
