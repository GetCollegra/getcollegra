-- ============================================
-- user_actions: per-user interaction events
-- ============================================
CREATE TABLE public.user_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  college_name TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'view' | 'dwell' | 'click_life' | 'click_map' | 'click_save' | 'click_compare' | 'click_neighborhood' | 'click_travel'
  dwell_ms INTEGER,           -- only set for 'dwell' actions
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own actions"
  ON public.user_actions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own actions"
  ON public.user_actions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_actions_user_created ON public.user_actions(user_id, created_at DESC);
CREATE INDEX idx_user_actions_college ON public.user_actions(college_name);
CREATE INDEX idx_user_actions_type_created ON public.user_actions(action_type, created_at DESC);

-- ============================================
-- cohort_college_signals: aggregated cohort → college boost scores
-- ============================================
CREATE TABLE public.cohort_college_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_key TEXT NOT NULL,          -- e.g. "gpa:3.5-3.7|size:medium|loc:urban|cost:20-30"
  college_name TEXT NOT NULL,
  -- raw aggregated counts (last 90 days)
  view_count INTEGER NOT NULL DEFAULT 0,
  total_dwell_ms BIGINT NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  applying_count INTEGER NOT NULL DEFAULT 0,
  applied_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  cohort_size INTEGER NOT NULL DEFAULT 0,    -- # of users in cohort (for normalization)
  -- final computed boost (clamped -5..+5) the matcher applies
  behavior_boost NUMERIC NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cohort_key, college_name)
);

ALTER TABLE public.cohort_college_signals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read aggregated signals (no PII; just college name + boost)
CREATE POLICY "Authenticated can read cohort signals"
  ON public.cohort_college_signals FOR SELECT TO authenticated
  USING (true);

-- Service role only for writes (handled implicitly — no INSERT/UPDATE/DELETE policy = blocked for users)

CREATE INDEX idx_cohort_signals_lookup ON public.cohort_college_signals(cohort_key, behavior_boost DESC);
CREATE INDEX idx_cohort_signals_college ON public.cohort_college_signals(college_name);