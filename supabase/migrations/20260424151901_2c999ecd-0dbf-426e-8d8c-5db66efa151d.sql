-- Remove the redundant rate_limits policy (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limits;

-- Remove the storage policies and replace with tighter versions.
-- Service role bypasses RLS, so we don't need explicit write policies for it.
DROP POLICY IF EXISTS "Email assets are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload email assets" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update email assets" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete email assets" ON storage.objects;

-- Allow reading individual files in email-assets but NOT listing the bucket.
-- storage.foldername returns NULL for top-level listing requests with no path,
-- so requiring a non-empty name blocks "list the bucket" while permitting
-- direct file fetches by full path (which is how public URLs work).
CREATE POLICY "Email assets readable by full path"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'email-assets'
  AND name IS NOT NULL
  AND length(name) > 0
  AND position('/' in name) > 0
);