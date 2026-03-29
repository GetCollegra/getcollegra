import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UNSPLASH_KEY = "0RFOIUa03s7zce9GGNz3G-5HP17u0kyybFzk2WQlR0k";

// Extract abbreviation or short name from college name
function getShortName(name: string): string {
  // Common patterns: "University of X" → "UofX", acronyms, etc.
  const words = name.split(/\s+/);
  if (words.length <= 2) return name;
  // Try acronym of major words
  const acronym = words
    .filter(w => !["of", "the", "and", "at", "in", "for"].includes(w.toLowerCase()))
    .map(w => w[0])
    .join("");
  return acronym.length >= 2 ? acronym : name;
}

// Check if a string contains any form of the college name
function matchesCollege(text: string, collegeName: string, shortName: string): boolean {
  const lower = text.toLowerCase();
  const nameLower = collegeName.toLowerCase();
  
  // Direct match
  if (lower.includes(nameLower)) return true;
  
  // Short name / acronym match (only if 3+ chars to avoid false positives)
  if (shortName.length >= 3 && lower.includes(shortName.toLowerCase())) return true;
  
  // Check significant words from the college name (3+ word colleges)
  const significantWords = collegeName.split(/\s+/)
    .filter(w => w.length > 3 && !["university", "college", "institute", "the", "and"].includes(w.toLowerCase()));
  if (significantWords.length >= 2) {
    const matchCount = significantWords.filter(w => lower.includes(w.toLowerCase())).length;
    if (matchCount >= 2) return true;
  }
  
  return false;
}

// Fetch from Wikimedia Commons — real, verified, properly tagged photos
async function fetchWikimediaPhotos(collegeName: string, shortName: string): Promise<Array<{
  id: string; url: string; thumbUrl: string; alt: string;
  photographer: string; photographerUrl: string; category: string;
}>> {
  const photos: Array<any> = [];

  // Try multiple search variants
  const searches = [
    `"${collegeName}" campus`,
    `"${shortName}" campus`,
    `"${collegeName}"`,
  ];

  for (const search of searches) {
    if (photos.length >= 8) break;
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(search)}&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=800&format=json`;
      const res = await fetch(url);
      if (!res.ok) { await res.text(); continue; }
      const data = await res.json();
      const pages = data?.query?.pages || {};

      for (const page of Object.values(pages) as any[]) {
        const title = page.title || "";
        const ii = (page.imageinfo || [{}])[0];
        const mime = ii.mime || "";

        // Only accept image files (not SVG logos, PDFs, etc.)
        if (!mime.startsWith("image/") || mime.includes("svg")) continue;

        const desc = ii.extmetadata?.ImageDescription?.value || "";
        const cats = ii.extmetadata?.Categories?.value || "";
        const artist = ii.extmetadata?.Artist?.value || "";
        const license = ii.extmetadata?.LicenseShortName?.value || "";

        // STRICT: must match the college name in title, description, or categories
        const combined = `${title} ${desc} ${cats}`;
        if (!matchesCollege(combined, collegeName, shortName)) continue;

        // Skip logos, maps, diagrams
        const titleLower = title.toLowerCase();
        if (titleLower.includes("logo") || titleLower.includes("seal") || 
            titleLower.includes("map") || titleLower.includes("diagram") ||
            titleLower.includes("chart") || titleLower.includes("icon")) continue;

        // Skip if already seen
        const photoId = `wiki-${page.pageid}`;
        if (photos.some(p => p.id === photoId)) continue;

        // Clean artist name (strip HTML)
        const cleanArtist = artist.replace(/<[^>]*>/g, "").trim() || "Wikimedia Commons";

        // Determine category from title/description
        let category = "Campus";
        const cl = combined.toLowerCase();
        if (cl.includes("hall") || cl.includes("building") || cl.includes("center")) category = "Buildings";
        else if (cl.includes("aerial") || cl.includes("overview") || cl.includes("panoram")) category = "Overview";
        else if (cl.includes("entrance") || cl.includes("gate")) category = "Entrance";
        else if (cl.includes("library")) category = "Library";
        else if (cl.includes("dorm") || cl.includes("residence")) category = "Housing";

        photos.push({
          id: photoId,
          url: ii.url || ii.thumburl,
          thumbUrl: ii.thumburl || ii.url,
          alt: desc.replace(/<[^>]*>/g, "").slice(0, 120) || `${collegeName} - ${category}`,
          photographer: cleanArtist,
          photographerUrl: ii.descriptionurl || "https://commons.wikimedia.org",
          category,
        });
      }
    } catch (e) {
      console.error(`Wikimedia search error for "${search}":`, e);
    }
  }

  return photos;
}

// Fetch from Unsplash — supplementary area photos only
async function fetchUnsplashPhotos(collegeName: string, city: string): Promise<Array<{
  id: string; url: string; thumbUrl: string; alt: string;
  photographer: string; photographerUrl: string; category: string;
}>> {
  const photos: Array<any> = [];
  
  // Only search for the specific campus + surrounding city
  const queries = [
    `${collegeName} campus`,
    city ? `${city} downtown cityscape` : null,
  ].filter(Boolean) as string[];

  for (const query of queries) {
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4&orientation=landscape&order_by=relevance`;
      const res = await fetch(url, {
        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
      });
      if (!res.ok) { await res.text(); continue; }
      const data = await res.json();

      for (const photo of (data.results || [])) {
        const id = `unsplash-${photo.id}`;
        if (photos.some(p => p.id === id)) continue;

        // For campus queries, verify relevance via tags
        const tags: string[] = (photo.tags || []).map((t: any) => (t.title || "").toLowerCase());
        const desc = (photo.description || photo.alt_description || "").toLowerCase();
        const isAreaQuery = query.includes("downtown") || query.includes("cityscape");
        
        if (!isAreaQuery) {
          // For campus queries, require some campus/university signal
          const hasSignal = tags.some(t =>
            t.includes("campus") || t.includes("university") || t.includes("college") ||
            t.includes("building") || t.includes("education") || t.includes("school")
          ) || desc.includes("campus") || desc.includes("university") || desc.includes("college");
          if (!hasSignal) continue;
        }

        const category = isAreaQuery ? "Surrounding Area" : "Campus";

        photos.push({
          id,
          url: photo.urls?.regular || photo.urls?.small,
          thumbUrl: photo.urls?.small || photo.urls?.thumb,
          alt: photo.alt_description || `${collegeName} area`,
          photographer: photo.user?.name || "Unknown",
          photographerUrl: `${photo.user?.links?.html || "https://unsplash.com"}?utm_source=collegra&utm_medium=referral`,
          category,
        });
      }
    } catch (e) {
      console.error(`Unsplash error for "${query}":`, e);
    }
  }

  return photos;
}

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

    const shortName = getShortName(collegeName);
    const city = typeof collegeLocation === "string"
      ? collegeLocation.split(",")[0].trim()
      : "";

    // Fetch from both sources in parallel
    const [wikiPhotos, unsplashPhotos] = await Promise.all([
      fetchWikimediaPhotos(collegeName, shortName),
      fetchUnsplashPhotos(collegeName, city),
    ]);

    // Prioritize Wikimedia (verified) then Unsplash (supplementary)
    const allPhotos = [...wikiPhotos, ...unsplashPhotos];

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = allPhotos.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    return new Response(
      JSON.stringify({
        photos: unique.slice(0, 12),
        sources: {
          wikimedia: wikiPhotos.length,
          unsplash: unsplashPhotos.length,
        },
      }),
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
