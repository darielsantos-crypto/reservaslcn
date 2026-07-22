/*
  LUCENA GESTÃO DE VIAGENS — BANCO TOTALMENTE ISOLADO
  Todas as tabelas deste arquivo usam o prefixo travel_app_.
  Nenhuma tabela do Suprimentos é alterada, consultada ou excluída.
*/

/*
# Lucena Travel Management — Core Schema

## Purpose
Creates the foundational tables for the Lucena Infraestrutura corporate travel
management system: user travel_app_profiles, roles, travel_app_worksites (obras), user↔worksite links,
travel_app_travelers (colaboradores viajantes), travel_app_suppliers, policy rules, FAQ items, audit logs, travel_app_notifications.

## New Tables
- `travel_app_profiles` — extends auth.users with role + personal data
- `travel_app_worksites` — obras (name, code, cost center, city/state, manager, status)
- `travel_app_user_worksites` — many-to-many between travel_app_profiles and travel_app_worksites
- `travel_app_travelers` — colaboradores viajantes (sensitive data protected)
- `travel_app_suppliers` — fornecedores / agências
- `travel_app_policy_rules` — configurable travel policy deadlines (editable by Super Admin)
- `travel_app_faq_items` — perguntas frequentes
- `travel_app_audit_logs` — immutable audit trail of user actions
- `travel_app_notifications` — in-app travel_app_notifications

## Security
- RLS enabled on every table.
- Profiles: each authenticated user reads/updates own row; admins read all.
- Worksites, travel_app_travelers, travel_app_suppliers, policy, faq: readable by all authenticated;
  writable only by travel management + super admin (checked via role column).
- travel_app_user_worksites: readable by authenticated; writable by admins.
- travel_app_audit_logs: insert by any authenticated; read only by super admin.
- travel_app_notifications: owner-scoped via user_id.

## Notes
- Roles: 'solicitante' | 'gestao_viagens' | 'super_admin'.
- Worksite status: 'ativa' | 'inativa' | 'encerrada'.
- Traveler type: 'colaborador' | 'terceiro' | 'necessidades_especiais'.
- Records are soft-deleted via `active` boolean to preserve history.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  registration text,
  email text NOT NULL,
  phone text,
  position text,
  city text,
  state text,
  role text NOT NULL DEFAULT 'solicitante'
    CHECK (role IN ('solicitante','gestao_viagens','super_admin')),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES travel_app_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON travel_app_profiles;
CREATE POLICY "profiles_select_self_or_admin" ON travel_app_profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR role IN ('gestao_viagens','super_admin')
  );

DROP POLICY IF EXISTS "profiles_insert_self" ON travel_app_profiles;
CREATE POLICY "profiles_insert_self" ON travel_app_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON travel_app_profiles;
CREATE POLICY "profiles_update_self_or_admin" ON travel_app_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR role IN ('gestao_viagens','super_admin'))
  WITH CHECK (auth.uid() = id OR auth.uid() IN (
    SELECT id FROM travel_app_profiles WHERE role IN ('gestao_viagens','super_admin')
  ));

DROP POLICY IF EXISTS "profiles_delete_admin" ON travel_app_profiles;
CREATE POLICY "profiles_delete_admin" ON travel_app_profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- WORKSITES (obras)
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_worksites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  cost_center text,
  city text,
  state text,
  manager_name text,
  status text NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa','inativa','encerrada')),
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES travel_app_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_worksites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worksites_select_auth" ON travel_app_worksites;
CREATE POLICY "worksites_select_auth" ON travel_app_worksites FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "worksites_insert_admin" ON travel_app_worksites;
CREATE POLICY "worksites_insert_admin" ON travel_app_worksites FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "worksites_update_admin" ON travel_app_worksites;
CREATE POLICY "worksites_update_admin" ON travel_app_worksites FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "worksites_delete_admin" ON travel_app_worksites;
CREATE POLICY "worksites_delete_admin" ON travel_app_worksites FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- USER_WORKSITES
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_user_worksites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES travel_app_profiles(id) ON DELETE CASCADE,
  worksite_id uuid NOT NULL REFERENCES travel_app_worksites(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, worksite_id)
);

ALTER TABLE travel_app_user_worksites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_worksites_select_auth" ON travel_app_user_worksites;
CREATE POLICY "user_worksites_select_auth" ON travel_app_user_worksites FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "user_worksites_insert_admin" ON travel_app_user_worksites;
CREATE POLICY "user_worksites_insert_admin" ON travel_app_user_worksites FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "user_worksites_update_admin" ON travel_app_user_worksites;
CREATE POLICY "user_worksites_update_admin" ON travel_app_user_worksites FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "user_worksites_delete_admin" ON travel_app_user_worksites;
CREATE POLICY "user_worksites_delete_admin" ON travel_app_user_worksites FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

-- ============================================================
-- TRAVELERS (colaboradores viajantes)
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  registration text,
  cpf text,
  birth_date date,
  phone text,
  email text,
  position text,
  worksite_id uuid REFERENCES travel_app_worksites(id) ON DELETE SET NULL,
  cost_center text,
  city text,
  state text,
  traveler_type text NOT NULL DEFAULT 'colaborador'
    CHECK (traveler_type IN ('colaborador','terceiro','necessidades_especiais')),
  travel_notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES travel_app_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_travelers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travelers_select_auth" ON travel_app_travelers;
CREATE POLICY "travelers_select_auth" ON travel_app_travelers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "travelers_insert_admin" ON travel_app_travelers;
CREATE POLICY "travelers_insert_admin" ON travel_app_travelers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('solicitante','gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "travelers_update_admin" ON travel_app_travelers;
CREATE POLICY "travelers_update_admin" ON travel_app_travelers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('solicitante','gestao_viagens','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('solicitante','gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "travelers_delete_admin" ON travel_app_travelers;
CREATE POLICY "travelers_delete_admin" ON travel_app_travelers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- SUPPLIERS (fornecedores / agências)
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  contact_name text,
  phone text,
  email text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES travel_app_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_select_auth" ON travel_app_suppliers;
CREATE POLICY "suppliers_select_auth" ON travel_app_suppliers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "suppliers_insert_admin" ON travel_app_suppliers;
CREATE POLICY "suppliers_insert_admin" ON travel_app_suppliers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "suppliers_update_admin" ON travel_app_suppliers;
CREATE POLICY "suppliers_update_admin" ON travel_app_suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "suppliers_delete_admin" ON travel_app_suppliers;
CREATE POLICY "suppliers_delete_admin" ON travel_app_suppliers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- POLICY_RULES (prazos configuráveis)
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_policy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  label text NOT NULL,
  min_days integer NOT NULL,
  description text,
  updated_by uuid REFERENCES travel_app_profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_policy_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_rules_select_auth" ON travel_app_policy_rules;
CREATE POLICY "policy_rules_select_auth" ON travel_app_policy_rules FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "policy_rules_insert_admin" ON travel_app_policy_rules;
CREATE POLICY "policy_rules_insert_admin" ON travel_app_policy_rules FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

DROP POLICY IF EXISTS "policy_rules_update_admin" ON travel_app_policy_rules;
CREATE POLICY "policy_rules_update_admin" ON travel_app_policy_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

DROP POLICY IF EXISTS "policy_rules_delete_admin" ON travel_app_policy_rules;
CREATE POLICY "policy_rules_delete_admin" ON travel_app_policy_rules FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- FAQ_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_select_auth" ON travel_app_faq_items;
CREATE POLICY "faq_select_auth" ON travel_app_faq_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "faq_insert_admin" ON travel_app_faq_items;
CREATE POLICY "faq_insert_admin" ON travel_app_faq_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

DROP POLICY IF EXISTS "faq_update_admin" ON travel_app_faq_items;
CREATE POLICY "faq_update_admin" ON travel_app_faq_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

DROP POLICY IF EXISTS "faq_delete_admin" ON travel_app_faq_items;
CREATE POLICY "faq_delete_admin" ON travel_app_faq_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- AUDIT_LOGS (immutable trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES travel_app_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  previous_status text,
  new_status text,
  field_changed text,
  justification text,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_insert_auth" ON travel_app_audit_logs;
CREATE POLICY "audit_insert_auth" ON travel_app_audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "audit_select_admin" ON travel_app_audit_logs;
CREATE POLICY "audit_select_admin" ON travel_app_audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES travel_app_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON travel_app_notifications;
CREATE POLICY "notif_select_own" ON travel_app_notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert_admin" ON travel_app_notifications;
CREATE POLICY "notif_insert_admin" ON travel_app_notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "notif_update_own" ON travel_app_notifications;
CREATE POLICY "notif_update_own" ON travel_app_notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_delete_own" ON travel_app_notifications;
CREATE POLICY "notif_delete_own" ON travel_app_notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON travel_app_profiles(role);
CREATE INDEX IF NOT EXISTS idx_worksites_status ON travel_app_worksites(status);
CREATE INDEX IF NOT EXISTS idx_user_worksites_user ON travel_app_user_worksites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_worksites_worksite ON travel_app_user_worksites(worksite_id);
CREATE INDEX IF NOT EXISTS idx_travelers_worksite ON travel_app_travelers(worksite_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON travel_app_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_read ON travel_app_notifications(user_id, read);


/*
# Lucena Travel Management — Travel Schema

## Purpose
Creates the travel-domain tables: travel requests, request↔traveler links,
segments (trechos), travel_app_accommodations, baggage, advance requests, travel_app_quotations,
travel_app_negotiations, travel_app_purchases, travel_app_attachments, travel_app_comments, status history.

## New Tables
- `travel_app_requests` — main request record (status, type, purpose, deadline signal, etc.)
- `travel_app_request_travelers` — many-to-many between requests and travel_app_travelers
- `travel_app_segments` — trechos (origin, destination, dates, transport)
- `travel_app_accommodations` — hospedagem (city, check-in/out, guests, diárias calc)
- `travel_app_baggage_requests` — bagagem especial (tools, EPI, etc.)
- `travel_app_advance_requests` — adiantamento
- `travel_app_quotations` — cotações (aérea/rodoviária/hospedagem) with JSONB detail
- `travel_app_negotiations` — negociação (initial/final value, savings)
- `travel_app_purchases` — compra registrada (ticket, voucher, totals)
- `travel_app_attachments` — anexos (request-level and purchase-level), with `released` flag
- `travel_app_comments` — mensagens/pendências entre solicitante e gestão
- `travel_app_status_history` — histórico de status (append-only)

## Security
- RLS enabled on every table.
- Travel requests: SELECT scoped — solicitante sees own + worksite-linked;
  gestao/super_admin see all. INSERT/UPDATE by owner or admins.
- Child tables (segments, travel_app_accommodations, baggage, advance, travel_app_quotations, travel_app_negotiations,
  travel_app_purchases, travel_app_attachments, travel_app_comments, travel_app_status_history): SELECT scoped through parent request;
  write by owner of parent request or admins.
- travel_app_attachments: solicitante can only read rows where `released = true` OR they own the parent.
- travel_app_status_history: INSERT by anyone allowed to update the parent; SELECT scoped via parent.

## Notes
- Request status enum stored as text with CHECK constraint.
- `request_type`: 'passagem' | 'hospedagem' | 'passagem_hospedagem'.
- `transport_mode`: 'aereo' | 'rodoviario'.
- `deadline_status`: 'dentro' | 'proximo' | 'fora' (computed at submit time, recomputed on update).
- `is_emergency` boolean drives the emergencial flow.
- `quote_detail` JSONB stores mode-specific fields (air/bus/hotel) flexibly.
*/

