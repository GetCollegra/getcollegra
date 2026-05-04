import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UNSPLASH_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");
if (!UNSPLASH_KEY) {
  console.error("UNSPLASH_ACCESS_KEY secret is not configured");
}

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
  for (const [key, abbrs] of Object.entries(knownAbbreviations)) {
    if (lower.includes(key)) return abbrs;
  }
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
  const sigWords = collegeName.split(/\s+/)
    .filter(w => w.length > 3 && !["university", "college", "institute", "the", "and", "state"].includes(w.toLowerCase()));
  if (sigWords.length >= 2) {
    const matched = sigWords.filter(w => lower.includes(w.toLowerCase())).length;
    if (matched >= 2) return true;
  }
  return false;
}

async function fetchWikimediaPhotos(collegeName: string, abbreviations: string[], city: string, state: string) {
  const photos: any[] = [];
  const locSuffix = [city, state].filter(Boolean).join(" ");

  const searches = [
    `"${collegeName}" ${locSuffix}`.trim(),
    `"${collegeName}"`,
    collegeName,
    ...abbreviations.filter(a => a.length >= 4).map(a => `"${a}" ${locSuffix} campus`.trim()),
  ];

  for (const searchTerm of searches) {
    if (photos.length >= 8) break;
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(searchTerm + " campus OR building OR hall")}&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=800&format=json`;
      const res = await fetch(url);
      if (!res.ok) { await res.text(); continue; }
      const data = await res.json();
      const pages = data?.query?.pages || {};

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
        const combinedLower = combined.toLowerCase();

        const nonUSSignals = ["lyon", "france", "germany", "japan", "china", "india", "brazil", "uk", "england", "australia", "canada"];
        if (nonUSSignals.some(s => combinedLower.includes(s))) continue;

        if (!matchesCollege(combined, collegeName, abbreviations)) continue;

        const titleLower = title.toLowerCase();
        const descLower = desc.toLowerCase();
        const blockedKeywords = [
          "logo", "seal", "map", "diagram", "chart", "icon", ".svg",
          "blueprint", "plan", "drawing", "sketch", "schematic", "floorplan",
          "floor plan", "elevation", "rendering", "render", "illustration",
          "engraving", "lithograph", "diagram", "coat of arms", "crest",
          "emblem", "shield", "flag", "banner",
        ];
        if (blockedKeywords.some(kw => titleLower.includes(kw) || descLower.includes(kw))) continue;

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

async function fetchUnsplashPhotos(collegeName: string, city: string, state: string) {
  const photos: any[] = [];
  const loc = [city, state].filter(Boolean).join(", ");

  // Tightly location-aware queries — try collegeName + city first, then
  // fall back to scenic city/state imagery so the photo still feels regionally accurate.
  const queries = [
    `"${collegeName}" campus`,
    loc ? `"${collegeName}" ${city}` : null,
    loc ? `${city} ${state} university campus` : null,
    loc ? `${city} ${state} downtown skyline architecture` : null,
    loc ? `${city} ${state} historic college buildings` : null,
    state ? `${state} college campus quad` : null,
  ].filter(Boolean) as string[];

  for (const query of queries) {
    if (photos.length >= 6) break;
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

        const isCampusQuery = query.toLowerCase().includes(collegeName.toLowerCase()) ||
                              query.toLowerCase().includes("campus") ||
                              query.toLowerCase().includes("university");
        const category = isCampusQuery ? "Campus" : "Surrounding Area";

        photos.push({
          id,
          url: photo.urls?.regular || photo.urls?.small,
          thumbUrl: photo.urls?.small || photo.urls?.thumb,
          alt: photo.alt_description || `${collegeName} ${loc} photo`,
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

function parseLocation(loc?: string): { city: string; state: string } {
  if (!loc || typeof loc !== "string") return { city: "", state: "" };
  const parts = loc.split(",").map(p => p.trim()).filter(Boolean);
  return { city: parts[0] || "", state: parts[1] || "" };
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
    const { city, state } = parseLocation(collegeLocation);

    console.log(`Fetching photos for: ${collegeName} (abbrs: ${abbreviations.join(", ")}), city: ${city}, state: ${state}`);

    // Curated overrides for schools where Wikimedia/Unsplash search returns
    // poor results (blueprints, logos, off-topic shots). Hand-picked photos.
    const CURATED: Record<string, { url: string; alt: string }[]> = {
      "university of miami": [
        {
          url: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1200&q=80",
          alt: "Palm trees and tropical campus architecture in Coral Gables, Florida",
        },
      ],
    };
    const curatedKey = collegeName.trim().toLowerCase();
    const curatedHit = CURATED[curatedKey];
    if (curatedHit && curatedHit.length > 0) {
      const photos = curatedHit.map((p, i) => ({
        id: `curated-${curatedKey}-${i}`,
        url: p.url,
        thumbUrl: p.url,
        alt: p.alt,
        photographer: "Unsplash",
        photographerUrl: "https://unsplash.com/?utm_source=collegra&utm_medium=referral",
        category: "Campus",
      }));
      console.log(`Returning curated photo for ${collegeName}`);
      return new Response(
        JSON.stringify({ photos }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [wikiPhotos, unsplashPhotos] = await Promise.all([
      fetchWikimediaPhotos(collegeName, abbreviations, city, state),
      fetchUnsplashPhotos(collegeName, city, state),
    ]);

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
