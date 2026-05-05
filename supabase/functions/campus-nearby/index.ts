import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_DAYS = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { collegeName, collegeLocation } = await req.json();

    if (!collegeName || !collegeLocation) {
      return new Response(
        JSON.stringify({ error: "Missing collegeName or collegeLocation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (collegeName.length > 200 || collegeLocation.length > 200) {
      return new Response(
        JSON.stringify({ error: "Input too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Try cache
    try {
      const { data: cached } = await admin
        .from("campus_area_cache")
        .select("nearby, updated_at")
        .eq("college_name", collegeName)
        .maybeSingle();

      if (cached?.nearby) {
        const ageMs = Date.now() - new Date(cached.updated_at as string).getTime();
        if (ageMs < CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) {
          return new Response(JSON.stringify({ nearby: cached.nearby, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (_e) { /* cache miss is fine */ }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a local area expert. Given a college campus, provide realistic nearby points of interest that students commonly care about.

College: "${collegeName}" in ${collegeLocation}

Return a JSON object with this exact structure (no markdown, just raw JSON):
{
  "summary": {
    "nearestHospital": { "name": "Example Hospital", "minutes": 8 },
    "nearestGrocery": { "name": "Example Store", "minutes": 5 },
    "restaurantsWithin10Min": 15,
    "closestShopping": { "name": "Example Mall", "minutes": 12 },
    "nearestAirport": { "name": "Example Airport", "minutes": 35, "code": "XXX" },
    "transitAccess": { "label": "Strong | Moderate | Limited", "detail": "Short description (e.g., bus + light rail)" },
    "walkScore": 78
  },
  "categories": {
    "health": { "label": "Health", "subtitle": "Hospitals & Clinics", "places": [
      { "name": "...", "type": "Hospital", "minutes": 8, "distance": "2.1 mi" },
      { "name": "...", "type": "Urgent Care", "minutes": 5, "distance": "1.3 mi" },
      { "name": "...", "type": "Pharmacy", "minutes": 3, "distance": "0.5 mi" }
    ]},
    "essentials": { "label": "Essentials", "subtitle": "Grocery & Pharmacies", "places": [
      { "name": "...", "type": "Grocery", "minutes": 5, "distance": "1.0 mi" },
      { "name": "...", "type": "Pharmacy", "minutes": 4, "distance": "0.8 mi" },
      { "name": "...", "type": "Grocery", "minutes": 7, "distance": "1.5 mi" }
    ]},
    "food": { "label": "Food & Coffee", "subtitle": "Restaurants & Cafes", "places": [
      { "name": "...", "type": "Restaurant", "minutes": 3, "distance": "0.3 mi" },
      { "name": "...", "type": "Cafe", "minutes": 5, "distance": "0.7 mi" },
      { "name": "...", "type": "Restaurant", "minutes": 6, "distance": "1.1 mi" }
    ]},
    "transit": { "label": "Transit & Travel", "subtitle": "Airports, transit, rideshare", "places": [
      { "name": "Airport name", "type": "Airport", "minutes": 35, "distance": "22 mi" },
      { "name": "Transit hub", "type": "Transit", "minutes": 6, "distance": "1.0 mi" },
      { "name": "Train/bus station", "type": "Transit", "minutes": 10, "distance": "2.0 mi" }
    ]}
  }
}

Rules:
- Use REAL, actual places near this specific college campus
- Include 3-5 places per category
- Minutes should be driving time estimates
- Walk score 0-100, integer estimate of walkability of the immediate campus area
- Only return the JSON object, nothing else`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API failed [${response.status}]: ${errText}`);
    }

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const nearbyData = JSON.parse(content);

    // 2) Write to cache (upsert)
    try {
      await admin
        .from("campus_area_cache")
        .upsert(
          { college_name: collegeName, nearby: nearbyData, source: "ai", updated_at: new Date().toISOString() },
          { onConflict: "college_name" }
        );
    } catch (_e) { /* non-fatal */ }

    return new Response(JSON.stringify({ nearby: nearbyData, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("campus-nearby error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
