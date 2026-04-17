DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_actions'
      AND policyname NOT IN ('Users can insert own actions', 'Users can read own actions')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_actions', rec.policyname);
  END LOOP;
END
$$;