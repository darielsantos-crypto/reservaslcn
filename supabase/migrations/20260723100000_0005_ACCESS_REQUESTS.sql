/*
  LUCENA GESTÃO DE VIAGENS — SOLICITAÇÕES PÚBLICAS DE ACESSO
  Cria uma fila exclusiva do módulo de Viagens para pedidos de cadastro feitos
  na tela de login. Não consulta nem altera tabelas do Suprimentos.
*/

CREATE TABLE IF NOT EXISTS public.travel_app_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_name text NOT NULL,
  registration text,
  email text NOT NULL,
  phone text,
  position text,
  worksite_name text NOT NULL,
  cost_center text,
  city text NOT NULL,
  state text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  reviewed_by uuid REFERENCES public.travel_app_profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS travel_app_access_requests_pending_email_unique
  ON public.travel_app_access_requests (lower(email))
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS travel_app_access_requests_status_created_idx
  ON public.travel_app_access_requests (status, created_at DESC);

ALTER TABLE public.travel_app_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "access_requests_select_management" ON public.travel_app_access_requests;
CREATE POLICY "access_requests_select_management"
ON public.travel_app_access_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.travel_app_profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('gestao_viagens', 'super_admin')
  )
);

DROP POLICY IF EXISTS "access_requests_update_management" ON public.travel_app_access_requests;
CREATE POLICY "access_requests_update_management"
ON public.travel_app_access_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.travel_app_profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('gestao_viagens', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.travel_app_profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('gestao_viagens', 'super_admin')
  )
);

GRANT SELECT, UPDATE ON public.travel_app_access_requests TO authenticated;
