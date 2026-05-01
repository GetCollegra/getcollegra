// Local fallback campus image used when no per-college photo is available
// or when the remote photo fails to load. Importing as a module so Vite
// fingerprints the asset and serves it from /assets/.
import fallback from "@/assets/campus-fallback.jpg";

export const CAMPUS_FALLBACK_IMG: string = fallback;
