
CREATE OR REPLACE FUNCTION public.college_matches_sanitize_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Only sanitize for non-service-role inserts (i.e. end-user inserts via PostgREST)
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND current_setting('role', true) <> 'service_role' THEN
    NEW.ai_status := 'pending';
    NEW.ai_error := NULL;
    NEW.college_data := '{}'::jsonb;
    NEW.comparison_insight := NULL;
    NEW.results_version := 1;
    NEW.results_generated_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS college_matches_sanitize_insert_trg ON public.college_matches;
CREATE TRIGGER college_matches_sanitize_insert_trg
BEFORE INSERT ON public.college_matches
FOR EACH ROW EXECUTE FUNCTION public.college_matches_sanitize_insert();
