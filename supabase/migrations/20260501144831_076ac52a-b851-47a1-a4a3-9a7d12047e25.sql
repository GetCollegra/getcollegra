-- Scholarships catalog (public read)
CREATE TABLE public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text,
  amount integer NOT NULL DEFAULT 0,
  deadline date NOT NULL,
  description text NOT NULL DEFAULT '',
  eligibility_tags text[] NOT NULL DEFAULT '{}',
  majors text[] NOT NULL DEFAULT '{}',
  state text,
  merit_based boolean NOT NULL DEFAULT false,
  need_based boolean NOT NULL DEFAULT false,
  essay_required boolean NOT NULL DEFAULT false,
  min_gpa numeric,
  grade_levels text[] NOT NULL DEFAULT '{}',
  application_url text,
  is_local boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read scholarships"
ON public.scholarships FOR SELECT
TO authenticated
USING (true);

CREATE INDEX idx_scholarships_deadline ON public.scholarships(deadline);
CREATE INDEX idx_scholarships_state ON public.scholarships(state);

-- Saved scholarships
CREATE TABLE public.saved_scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  scholarship_name text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  deadline date NOT NULL,
  status text NOT NULL DEFAULT 'saved',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scholarship_id)
);

ALTER TABLE public.saved_scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved scholarships"
ON public.saved_scholarships FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved scholarships"
ON public.saved_scholarships FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved scholarships"
ON public.saved_scholarships FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved scholarships"
ON public.saved_scholarships FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_saved_scholarships_user ON public.saved_scholarships(user_id);

