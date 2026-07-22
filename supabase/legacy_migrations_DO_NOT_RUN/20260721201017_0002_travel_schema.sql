/*
# Lucena Travel Management — Travel Schema

## Purpose
Creates the travel-domain tables: travel requests, request↔traveler links,
segments (trechos), accommodations, baggage, advance requests, quotations,
negotiations, purchases, attachments, comments, status history.

## New Tables
- `travel_requests` — main request record (status, type, purpose, deadline signal, etc.)
- `travel_request_travelers` — many-to-many between requests and travelers
- `travel_segments` — trechos (origin, destination, dates, transport)
- `accommodations` — hospedagem (city, check-in/out, guests, diárias calc)
- `baggage_requests` — bagagem especial (tools, EPI, etc.)
- `advance_requests` — adiantamento
- `quotations` — cotações (aérea/rodoviária/hospedagem) with JSONB detail
- `negotiations` — negociação (initial/final value, savings)
- `purchases` — compra registrada (ticket, voucher, totals)
- `attachments` — anexos (request-level and purchase-level), with `released` flag
- `comments` — mensagens/pendências entre solicitante e gestão
- `status_history` — histórico de status (append-only)

## Security
- RLS enabled on every table.
- Travel requests: SELECT scoped — solicitante sees own + worksite-linked;
  gestao/super_admin see all. INSERT/UPDATE by owner or admins.
- Child tables (segments, accommodations, baggage, advance, quotations, negotiations,
  purchases, attachments, comments, status_history): SELECT scoped through parent request;
  write by owner of parent request or admins.
- attachments: solicitante can only read rows where `released = true` OR they own the parent.
- status_history: INSERT by anyone allowed to update the parent; SELECT scoped via parent.

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
CREATE TABLE IF NOT EXISTS travel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text UNIQUE,
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worksite_id uuid REFERENCES worksites(id) ON DELETE SET NULL,
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
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  not_attended_reason text,
  cancel_reason text,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  finalized_at timestamptz
);

ALTER TABLE travel_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: solicitante sees own requests + requests for worksites they are linked to;
-- gestao/super_admin see all.
DROP POLICY IF EXISTS "tr_select_scoped" ON travel_requests;
CREATE POLICY "tr_select_scoped" ON travel_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_worksites uw
      WHERE uw.user_id = auth.uid() AND uw.worksite_id = travel_requests.worksite_id
    )
  );

DROP POLICY IF EXISTS "tr_insert_own" ON travel_requests;
CREATE POLICY "tr_insert_own" ON travel_requests FOR INSERT
  TO authenticated WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "tr_update_owner_or_admin" ON travel_requests;
CREATE POLICY "tr_update_owner_or_admin" ON travel_requests FOR UPDATE
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  )
  WITH CHECK (
    requester_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "tr_delete_admin" ON travel_requests;
CREATE POLICY "tr_delete_admin" ON travel_requests FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- TRAVEL_REQUEST_TRAVELERS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_request_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  traveler_id uuid NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
  ticket_number text,
  locator text,
  individual_value numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE travel_request_travelers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trt_select_via_parent" ON travel_request_travelers;
CREATE POLICY "trt_select_via_parent" ON travel_request_travelers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "trt_insert_via_parent" ON travel_request_travelers;
CREATE POLICY "trt_insert_via_parent" ON travel_request_travelers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "trt_update_via_parent" ON travel_request_travelers;
CREATE POLICY "trt_update_via_parent" ON travel_request_travelers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "trt_delete_via_parent" ON travel_request_travelers;
CREATE POLICY "trt_delete_via_parent" ON travel_request_travelers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- TRAVEL_SEGMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
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

ALTER TABLE travel_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seg_select_via_parent" ON travel_segments;
CREATE POLICY "seg_select_via_parent" ON travel_segments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "seg_insert_via_parent" ON travel_segments;
CREATE POLICY "seg_insert_via_parent" ON travel_segments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "seg_update_via_parent" ON travel_segments;
CREATE POLICY "seg_update_via_parent" ON travel_segments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "seg_delete_via_parent" ON travel_segments;
CREATE POLICY "seg_delete_via_parent" ON travel_segments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- ACCOMMODATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
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

ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acc_select_via_parent" ON accommodations;
CREATE POLICY "acc_select_via_parent" ON accommodations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "acc_insert_via_parent" ON accommodations;
CREATE POLICY "acc_insert_via_parent" ON accommodations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "acc_update_via_parent" ON accommodations;
CREATE POLICY "acc_update_via_parent" ON accommodations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "acc_delete_via_parent" ON accommodations;
CREATE POLICY "acc_delete_via_parent" ON accommodations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- BAGGAGE_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS baggage_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  baggage_type text NOT NULL
    CHECK (baggage_type IN ('nao','mao','despachada','uniforme_epi','ferramentas_equipamentos','adicional_especial')),
  description text,
  quantity integer,
  approx_weight text,
  dimensions text,
  justification text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE baggage_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bag_select_via_parent" ON baggage_requests;
CREATE POLICY "bag_select_via_parent" ON baggage_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "bag_insert_via_parent" ON baggage_requests;
CREATE POLICY "bag_insert_via_parent" ON baggage_requests FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "bag_update_via_parent" ON baggage_requests;
CREATE POLICY "bag_update_via_parent" ON baggage_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "bag_delete_via_parent" ON baggage_requests;
CREATE POLICY "bag_delete_via_parent" ON baggage_requests FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- ADVANCE_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS advance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  needed boolean NOT NULL DEFAULT false,
  estimated_value numeric(12,2),
  purpose text,
  notes text,
  within_deadline boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE advance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adv_select_via_parent" ON advance_requests;
CREATE POLICY "adv_select_via_parent" ON advance_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "adv_insert_via_parent" ON advance_requests;
CREATE POLICY "adv_insert_via_parent" ON advance_requests FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "adv_update_via_parent" ON advance_requests;
CREATE POLICY "adv_update_via_parent" ON advance_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "adv_delete_via_parent" ON advance_requests;
CREATE POLICY "adv_delete_via_parent" ON advance_requests FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- QUOTATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  quote_type text NOT NULL
    CHECK (quote_type IN ('aerea','rodoviaria','hospedagem')),
  quote_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_value numeric(12,2),
  valid_until date,
  conditions text,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quo_select_via_parent" ON quotations;
CREATE POLICY "quo_select_via_parent" ON quotations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "quo_insert_admin" ON quotations;
CREATE POLICY "quo_insert_admin" ON quotations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "quo_update_admin" ON quotations;
CREATE POLICY "quo_update_admin" ON quotations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "quo_delete_admin" ON quotations;
CREATE POLICY "quo_delete_admin" ON quotations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- NEGOTIATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  supplier_name text,
  initial_value numeric(12,2),
  final_value numeric(12,2),
  discount_value numeric(12,2) GENERATED ALWAYS AS (initial_value - final_value) STORED,
  savings_percent numeric(6,2),
  payment_method text,
  notes text,
  responsible text,
  negotiated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "neg_select_via_parent" ON negotiations;
CREATE POLICY "neg_select_via_parent" ON negotiations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "neg_insert_admin" ON negotiations;
CREATE POLICY "neg_insert_admin" ON negotiations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "neg_update_admin" ON negotiations;
CREATE POLICY "neg_update_admin" ON negotiations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "neg_delete_admin" ON negotiations;
CREATE POLICY "neg_delete_admin" ON negotiations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- PURCHASES
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  purchase_type text,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
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
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pur_select_via_parent" ON purchases;
CREATE POLICY "pur_select_via_parent" ON purchases FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "pur_insert_admin" ON purchases;
CREATE POLICY "pur_insert_admin" ON purchases FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "pur_update_admin" ON purchases;
CREATE POLICY "pur_update_admin" ON purchases FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "pur_delete_admin" ON purchases;
CREATE POLICY "pur_delete_admin" ON purchases FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES travel_requests(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  released boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (request_id IS NOT NULL OR purchase_id IS NOT NULL)
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: solicitante sees released attachments OR attachments on their own requests;
-- gestao/super_admin see all.
DROP POLICY IF EXISTS "att_select_scoped" ON attachments;
CREATE POLICY "att_select_scoped" ON attachments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR (
      released = true
      AND (
        request_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
            r.requester_id = auth.uid()
            OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
          )
        )
        OR purchase_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM purchases pu WHERE pu.id = purchase_id
          AND EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = pu.request_id AND (
            r.requester_id = auth.uid()
            OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
          ))
        )
      )
    )
    OR (
      request_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM travel_requests r WHERE r.id = request_id AND r.requester_id = auth.uid()
      )
    )
    OR (
      uploaded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "att_insert_admin" ON attachments;
CREATE POLICY "att_insert_admin" ON attachments FOR INSERT
  TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      request_id IS NULL OR EXISTS (
        SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
          r.requester_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
        )
      )
    )
    AND (
      purchase_id IS NULL OR EXISTS (
        SELECT 1 FROM purchases pu WHERE pu.id = purchase_id
        AND EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = pu.request_id AND (
          r.requester_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
        ))
      )
    )
  );

DROP POLICY IF EXISTS "att_update_admin" ON attachments;
CREATE POLICY "att_update_admin" ON attachments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR uploaded_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "att_delete_admin" ON attachments;
CREATE POLICY "att_delete_admin" ON attachments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    OR uploaded_by = auth.uid()
  );

-- ============================================================
-- COMMENTS (pendências / mensagens)
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_request_for_info boolean NOT NULL DEFAULT false,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "com_select_via_parent" ON comments;
CREATE POLICY "com_select_via_parent" ON comments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "com_insert_via_parent" ON comments;
CREATE POLICY "com_insert_via_parent" ON comments FOR INSERT
  TO authenticated WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

DROP POLICY IF EXISTS "com_update_via_parent" ON comments;
CREATE POLICY "com_update_via_parent" ON comments FOR UPDATE
  TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
  );

DROP POLICY IF EXISTS "com_delete_admin" ON comments;
CREATE POLICY "com_delete_admin" ON comments FOR DELETE
  TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- ============================================================
-- STATUS_HISTORY (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  previous_status text,
  new_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sh_select_via_parent" ON status_history;
CREATE POLICY "sh_select_via_parent" ON status_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
      OR EXISTS (SELECT 1 FROM user_worksites uw WHERE uw.user_id = auth.uid() AND uw.worksite_id = r.worksite_id)
    ))
  );

DROP POLICY IF EXISTS "sh_insert_via_parent" ON status_history;
CREATE POLICY "sh_insert_via_parent" ON status_history FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM travel_requests r WHERE r.id = request_id AND (
      r.requester_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('gestao_viagens','super_admin'))
    ))
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tr_requester ON travel_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_tr_worksite ON travel_requests(worksite_id);
CREATE INDEX IF NOT EXISTS idx_tr_status ON travel_requests(status);
CREATE INDEX IF NOT EXISTS idx_tr_assigned ON travel_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_trt_request ON travel_request_travelers(request_id);
CREATE INDEX IF NOT EXISTS idx_seg_request ON travel_segments(request_id);
CREATE INDEX IF NOT EXISTS idx_acc_request ON accommodations(request_id);
CREATE INDEX IF NOT EXISTS idx_bag_request ON baggage_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_adv_request ON advance_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_quo_request ON quotations(request_id);
CREATE INDEX IF NOT EXISTS idx_neg_request ON negotiations(request_id);
CREATE INDEX IF NOT EXISTS idx_pur_request ON purchases(request_id);
CREATE INDEX IF NOT EXISTS idx_att_request ON attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_att_purchase ON attachments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_com_request ON comments(request_id);
CREATE INDEX IF NOT EXISTS idx_sh_request ON status_history(request_id);
