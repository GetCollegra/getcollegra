// Local fallback campus images. We rotate between several photos so that
// colleges without a real campus photo don't all look identical. Each college
// is assigned a stable image, with collision-free indexes available for lists.
import f1 from "@/assets/campus-fallback.jpg";
import f2 from "@/assets/campus-fallback-2.jpg";
import f3 from "@/assets/campus-fallback-3.jpg";
import f4 from "@/assets/campus-fallback-4.jpg";
import f5 from "@/assets/campus-fallback-5.jpg";
import f6 from "@/assets/campus-fallback-6.jpg";
import f7 from "@/assets/campus-fallback-7.jpg";
import f8 from "@/assets/campus-fallback-8.jpg";
import f9 from "@/assets/campus-fallback-9.jpg";
import f10 from "@/assets/campus-fallback-10.jpg";
import f11 from "@/assets/campus-fallback-11.jpg";
import f12 from "@/assets/campus-fallback-12.jpg";
import f13 from "@/assets/campus-fallback-13.jpg";
import f14 from "@/assets/campus-fallback-14.jpg";
import f15 from "@/assets/campus-fallback-15.jpg";
import f16 from "@/assets/campus-fallback-16.jpg";
import f17 from "@/assets/campus-fallback-17.jpg";
import f18 from "@/assets/campus-fallback-18.jpg";
import f19 from "@/assets/campus-fallback-19.jpg";
import f20 from "@/assets/campus-fallback-20.jpg";
import f21 from "@/assets/campus-fallback-21.jpg";
import f22 from "@/assets/campus-fallback-22.jpg";
import f23 from "@/assets/campus-fallback-23.jpg";
import f24 from "@/assets/campus-fallback-24.jpg";
import f25 from "@/assets/campus-fallback-25.jpg";
import f26 from "@/assets/campus-fallback-26.jpg";
import f27 from "@/assets/campus-fallback-27.jpg";
import f28 from "@/assets/campus-fallback-28.jpg";
import f29 from "@/assets/campus-fallback-29.jpg";
import f30 from "@/assets/campus-fallback-30.jpg";
import f31 from "@/assets/campus-fallback-31.jpg";
import f32 from "@/assets/campus-fallback-32.jpg";
import f33 from "@/assets/campus-fallback-33.jpg";
import f34 from "@/assets/campus-fallback-34.jpg";
import f35 from "@/assets/campus-fallback-35.jpg";
import f36 from "@/assets/campus-fallback-36.jpg";
import f37 from "@/assets/campus-fallback-37.jpg";
import f38 from "@/assets/campus-fallback-38.jpg";
import f39 from "@/assets/campus-fallback-39.jpg";
import f40 from "@/assets/campus-fallback-40.jpg";
import f41 from "@/assets/campus-fallback-41.jpg";
import f42 from "@/assets/campus-fallback-42.jpg";
import f43 from "@/assets/campus-fallback-43.jpg";
import f44 from "@/assets/campus-fallback-44.jpg";
import f45 from "@/assets/campus-fallback-45.jpg";
import f46 from "@/assets/campus-fallback-46.jpg";
import f47 from "@/assets/campus-fallback-47.jpg";
import f48 from "@/assets/campus-fallback-48.jpg";
import f49 from "@/assets/campus-fallback-49.jpg";
import f50 from "@/assets/campus-fallback-50.jpg";
import f51 from "@/assets/campus-fallback-51.jpg";
import f52 from "@/assets/campus-fallback-52.jpg";
import f53 from "@/assets/campus-fallback-53.jpg";
import f54 from "@/assets/campus-fallback-54.jpg";

export const CAMPUS_FALLBACKS: string[] = [
  f1, f2, f3, f4, f5, f6, f7, f8, f9,
  f10, f11, f12, f13, f14, f15, f16, f17, f18,
  f19, f20, f21, f22, f23, f24, f25, f26, f27,
  f28, f29, f30, f31, f32, f33, f34, f35, f36,
  f37, f38, f39, f40, f41, f42, f43, f44, f45,
  f46, f47, f48, f49, f50, f51, f52, f53, f54,
];

// Generic single fallback (kept for legacy imports).
export const CAMPUS_FALLBACK_IMG: string = f1;

// Region buckets: which fallback indexes look most appropriate for each US region.
// Indexes refer to positions in CAMPUS_FALLBACKS above (0-based).
// These groupings are heuristic — they bias the picker toward climate/architecture
// that matches the school's actual region so generic fallbacks still feel believable.
const REGION_BUCKETS: Record<string, number[]> = {
  northeast: [0, 1, 7, 12, 18, 22, 27, 31, 36, 40, 45, 49],   // brick / ivy / autumn
  southeast: [2, 8, 13, 19, 24, 29, 34, 38, 43, 47, 51],       // green / humid / colonial
  midwest:   [3, 9, 14, 20, 25, 30, 35, 39, 44, 48, 52],       // limestone / open quads
  southwest: [4, 10, 15, 21, 26, 32, 37, 41, 46, 50, 53],      // desert / adobe / sun
  west:      [5, 11, 16, 23, 28, 33, 42],                       // coastal / modern / palm
  mountain:  [6, 17, 33, 42],                                   // snow / pine / stone
};

