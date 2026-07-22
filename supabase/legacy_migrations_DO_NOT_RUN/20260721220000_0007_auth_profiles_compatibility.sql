-- Lucena Viagens — reparo definitivo de autenticação/perfis
-- Compatibiliza a tabela public.profiles já existente (legada) com o Supabase Auth
-- sem remover colunas antigas que podem ser usadas por outros sistemas.

BEGIN;

-- 1) Acrescenta somente as colunas esperadas pelo sistema de viagens.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2) Aproveita os dados legados existentes sem apagar nada.
UPDATE public.profiles
SET
  full_name = COALESCE(NULLIF(full_name, ''), NULLIF(name, ''), NULLIF(login, ''), split_part(COALESCE(email, ''), '@', 1)),
  registration = COALESCE(NULLIF(registration, ''), NULLIF(matricula, '')),
  position = COALESCE(NULLIF(position, ''), NULLIF(job_title, '')),
  updated_at = COALESCE(updated_at, now())
WHERE
  full_name IS NULL OR full_name = ''
  OR registration IS NULL
  OR position IS NULL
  OR updated_at IS NULL;

-- 3) Função para traduzir perfis antigos sem alterar globalmente outros sistemas.
CREATE OR REPLACE FUNCTION public.normalize_travel_role(input_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(COALESCE(input_role, ''))
    WHEN 'superadmin' THEN 'super_admin'
    WHEN 'super_admin' THEN 'super_admin'
    WHEN 'admin' THEN 'super_admin'
    WHEN 'gestor' THEN 'gestao_viagens'
    WHEN 'gestao' THEN 'gestao_viagens'
    WHEN 'gestao_viagens' THEN 'gestao_viagens'
    WHEN 'solicitante' THEN 'solicitante'
    ELSE 'solicitante'
  END;
$$;

-- 4) Garante um perfil vinculado a cada conta real do Supabase Auth.
-- Não sobrescreve informações preenchidas; apenas completa o necessário.
INSERT INTO public.profiles (
  id, name, login, email, password_hash, role, active,
  full_name, registration, position, created_at, updated_at
)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(u.email, ''), '@', 1)),
  split_part(COALESCE(u.email, ''), '@', 1),
  COALESCE(u.email, ''),
  'SUPABASE_AUTH',
  CASE
    WHEN lower(COALESCE(u.email, '')) = 'administrador@lucena.com.br' THEN 'super_admin'
    ELSE 'solicitante'
  END,
  true,
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(u.email, ''), '@', 1)),
  NULL,
  NULL,
  now(),
  now()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Completa/normaliza especificamente os perfis ligados ao Auth.
UPDATE public.profiles p
SET
  email = COALESCE(NULLIF(p.email, ''), u.email),
  name = COALESCE(NULLIF(p.name, ''), NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(u.email, ''), '@', 1)),
  login = COALESCE(NULLIF(p.login, ''), split_part(COALESCE(u.email, ''), '@', 1)),
  full_name = COALESCE(NULLIF(p.full_name, ''), NULLIF(p.name, ''), NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(u.email, ''), '@', 1)),
  active = COALESCE(p.active, true),
  role = CASE
    WHEN lower(COALESCE(u.email, '')) = 'administrador@lucena.com.br' THEN 'super_admin'
    ELSE public.normalize_travel_role(p.role)
  END,
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id;

-- 5) Papel atual usado pelas políticas do sistema de viagens.
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.normalize_travel_role(p.role)
  FROM public.profiles p
  WHERE p.id = auth.uid() AND COALESCE(p.active, true) = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

-- 6) Remove o gatilho que causava "Database error creating new user".
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

-- 7) Bootstrap/reparo do Super Administrador, compatível com a tabela legada.
CREATE OR REPLACE FUNCTION public.bootstrap_first_super_admin(target_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user auth.users%ROWTYPE;
BEGIN
  SELECT * INTO target_user
  FROM auth.users
  WHERE lower(email) = lower(trim(target_email))
  LIMIT 1;

  IF target_user.id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado em Authentication > Users.';
  END IF;

  INSERT INTO public.profiles (
    id, name, login, email, password_hash, role, active,
    full_name, created_at, updated_at
  )
  VALUES (
    target_user.id,
    COALESCE(NULLIF(target_user.raw_user_meta_data->>'full_name', ''), split_part(target_user.email, '@', 1)),
    split_part(target_user.email, '@', 1),
    target_user.email,
    'SUPABASE_AUTH',
    'super_admin',
    true,
    COALESCE(NULLIF(target_user.raw_user_meta_data->>'full_name', ''), split_part(target_user.email, '@', 1)),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NULLIF(public.profiles.name, ''), EXCLUDED.name),
    login = COALESCE(NULLIF(public.profiles.login, ''), EXCLUDED.login),
    email = EXCLUDED.email,
    role = 'super_admin',
    active = true,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    updated_at = now();

  RETURN 'Super Administrador configurado com sucesso.';
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_super_admin(text) FROM PUBLIC;

-- 8) Políticas mínimas para o sistema de viagens.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.current_app_role() IN ('gestao_viagens', 'super_admin')
);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
FOR UPDATE TO authenticated
USING (
  auth.uid() = id
  OR public.current_app_role() IN ('gestao_viagens', 'super_admin')
)
WITH CHECK (
  auth.uid() = id
  OR public.current_app_role() IN ('gestao_viagens', 'super_admin')
);

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
FOR DELETE TO authenticated
USING (public.current_app_role() = 'super_admin');

COMMIT;

-- Após executar esta migração, rode uma vez:
-- SELECT public.bootstrap_first_super_admin('administrador@lucena.com.br');
