-- Security fixes + automatic profile creation.

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND active = true;
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT
TO authenticated USING (
  auth.uid() = id OR public.current_app_role() IN ('gestao_viagens','super_admin')
);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = id AND role = 'solicitante'
);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.current_app_role() IN ('gestao_viagens','super_admin'))
WITH CHECK (
  (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
  OR public.current_app_role() IN ('gestao_viagens','super_admin')
);

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE
TO authenticated USING (public.current_app_role() = 'super_admin');

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, active)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NEW.email, ''),
    'solicitante',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Bootstrap helper: run once after creating the first user in Authentication > Users.
CREATE OR REPLACE FUNCTION public.bootstrap_first_super_admin(target_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_id uuid;
  admin_count integer;
BEGIN
  SELECT count(*) INTO admin_count FROM public.profiles WHERE role = 'super_admin';
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Já existe um Super Administrador cadastrado.';
  END IF;

  SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(target_email) LIMIT 1;
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado em Authentication > Users.';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, active)
  SELECT id,
         COALESCE(NULLIF(raw_user_meta_data->>'full_name',''), split_part(email,'@',1)),
         email,
         'super_admin',
         true
  FROM auth.users WHERE id = target_id
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin', active = true, updated_at = now();

  RETURN 'Super Administrador configurado com sucesso.';
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_super_admin(text) FROM PUBLIC;
