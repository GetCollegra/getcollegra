
CREATE TABLE public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own quiz answers"
  ON public.quiz_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own quiz answers"
  ON public.quiz_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_quiz_answers_user_id ON public.quiz_answers (user_id, created_at DESC);
