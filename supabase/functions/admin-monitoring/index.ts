import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather stats
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Rate limit hits (last 24h) grouped by function
    const { data: rateLimitData } = await sb
      .from("rate_limits")
      .select("function_name, window_start")
      .gte("window_start", oneDayAgo);

    const functionCounts: Record<string, number> = {};
    (rateLimitData || []).forEach((r: any) => {
      functionCounts[r.function_name] = (functionCounts[r.function_name] || 0) + 1;
    });

    // Total users
    const { count: totalProfiles } = await sb
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // New users this week
    const { count: newUsersWeek } = await sb
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneWeekAgo);

    // Total matches
    const { count: totalMatches } = await sb
      .from("college_matches")
      .select("*", { count: "exact", head: true });

    // Total saved colleges
    const { count: totalSaved } = await sb
      .from("saved_colleges")
      .select("*", { count: "exact", head: true });

    // Waitlist
    const { count: waitlistCount } = await sb
      .from("waitlist_emails")
      .select("*", { count: "exact", head: true });

    return new Response(
      JSON.stringify({
        totalUsers: totalProfiles ?? 0,
        newUsersThisWeek: newUsersWeek ?? 0,
        totalMatches: totalMatches ?? 0,
        totalSavedColleges: totalSaved ?? 0,
        waitlistEmails: waitlistCount ?? 0,
        apiUsage24h: functionCounts,
        totalApiCalls24h: rateLimitData?.length ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("admin-monitoring error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