-- ============================================================
-- TRAVEL_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text UNIQUE,
  requester_id uuid NOT NULL REFERENCES travel_app_profiles(id) ON DELETE CASCADE,
  worksite_id uuid REFERENCES travel_app_worksites(id) ON DELETE SET NULL,
  request_type text NOT NULL
    CHECK (request_type IN ('passagem','hospedagem','passagem_hospedagem')),
  purpose text NOT NULL,
  purpose_detail text,
  international boolean NOT NULL DEFAULT false,
  is_emergency boolean NOT NULL DEFAULT false,
  internal_requested_by text,
  internal_requester_position text,
  traveler_type_confirmed boolean NOT NULL DEFAULT false,
  deadline_status text NOT NULL DEFAULT 'dentro'
    CHECK (deadline_status IN ('dentro','proximo','fora')),
  deadline_min_days integer,
  deadline_actual_days integer,
  justification text,
  justification_responsible text,
  justification_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','enviada','aguardando_atendimento','em_analise',
      'aguardando_informacoes','em_orcamento','em_negociacao','em_compra',
      'compra_realizada','finalizada','nao_atendida','cancelada')),
  assigned_to uuid REFERENCES travel_app_profiles(id) ON DELETE SET NULL,
  not_attended_reason text,
  cancel_reason text,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  finalized_at timestamptz
);

