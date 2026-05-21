-- Fix: ai_models had RLS enabled but ZERO policies, so anon and authenticated
-- clients (the front-end AI tutor widget) silently received 0 rows. Admin pages
-- worked because they use the service_role client which bypasses RLS.
--
-- Resolution: allow any role to SELECT active models. Display name, provider,
-- description, daily limit, and pricing columns are not secrets — they only
-- describe what the platform offers. Insert/update/delete remain blocked
-- (covered by admin-only routes using service_role).

DROP POLICY IF EXISTS "ai_models_public_read" ON public.ai_models;
CREATE POLICY "ai_models_public_read"
  ON public.ai_models
  FOR SELECT
  USING (is_active = true);
