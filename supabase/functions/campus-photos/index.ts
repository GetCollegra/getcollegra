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
    const { collegeName, searchTerms } = await req.json();

    if (!collegeName || typeof collegeName !== "string") {
      return new Response(JSON.stringify({ error: "collegeName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const UNSPLASH_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY") || "0RFOIUa03s7zce9GGNz3G-5HP17u0kyybFzk2WQlR0k";
    if (!UNSPLASH_KEY) {
      return new Response(JSON.stringify({ error: "Unsplash API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build search queries from college name + provided terms
    const queries: string[] = [];
    queries.push(`${collegeName} campus`);
    queries.push(`${collegeName} university`);
    if (Array.isArray(searchTerms)) {
      for (const term of searchTerms.slice(0, 3)) {
        if (typeof term === "string" && term.trim()) {
          queries.push(term.trim());
        }
      }
    }

    // Fetch photos for each query in parallel (3 per query)
    const allPhotos: Array<{
      id: string;
      url: string;
      thumbUrl: string;
      alt: string;
      photographer: string;
      photographerUrl: string;
      query: string;
    }> = [];

    const seen = new Set<string>();

    await Promise.all(
      queries.map(async (query) => {
        try {
          const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4&orientation=landscape`;
          const res = await fetch(url, {
            headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
          });
          if (!res.ok) {
            const errBody = await res.text();
            console.error(`Unsplash error for "${query}": ${res.status}`, errBody);
            return;
          }
          const data = await res.json();
          if (data.results) {
            for (const photo of data.results) {
              if (!seen.has(photo.id)) {
                seen.add(photo.id);
                allPhotos.push({
                  id: photo.id,
                  url: photo.urls?.regular || photo.urls?.small,
                  thumbUrl: photo.urls?.small || photo.urls?.thumb,
                  alt: photo.alt_description || `${collegeName} campus photo`,
                  photographer: photo.user?.name || "Unknown",
                  photographerUrl: photo.user?.links?.html || "https://unsplash.com",
                  query,
                });
              }
            }
          }
        } catch (e) {
          console.error(`Failed fetching photos for "${query}":`, e);
        }
      })
    );

    // Return up to 12 unique photos
    return new Response(
      JSON.stringify({ photos: allPhotos.slice(0, 12) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("campus-photos error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
