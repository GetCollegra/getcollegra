
-- Add unique constraint on user_id to prevent duplicate feedback rows
ALTER TABLE public.feedback_responses
  ADD CONSTRAINT feedback_responses_user_id_unique UNIQUE (user_id);
