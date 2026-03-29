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
    const { collegeName, collegeLocation, searchTerms } = await req.json();

    if (!collegeName || typeof collegeName !== "string") {
      return new Response(JSON.stringify({ error: "collegeName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const UNSPLASH_KEY = "0RFOIUa03s7zce9GGNz3G-5HP17u0kyybFzk2WQlR0k";

    // Extract city from location (e.g. "Newark, NJ" → "Newark")
    const city = typeof collegeLocation === "string"
      ? collegeLocation.split(",")[0].trim()
      : "";

    // Build highly specific search queries that target the actual campus
    // Use exact college name + specific campus aspects for accuracy
    const queries: string[] = [
      `"${collegeName}" campus buildings`,
      `"${collegeName}" students`,
      `${collegeName} campus quad`,
    ];

    // Add city-specific query for surrounding area photos
    if (city) {
      queries.push(`${city} university campus`);
    }

    // Add any AI-generated search terms from college-life data
    if (Array.isArray(searchTerms)) {
      for (const term of searchTerms.slice(0, 2)) {
        if (typeof term === "string" && term.trim()) {
          queries.push(term.trim());
        }
      }
    }

    // Fetch photos for each query in parallel
    const allPhotos: Array<{
      id: string;
      url: string;
      thumbUrl: string;
      alt: string;
      photographer: string;
      photographerUrl: string;
      category: string;
    }> = [];

    const seen = new Set<string>();

    // Category labels for display
    const categoryMap: Record<number, string> = {
      0: "Campus",
      1: "Student Life",
      2: "Campus Grounds",
      3: "Surrounding Area",
      4: "Campus Feature",
      5: "Campus Feature",
    };

    await Promise.all(
      queries.map(async (query, idx) => {
        try {
          // Use relevance sorting for better matches
          const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape&order_by=relevance`;
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
              if (seen.has(photo.id)) continue;
              seen.add(photo.id);

              // Filter out photos that are clearly unrelated
              // Check tags if available
              const tags: string[] = (photo.tags || []).map((t: any) => (t.title || "").toLowerCase());
              const desc = (photo.description || photo.alt_description || "").toLowerCase();
              const nameWords = collegeName.toLowerCase().split(/\s+/);

              // For the first two queries (campus-specific), prefer photos 
              // that have relevant tags or descriptions
              const hasRelevantTag = tags.some(t =>
                t.includes("campus") || t.includes("university") || t.includes("college") ||
                t.includes("building") || t.includes("architecture") || t.includes("school") ||
                t.includes("student") || t.includes("education") ||
                nameWords.some(w => w.length > 3 && t.includes(w))
              );
              const hasRelevantDesc =
                desc.includes("campus") || desc.includes("university") || desc.includes("college") ||
                desc.includes("building") || desc.includes("student") ||
                nameWords.some(w => w.length > 3 && desc.includes(w));

              // Only add if somewhat relevant (skip random landscape photos)
              if (idx < 2 && !hasRelevantTag && !hasRelevantDesc) {
                // For campus-specific queries, be stricter
                continue;
              }

              allPhotos.push({
                id: photo.id,
                url: photo.urls?.regular || photo.urls?.small,
                thumbUrl: photo.urls?.small || photo.urls?.thumb,
                alt: photo.alt_description || `${collegeName} - ${categoryMap[idx] || "Campus"}`,
                photographer: photo.user?.name || "Unknown",
                photographerUrl: photo.user?.links?.html || "https://unsplash.com",
                category: categoryMap[idx] || "Campus",
              });
            }
          }
        } catch (e) {
          console.error(`Failed fetching photos for "${query}":`, e);
        }
      })
    );

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
