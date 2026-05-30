-- Migration 006: Public user count RPC
-- Allows any authenticated user to see total app user count without exposing user data

CREATE OR REPLACE FUNCTION public.get_total_user_count()
RETURNS BIGINT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COUNT(*) FROM auth.users;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_user_count() TO authenticated;
