-- Fix: "Database error creating new user"
-- User accounts created by the application are followed by an explicit profiles upsert
-- in /api/admin/users.ts. Keeping an auth.users trigger duplicates that operation and
-- can make Supabase Auth fail before the API can return the real database error.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

-- Keep the one-time bootstrap independent from the trigger. It creates or updates
-- the profile for the first Super Administrator directly from auth.users.
CREATE OR REPLACE FUNCTION public.bootstrap_first_super_admin(target_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_id uuid;
  target_name text;
  target_user_email text;
  admin_count integer;
BEGIN
  SELECT count(*) INTO admin_count
  FROM public.profiles
  WHERE role = 'super_admin' AND active = true;

  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Já existe um Super Administrador ativo cadastrado.';
  END IF;

  SELECT
    u.id,
    COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(u.email, ''), '@', 1)),
    COALESCE(u.email, '')
  INTO target_id, target_name, target_user_email
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(target_email))
  LIMIT 1;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado em Authentication > Users.';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, active, updated_at)
  VALUES (target_id, target_name, target_user_email, 'super_admin', true, now())
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      role = 'super_admin',
      active = true,
      updated_at = now();

  RETURN 'Super Administrador configurado com sucesso.';
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_super_admin(text) FROM PUBLIC;