-- Seed realistic sample scholarships
INSERT INTO public.scholarships (name, provider, amount, deadline, description, eligibility_tags, majors, state, merit_based, need_based, essay_required, min_gpa, grade_levels, is_local) VALUES
('Academic Excellence Scholarship', 'National Merit Foundation', 10000, (CURRENT_DATE + INTERVAL '45 days')::date, 'Awarded to high school seniors with outstanding academic achievement and leadership potential.', ARRAY['Merit','GPA 3.5+','Leadership'], ARRAY['Any'], NULL, true, false, true, 3.5, ARRAY['12'], false),
('STEM Scholars Award', 'Society of STEM Educators', 7500, (CURRENT_DATE + INTERVAL '30 days')::date, 'Supports students pursuing degrees in science, technology, engineering, or mathematics.', ARRAY['STEM','Merit'], ARRAY['Engineering','Computer Science','Biology','Mathematics','Physics'], NULL, true, false, true, 3.3, ARRAY['11','12'], false),
('Business Innovators Scholarship', 'Future Founders Fund', 5000, (CURRENT_DATE + INTERVAL '60 days')::date, 'For aspiring entrepreneurs and business leaders. Submit a one-page business idea.', ARRAY['Essay','Entrepreneurship'], ARRAY['Business','Economics','Finance'], NULL, true, false, true, 3.0, ARRAY['11','12'], false),
('Community Service Award', 'Helping Hands Foundation', 3000, (CURRENT_DATE + INTERVAL '20 days')::date, 'Recognizes students with at least 100 hours of documented community service.', ARRAY['Service','No GPA Min'], ARRAY['Any'], NULL, false, false, true, NULL, ARRAY['10','11','12'], false),
('First-Generation College Grant', 'Opportunity Education', 6000, (CURRENT_DATE + INTERVAL '75 days')::date, 'Supports students who will be the first in their family to attend college.', ARRAY['First-Gen','Need-Based'], ARRAY['Any'], NULL, false, true, true, 2.8, ARRAY['12'], false),
('Creative Arts Scholarship', 'National Arts Council', 4000, (CURRENT_DATE + INTERVAL '40 days')::date, 'For students pursuing visual arts, music, theater, or creative writing.', ARRAY['Arts','Portfolio'], ARRAY['Arts','Music','Theater','Creative Writing'], NULL, true, false, false, NULL, ARRAY['11','12'], false),
('Future Educators Scholarship', 'Teach Forward Initiative', 4500, (CURRENT_DATE + INTERVAL '55 days')::date, 'For students planning to pursue a career in education.', ARRAY['Education','Merit'], ARRAY['Education'], NULL, true, false, true, 3.2, ARRAY['12'], false),
('Healthcare Heroes Award', 'MedFuture Foundation', 8000, (CURRENT_DATE + INTERVAL '50 days')::date, 'Supports future doctors, nurses, and healthcare professionals.', ARRAY['STEM','Healthcare'], ARRAY['Pre-Med','Nursing','Public Health','Biology'], NULL, true, false, true, 3.4, ARRAY['12'], false),
('Women in Tech Scholarship', 'TechForward', 6500, (CURRENT_DATE + INTERVAL '35 days')::date, 'Empowering young women pursuing technology degrees.', ARRAY['STEM','Diversity'], ARRAY['Computer Science','Engineering','Data Science'], NULL, true, false, true, 3.3, ARRAY['11','12'], false),
('Athletic Achievement Grant', 'Student Athlete Alliance', 3500, (CURRENT_DATE + INTERVAL '90 days')::date, 'For varsity athletes maintaining strong academics.', ARRAY['Athletics','Merit'], ARRAY['Any'], NULL, true, false, false, 3.0, ARRAY['11','12'], false),
('Environmental Stewardship Scholarship', 'Green Future Foundation', 4000, (CURRENT_DATE + INTERVAL '70 days')::date, 'For students committed to environmental sustainability.', ARRAY['Environment','Service'], ARRAY['Environmental Science','Biology','Public Policy'], NULL, false, false, true, 3.0, ARRAY['11','12'], false),
('Hispanic Heritage Scholars', 'Hispanic Education Fund', 5500, (CURRENT_DATE + INTERVAL '25 days')::date, 'Supports Hispanic and Latino high school seniors.', ARRAY['Heritage','Need-Based'], ARRAY['Any'], NULL, false, true, true, 3.0, ARRAY['12'], false),
('No Essay Quick Award', 'Easy Apply Foundation', 1000, (CURRENT_DATE + INTERVAL '15 days')::date, 'Quick scholarship — no essay needed. Just complete the form.', ARRAY['No Essay','Easy Apply'], ARRAY['Any'], NULL, false, false, false, NULL, ARRAY['9','10','11','12'], false),
('Future Coders Scholarship', 'Code Academy Trust', 2500, (CURRENT_DATE + INTERVAL '42 days')::date, 'For students with demonstrated coding projects on GitHub.', ARRAY['STEM','Portfolio'], ARRAY['Computer Science','Software Engineering'], NULL, true, false, false, NULL, ARRAY['10','11','12'], false),
('Need-Based Opportunity Grant', 'American Education Trust', 12000, (CURRENT_DATE + INTERVAL '80 days')::date, 'Substantial award for students from low-income households.', ARRAY['Need-Based','FAFSA Required'], ARRAY['Any'], NULL, false, true, true, 2.5, ARRAY['12'], false),
-- Illinois local
('Illinois Future Leaders Grant', 'Illinois Education Board', 5000, (CURRENT_DATE + INTERVAL '38 days')::date, 'Awarded to Illinois high school seniors demonstrating leadership.', ARRAY['Local','Leadership'], ARRAY['Any'], 'IL', true, false, true, 3.2, ARRAY['12'], true),
('Illinois Community Grant', 'IL Community Foundation', 2500, (CURRENT_DATE + INTERVAL '28 days')::date, 'For Illinois residents with community involvement.', ARRAY['Local','Service'], ARRAY['Any'], 'IL', false, false, false, 3.0, ARRAY['11','12'], true),
('Barrington Area Scholars Fund', 'Barrington Foundation', 3000, (CURRENT_DATE + INTERVAL '48 days')::date, 'Local scholarship for the Barrington, IL area.', ARRAY['Local'], ARRAY['Any'], 'IL', true, false, true, 3.3, ARRAY['12'], true),
('Chicago Future Leaders Award', 'Chicago Civic Trust', 4000, (CURRENT_DATE + INTERVAL '65 days')::date, 'For students from the Chicago metropolitan area.', ARRAY['Local','Leadership'], ARRAY['Any'], 'IL', true, false, true, 3.0, ARRAY['11','12'], true),
-- A few other state locals so non-IL users still see local options
('California Dream Scholarship', 'CA Education Trust', 4500, (CURRENT_DATE + INTERVAL '52 days')::date, 'For California high school seniors.', ARRAY['Local'], ARRAY['Any'], 'CA', true, false, true, 3.0, ARRAY['12'], true),
('Texas Tomorrow Scholars', 'Lone Star Education Fund', 4000, (CURRENT_DATE + INTERVAL '58 days')::date, 'For Texas-based high school students.', ARRAY['Local'], ARRAY['Any'], 'TX', true, false, true, 3.0, ARRAY['11','12'], true),
('New York Empire Scholarship', 'NY Education Foundation', 5000, (CURRENT_DATE + INTERVAL '47 days')::date, 'For New York state high school seniors.', ARRAY['Local'], ARRAY['Any'], 'NY', true, false, true, 3.1, ARRAY['12'], true),
('Florida Sunshine Scholars', 'FL Education Trust', 3500, (CURRENT_DATE + INTERVAL '63 days')::date, 'For Florida high school students.', ARRAY['Local'], ARRAY['Any'], 'FL', true, false, false, 3.0, ARRAY['11','12'], true);