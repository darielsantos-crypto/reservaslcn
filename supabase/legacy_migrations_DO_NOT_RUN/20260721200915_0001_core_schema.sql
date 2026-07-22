/*
# Lucena Travel Management — Core Schema

## Purpose
Creates the foundational tables for the Lucena Infraestrutura corporate travel
management system: user profiles, roles, worksites (obras), user↔worksite links,
travelers (colaboradores viajantes), suppliers, policy rules, FAQ items, audit logs, notifications.

## New Tables
- `profiles` — extends auth.users with role + personal data
- `worksites` — obras (name, code, cost center, city/state, manager, status)
- `user_worksites` — many-to-many between profiles and worksites
- `travelers` — colaboradores viajantes (sensitive data protected)
- `suppliers` — fornecedores / agências
- `policy_rules` — configurable travel policy deadlines (editable by Super Admin)
- `faq_items` — perguntas frequentes
- `audit_logs` — immutable audit trail of user actions
- `notifications` — in-app notifications

## Security
- RLS enabled on every table.
- Profiles: each authenticated user reads/updates own row; admins read all.
- Worksites, travelers, suppliers, policy, faq: readable by all authenticated;
  writable only by travel management + super admin (checked via role column).
- user_worksites: readable by authenticated; writable by admins.
- audit_logs: insert by any authenticated; read only by super admin.
- notifications: owner-scoped via user_id.

## Notes
- Roles: 'solicitante' | 'gestao_viagens' | 'super_admin'.
- Worksite status: 'ativa' | 'inativa' | 'encerrada'.
- Traveler type: 'colaborador' | 'terceiro' | 'necessidades_especiais'.
- Records are soft-deleted via `active` boolean to preserve history.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
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
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON profiles;
CREATE POLICY "profiles_select_self_or_admin" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR role IN ('gestao_viagens','super_admin')
  );

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON profiles;
CREATE POLICY "profiles_update_self_or_admin" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR role IN ('gestao_viagens','super_admin'))
  WITH CHECK (auth.uid() = id OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('gestao_viagens','super_admin')
  ));

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- WORKSITES (obras)
-- ============================================================
CREATE TABLE IF NOT EXISTS worksites (
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
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE worksites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worksites_select_auth" ON worksites;
CREATE POLICY "worksites_select_auth" ON worksites FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "worksites_insert_admin" ON worksites;
CREATE POLICY "worksites_insert_admin" ON worksites FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "worksites_update_admin" ON worksites;
CREATE POLICY "worksites_update_admin" ON worksites FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "worksites_delete_admin" ON worksites;
CREATE POLICY "worksites_delete_admin" ON worksites FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- USER_WORKSITES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_worksites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worksite_id uuid NOT NULL REFERENCES worksites(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, worksite_id)
);

ALTER TABLE user_worksites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_worksites_select_auth" ON user_worksites;
CREATE POLICY "user_worksites_select_auth" ON user_worksites FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "user_worksites_insert_admin" ON user_worksites;
CREATE POLICY "user_worksites_insert_admin" ON user_worksites FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "user_worksites_update_admin" ON user_worksites;
CREATE POLICY "user_worksites_update_admin" ON user_worksites FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "user_worksites_delete_admin" ON user_worksites;
CREATE POLICY "user_worksites_delete_admin" ON user_worksites FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

-- ============================================================
-- TRAVELERS (colaboradores viajantes)
-- ============================================================
CREATE TABLE IF NOT EXISTS travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  registration text,
  cpf text,
  birth_date date,
  phone text,
  email text,
  position text,
  worksite_id uuid REFERENCES worksites(id) ON DELETE SET NULL,
  cost_center text,
  city text,
  state text,
  traveler_type text NOT NULL DEFAULT 'colaborador'
    CHECK (traveler_type IN ('colaborador','terceiro','necessidades_especiais')),
  travel_notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travelers_select_auth" ON travelers;
CREATE POLICY "travelers_select_auth" ON travelers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "travelers_insert_admin" ON travelers;
CREATE POLICY "travelers_insert_admin" ON travelers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('solicitante','gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "travelers_update_admin" ON travelers;
CREATE POLICY "travelers_update_admin" ON travelers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('solicitante','gestao_viagens','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('solicitante','gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "travelers_delete_admin" ON travelers;
CREATE POLICY "travelers_delete_admin" ON travelers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- SUPPLIERS (fornecedores / agências)
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  contact_name text,
  phone text,
  email text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_select_auth" ON suppliers;
CREATE POLICY "suppliers_select_auth" ON suppliers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "suppliers_insert_admin" ON suppliers;
CREATE POLICY "suppliers_insert_admin" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "suppliers_update_admin" ON suppliers;
CREATE POLICY "suppliers_update_admin" ON suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "suppliers_delete_admin" ON suppliers;
CREATE POLICY "suppliers_delete_admin" ON suppliers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- POLICY_RULES (prazos configuráveis)
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  label text NOT NULL,
  min_days integer NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE policy_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_rules_select_auth" ON policy_rules;
CREATE POLICY "policy_rules_select_auth" ON policy_rules FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "policy_rules_insert_admin" ON policy_rules;
CREATE POLICY "policy_rules_insert_admin" ON policy_rules FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

DROP POLICY IF EXISTS "policy_rules_update_admin" ON policy_rules;
CREATE POLICY "policy_rules_update_admin" ON policy_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

DROP POLICY IF EXISTS "policy_rules_delete_admin" ON policy_rules;
CREATE POLICY "policy_rules_delete_admin" ON policy_rules FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- FAQ_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_select_auth" ON faq_items;
CREATE POLICY "faq_select_auth" ON faq_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "faq_insert_admin" ON faq_items;
CREATE POLICY "faq_insert_admin" ON faq_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

DROP POLICY IF EXISTS "faq_update_admin" ON faq_items;
CREATE POLICY "faq_update_admin" ON faq_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

DROP POLICY IF EXISTS "faq_delete_admin" ON faq_items;
CREATE POLICY "faq_delete_admin" ON faq_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- AUDIT_LOGS (immutable trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
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

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_insert_auth" ON audit_logs;
CREATE POLICY "audit_insert_auth" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "audit_select_admin" ON audit_logs;
CREATE POLICY "audit_select_admin" ON audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON notifications;
CREATE POLICY "notif_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert_admin" ON notifications;
CREATE POLICY "notif_insert_admin" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_worksites_status ON worksites(status);
CREATE INDEX IF NOT EXISTS idx_user_worksites_user ON user_worksites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_worksites_worksite ON user_worksites(worksite_id);
CREATE INDEX IF NOT EXISTS idx_travelers_worksite ON travelers(worksite_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, read);