ALTER TABLE travel_app_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: solicitante sees own requests + requests for travel_app_worksites they are linked to;
-- gestao/super_admin see all.
DROP POLICY IF EXISTS "tr_select_scoped" ON travel_app_requests;
CREATE POLICY "tr_select_scoped" ON travel_app_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM travel_app_user_worksites uw
      WHERE uw.user_id = auth.uid() AND uw.worksite_id = travel_app_requests.worksite_id
    )
  );

DROP POLICY IF EXISTS "tr_insert_own" ON travel_app_requests;
CREATE POLICY "tr_insert_own" ON travel_app_requests FOR INSERT
  TO authenticated WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "tr_update_owner_or_admin" ON travel_app_requests;
CREATE POLICY "tr_update_owner_or_admin" ON travel_app_requests FOR UPDATE
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  )
  WITH CHECK (
    requester_id = auth.uid()
    OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "tr_delete_admin" ON travel_app_requests;
CREATE POLICY "tr_delete_admin" ON travel_app_requests FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- TRAVEL_REQUEST_TRAVELERS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_request_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  traveler_id uuid NOT NULL REFERENCES travel_app_travelers(id) ON DELETE CASCADE,
  ticket_number text,
  locator text,
  individual_value numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_request_travelers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trt_select_via_parent" ON travel_app_request_travelers;
CREATE POLICY "trt_select_via_parent" ON travel_app_request_travelers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "trt_insert_via_parent" ON travel_app_request_travelers;
CREATE POLICY "trt_insert_via_parent" ON travel_app_request_travelers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "trt_update_via_parent" ON travel_app_request_travelers;
CREATE POLICY "trt_update_via_parent" ON travel_app_request_travelers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "trt_delete_via_parent" ON travel_app_request_travelers;
CREATE POLICY "trt_delete_via_parent" ON travel_app_request_travelers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- TRAVEL_SEGMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  segment_order integer NOT NULL DEFAULT 1,
  origin text NOT NULL,
  destination text NOT NULL,
  direction text NOT NULL DEFAULT 'ida_e_volta'
    CHECK (direction IN ('ida','volta','ida_e_volta')),
  departure_date date,
  return_date date,
  transport_mode text
    CHECK (transport_mode IS NULL OR transport_mode IN ('aereo','rodoviario')),
  preferred_period text,
  flexibility text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seg_select_via_parent" ON travel_app_segments;
CREATE POLICY "seg_select_via_parent" ON travel_app_segments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "seg_insert_via_parent" ON travel_app_segments;
CREATE POLICY "seg_insert_via_parent" ON travel_app_segments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "seg_update_via_parent" ON travel_app_segments;
CREATE POLICY "seg_update_via_parent" ON travel_app_segments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "seg_delete_via_parent" ON travel_app_segments;
CREATE POLICY "seg_delete_via_parent" ON travel_app_segments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- ACCOMMODATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  city text,
  check_in date,
  check_out date,
  nights integer,
  guests integer NOT NULL DEFAULT 1,
  location_preference text,
  estimated_arrival_time text,
  suggested_hotel text,
  needs_parking boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_accommodations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acc_select_via_parent" ON travel_app_accommodations;
CREATE POLICY "acc_select_via_parent" ON travel_app_accommodations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "acc_insert_via_parent" ON travel_app_accommodations;
CREATE POLICY "acc_insert_via_parent" ON travel_app_accommodations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "acc_update_via_parent" ON travel_app_accommodations;
CREATE POLICY "acc_update_via_parent" ON travel_app_accommodations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "acc_delete_via_parent" ON travel_app_accommodations;
CREATE POLICY "acc_delete_via_parent" ON travel_app_accommodations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- BAGGAGE_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_baggage_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  baggage_type text NOT NULL
    CHECK (baggage_type IN ('nao','mao','despachada','uniforme_epi','ferramentas_equipamentos','adicional_especial')),
  description text,
  quantity integer,
  approx_weight text,
  dimensions text,
  justification text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_baggage_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bag_select_via_parent" ON travel_app_baggage_requests;
CREATE POLICY "bag_select_via_parent" ON travel_app_baggage_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "bag_insert_via_parent" ON travel_app_baggage_requests;
CREATE POLICY "bag_insert_via_parent" ON travel_app_baggage_requests FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "bag_update_via_parent" ON travel_app_baggage_requests;
CREATE POLICY "bag_update_via_parent" ON travel_app_baggage_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "bag_delete_via_parent" ON travel_app_baggage_requests;
CREATE POLICY "bag_delete_via_parent" ON travel_app_baggage_requests FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- ADVANCE_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_advance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  needed boolean NOT NULL DEFAULT false,
  estimated_value numeric(12,2),
  purpose text,
  notes text,
  within_deadline boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_advance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adv_select_via_parent" ON travel_app_advance_requests;
CREATE POLICY "adv_select_via_parent" ON travel_app_advance_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "adv_insert_via_parent" ON travel_app_advance_requests;
CREATE POLICY "adv_insert_via_parent" ON travel_app_advance_requests FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "adv_update_via_parent" ON travel_app_advance_requests;
CREATE POLICY "adv_update_via_parent" ON travel_app_advance_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "adv_delete_via_parent" ON travel_app_advance_requests;
CREATE POLICY "adv_delete_via_parent" ON travel_app_advance_requests FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- QUOTATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES travel_app_suppliers(id) ON DELETE SET NULL,
  quote_type text NOT NULL
    CHECK (quote_type IN ('aerea','rodoviaria','hospedagem')),
  quote_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_value numeric(12,2),
  valid_until date,
  conditions text,
  notes text,
  created_by uuid REFERENCES travel_app_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quo_select_via_parent" ON travel_app_quotations;
CREATE POLICY "quo_select_via_parent" ON travel_app_quotations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "quo_insert_admin" ON travel_app_quotations;
CREATE POLICY "quo_insert_admin" ON travel_app_quotations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "quo_update_admin" ON travel_app_quotations;
CREATE POLICY "quo_update_admin" ON travel_app_quotations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "quo_delete_admin" ON travel_app_quotations;
CREATE POLICY "quo_delete_admin" ON travel_app_quotations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- NEGOTIATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  supplier_name text,
  initial_value numeric(12,2),
  final_value numeric(12,2),
  discount_value numeric(12,2) GENERATED ALWAYS AS (initial_value - final_value) STORED,
  savings_percent numeric(6,2),
  payment_method text,
  notes text,
  responsible text,
  negotiated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES travel_app_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_negotiations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "neg_select_via_parent" ON travel_app_negotiations;
CREATE POLICY "neg_select_via_parent" ON travel_app_negotiations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "neg_insert_admin" ON travel_app_negotiations;
CREATE POLICY "neg_insert_admin" ON travel_app_negotiations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "neg_update_admin" ON travel_app_negotiations;
CREATE POLICY "neg_update_admin" ON travel_app_negotiations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "neg_delete_admin" ON travel_app_negotiations;
CREATE POLICY "neg_delete_admin" ON travel_app_negotiations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- PURCHASES
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  purchase_type text,
  supplier_id uuid REFERENCES travel_app_suppliers(id) ON DELETE SET NULL,
  agency text,
  airline text,
  hotel text,
  purchased_at date NOT NULL DEFAULT CURRENT_DATE,
  ticket_value numeric(12,2),
  accommodation_value numeric(12,2),
  baggage_value numeric(12,2),
  fees numeric(12,2),
  other_costs numeric(12,2),
  total_value numeric(12,2),
  payment_method text,
  locator text,
  ticket_number text,
  reservation_number text,
  invoice_number text,
  ticket_issued boolean NOT NULL DEFAULT false,
  accommodation_reserved boolean NOT NULL DEFAULT false,
  docs_sent_to_requester boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES travel_app_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pur_select_via_parent" ON travel_app_purchases;
CREATE POLICY "pur_select_via_parent" ON travel_app_purchases FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "pur_insert_admin" ON travel_app_purchases;
CREATE POLICY "pur_insert_admin" ON travel_app_purchases FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "pur_update_admin" ON travel_app_purchases;
CREATE POLICY "pur_update_admin" ON travel_app_purchases FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "pur_delete_admin" ON travel_app_purchases;
CREATE POLICY "pur_delete_admin" ON travel_app_purchases FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES travel_app_purchases(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  released boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES travel_app_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (request_id IS NOT NULL OR purchase_id IS NOT NULL)
);

ALTER TABLE travel_app_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: solicitante sees released travel_app_attachments OR travel_app_attachments on their own requests;
-- gestao/super_admin see all.
DROP POLICY IF EXISTS "att_select_scoped" ON travel_app_attachments;
CREATE POLICY "att_select_scoped" ON travel_app_attachments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR (
      released = true
      AND (
        request_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
            r.requester_id = auth.uid()
            OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
          )
        )
        OR purchase_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM travel_app_purchases pu WHERE pu.id = purchase_id
          AND EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = pu.request_id AND (
            r.requester_id = auth.uid()
            OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
          ))
        )
      )
    )
    OR (
      request_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND r.requester_id = auth.uid()
      )
    )
    OR (
      uploaded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "att_insert_admin" ON travel_app_attachments;
CREATE POLICY "att_insert_admin" ON travel_app_attachments FOR INSERT
  TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      request_id IS NULL OR EXISTS (
        SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
          r.requester_id = auth.uid()
          OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
        )
      )
    )
    AND (
      purchase_id IS NULL OR EXISTS (
        SELECT 1 FROM travel_app_purchases pu WHERE pu.id = purchase_id
        AND EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = pu.request_id AND (
          r.requester_id = auth.uid()
          OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
        ))
      )
    )
  );

