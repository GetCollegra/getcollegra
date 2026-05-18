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
    const { homeAddress, collegeName, collegeLocation } = await req.json();

    if (!homeAddress || !collegeName || !collegeLocation) {
      return new Response(
        JSON.stringify({ error: "Missing homeAddress, collegeName, or collegeLocation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate inputs
    if (homeAddress.length > 200 || collegeName.length > 200 || collegeLocation.length > 200) {
      return new Response(
        JSON.stringify({ error: "Input too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a travel advisor. Given a home address and a college, estimate realistic travel options.

Home: "${homeAddress}"
College: "${collegeName}" located in ${collegeLocation}

Return a JSON object with this exact structure (no markdown, just raw JSON):
{
  "driving": {
    "available": true,
    "distanceMiles": 350,
    "estimatedTime": "5h 30m",
    "notes": "Via I-95 South"
  },
  "bus": {
    "available": true,
    "estimatedTime": "7h 15m",
    "departureCity": "Boston",
    "arrivalCity": "New York",
    "provider": "Greyhound / FlixBus",
    "notes": "Direct routes available"
  },
  "train": {
    "available": true,
    "estimatedTime": "4h 00m",
    "departureStation": "Boston South Station",
    "arrivalStation": "New York Penn Station",
    "provider": "Amtrak",
    "notes": "Acela Express or Northeast Regional"
  },
  "flight": {
    "available": true,
    "estimatedFlightTime": "1h 15m",
    "totalTravelTime": "3h 30m",
    "nearestHomeAirport": "BOS (Boston Logan)",
    "nearestCollegeAirport": "JFK (New York JFK)",
    "notes": "Multiple daily flights"
  }
}

Rules:
- Use realistic estimates based on actual US geography
- If a mode is not practical (e.g. no train service, or driving >20 hours), set "available": false and add a "reason" field
- For flights, totalTravelTime includes getting to/from airports (~1h each side)
- Be specific about providers and routes
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
    
    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const travelOptions = JSON.parse(content);

    return new Response(JSON.stringify({ travel: travelOptions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("estimate-travel error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
