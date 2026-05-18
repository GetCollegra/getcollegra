import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated user
  const _authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!_authHeader || !_authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  {
    const _token = _authHeader.slice(7).trim();
    const _resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${_token}`, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
    });
    if (!_resp.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }


  try {
    const { collegeName, collegeLocation } = await req.json();
    if (!collegeName || !collegeLocation) {
      return new Response(JSON.stringify({ error: "collegeName and collegeLocation required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a college life research assistant. Provide detailed, accurate lifestyle information about ${collegeName} located in ${collegeLocation}.

Return a JSON object with EXACTLY this structure (no markdown, no code fences, just raw JSON):

{
  "weather": {
    "climate": "Brief climate description (e.g., 'Humid subtropical with hot summers and mild winters')",
    "seasons": {
      "spring": { "avgHigh": 72, "avgLow": 50, "description": "Pleasant with occasional rain" },
      "summer": { "avgHigh": 92, "avgLow": 70, "description": "Hot and humid" },
      "fall": { "avgHigh": 68, "avgLow": 45, "description": "Crisp and colorful" },
      "winter": { "avgHigh": 48, "avgLow": 28, "description": "Cold with occasional snow" }
    },
    "annualRainfall": "48 inches",
    "annualSnowfall": "12 inches",
    "sunnyDaysPerYear": 210
  },
  "naturalDisasters": {
    "tornadoes": { "risk": "Low", "description": "Rare occurrence in this region" },
    "hurricanes": { "risk": "Low", "description": "Not in hurricane path" },
    "earthquakes": { "risk": "Low", "description": "Minimal seismic activity" },
    "wildfires": { "risk": "Low", "description": "Low wildfire risk" },
    "flooding": { "risk": "Moderate", "description": "Some flood-prone areas nearby" },
    "severeWinter": { "risk": "Moderate", "description": "Occasional ice storms" }
  },
  "costOfLiving": {
    "overallRating": "Moderate",
    "comparedToNational": "5% above average",
    "avgRent1Bedroom": "$950/month",
    "avgRent2Bedroom": "$1,200/month",
    "monthlyFood": "$350-450",
    "transportation": "$80-150/month",
    "affordabilityTips": [
      "On-campus housing is competitive but affordable",
      "Student meal plans offer good value"
    ]
  },
  "areaLifestyle": {
    "setting": "Urban",
    "walkability": "Very walkable campus, moderate walkability off-campus",
    "needsCar": false,
    "publicTransit": "Good bus system with student discounts",
    "nearbyAttractions": [
      "Downtown shopping district - 10 min walk",
      "State park - 20 min drive",
      "Movie theaters - 5 min drive"
    ],
    "diningScene": "Diverse restaurant scene with many student-friendly options",
    "nightlife": "Active bar and entertainment district near campus",
    "outdoorActivities": ["Hiking trails", "Lake swimming", "Bike paths"],
    "generalVibe": "Energetic college town with a mix of academic culture and local charm"
  },
  "studentPerspective": "Living at ${collegeName} feels like being part of a vibrant community. The campus is well-connected to the surrounding area with plenty of dining, shopping, and entertainment options within walking distance. Winters can be chilly, but the campus culture keeps things warm. Students enjoy a good balance of academic rigor and social life, with the nearby downtown offering weekend activities. The cost of living is manageable on a student budget, especially with on-campus housing options.",
  "campusPhotos": {
    "searchTerms": [
      "${collegeName} campus aerial view",
      "${collegeName} student center",
      "${collegeName} dormitory",
      "${collegeName} library",
      "${collegeName} surrounding area"
    ],
    "campusHighlights": [
      { "title": "Main Quad", "description": "The heart of campus life with historic buildings and green spaces" },
      { "title": "Student Center", "description": "Modern hub for dining, events, and student organizations" },
      { "title": "Residence Halls", "description": "Mix of traditional and suite-style housing options" },
      { "title": "Academic Buildings", "description": "State-of-the-art facilities for research and learning" },
      { "title": "Surrounding Area", "description": "The neighborhood around campus with shops and restaurants" }
    ]
  }
}

Use REALISTIC data based on the actual location. Risk levels must be one of: "Low", "Moderate", "Higher". Temperatures in Fahrenheit. Make the student perspective warm, honest, and helpful — like advice from a current student.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await res.json();
    const raw = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let collegeLife;
    try {
      // Strip markdown fences if present
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      collegeLife = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw:", raw.substring(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ collegeLife }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("college-life error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
