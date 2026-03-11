
ALTER TABLE public.college_matches 
  ADD COLUMN IF NOT EXISTS ai_status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS ai_error text,
  ADD COLUMN IF NOT EXISTS results_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS results_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS raw_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_college_matches_ai_status ON public.college_matches(user_id, ai_status, created_at DESC);

CREATE POLICY "Users can update own matches"
  ON public.college_matches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
