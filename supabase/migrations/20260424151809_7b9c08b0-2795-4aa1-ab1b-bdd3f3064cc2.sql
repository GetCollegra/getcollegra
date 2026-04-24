-- Finding 1: rate_limits — make service-role-only access explicit
-- (Service role bypasses RLS, but this satisfies the linter and documents intent.)
CREATE POLICY "Service role manages rate limits"
ON public.rate_limits
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Finding 2: storage.objects — lock down email-assets writes, keep public reads
-- Public read of the public bucket
CREATE POLICY "Email assets are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'email-assets');

-- Only service role can write/update/delete email-assets
CREATE POLICY "Service role can upload email assets"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'service_role');

CREATE POLICY "Service role can update email assets"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'email-assets' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'service_role');

CREATE POLICY "Service role can delete email assets"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'email-assets' AND auth.role() = 'service_role');