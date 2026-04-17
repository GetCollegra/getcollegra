CREATE TABLE IF NOT EXISTS public.user_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  college_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  dwell_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_actions'
      AND policyname = 'Users can insert own actions'
  ) THEN
    CREATE POLICY "Users can insert own actions"
      ON public.user_actions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_actions'
      AND policyname = 'Users can read own actions'
  ) THEN
    CREATE POLICY "Users can read own actions"
      ON public.user_actions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_user_actions_user_created
  ON public.user_actions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_actions_college
  ON public.user_actions(college_name);

CREATE INDEX IF NOT EXISTS idx_user_actions_type_created
  ON public.user_actions(action_type, created_at DESC);