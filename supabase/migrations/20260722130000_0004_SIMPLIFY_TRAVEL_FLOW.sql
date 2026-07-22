-- Simplifica o fluxo do sistema de Viagens sem tocar em nenhuma tabela do Suprimentos.
BEGIN;

-- 1) Converte os status antigos para a jornada simples.
ALTER TABLE public.travel_app_requests DROP CONSTRAINT IF EXISTS travel_app_requests_status_check;
UPDATE public.travel_app_requests SET status = CASE
  WHEN status = 'rascunho' THEN 'rascunho'
  WHEN status IN ('enviada','aguardando_atendimento') THEN 'pedido_recebido'
  WHEN status IN ('em_analise','aguardando_informacoes','em_negociacao','em_compra') THEN 'em_andamento'
  WHEN status = 'em_orcamento' THEN 'orcado'
  WHEN status = 'compra_realizada' THEN 'aprovado'
  WHEN status = 'finalizada' THEN 'finalizada'
  ELSE 'cancelada'
END;
ALTER TABLE public.travel_app_requests ADD CONSTRAINT travel_app_requests_status_check
  CHECK (status IN ('rascunho','pedido_recebido','em_andamento','orcado','aprovado','finalizada','cancelada'));
ALTER TABLE public.travel_app_requests ALTER COLUMN status SET DEFAULT 'rascunho';

-- 2) Dados práticos que o solicitante consulta após a compra.
ALTER TABLE public.travel_app_purchases ADD COLUMN IF NOT EXISTS flight_number text;
ALTER TABLE public.travel_app_purchases ADD COLUMN IF NOT EXISTS departure_time text;
ALTER TABLE public.travel_app_purchases ADD COLUMN IF NOT EXISTS arrival_time text;

-- 3) Funções seguras para as políticas de usuários.
CREATE OR REPLACE FUNCTION public.travel_app_current_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT role FROM public.travel_app_profiles WHERE id=auth.uid() AND active=true;
$$;
REVOKE ALL ON FUNCTION public.travel_app_current_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_app_current_role() TO authenticated;

-- Gestão vê solicitantes e outros gestores, mas nunca o Super Admin.
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.travel_app_profiles;
CREATE POLICY "travel_profiles_select_scoped" ON public.travel_app_profiles FOR SELECT TO authenticated USING (
  id=auth.uid()
  OR public.travel_app_current_role()='super_admin'
  OR (public.travel_app_current_role()='gestao_viagens' AND role<>'super_admin')
);

-- Gestão pode editar somente perfis não-super-admin; Super Admin pode editar todos.
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.travel_app_profiles;
CREATE POLICY "travel_profiles_update_scoped" ON public.travel_app_profiles FOR UPDATE TO authenticated
USING (
  id=auth.uid()
  OR public.travel_app_current_role()='super_admin'
  OR (public.travel_app_current_role()='gestao_viagens' AND role<>'super_admin')
)
WITH CHECK (
  id=auth.uid()
  OR public.travel_app_current_role()='super_admin'
  OR (public.travel_app_current_role()='gestao_viagens' AND role<>'super_admin')
);

-- Remove a opção antiga de bagagem sem apagar registros históricos.
ALTER TABLE public.travel_app_baggage_requests DROP CONSTRAINT IF EXISTS travel_app_baggage_requests_baggage_type_check;
UPDATE public.travel_app_baggage_requests SET baggage_type='adicional_especial' WHERE baggage_type='uniforme_epi';
ALTER TABLE public.travel_app_baggage_requests ADD CONSTRAINT travel_app_baggage_requests_baggage_type_check
  CHECK (baggage_type IN ('nao','mao','despachada','ferramentas_equipamentos','adicional_especial'));

COMMIT;
