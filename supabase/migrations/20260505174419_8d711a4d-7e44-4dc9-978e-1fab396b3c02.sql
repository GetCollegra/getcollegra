CREATE TABLE IF NOT EXISTS public.campus_area_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_name TEXT NOT NULL UNIQUE,
  nearby JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campus_area_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read campus area cache"
ON public.campus_area_cache
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manages campus area cache"
ON public.campus_area_cache
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS campus_area_cache_name_idx ON public.campus_area_cache (college_name);