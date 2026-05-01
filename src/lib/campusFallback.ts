// Local fallback campus images. We rotate between several photos so that
// colleges without a real campus photo don't all look identical. Each college
// is assigned a stable image based on a hash of its name, so the same school
// always gets the same fallback.
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
 * Same name → same image, different names → likely different images.
 */
export function getFallbackForCollege(collegeName: string | undefined | null): string {
  if (!collegeName) return CAMPUS_FALLBACKS[0];
  const idx = hashString(collegeName.trim().toLowerCase()) % CAMPUS_FALLBACKS.length;
  return CAMPUS_FALLBACKS[idx];
}
