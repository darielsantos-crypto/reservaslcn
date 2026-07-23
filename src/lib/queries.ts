import { supabase } from './supabase';
import { normalizeProfile } from './profile';
import type {
  TravelRequest,
  TravelSegment,
  Accommodation,
  BaggageRequest,
  AdvanceRequest,
  Quotation,
  Negotiation,
  Purchase,
  Attachment,
  Comment,
  StatusHistory,
  Traveler,
  Worksite,
  Profile,
  PolicyRule,
  FaqItem,
} from './types';

export interface RequestWithRelations extends TravelRequest {
  worksite?: Worksite | null;
  requester?: Profile | null;
  assigned?: Profile | null;
  travelers?: (TravelRequestTravelerRow)[];
  segments?: TravelSegment[];
  accommodations?: Accommodation[];
  baggage?: BaggageRequest[];
  advance?: AdvanceRequest | null;
  quotations?: Quotation[];
  negotiations?: Negotiation[];
  purchases?: Purchase[];
  attachments?: Attachment[];
  comments?: (Comment & { author?: Profile | null })[];
  history?: (StatusHistory & { user?: Profile | null })[];
}

export interface TravelRequestTravelerRow {
  id: string;
  traveler_id: string;
  ticket_number: string | null;
  locator: string | null;
  individual_value: number | null;
  traveler?: Traveler | null;
}

export async function fetchRequestDetail(id: string): Promise<RequestWithRelations | null> {
  const { data: req } = await supabase
    .from('travel_app_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!req) return null;

  const [ws, reqer, assigned, trt, seg, acc, bag, adv, quo, neg, pur, att, com, hist] =
    await Promise.all([
      req.worksite_id
        ? supabase.from('travel_app_worksites').select('*').eq('id', req.worksite_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('travel_app_profiles').select('*').eq('id', req.requester_id).maybeSingle(),
      req.assigned_to
        ? supabase.from('travel_app_profiles').select('*').eq('id', req.assigned_to).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('travel_app_request_travelers').select('*').eq('request_id', id),
      supabase.from('travel_app_segments').select('*').eq('request_id', id).order('segment_order'),
      supabase.from('travel_app_accommodations').select('*').eq('request_id', id),
      supabase.from('travel_app_baggage_requests').select('*').eq('request_id', id),
      supabase.from('travel_app_advance_requests').select('*').eq('request_id', id).maybeSingle(),
      supabase.from('travel_app_quotations').select('*').eq('request_id', id).order('created_at'),
      supabase.from('travel_app_negotiations').select('*').eq('request_id', id).order('negotiated_at'),
      supabase.from('travel_app_purchases').select('*').eq('request_id', id).order('created_at'),
      supabase.from('travel_app_attachments').select('*').eq('request_id', id).order('created_at'),
      supabase.from('travel_app_comments').select('*').eq('request_id', id).order('created_at'),
      supabase.from('travel_app_status_history').select('*').eq('request_id', id).order('created_at'),
    ]);

  const travelerIds = (trt.data ?? []).map((r) => r.traveler_id).filter(Boolean);
  const travelersMap: Record<string, Traveler> = {};
  if (travelerIds.length) {
    const { data: tdata } = await supabase
      .from('travel_app_travelers')
      .select('*')
      .in('id', travelerIds);
    (tdata ?? []).forEach((t) => (travelersMap[t.id] = t as Traveler));
  }

  const authorIds = Array.from(
    new Set((com.data ?? []).map((c) => c.author_id).filter(Boolean))
  );
  const authorsMap: Record<string, Profile> = {};
  if (authorIds.length) {
    const { data: adata } = await supabase
      .from('travel_app_profiles')
      .select('*')
      .in('id', authorIds);
    (adata ?? []).forEach((a) => (authorsMap[a.id] = a as Profile));
  }

  const histUserIds = Array.from(
    new Set((hist.data ?? []).map((h) => h.user_id).filter(Boolean))
  );
  const histUsersMap: Record<string, Profile> = {};
  if (histUserIds.length) {
    const { data: hudata } = await supabase
      .from('travel_app_profiles')
      .select('*')
      .in('id', histUserIds);
    (hudata ?? []).forEach((u) => (histUsersMap[u.id] = u as Profile));
  }

  return {
    ...(req as TravelRequest),
    worksite: ws.data as Worksite | null,
    requester: reqer.data as Profile | null,
    assigned: assigned.data as Profile | null,
    travelers: (trt.data ?? []).map((r) => ({
      ...r,
      traveler: travelersMap[r.traveler_id] ?? null,
    })) as TravelRequestTravelerRow[],
    segments: (seg.data ?? []) as TravelSegment[],
    accommodations: (acc.data ?? []) as Accommodation[],
    baggage: (bag.data ?? []) as BaggageRequest[],
    advance: (adv.data as AdvanceRequest | null) ?? null,
    quotations: (quo.data ?? []) as Quotation[],
    negotiations: (neg.data ?? []) as Negotiation[],
    purchases: (pur.data ?? []) as Purchase[],
    attachments: (att.data ?? []) as Attachment[],
    comments: (com.data ?? []).map((c) => ({
      ...c,
      author: authorsMap[c.author_id] ?? null,
    })) as (Comment & { author?: Profile | null })[],
    history: (hist.data ?? []).map((h) => ({
      ...h,
      user: h.user_id ? histUsersMap[h.user_id] ?? null : null,
    })) as (StatusHistory & { user?: Profile | null })[],
  };
}

export async function fetchMyWorksites(userId: string): Promise<Worksite[]> {
  const { data: links } = await supabase
    .from('travel_app_user_worksites')
    .select('worksite_id')
    .eq('user_id', userId);
  const ids = (links ?? []).map((l) => l.worksite_id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from('travel_app_worksites')
    .select('*')
    .in('id', ids)
    .eq('active', true)
    .order('name');
  return (data ?? []) as Worksite[];
}

export async function fetchTravelersForWorksite(worksiteId: string | null): Promise<Traveler[]> {
  let q = supabase.from('travel_app_travelers').select('*').eq('active', true).order('full_name');
  if (worksiteId) q = q.eq('worksite_id', worksiteId);
  const { data } = await q;
  return (data ?? []) as Traveler[];
}

export async function fetchAllTravelers(): Promise<Traveler[]> {
  const { data } = await supabase
    .from('travel_app_travelers')
    .select('*')
    .order('full_name');
  return (data ?? []) as Traveler[];
}

export async function fetchPolicyRules(): Promise<PolicyRule[]> {
  const { data } = await supabase.from('travel_app_policy_rules').select('*').order('label');
  return (data ?? []) as PolicyRule[];
}

export async function fetchFaq(): Promise<FaqItem[]> {
  const { data } = await supabase
    .from('travel_app_faq_items')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('sort_order');
  return (data ?? []) as FaqItem[];
}


export async function fetchWorksitesAll(): Promise<Worksite[]> {
  const { data } = await supabase.from('travel_app_worksites').select('*').order('name');
  return (data ?? []) as Worksite[];
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data } = await supabase.from('travel_app_profiles').select('*').order('name');
  return (data ?? []).map((row) => normalizeProfile(row as Record<string, unknown>)).filter(Boolean) as Profile[];
}
