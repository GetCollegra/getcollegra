UPDATE public.scholarships
SET deadline = (deadline + INTERVAL '1 year')::date
WHERE deadline < CURRENT_DATE;