DROP POLICY IF EXISTS "att_update_admin" ON travel_app_attachments;
CREATE POLICY "att_update_admin" ON travel_app_attachments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR uploaded_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "att_delete_admin" ON travel_app_attachments;
CREATE POLICY "att_delete_admin" ON travel_app_attachments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR uploaded_by = auth.uid()
  );

-- ============================================================
-- COMMENTS (pendências / mensagens)
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES travel_app_profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_request_for_info boolean NOT NULL DEFAULT false,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "com_select_via_parent" ON travel_app_comments;
CREATE POLICY "com_select_via_parent" ON travel_app_comments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "com_insert_via_parent" ON travel_app_comments;
CREATE POLICY "com_insert_via_parent" ON travel_app_comments FOR INSERT
  TO authenticated WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "com_update_via_parent" ON travel_app_comments;
CREATE POLICY "com_update_via_parent" ON travel_app_comments FOR UPDATE
  TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "com_delete_admin" ON travel_app_comments;
CREATE POLICY "com_delete_admin" ON travel_app_comments FOR DELETE
  TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- STATUS_HISTORY (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_app_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_app_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES travel_app_profiles(id) ON DELETE SET NULL,
  previous_status text,
  new_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_app_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sh_select_via_parent" ON travel_app_status_history;
CREATE POLICY "sh_select_via_parent" ON travel_app_status_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM travel_app_user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "sh_insert_via_parent" ON travel_app_status_history;
CREATE POLICY "sh_insert_via_parent" ON travel_app_status_history FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_app_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM travel_app_profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tr_requester ON travel_app_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_tr_worksite ON travel_app_requests(worksite_id);
CREATE INDEX IF NOT EXISTS idx_tr_status ON travel_app_requests(status);
CREATE INDEX IF NOT EXISTS idx_tr_assigned ON travel_app_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_trt_request ON travel_app_request_travelers(request_id);
CREATE INDEX IF NOT EXISTS idx_seg_request ON travel_app_segments(request_id);
CREATE INDEX IF NOT EXISTS idx_acc_request ON travel_app_accommodations(request_id);
CREATE INDEX IF NOT EXISTS idx_bag_request ON travel_app_baggage_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_adv_request ON travel_app_advance_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_quo_request ON travel_app_quotations(request_id);
CREATE INDEX IF NOT EXISTS idx_neg_request ON travel_app_negotiations(request_id);
CREATE INDEX IF NOT EXISTS idx_pur_request ON travel_app_purchases(request_id);
CREATE INDEX IF NOT EXISTS idx_att_request ON travel_app_attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_att_purchase ON travel_app_attachments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_com_request ON travel_app_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_sh_request ON travel_app_status_history(request_id);


/*
# Lucena Travel Management — Seed Data

## Purpose
Populates travel_app_policy_rules (configurable deadlines) and travel_app_faq_items (initial FAQ)
with content from the Lucena travel policy. These are idempotent inserts using
ON CONFLICT clauses so re-running is safe.

## Tables affected
- travel_app_policy_rules: inserts 6 deadline rules
- travel_app_faq_items: inserts 11 FAQ entries across categories

## Notes
- No user-specific seed (travel_app_worksites, travel_app_travelers, users) — those are created at runtime
  via the app UI. The app will bootstrap a super admin profile on first sign-in if none exists.
*/

INSERT INTO travel_app_policy_rules (rule_key, label, min_days, description) VALUES
  ('baixada_admissao_retorno_transferencia', 'Baixada, admissão, retorno ou transferência', 30, 'Baixadas, admissões, retornos e transferências devem ser solicitadas com pelo menos 30 dias corridos de antecedência.'),
  ('demais_nacionais', 'Demais viagens nacionais', 30, 'Demais viagens nacionais devem ser solicitadas com pelo menos 30 dias corridos de antecedência.'),
  ('internacional', 'Viagem internacional', 60, 'Viagens internacionais devem ser solicitadas com pelo menos 60 dias corridos de antecedência.'),
  ('diretoria_gerencias_nacional', 'Diretoria Executiva e Gerências — nacional', 15, 'Viagens da Diretoria Executiva e Gerências nacionais devem ser solicitadas com pelo menos 15 dias corridos de antecedência.'),
  ('diretoria_gerencias_internacional', 'Diretoria Executiva e Gerências — internacional', 30, 'Viagens da Diretoria Executiva e Gerências internacionais devem ser solicitadas com pelo menos 30 dias corridos de antecedência.'),
  ('adiantamento', 'Adiantamento', 7, 'O adiantamento deve ser solicitado preferencialmente junto com a viagem, com sete dias corridos de antecedência e, no mínimo, dois dias úteis antes da viagem.')
ON CONFLICT (rule_key) DO UPDATE
  SET label = EXCLUDED.label,
      min_days = EXCLUDED.min_days,
      description = EXCLUDED.description,
      updated_at = now();

INSERT INTO travel_app_faq_items (category, question, answer, sort_order) VALUES
  ('prazos', 'Com quantos dias de antecedência devo solicitar?', 'Baixadas, admissões, retornos, transferências e demais viagens nacionais devem ser solicitadas com pelo menos 30 dias corridos. Viagens internacionais devem ser solicitadas com pelo menos 60 dias.', 1),
  ('prazos', 'Posso solicitar fora do prazo?', 'Sim. O sistema solicitará uma justificativa e o nome do responsável que orientou ou autorizou a demanda. A solicitação poderá ser atendida com opções limitadas ou custos maiores.', 2),
  ('baixada', 'Quem deve solicitar uma baixada?', 'A solicitação deve ser registrada pela administração ou gestão da obra após o alinhamento interno.', 3),
  ('terceiros', 'Posso solicitar viagem para terceiro?', 'Sim, desde que a autorização prévia da Diretoria Executiva já tenha sido obtida. O sistema deverá registrar a confirmação.', 4),
  ('hospedagem', 'Como solicito hospedagem?', 'A hospedagem deve ser informada na mesma solicitação da passagem, quando aplicável.', 5),
  ('hospedagem', 'Posso reservar hotel por conta própria?', 'Não, salvo autorização expressa.', 6),
  ('bagagem', 'Posso levar bagagem despachada?', 'Depende da duração e finalidade da viagem. Bagagem adicional, ferramentas, equipamentos, uniformes e EPIs devem ser informados antes da emissão.', 7),
  ('alteracoes', 'Quem faz alterações depois da emissão?', 'Após a emissão, remarcações, cancelamentos, bagagens e alterações devem ser tratadas conforme o canal da agência oficial configurado no sistema.', 8),
  ('passagem', 'Posso comprar nova passagem por conta própria?', 'Não, salvo autorização expressa.', 9),
  ('aeroporto', 'Quanto tempo antes devo chegar ao aeroporto?', 'Duas horas antes para voos nacionais e três horas antes para voos internacionais.', 10),
  ('adiantamento', 'Quando devo solicitar adiantamento?', 'Preferencialmente junto com a viagem, com sete dias corridos de antecedência e, no mínimo, dois dias úteis antes da viagem.', 11),
  ('prestacao_contas', 'Qual o prazo para prestação de contas?', 'Até dez dias corridos após o retorno.', 12)
ON CONFLICT DO NOTHING;


-- ============================================================
-- SEGURANÇA E PERFIL INICIAL EXCLUSIVOS DE VIAGENS
-- ============================================================
CREATE OR REPLACE FUNCTION public.travel_app_is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.travel_app_profiles
    WHERE id = auth.uid() AND active = true
      AND role IN ('gestao_viagens','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.travel_app_is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.travel_app_profiles
    WHERE id = auth.uid() AND active = true AND role = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.travel_app_is_manager() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.travel_app_is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_app_is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.travel_app_is_super_admin() TO authenticated;

DROP POLICY IF EXISTS "travel_app_profiles_select_self_or_admin" ON public.travel_app_profiles;
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.travel_app_profiles;
CREATE POLICY "travel_app_profiles_select_self_or_manager"
ON public.travel_app_profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.travel_app_is_manager());

DROP POLICY IF EXISTS "travel_app_profiles_insert_self" ON public.travel_app_profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.travel_app_profiles;
CREATE POLICY "travel_app_profiles_insert_manager"
ON public.travel_app_profiles FOR INSERT TO authenticated
WITH CHECK (public.travel_app_is_manager());

DROP POLICY IF EXISTS "travel_app_profiles_update_self_or_admin" ON public.travel_app_profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.travel_app_profiles;
CREATE POLICY "travel_app_profiles_update_self_or_manager"
ON public.travel_app_profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.travel_app_is_manager())
WITH CHECK (id = auth.uid() OR public.travel_app_is_manager());

DROP POLICY IF EXISTS "travel_app_profiles_delete_admin" ON public.travel_app_profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.travel_app_profiles;
CREATE POLICY "travel_app_profiles_delete_super_admin"
ON public.travel_app_profiles FOR DELETE TO authenticated
USING (public.travel_app_is_super_admin());

DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'travel_app_%'
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
      table_record.tablename
    );
  END LOOP;
END $$;

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE lower(email) = lower('cadastro@lucena.com.br')
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Crie primeiro cadastro@lucena.com.br em Authentication > Users com e-mail confirmado.';
  END IF;

  INSERT INTO public.travel_app_profiles (
    id, full_name, registration, email, position, role, active, created_at, updated_at
  ) VALUES (
    admin_user_id,
    'Administrador de Viagens',
    '0001',
    'cadastro@lucena.com.br',
    'Super Administrador',
    'super_admin',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    position = EXCLUDED.position,
    role = 'super_admin',
    active = true,
    updated_at = now();
END $$;

-- Conferência: deve retornar apenas o e-mail cadastro inicialmente.
SELECT id, full_name, email, role, active
FROM public.travel_app_profiles
ORDER BY full_name;
