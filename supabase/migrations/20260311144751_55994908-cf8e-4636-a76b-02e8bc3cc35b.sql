-- Indexes for read performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_college_matches_user_id_created ON public.college_matches (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_colleges_user_id_created ON public.saved_colleges (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_fn_window ON public.rate_limits (ip_address, function_name, window_start);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles (id);

-- Auth rate limiting table (reuses rate_limits with function_name = 'auth_login' / 'auth_signup')
-- No schema change needed, we'll use the existing rate_limits table