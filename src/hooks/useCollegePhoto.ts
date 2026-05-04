import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight hook that fetches a single banner photo for a college and caches
 * it in localStorage so it loads instantly on subsequent renders.
 *
 * Now location-aware: passing the college's location lets the edge function
 * search Unsplash/Wikimedia with city + state context, so cards feel like
 * realistic photos for that specific school and region.
 */

const MEMORY_CACHE = new Map<string, string | null>();
const IN_FLIGHT = new Map<string, Promise<string | null>>();
const STORAGE_PREFIX = "collegra:photo:v3:";
const TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const REMOTE_URL_OWNER = new Map<string, string>();

type CachedEntry = { url: string | null; fetchedAt: number };

function buildKey(name: string, location?: string | null): string {
  const n = name.trim().toLowerCase();
  const l = (location || "").trim().toLowerCase();
  return l ? `${n}@@${l}` : n;
}

function readFromStorage(key: string): string | null | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (!parsed || typeof parsed.fetchedAt !== "number") return undefined;
    if (Date.now() - parsed.fetchedAt > TTL_MS) return undefined;
    return parsed.url ?? null;
  } catch {
    return undefined;
  }
}

function writeToStorage(key: string, url: string | null) {
  try {
    localStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ url, fetchedAt: Date.now() } satisfies CachedEntry),
    );
  } catch { /* quota exceeded — ignore */ }
}

function reserveUniqueRemoteUrl(key: string, url: string | null): string | null | undefined {
  if (!url) return url;
  const owner = REMOTE_URL_OWNER.get(url);
  if (owner && owner !== key) return undefined;
  REMOTE_URL_OWNER.set(url, key);
  return url;
}

async function fetchPhoto(
  collegeName: string,
  collegeLocation: string | undefined | null,
  preferredIndex = 0,
): Promise<string | null> {
  const key = buildKey(collegeName, collegeLocation);
  if (!key) return null;
  if (MEMORY_CACHE.has(key)) return MEMORY_CACHE.get(key) ?? null;

  const stored = readFromStorage(key);
  if (stored !== undefined) {
    const uniqueStored = reserveUniqueRemoteUrl(key, stored);
    if (uniqueStored !== undefined) {
      MEMORY_CACHE.set(key, uniqueStored);
      return uniqueStored;
    }
  }

  if (IN_FLIGHT.has(key)) return IN_FLIGHT.get(key)!;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("campus-photos", {
        body: { collegeName, collegeLocation: collegeLocation || undefined },
      });
      if (error) throw error;
      const photos = (data?.photos as Array<{ url?: string; thumbUrl?: string; thumbnailUrl?: string }> | undefined) || [];
      const urls = photos.map(p => p.url || p.thumbUrl || p.thumbnailUrl).filter(Boolean) as string[];
      let url: string | null = null;
      if (urls.length > 0) {
        const start = Math.abs(preferredIndex) % urls.length;
        for (let offset = 0; offset < urls.length; offset++) {
          const candidate = urls[(start + offset) % urls.length];
          const uniqueCandidate = reserveUniqueRemoteUrl(key, candidate);
          if (uniqueCandidate !== undefined) {
            url = uniqueCandidate;
            break;
          }
        }
      }
      MEMORY_CACHE.set(key, url);
      writeToStorage(key, url);
      return url;
    } catch {
      MEMORY_CACHE.set(key, null);
      return null;
    } finally {
      IN_FLIGHT.delete(key);
    }
  })();

  IN_FLIGHT.set(key, promise);
  return promise;
}

export function useCollegePhoto(
  collegeName: string | undefined | null,
  preferredIndex = 0,
  collegeLocation?: string | null,
) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!collegeName) return null;
    const key = buildKey(collegeName, collegeLocation);
    if (MEMORY_CACHE.has(key)) return MEMORY_CACHE.get(key) ?? null;
    const stored = readFromStorage(key);
    if (stored !== undefined) {
      const uniqueStored = reserveUniqueRemoteUrl(key, stored);
      if (uniqueStored !== undefined) {
        MEMORY_CACHE.set(key, uniqueStored);
        return uniqueStored;
      }
    }
    return null;
  });
  const [loaded, setLoaded] = useState<boolean>(() => {
    if (!collegeName) return true;
    return MEMORY_CACHE.has(buildKey(collegeName, collegeLocation));
  });

  useEffect(() => {
    if (!collegeName) {
      setUrl(null);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    const key = buildKey(collegeName, collegeLocation);
    if (MEMORY_CACHE.has(key)) {
      setUrl(MEMORY_CACHE.get(key) ?? null);
      setLoaded(true);
      return;
    }
    fetchPhoto(collegeName, collegeLocation, preferredIndex).then(result => {
      if (cancelled) return;
      setUrl(result);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [collegeName, collegeLocation, preferredIndex]);

  return { url, loaded };
}
