export type Role = 'solicitante' | 'gestao_viagens' | 'super_admin';


export type AccessRequestStatus = 'pendente' | 'aprovada' | 'rejeitada';

export interface AccessRequest {
  id: string;
  requester_name: string;
  registration: string | null;
  email: string;
  phone: string | null;
  position: string | null;
  worksite_name: string;
  cost_center: string | null;
  city: string;
  state: string;
  status: AccessRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type WorksiteStatus = 'ativa' | 'inativa' | 'encerrada';

export type TravelerType = 'colaborador' | 'terceiro' | 'necessidades_especiais';

export type RequestType = 'passagem' | 'hospedagem' | 'passagem_hospedagem';

export type TransportMode = 'aereo' | 'rodoviario';

export type Direction = 'ida' | 'volta' | 'ida_e_volta';

export type DeadlineStatus = 'dentro' | 'proximo' | 'fora';

export type RequestStatus =
  | 'rascunho'
  | 'pedido_recebido'
  | 'em_andamento'
  | 'orcado'
  | 'aprovado'
  | 'finalizada'
  | 'cancelada';

export type BaggageType =
  | 'nao'
  | 'mao'
  | 'despachada'
  | 'ferramentas_equipamentos'
  | 'adicional_especial';

export type QuoteType = 'aerea' | 'rodoviaria' | 'hospedagem';

export interface Profile {
  id: string;
  full_name: string;
  registration: string | null;
  email: string;
  phone: string | null;
  position: string | null;
  city: string | null;
  state: string | null;
  role: Role;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Worksite {
  id: string;
  name: string;
  code: string | null;
  cost_center: string | null;
  city: string | null;
  state: string | null;
  manager_name: string | null;
  status: WorksiteStatus;
  notes: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWorksite {
  id: string;
  user_id: string;
  worksite_id: string;
  created_at: string;
}

export interface Traveler {
  id: string;
  full_name: string;
  registration: string | null;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  worksite_id: string | null;
  cost_center: string | null;
  city: string | null;
  state: string | null;
  traveler_type: TravelerType;
  travel_notes: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  type: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyRule {
  id: string;
  rule_key: string;
  label: string;
  min_days: number;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TravelRequest {
  id: string;
  request_number: string | null;
  requester_id: string;
  worksite_id: string | null;
  request_type: RequestType;
  purpose: string;
  purpose_detail: string | null;
  international: boolean;
  is_emergency: boolean;
  internal_requested_by: string | null;
  internal_requester_position: string | null;
  traveler_type_confirmed: boolean;
  deadline_status: DeadlineStatus;
  deadline_min_days: number | null;
  deadline_actual_days: number | null;
  justification: string | null;
  justification_responsible: string | null;
  justification_confirmed: boolean;
  status: RequestStatus;
  assigned_to: string | null;
  not_attended_reason: string | null;
  cancel_reason: string | null;
  observation: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  finalized_at: string | null;
}

export interface TravelRequestTraveler {
  id: string;
  request_id: string;
  traveler_id: string;
  ticket_number: string | null;
  locator: string | null;
  individual_value: number | null;
  created_at: string;
}

export interface TravelSegment {
  id: string;
  request_id: string;
  segment_order: number;
  origin: string;
  destination: string;
  direction: Direction;
  departure_date: string | null;
  return_date: string | null;
  transport_mode: TransportMode | null;
  preferred_period: string | null;
  flexibility: string | null;
  notes: string | null;
  created_at: string;
}

export interface Accommodation {
  id: string;
  request_id: string;
  city: string | null;
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
  guests: number;
  location_preference: string | null;
  estimated_arrival_time: string | null;
  suggested_hotel: string | null;
  needs_parking: boolean;
  notes: string | null;
  created_at: string;
}

export interface BaggageRequest {
  id: string;
  request_id: string;
  baggage_type: BaggageType;
  description: string | null;
  quantity: number | null;
  approx_weight: string | null;
  dimensions: string | null;
  justification: string | null;
  created_at: string;
}

export interface AdvanceRequest {
  id: string;
  request_id: string;
  needed: boolean;
  estimated_value: number | null;
  purpose: string | null;
  notes: string | null;
  within_deadline: boolean | null;
  created_at: string;
}

export interface Quotation {
  id: string;
  request_id: string;
  supplier_id: string | null;
  quote_type: QuoteType;
  quote_detail: Record<string, unknown>;
  total_value: number | null;
  valid_until: string | null;
  conditions: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Negotiation {
  id: string;
  request_id: string;
  supplier_name: string | null;
  initial_value: number | null;
  final_value: number | null;
  discount_value: number | null;
  savings_percent: number | null;
  payment_method: string | null;
  notes: string | null;
  responsible: string | null;
  negotiated_at: string;
  created_by: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  request_id: string;
  purchase_type: string | null;
  supplier_id: string | null;
  agency: string | null;
  airline: string | null;
  flight_number: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  hotel: string | null;
  purchased_at: string;
  ticket_value: number | null;
  accommodation_value: number | null;
  baggage_value: number | null;
  fees: number | null;
  other_costs: number | null;
  total_value: number | null;
  payment_method: string | null;
  locator: string | null;
  ticket_number: string | null;
  reservation_number: string | null;
  invoice_number: string | null;
  ticket_issued: boolean;
  accommodation_reserved: boolean;
  docs_sent_to_requester: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  request_id: string | null;
  purchase_id: string | null;
  category: string;
  label: string | null;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  released: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  is_request_for_info: boolean;
  resolved: boolean;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  request_id: string;
  user_id: string | null;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  field_changed: string | null;
  justification: string | null;
  observation: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}
