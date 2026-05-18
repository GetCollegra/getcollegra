
-- Tighten subscribers SELECT policy: user_id only
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscribers;
CREATE POLICY "Users can read own subscription"
ON public.subscribers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete own college_matches
CREATE POLICY "Users can delete own matches"
ON public.college_matches
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update/delete own quiz_answers
CREATE POLICY "Users can update own quiz answers"
ON public.quiz_answers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz answers"
ON public.quiz_answers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix mutable search_path on pgmq wrappers + revoke EXECUTE from anon/authenticated
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;