const STATE_TO_REGION: Record<string, keyof typeof REGION_BUCKETS> = {
  // Northeast
  ME: "northeast", NH: "northeast", VT: "northeast", MA: "northeast", RI: "northeast",
  CT: "northeast", NY: "northeast", NJ: "northeast", PA: "northeast", DE: "northeast", MD: "northeast", DC: "northeast",
  // Southeast
  VA: "southeast", WV: "southeast", KY: "southeast", TN: "southeast", NC: "southeast", SC: "southeast",
  GA: "southeast", FL: "southeast", AL: "southeast", MS: "southeast", AR: "southeast", LA: "southeast",
  // Midwest
  OH: "midwest", MI: "midwest", IN: "midwest", IL: "midwest", WI: "midwest", MN: "midwest",
  IA: "midwest", MO: "midwest", ND: "midwest", SD: "midwest", NE: "midwest", KS: "midwest",
  // Southwest
  TX: "southwest", OK: "southwest", NM: "southwest", AZ: "southwest",
  // Mountain
  CO: "mountain", UT: "mountain", WY: "mountain", MT: "mountain", ID: "mountain",
  // West / Pacific
  CA: "west", OR: "west", WA: "west", NV: "west", HI: "west", AK: "mountain",
};

function getRegionFromLocation(location?: string | null): keyof typeof REGION_BUCKETS | null {
  if (!location) return null;
  // location format is "City, ST" — grab the trailing 2-letter state
  const match = location.match(/,\s*([A-Z]{2})(\b|$)/);
  if (!match) return null;
  return STATE_TO_REGION[match[1]] ?? null;
}

export function getCollegeFallbackKey(collegeName: string | undefined | null): string {
  return (collegeName || "").trim().toLowerCase();
}

/** Stable string hash (djb2 variant) — deterministic across renders. */
function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Pick a stable fallback image for a given college name, biased toward the
 * school's US region so the photo feels regionally accurate (e.g. desert
 * imagery for Arizona schools, snowy/pine for Colorado, coastal for California).
 *
 * Same (name, region) → same image. Falls back to a deterministic hash if no
 * region info is available.
 */
export function getFallbackForCollege(
  collegeName: string | undefined | null,
  preferredIndex?: number,
  location?: string | null,
): string {
  if (Number.isInteger(preferredIndex) && preferredIndex! >= 0) {
    return CAMPUS_FALLBACKS[preferredIndex! % CAMPUS_FALLBACKS.length];
  }
  const key = getCollegeFallbackKey(collegeName);
  if (!key) return CAMPUS_FALLBACKS[0];

  const region = getRegionFromLocation(location);
  if (region) {
    const bucket = REGION_BUCKETS[region];
    const idx = bucket[hashString(key) % bucket.length];
    return CAMPUS_FALLBACKS[idx];
  }

  const idx = hashString(key) % CAMPUS_FALLBACKS.length;
  return CAMPUS_FALLBACKS[idx];
}

/**
 * Create unique fallback assignments for the current college universe.
 * Removes hash collisions so different schools do not share fallback art
 * until the full image library has been exhausted. When a college's location
 * is provided, the picker prefers a region-appropriate image first and only
 * falls outside the region bucket if every regional image is already taken.
 *
 * Accepts either an array of names (legacy) or an array of `{ name, location }`.
 */
export function createUniqueFallbackIndexes(
  colleges: Array<string | undefined | null | { name?: string | null; location?: string | null }>,
): Map<string, number> {
  const assigned = new Map<string, number>();
  const used = new Set<number>();

  for (const entry of colleges) {
    const isObj = typeof entry === "object" && entry !== null;
    const name = isObj ? ((entry as { name?: string | null }).name ?? null) : ((entry as string | null | undefined) ?? null);
    const location = isObj ? ((entry as { location?: string | null }).location ?? null) : null;
    const key = getCollegeFallbackKey(name);
    if (!key || assigned.has(key)) continue;

    const region = getRegionFromLocation(location);
    const regionalPool = region ? REGION_BUCKETS[region] : null;

    let chosen: number | null = null;

    // 1. Try regional pool first (rotated by stable hash)
    if (regionalPool && regionalPool.length > 0) {
      const start = hashString(key) % regionalPool.length;
      for (let offset = 0; offset < regionalPool.length; offset++) {
        const candidate = regionalPool[(start + offset) % regionalPool.length];
        if (!used.has(candidate)) { chosen = candidate; break; }
      }
    }

    // 2. Fall back to the full library if the region bucket is exhausted
    if (chosen === null) {
      const base = hashString(key) % CAMPUS_FALLBACKS.length;
      for (let offset = 0; offset < CAMPUS_FALLBACKS.length; offset++) {
        const candidate = (base + offset) % CAMPUS_FALLBACKS.length;
        if (!used.has(candidate)) { chosen = candidate; break; }
      }
    }

    if (chosen === null) chosen = hashString(key) % CAMPUS_FALLBACKS.length;
    used.add(chosen);
    assigned.set(key, chosen);
  }

  return assigned;
}

