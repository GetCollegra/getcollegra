CREATE POLICY "No public read of waitlist"
  ON public.waitlist_emails
  FOR SELECT
  TO public
  USING (false);