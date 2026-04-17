/**
 * Lightweight client-side action tracker.
 *
 * Records: views, dwell time, and key clicks on college pages.
 * Events are batched in-memory and flushed:
 *   - on a 5s interval
 *   - on page hide (using sendBeacon when available)
 *   - immediately when the queue exceeds 10 events
 *
 * Only fires for logged-in users. Silent on failure — never blocks UX.
 */
import { supabase } from "@/integrations/supabase/client";

export type ActionType =
  | "view"
  | "dwell"
  | "click_life"
  | "click_map"
  | "click_save"
  | "click_compare"
  | "click_neighborhood"
  | "click_travel";

type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

interface QueuedAction {
  user_id: string;
  college_name: string;
  action_type: ActionType;
  dwell_ms?: number;
  metadata?: Json;
}

const queue: QueuedAction[] = [];
const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 10;
let flushTimer: number | null = null;
let listenersAttached = false;

const ensureFlushScheduled = () => {
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
};

const flush = async (sync = false): Promise<void> => {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    if (sync && navigator.sendBeacon) {
      // Best-effort sync send on unload — uses anon REST endpoint
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_actions`;
      const blob = new Blob([JSON.stringify(batch)], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
    const { error } = await supabase.from("user_actions").insert(batch);
    if (error) {
      // Silent — re-queue at most once to avoid memory growth
      if (queue.length < 50) queue.push(...batch);
    }
  } catch {
    /* ignore */
  }
};

const attachUnloadListeners = () => {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  window.addEventListener("pagehide", () => void flush(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true);
  });
};

const enqueue = async (
  collegeName: string,
  actionType: ActionType,
  extras: { dwell_ms?: number; metadata?: Record<string, unknown> } = {}
): Promise<void> => {
  if (!collegeName) return;
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return; // anonymous — don't track

    attachUnloadListeners();

    queue.push({
      user_id: userId,
      college_name: collegeName,
      action_type: actionType,
      dwell_ms: extras.dwell_ms,
      metadata: extras.metadata ?? {},
    });

    if (queue.length >= MAX_BATCH) {
      void flush();
    } else {
      ensureFlushScheduled();
    }
  } catch {
    /* ignore — tracking should never throw */
  }
};

export const trackCollegeAction = (
  collegeName: string,
  actionType: ActionType,
  metadata?: Record<string, unknown>
): void => {
  void enqueue(collegeName, actionType, { metadata });
};

export const trackCollegeDwell = (collegeName: string, dwellMs: number): void => {
  if (dwellMs < 1500) return; // ignore noise (<1.5s = bounce)
  if (dwellMs > 30 * 60 * 1000) return; // cap at 30 min (likely tab left open)
  void enqueue(collegeName, "dwell", { dwell_ms: Math.round(dwellMs) });
};
