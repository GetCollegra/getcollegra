ALTER TABLE public.college_vibe_reviews 
ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '[]'::jsonb;