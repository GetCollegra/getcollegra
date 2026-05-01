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

export const CAMPUS_FALLBACKS: string[] = [
  f1, f2, f3, f4, f5, f6, f7, f8, f9,
  f10, f11, f12, f13, f14, f15, f16, f17, f18,
];

// Generic single fallback (kept for legacy imports).
export const CAMPUS_FALLBACK_IMG: string = f1;

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
 * Pick a stable fallback image for a given college name.
 * Same name → same image, with an optional collision-free list index.
 */
export function getFallbackForCollege(collegeName: string | undefined | null, preferredIndex?: number): string {
  if (Number.isInteger(preferredIndex) && preferredIndex! >= 0) {
    return CAMPUS_FALLBACKS[preferredIndex! % CAMPUS_FALLBACKS.length];
  }
  const key = getCollegeFallbackKey(collegeName);
  if (!key) return CAMPUS_FALLBACKS[0];
  const idx = hashString(key) % CAMPUS_FALLBACKS.length;
  return CAMPUS_FALLBACKS[idx];
}

/**
 * Create unique fallback assignments for the current college universe.
 * This removes hash collisions so different schools do not share fallback art
 * until the full image library has been exhausted.
 */
export function createUniqueFallbackIndexes(collegeNames: Array<string | undefined | null>): Map<string, number> {
  const assigned = new Map<string, number>();
  const used = new Set<number>();

  for (const name of collegeNames) {
    const key = getCollegeFallbackKey(name);
    if (!key || assigned.has(key)) continue;

    const base = hashString(key) % CAMPUS_FALLBACKS.length;
    let chosen = base;
    for (let offset = 0; offset < CAMPUS_FALLBACKS.length; offset++) {
      const candidate = (base + offset) % CAMPUS_FALLBACKS.length;
      if (!used.has(candidate)) {
        chosen = candidate;
        used.add(candidate);
        break;
      }
    }
    assigned.set(key, chosen);
  }

  return assigned;
}
