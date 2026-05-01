-- College Lists table for "Trending College Lists" feature
CREATE TABLE public.college_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  emoji text NOT NULL DEFAULT '🎓',
  category text NOT NULL DEFAULT 'general',
  colleges jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.college_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read college lists"
ON public.college_lists FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX idx_college_lists_order ON public.college_lists(display_order);

-- Cache table for AI-generated college vibe reviews
CREATE TABLE public.college_vibe_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_name text NOT NULL UNIQUE,
  summary text NOT NULL DEFAULT '',
  snippets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ratings jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_note text NOT NULL DEFAULT 'AI-summarized from public sources',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.college_vibe_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read vibe reviews"
ON public.college_vibe_reviews FOR SELECT
TO authenticated
USING (true);

CREATE INDEX idx_college_vibe_reviews_name ON public.college_vibe_reviews(college_name);