import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UNSPLASH_KEY = "0RFOIUa03s7zce9GGNz3G-5HP17u0kyybFzk2WQlR0k";

// Well-known abbreviations for US colleges
const knownAbbreviations: Record<string, string[]> = {
  "new jersey institute of technology": ["NJIT"],
  "massachusetts institute of technology": ["MIT"],
  "university of california los angeles": ["UCLA"],
  "university of california berkeley": ["UC Berkeley", "Cal"],
  "university of southern california": ["USC"],
  "georgia institute of technology": ["Georgia Tech"],
  "california institute of technology": ["Caltech"],
  "university of north carolina": ["UNC"],
  "texas christian university": ["TCU"],
  "university of colorado boulder": ["CU Boulder"],
  "university of illinois urbana-champaign": ["UIUC"],
  "new york university": ["NYU"],
  "ohio state university": ["OSU"],
  "penn state university": ["Penn State"],
  "virginia polytechnic institute": ["Virginia Tech"],
  "rensselaer polytechnic institute": ["RPI"],
};

function getAbbreviations(name: string): string[] {
  const lower = name.toLowerCase();
  // Check known abbreviations
  for (const [key, abbrs] of Object.entries(knownAbbreviations)) {
    if (lower.includes(key)) return abbrs;
  }
  // Generate acronym from significant words
  const words = name.split(/\s+/);
  if (words.length <= 2) return [name];
  const acronym = words
    .filter(w => !["of", "the", "and", "at", "in", "for"].includes(w.toLowerCase()))
    .map(w => w[0].toUpperCase())
    .join("");
  return acronym.length >= 3 ? [acronym] : [];
}

function matchesCollege(text: string, collegeName: string, abbreviations: string[]): boolean {
  const lower = text.toLowerCase();
  
  if (lower.includes(collegeName.toLowerCase())) return true;
  
  for (const abbr of abbreviations) {
    if (abbr.length >= 2 && lower.includes(abbr.toLowerCase())) return true;
  }

  // Match on 2+ significant words from the name
  const sigWords = collegeName.split(/\s+/)
    .filter(w => w.length > 3 && !["university", "college", "institute", "the", "and", "state"].includes(w.toLowerCase()));
  if (sigWords.length >= 2) {
    const matched = sigWords.filter(w => lower.includes(w.toLowerCase())).length;
    if (matched >= 2) return true;
  }
  
  return false;
}

async function fetchWikimediaPhotos(collegeName: string, abbreviations: string[]) {
  const photos: any[] = [];
  
  // Search with full name first, then abbreviations — but always with campus context
  const searches = [
    `"${collegeName}"`,
    ...abbreviations.filter(a => a.length >= 4).map(a => `"${a}" campus`),
  ];

  for (const searchTerm of searches) {
    if (photos.length >= 8) break;
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(searchTerm + " campus OR building OR hall")}&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=800&format=json`;
      console.log("Wikimedia search:", searchTerm);
      const res = await fetch(url);
      if (!res.ok) { await res.text(); continue; }
      const data = await res.json();
      const pages = data?.query?.pages || {};
      console.log(`Wikimedia returned ${Object.keys(pages).length} results for "${searchTerm}"`);

      for (const page of Object.values(pages) as any[]) {
        if (photos.length >= 8) break;
        const title = page.title || "";
        const ii = (page.imageinfo || [{}])[0];
        const mime = ii.mime || "";

        if (!mime.startsWith("image/") || mime.includes("svg")) continue;

        const desc = ii.extmetadata?.ImageDescription?.value || "";
        const cats = ii.extmetadata?.Categories?.value || "";
        const artist = ii.extmetadata?.Artist?.value || "";
        const combined = `${title} ${desc} ${cats}`;

        // STRICT US check: reject if it mentions non-US locations
        const combinedLower = combined.toLowerCase();
        const nonUSSignals = ["lyon", "france", "germany", "japan", "china", "india", "brazil", "uk", "england", "australia", "canada"];
        if (nonUSSignals.some(s => combinedLower.includes(s))) {
          console.log(`Rejected (non-US): ${title}`);
          continue;
        }

        if (!matchesCollege(combined, collegeName, abbreviations)) {
          console.log(`Rejected (no match): ${title}`);
          continue;
        }

        const titleLower = title.toLowerCase();
        if (titleLower.includes("logo") || titleLower.includes("seal") || 
            titleLower.includes("map") || titleLower.includes("diagram") ||
            titleLower.includes("chart") || titleLower.includes("icon") ||
            titleLower.includes(".svg")) continue;

        const photoId = `wiki-${page.pageid}`;
        if (photos.some(p => p.id === photoId)) continue;

        const cleanArtist = artist.replace(/<[^>]*>/g, "").trim() || "Wikimedia Commons";
        
        let category = "Campus";
        const cl = combined.toLowerCase();
        if (cl.includes("hall") || cl.includes("building") || cl.includes("center")) category = "Buildings";
        else if (cl.includes("aerial") || cl.includes("panoram")) category = "Overview";
        else if (cl.includes("library")) category = "Library";
        else if (cl.includes("dorm") || cl.includes("residence")) category = "Housing";
        else if (cl.includes("entrance") || cl.includes("gate")) category = "Entrance";

        console.log(`Accepted: ${title} → ${category}`);

        photos.push({
          id: photoId,
          url: ii.url || ii.thumburl,
          thumbUrl: ii.thumburl || ii.url,
          alt: desc.replace(/<[^>]*>/g, "").slice(0, 150) || `${collegeName} - ${category}`,
          photographer: cleanArtist,
          photographerUrl: ii.descriptionurl || "https://commons.wikimedia.org",
          category,
        });
      }
    } catch (e) {
      console.error("Wikimedia fetch error:", e);
    }
  }

  return photos;
}

async function fetchUnsplashPhotos(collegeName: string, city: string) {
  const photos: any[] = [];
  
  const queries = [
    `"${collegeName}" campus building`,
    city ? `${city} university area neighborhood` : null,
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

        const isAreaQuery = query.includes("city");
        const category = isAreaQuery ? "Surrounding Area" : "Campus";

        photos.push({
          id,
          url: photo.urls?.regular || photo.urls?.small,
          thumbUrl: photo.urls?.small || photo.urls?.thumb,
          alt: photo.alt_description || `${isAreaQuery ? city : collegeName} photo`,
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
    const { collegeName, collegeLocation } = await req.json();

    if (!collegeName || typeof collegeName !== "string") {
      return new Response(JSON.stringify({ error: "collegeName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const abbreviations = getAbbreviations(collegeName);
    const city = typeof collegeLocation === "string"
      ? collegeLocation.split(",")[0].trim()
      : "";

    console.log(`Fetching photos for: ${collegeName} (abbrs: ${abbreviations.join(", ")}), city: ${city}`);

    const [wikiPhotos, unsplashPhotos] = await Promise.all([
      fetchWikimediaPhotos(collegeName, abbreviations),
      fetchUnsplashPhotos(collegeName, city),
    ]);

    // Prioritize Wikimedia (verified) then Unsplash (supplementary)
    const allPhotos = [...wikiPhotos, ...unsplashPhotos];
    const seen = new Set<string>();
    const unique = allPhotos.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    console.log(`Total: ${unique.length} (wiki: ${wikiPhotos.length}, unsplash: ${unsplashPhotos.length})`);

    return new Response(
      JSON.stringify({ photos: unique.slice(0, 12) }),
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
