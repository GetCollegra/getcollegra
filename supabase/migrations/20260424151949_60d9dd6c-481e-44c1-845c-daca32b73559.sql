DROP POLICY IF EXISTS "Email assets readable by full path" ON storage.objects;

-- Allow reading individual files in email-assets via public URL.
-- Listing the bucket sends name = NULL which this policy blocks.
CREATE POLICY "Email assets readable by name"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'email-assets'
  AND name IS NOT NULL
  AND length(name) > 0
);