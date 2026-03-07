CREATE TABLE public.survey_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email TEXT,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.survey_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts" ON public.survey_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "No public reads" ON public.survey_submissions
  FOR SELECT TO anon, authenticated
  USING (false);