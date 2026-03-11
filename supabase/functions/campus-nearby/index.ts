import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    "closestShopping": { "name": "Example Mall", "minutes": 12 }
  },
  "categories": {
    "health": {
      "label": "Health",
      "subtitle": "Hospitals & Clinics",
      "places": [
        { "name": "Hospital Name", "type": "Hospital", "minutes": 8, "distance": "2.1 mi" },
        { "name": "Urgent Care Name", "type": "Urgent Care", "minutes": 5, "distance": "1.3 mi" },
        { "name": "Pharmacy Name", "type": "Pharmacy", "minutes": 3, "distance": "0.5 mi" }
      ]
    },
    "essentials": {
      "label": "Essentials",
      "subtitle": "Grocery Stores & Pharmacies",
      "places": [
        { "name": "Store Name", "type": "Grocery", "minutes": 5, "distance": "1.0 mi" },
        { "name": "Pharmacy Name", "type": "Pharmacy", "minutes": 4, "distance": "0.8 mi" },
        { "name": "Store Name", "type": "Grocery", "minutes": 7, "distance": "1.5 mi" }
      ]
    },
    "food": {
      "label": "Food & Dining",
      "subtitle": "Restaurants & Cafes",
      "places": [
        { "name": "Restaurant Name", "type": "Restaurant", "minutes": 3, "distance": "0.3 mi" },
        { "name": "Cafe Name", "type": "Cafe", "minutes": 5, "distance": "0.7 mi" },
        { "name": "Restaurant Name", "type": "Restaurant", "minutes": 6, "distance": "1.1 mi" }
      ]
    },
    "lifestyle": {
      "label": "Lifestyle",
      "subtitle": "Gyms, Shopping, Entertainment",
      "places": [
        { "name": "Gym Name", "type": "Gym", "minutes": 5, "distance": "0.9 mi" },
        { "name": "Mall Name", "type": "Shopping", "minutes": 12, "distance": "3.2 mi" },
        { "name": "Theater Name", "type": "Entertainment", "minutes": 10, "distance": "2.5 mi" }
      ]
    }
  }
}

Rules:
- Use REAL, actual places near this specific college campus
- Include 3-5 places per category
- Minutes should be driving time estimates
- Be specific with actual business names and realistic distances
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

    return new Response(JSON.stringify({ nearby: nearbyData }), {
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
