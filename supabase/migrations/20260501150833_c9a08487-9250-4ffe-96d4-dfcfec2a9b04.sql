-- Correct verified scholarship amounts based on official source verification
-- Sources verified: official scholarship websites (Nov 2025)

-- Regeneron STS: top prize is $250,000 (per societyforscience.org)
UPDATE public.scholarships
SET amount = 250000,
    description = 'Nation''s oldest and most prestigious science and math competition for high school seniors. Top prize is $250,000; finalists share over $3.1M annually.'
WHERE name = 'Regeneron Science Talent Search';

-- Doodle for Google: national winner receives $55,000 college scholarship (per official prizes page)
UPDATE public.scholarships
SET amount = 55000,
    description = 'K-12 students design a Google Doodle around an annual theme. National winner receives a $55,000 college scholarship and their art featured on Google.com.'
WHERE name = 'Doodle for Google';

-- Elks Most Valuable Student: top award is $30,000 (per Elks.org press release)
UPDATE public.scholarships
SET amount = 30000,
    description = 'Open to U.S. citizen high school seniors. Judged on scholarship, leadership, and financial need. Top 20 national finalists receive $30,000; 480 runners-up receive $4,000.'
WHERE name = 'Elks Most Valuable Student Scholarship';

-- Davidson Fellows: top award is $50,000 (also $25,000 and $10,000 tiers)
UPDATE public.scholarships
SET amount = 50000,
    description = 'For students 18 and under who have completed significant work in STEM, literature, music, philosophy, or "Outside the Box". Awards of $10,000, $25,000, or $50,000.'
WHERE name = 'Davidson Fellows Scholarship';

-- Gates Scholarship: last-dollar covering full unmet cost of attendance (varies, often well above $40k/yr)
UPDATE public.scholarships
SET amount = 50000,
    description = 'Highly selective last-dollar scholarship for outstanding minority high school seniors from low-income backgrounds. Covers full cost of attendance not met by other aid (no fixed amount; often $40,000+ per year).'
WHERE name = 'The Gates Scholarship';

-- Jack Kent Cooke: confirmed up to $55,000/year (last-dollar, varies)
UPDATE public.scholarships
SET description = 'For high-achieving high school seniors with financial need attending top 4-year colleges. Last-dollar award up to $55,000 per year, plus advising and graduate funding.'
WHERE name = 'Jack Kent Cooke Foundation College Scholarship Program';

-- Voice of Democracy: confirmed $35,000 first place
UPDATE public.scholarships
SET description = 'VFW audio-essay competition for grades 9-12. First place: $35,000; second: $21,000; third: $16,000. Additional state and local awards available.'
WHERE name = 'Voice of Democracy Scholarship';

-- Coca-Cola Scholars: confirmed $20,000
UPDATE public.scholarships
SET description = '150 graduating high school seniors selected each year for leadership, service, and academic achievement. Each receives a $20,000 college scholarship.'
WHERE name = 'Coca-Cola Scholars Program';