/**
 * Lightweight client-side action tracker.
 *
 * Records: views, dwell time, and key clicks on college pages.
 * Sends events IMMEDIATELY (no batching) so they appear in Supabase
 * without delay — easier to debug and small enough volume to not matter.
 *
 * Only fires for logged-in users. Logs every step to the console so the
 * pipeline is visible end-to-end.
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

const DEBUG = true; // flip to false once verified

const log = (...args: unknown[]) => {
  if (DEBUG) console.log("[track]", ...args);
};
const warn = (...args: unknown[]) => {
  if (DEBUG) console.warn("[track]", ...args);
};
const errorLog = (...args: unknown[]) => {
  console.error("[track]", ...args);
};

/** Insert a single row immediately. No batching — easier to verify. */
const insertAction = async (
  collegeName: string,
  actionType: ActionType,
  extras: { dwell_ms?: number; metadata?: Record<string, unknown> } = {}
): Promise<void> => {
  if (!collegeName) {
    warn("skip: no college name");
    return;
  }

  // 1. Auth check
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    errorLog("auth.getSession error:", sessionErr.message);
    return;
  }
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    warn(`skip ${actionType} for "${collegeName}" — no authenticated user`);
    return;
  }

  // 2. Build payload
  const payload = {
    user_id: userId,
    college_name: collegeName,
    action_type: actionType,
    dwell_ms: extras.dwell_ms ?? null,
    metadata: (extras.metadata ?? {}) as Json,
  };

  log(`→ inserting ${actionType}`, { college: collegeName, user: userId, dwell_ms: payload.dwell_ms });

  // 3. Insert with detailed error reporting
  try {
    const { data, error, status } = await supabase
      .from("user_actions")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      errorLog(`insert FAILED (status=${status}) for ${actionType} / ${collegeName}:`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        payload,
      });
      return;
    }
    log(`✓ inserted ${actionType} for "${collegeName}" → row id=${data?.id}`);
  } catch (e) {
    errorLog(`insert THREW for ${actionType} / ${collegeName}:`, e);
  }
};

export const trackCollegeAction = (
  collegeName: string,
  actionType: ActionType,
  metadata?: Record<string, unknown>
): void => {
  log(`tracking ${actionType} on "${collegeName}"`);
  void insertAction(collegeName, actionType, { metadata });
};

export const trackCollegeDwell = (collegeName: string, dwellMs: number): void => {
  if (dwellMs < 1500) {
    log(`skip dwell — too short (${dwellMs}ms < 1500ms) for "${collegeName}"`);
    return;
  }
  if (dwellMs > 30 * 60 * 1000) {
    log(`skip dwell — too long (${dwellMs}ms > 30min) for "${collegeName}"`);
    return;
  }
  log(`tracking dwell ${Math.round(dwellMs)}ms on "${collegeName}"`);
  void insertAction(collegeName, "dwell", { dwell_ms: Math.round(dwellMs) });
};
