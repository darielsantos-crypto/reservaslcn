import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import {
  fetchMyWorksites,
  fetchTravelersForWorksite,
  fetchPolicyRules,
} from '@/lib/queries';
import { notify, logAudit, appendStatus } from '@/lib/hooks';
import {
  computeDeadlineStatus,
  resolveMinDays,
  daysUntil,
  nightsBetween,
  generateRequestNumber,
  cn,
} from '@/lib/helpers';
import {
  PURPOSES,
  PURPOSE_LABELS,
  FLEXIBILITY_OPTIONS,
  FLEXIBILITY_LABELS,
} from '@/lib/constants';
import type {
  Worksite,
  Traveler,
  PolicyRule,
  RequestType,
  TransportMode,
  Direction,
  BaggageType,
  DeadlineStatus,
} from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select, Textarea, Label } from '@/components/ui/Field';
import {
  Plane,
  BedDouble,
  Hotel,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Info,
  Plus,
  X,
  ShieldCheck,
} from 'lucide-react';

interface Draft {
  requestType: RequestType | null;
  worksiteId: string | null;
  travelerIds: string[];
  purpose: string;
  purposeDetail: string;
  internalRequestedBy: string;
  internalRequesterPosition: string;
  travelerTypeConfirmed: boolean;
  international: boolean;
  origin: string;
  destination: string;
  direction: Direction;
  departureDate: string;
  returnDate: string;
  transportMode: TransportMode;
  preferredPeriod: string;
  flexibility: string;
  segmentNotes: string;
  multiSegment: boolean;
  accCity: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  locationPreference: string;
  estimatedArrival: string;
  suggestedHotel: string;
  needsParking: boolean;
  accNotes: string;
  baggageType: BaggageType;
  baggageDescription: string;
  baggageQuantity: string;
  baggageWeight: string;
  baggageDimensions: string;
  baggageJustification: string;
  advanceNeeded: boolean;
  advanceValue: string;
  advancePurpose: string;
  advanceNotes: string;
  observation: string;
  isEmergency: boolean;
  justification: string;
  justificationResponsible: string;
  justificationConfirmed: boolean;
}

const emptyDraft: Draft = {
  requestType: null,
  worksiteId: null,
  travelerIds: [],
  purpose: '',
  purposeDetail: '',
  internalRequestedBy: '',
  internalRequesterPosition: '',
  travelerTypeConfirmed: false,
  international: false,
  origin: '',
  destination: '',
  direction: 'ida_e_volta',
  departureDate: '',
  returnDate: '',
  transportMode: 'aereo',
  preferredPeriod: '',
  flexibility: 'qualquer_horario',
  segmentNotes: '',
  multiSegment: false,
  accCity: '',
  checkIn: '',
  checkOut: '',
  guests: 1,
  locationPreference: '',
  estimatedArrival: '',
  suggestedHotel: '',
  needsParking: false,
  accNotes: '',
  baggageType: 'nao',
  baggageDescription: '',
  baggageQuantity: '',
  baggageWeight: '',
  baggageDimensions: '',
  baggageJustification: '',
  advanceNeeded: false,
  advanceValue: '',
  advancePurpose: '',
  advanceNotes: '',
  observation: '',
  isEmergency: false,
  justification: '',
  justificationResponsible: '',
  justificationConfirmed: false,
};

const STORAGE_KEY = 'lucena_draft_request';

const STEPS = [
  'type',
  'traveler',
  'route',
  'purpose',
  'accommodation',
  'baggage',
  'advance',
  'attachments',
  'review',
] as const;

const STEP_LABELS: Record<string, string> = {
  type: 'O que você precisa?',
  traveler: 'Quem vai viajar?',
  route: 'Para onde e quando?',
  purpose: 'Finalidade',
  accommodation: 'Hospedagem',
  baggage: 'Bagagem',
  advance: 'Adiantamento',
  attachments: 'Anexos',
  review: 'Conferência',
};

export function NewRequestScreen() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...emptyDraft, ...JSON.parse(saved) } : emptyDraft;
  });
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; number: string } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (!profile) return;
    fetchMyWorksites(profile.id).then(setWorksites);
    fetchPolicyRules().then(setRules);
  }, [profile]);

  useEffect(() => {
    fetchTravelersForWorksite(draft.worksiteId).then(setTravelers);
  }, [draft.worksiteId]);

  const selectedTravelers = travelers.filter((t) => draft.travelerIds.includes(t.id));
  const hasTerceiro = selectedTravelers.some((t) => t.traveler_type === 'terceiro');

  const showAccommodation = draft.requestType === 'hospedagem' || draft.requestType === 'passagem_hospedagem';

  const effectiveStep = STEPS[step];
  const visibleSteps = useMemo(() => {
    return STEPS.filter((s) => s !== 'accommodation' || showAccommodation);
  }, [showAccommodation]);

  const deadline = useMemo(() => {
    if (!draft.departureDate) return null;
    const actualDays = daysUntil(draft.departureDate);
    const minDays = resolveMinDays(
      {
        purpose: draft.purpose,
        international: draft.international,
        is_emergency: draft.isEmergency,
        departureDate: draft.departureDate,
      },
      rules
    );
    const status = computeDeadlineStatus(actualDays, minDays);
    return { actualDays, minDays, status };
  }, [draft.departureDate, draft.purpose, draft.international, draft.isEmergency, rules]);

  const advanceDeadline = useMemo(() => {
    if (!draft.advanceNeeded || !draft.departureDate) return null;
    const days = daysUntil(draft.departureDate);
    const min = rules.find((r) => r.rule_key === 'adiantamento')?.min_days ?? 7;
    return { within: days >= min, days, min };
  }, [draft.advanceNeeded, draft.departureDate, rules]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleTraveler(id: string) {
    setDraft((d) => ({
      ...d,
      travelerIds: d.travelerIds.includes(id)
        ? d.travelerIds.filter((t) => t !== id)
        : [...d.travelerIds, id],
    }));
  }

  function next() {
    setStep((s) => Math.min(visibleSteps.length - 1, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  function canProceed(): boolean {
    switch (effectiveStep) {
      case 'type':
        return !!draft.requestType;
      case 'traveler':
        return (
          !!draft.worksiteId &&
          draft.travelerIds.length > 0 &&
          !!draft.purpose &&
          !!draft.internalRequestedBy &&
          (!hasTerceiro || draft.travelerTypeConfirmed)
        );
      case 'route':
        return (
          !!draft.origin &&
          !!draft.destination &&
          !!draft.departureDate &&
          (draft.direction !== 'ida_e_volta' || !!draft.returnDate)
        );
      case 'purpose':
        return !!draft.purpose && (draft.purpose !== 'outros' || !!draft.purposeDetail);
      case 'accommodation':
        return !!draft.checkIn && !!draft.checkOut;
      case 'baggage':
        if (['ferramentas_equipamentos', 'adicional_especial', 'uniforme_epi'].includes(draft.baggageType)) {
          return !!draft.baggageDescription && !!draft.baggageJustification;
        }
        return true;
      case 'advance':
        if (draft.advanceNeeded) return !!draft.advanceValue && !!draft.advancePurpose;
        return true;
      case 'attachments':
        return true;
      case 'review':
        if (deadline?.status === 'fora' && !draft.isEmergency) {
          return !!draft.justification && !!draft.justificationResponsible && draft.justificationConfirmed;
        }
        return true;
    }
    return true;
  }

  async function submit() {
    if (!profile) return;
    setSubmitting(true);
    setError(null);

    try {
      const number = generateRequestNumber();
      const deadlineInfo = deadline ?? { actualDays: null, minDays: null, status: 'dentro' as DeadlineStatus };

      const { data: req, error: e1 } = await supabase
        .from('travel_app_requests')
        .insert({
          request_number: number,
          requester_id: profile.id,
          worksite_id: draft.worksiteId,
          request_type: draft.requestType,
          purpose: draft.purpose,
          purpose_detail: draft.purpose === 'outros' ? draft.purposeDetail : null,
          international: draft.international,
          is_emergency: draft.isEmergency,
          internal_requested_by: draft.internalRequestedBy,
          internal_requester_position: draft.internalRequesterPosition || null,
          traveler_type_confirmed: draft.travelerTypeConfirmed,
          deadline_status: deadlineInfo.status,
          deadline_min_days: deadlineInfo.minDays,
          deadline_actual_days: deadlineInfo.actualDays,
          justification: deadlineInfo.status === 'fora' ? draft.justification : null,
          justification_responsible: deadlineInfo.status === 'fora' ? draft.justificationResponsible : null,
          justification_confirmed: draft.justificationConfirmed,
          status: 'enviada',
          submitted_at: new Date().toISOString(),
          observation: draft.observation || null,
        })
        .select()
        .single();

      if (e1 || !req) throw new Error(e1?.message ?? 'Falha ao criar solicitação');

      // travelers
      if (draft.travelerIds.length) {
        await supabase
          .from('travel_app_request_travelers')
          .insert(draft.travelerIds.map((tid) => ({ request_id: req.id, traveler_id: tid })));
      }

      // segment
      await supabase.from('travel_app_segments').insert({
        request_id: req.id,
        segment_order: 1,
        origin: draft.origin,
        destination: draft.destination,
        direction: draft.direction,
        departure_date: draft.departureDate || null,
        return_date: draft.direction === 'ida_e_volta' ? draft.returnDate || null : null,
        transport_mode: draft.transportMode,
        preferred_period: draft.preferredPeriod || null,
        flexibility: draft.flexibility,
        notes: draft.segmentNotes || null,
      });

      // accommodation
      if (showAccommodation && draft.checkIn && draft.checkOut) {
        await supabase.from('travel_app_accommodations').insert({
          request_id: req.id,
          city: draft.accCity || null,
          check_in: draft.checkIn,
          check_out: draft.checkOut,
          nights: nightsBetween(draft.checkIn, draft.checkOut),
          guests: draft.guests,
          location_preference: draft.locationPreference || null,
          estimated_arrival_time: draft.estimatedArrival || null,
          suggested_hotel: draft.suggestedHotel || null,
          needs_parking: draft.needsParking,
          notes: draft.accNotes || null,
        });
      }

      // baggage
      if (draft.baggageType !== 'nao') {
        await supabase.from('travel_app_baggage_requests').insert({
          request_id: req.id,
          baggage_type: draft.baggageType,
          description: draft.baggageDescription || null,
          quantity: draft.baggageQuantity ? Number(draft.baggageQuantity) : null,
          approx_weight: draft.baggageWeight || null,
          dimensions: draft.baggageDimensions || null,
          justification: draft.baggageJustification || null,
        });
      }

      // advance
      if (draft.advanceNeeded) {
        await supabase.from('travel_app_advance_requests').insert({
          request_id: req.id,
          needed: true,
          estimated_value: draft.advanceValue ? Number(draft.advanceValue) : null,
          purpose: draft.advancePurpose || null,
          notes: draft.advanceNotes || null,
          within_deadline: advanceDeadline?.within ?? null,
        });
      }

      // attachments
      for (const file of files) {
        const path = `${req.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from('travel_app_attachments')
          .upload(path, file);
        if (!upErr) {
          await supabase.from('travel_app_attachments').insert({
            request_id: req.id,
            category: 'documento',
            label: file.name,
            file_path: path,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: profile.id,
          });
        }
      }

      await appendStatus(req.id, profile.id, null, 'enviada', 'Solicitação enviada');
      await logAudit(profile.id, 'create_request', { type: 'travel_request', id: req.id });

      // notify travel management
      const { data: gestores } = await supabase
        .from('travel_app_profiles')
        .select('id')
        .in('role', ['gestao_viagens', 'super_admin'])
        .eq('active', true);
      for (const g of gestores ?? []) {
        await notify(g.id, 'Nova solicitação enviada', `${number} — ${draft.origin} → ${draft.destination}`, `request/${req.id}`);
      }

      localStorage.removeItem(STORAGE_KEY);
      setSuccess({ id: req.id, number });
    } catch (err: any) {
      setError(err.message ?? 'Erro ao enviar solicitação');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Solicitação enviada com sucesso</h1>
          <p className="text-sm text-gray-500 mt-1">Número: <span className="font-mono font-medium text-gray-700">{success.number}</span></p>
          <p className="text-sm text-gray-500 mt-3">Status inicial: <span className="font-medium text-gray-700">Enviada</span></p>
          <p className="text-sm text-gray-500">Acompanhe o andamento no seu painel.</p>
          <div className="flex flex-col gap-2 mt-6">
            <Button onClick={() => navigate(`/request/${success.id}`)}>Abrir o pedido</Button>
            <Button variant="outline" onClick={() => navigate('/my-requests')}>Ir para minhas solicitações</Button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / visibleSteps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-gray-900">Nova solicitação</h1>
          <span className="text-xs text-gray-500">{step + 1} de {visibleSteps.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-[#004883] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm font-medium text-[#004883]">{STEP_LABELS[effectiveStep]}</p>
      </div>

      {/* STEP: type */}
      {effectiveStep === 'type' && (
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { v: 'passagem', label: 'Passagem', icon: Plane },
            { v: 'hospedagem', label: 'Hospedagem', icon: BedDouble },
            { v: 'passagem_hospedagem', label: 'Passagem + hospedagem', icon: Hotel },
          ].map((opt) => {
            const active = draft.requestType === opt.v;
            const Icon = opt.icon;
            return (
              <button
                key={opt.v}
                onClick={() => update('requestType', opt.v as RequestType)}
                className={cn(
                  'rounded-2xl border p-5 text-left transition-all',
                  active
                    ? 'border-[#004883] bg-[#004883]/5 ring-2 ring-[#004883]/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center mb-3', active ? 'bg-[#004883] text-white' : 'bg-gray-100 text-gray-600')}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="font-medium text-gray-900 text-sm">{opt.label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* STEP: traveler */}
      {effectiveStep === 'traveler' && (
        <div className="space-y-4">
          <Field label="Obra" required>
            <Select value={draft.worksiteId ?? ''} onChange={(e) => update('worksiteId', e.target.value || null)}>
              <option value="">Selecione...</option>
              {worksites.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Colaborador(es) que vai viajar" required hint="Selecione um ou mais. Os dados são preenchidos automaticamente.">
            <div className="space-y-1.5 max-h-56 overflow-y-auto rounded-xl border border-gray-200 p-1.5">
              {travelers.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Nenhum colaborador vinculado a esta obra.</p>
              )}
              {travelers.map((t) => {
                const sel = draft.travelerIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTraveler(t.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition',
                      sel ? 'bg-[#004883]/5 border border-[#004883]/30' : 'hover:bg-gray-50 border border-transparent'
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.full_name}</p>
                      <p className="text-xs text-gray-500">{t.registration ?? 'Sem matrícula'} · {t.position ?? '—'}</p>
                    </div>
                    <div className={cn('h-5 w-5 rounded-full border flex items-center justify-center', sel ? 'bg-[#004883] border-[#004883] text-white' : 'border-gray-300')}>
                      {sel && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Finalidade da viagem" required>
            <Select value={draft.purpose} onChange={(e) => update('purpose', e.target.value)}>
              <option value="">Selecione...</option>
              {PURPOSES.map((p) => (
                <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>
              ))}
            </Select>
          </Field>

          {draft.purpose === 'outros' && (
            <Field label="Descreva a finalidade" required>
              <Input value={draft.purposeDetail} onChange={(e) => update('purposeDetail', e.target.value)} placeholder="Descrição curta" />
            </Field>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Solicitado internamente por" required hint="Gestor ou responsável que originou o pedido">
              <Input value={draft.internalRequestedBy} onChange={(e) => update('internalRequestedBy', e.target.value)} placeholder="Nome" />
            </Field>
            <Field label="Cargo ou função de quem solicitou">
              <Input value={draft.internalRequesterPosition} onChange={(e) => update('internalRequesterPosition', e.target.value)} placeholder="Cargo" />
            </Field>
          </div>

          {hasTerceiro && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-900">
                    Viagens para terceiros devem possuir autorização prévia da Diretoria Executiva. Confirme que essa autorização já foi obtida antes de continuar.
                  </p>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.travelerTypeConfirmed}
                      onChange={(e) => update('travelerTypeConfirmed', e.target.checked)}
                      className="h-4 w-4 rounded border-amber-400 text-[#004883] focus:ring-[#004883]"
                    />
                    <span className="text-sm font-medium text-amber-900">Confirmo que a autorização necessária já foi obtida.</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <Field label="Observação (opcional)">
            <Textarea value={draft.observation} onChange={(e) => update('observation', e.target.value)} placeholder="Informações adicionais..." />
          </Field>
        </div>
      )}

      {/* STEP: route */}
      {effectiveStep === 'route' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => update('international', false)}
              className={cn('flex-1 rounded-xl border py-2.5 text-sm font-medium', !draft.international ? 'border-[#004883] bg-[#004883]/5 text-[#004883]' : 'border-gray-200 text-gray-600')}
            >
              Viagem nacional
            </button>
            <button
              onClick={() => update('international', true)}
              className={cn('flex-1 rounded-xl border py-2.5 text-sm font-medium', draft.international ? 'border-[#004883] bg-[#004883]/5 text-[#004883]' : 'border-gray-200 text-gray-600')}
            >
              Viagem internacional
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Origem" required>
              <Input value={draft.origin} onChange={(e) => update('origin', e.target.value)} placeholder="Cidade" />
            </Field>
            <Field label="Destino" required>
              <Input value={draft.destination} onChange={(e) => update('destination', e.target.value)} placeholder="Cidade" />
            </Field>
          </div>

          <Field label="Tipo de trajeto" required>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'ida', l: 'Somente ida' },
                { v: 'volta', l: 'Somente volta' },
                { v: 'ida_e_volta', l: 'Ida e volta' },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => update('direction', o.v as Direction)}
                  className={cn('rounded-xl border py-2.5 text-sm font-medium', draft.direction === o.v ? 'border-[#004883] bg-[#004883]/5 text-[#004883]' : 'border-gray-200 text-gray-600')}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Data da ida" required>
              <Input type="date" value={draft.departureDate} onChange={(e) => update('departureDate', e.target.value)} />
            </Field>
            {draft.direction === 'ida_e_volta' && (
              <Field label="Data da volta" required>
                <Input type="date" value={draft.returnDate} onChange={(e) => update('returnDate', e.target.value)} min={draft.departureDate} />
              </Field>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Transporte" required>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'aereo', l: 'Aéreo' },
                  { v: 'rodoviario', l: 'Rodoviário' },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => update('transportMode', o.v as TransportMode)}
                    className={cn('rounded-xl border py-2.5 text-sm font-medium', draft.transportMode === o.v ? 'border-[#004883] bg-[#004883]/5 text-[#004883]' : 'border-gray-200 text-gray-600')}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Flexibilidade de horário">
              <Select value={draft.flexibility} onChange={(e) => update('flexibility', e.target.value)}>
                {FLEXIBILITY_OPTIONS.map((f) => (
                  <option key={f} value={f}>{FLEXIBILITY_LABELS[f]}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Horário ou período preferencial (opcional)">
            <Input value={draft.preferredPeriod} onChange={(e) => update('preferredPeriod', e.target.value)} placeholder="Ex: partida pela manhã" />
          </Field>

          <Field label="Observações do trajeto (opcional)">
            <Textarea value={draft.segmentNotes} onChange={(e) => update('segmentNotes', e.target.value)} placeholder="Ex: evitar voos com conexão longa" />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.isEmergency} onChange={(e) => update('isEmergency', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#004883] focus:ring-[#004883]" />
            <span className="text-sm font-medium text-gray-700">Esta é uma viagem emergencial</span>
          </label>
        </div>
      )}

      {/* STEP: purpose (confirmation of purpose + emergency handling) */}
      {effectiveStep === 'purpose' && (
        <div className="space-y-4">
          <Card className="bg-[#004883]/5 border-[#004883]/20">
            <div className="p-4">
              <p className="text-sm text-gray-700">
                Finalidade selecionada: <span className="font-semibold text-[#004883]">{PURPOSE_LABELS[draft.purpose] ?? draft.purpose}</span>
              </p>
              {draft.purpose === 'outros' && draft.purposeDetail && (
                <p className="text-sm text-gray-600 mt-1">{draft.purposeDetail}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">A finalidade organiza relatórios, calcula prazos e habilita campos específicos. Não gera fluxo de aprovação.</p>
            </div>
          </Card>

          {deadline && (
            <DeadlineBanner status={deadline.status} minDays={deadline.minDays} actualDays={deadline.actualDays} isEmergency={draft.isEmergency} />
          )}

          {deadline?.status === 'fora' && !draft.isEmergency && (
            <div className="space-y-3 rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm font-medium text-red-900">Solicitação fora do prazo da Política de Viagens.</p>
              <Field label="Justificativa" required>
                <Textarea value={draft.justification} onChange={(e) => update('justification', e.target.value)} placeholder="Explique o motivo do pedido fora do prazo" />
              </Field>
              <Field label="Quem orientou ou autorizou a solicitação" required>
                <Input value={draft.justificationResponsible} onChange={(e) => update('justificationResponsible', e.target.value)} placeholder="Nome do responsável" />
              </Field>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={draft.justificationConfirmed} onChange={(e) => update('justificationConfirmed', e.target.checked)} className="h-4 w-4 rounded border-red-400 text-[#004883] focus:ring-[#004883]" />
                <span className="text-sm font-medium text-red-900">Confirmo que esta demanda foi previamente alinhada com o responsável pela solicitação.</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* STEP: accommodation */}
      {effectiveStep === 'accommodation' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900">A hospedagem será reservada pela Lucena ou pela agência oficial. Não realize reserva por conta própria.</p>
          </div>
          <Field label="Cidade da hospedagem">
            <Input value={draft.accCity} onChange={(e) => update('accCity', e.target.value)} placeholder="Cidade" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Check-in" required>
              <Input type="date" value={draft.checkIn} onChange={(e) => update('checkIn', e.target.value)} />
            </Field>
            <Field label="Check-out" required>
              <Input type="date" value={draft.checkOut} onChange={(e) => update('checkOut', e.target.value)} min={draft.checkIn} />
            </Field>
          </div>
          {draft.checkIn && draft.checkOut && (
            <p className="text-xs text-gray-500">Diárias calculadas: <span className="font-medium text-gray-700">{nightsBetween(draft.checkIn, draft.checkOut)}</span></p>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Quantidade de hóspedes">
              <Input type="number" min={1} value={draft.guests} onChange={(e) => update('guests', Number(e.target.value))} />
            </Field>
            <Field label="Horário estimado de chegada">
              <Input value={draft.estimatedArrival} onChange={(e) => update('estimatedArrival', e.target.value)} placeholder="Ex: 18h" />
            </Field>
          </div>
          <Field label="Preferência de localização">
            <Input value={draft.locationPreference} onChange={(e) => update('locationPreference', e.target.value)} placeholder="Ex: próximo à obra" />
          </Field>
          <Field label="Hotel sugerido (opcional)">
            <Input value={draft.suggestedHotel} onChange={(e) => update('suggestedHotel', e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.needsParking} onChange={(e) => update('needsParking', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#004883] focus:ring-[#004883]" />
            <span className="text-sm text-gray-700">Necessidade de estacionamento</span>
          </label>
          <Field label="Observações (opcional)">
            <Textarea value={draft.accNotes} onChange={(e) => update('accNotes', e.target.value)} />
          </Field>
        </div>
      )}

      {/* STEP: baggage */}
      {effectiveStep === 'baggage' && (
        <div className="space-y-4">
          <Field label="Precisa de bagagem?">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { v: 'nao', l: 'Não' },
                { v: 'mao', l: 'Bagagem de mão' },
                { v: 'despachada', l: 'Bagagem despachada' },
                { v: 'uniforme_epi', l: 'Uniforme ou EPI' },
                { v: 'ferramentas_equipamentos', l: 'Ferramentas ou equipamentos' },
                { v: 'adicional_especial', l: 'Adicional ou especial' },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => update('baggageType', o.v as BaggageType)}
                  className={cn('rounded-xl border py-2.5 px-3 text-sm font-medium text-left', draft.baggageType === o.v ? 'border-[#004883] bg-[#004883]/5 text-[#004883]' : 'border-gray-200 text-gray-600')}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </Field>

          {['ferramentas_equipamentos', 'adicional_especial', 'uniforme_epi'].includes(draft.baggageType) && (
            <>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900">Ferramentas, equipamentos, uniformes, EPIs e bagagens especiais precisam ser informados antes da emissão.</p>
              </div>
              <Field label="Descrição" required>
                <Input value={draft.baggageDescription} onChange={(e) => update('baggageDescription', e.target.value)} />
              </Field>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Quantidade">
                  <Input type="number" value={draft.baggageQuantity} onChange={(e) => update('baggageQuantity', e.target.value)} />
                </Field>
                <Field label="Peso aproximado">
                  <Input value={draft.baggageWeight} onChange={(e) => update('baggageWeight', e.target.value)} placeholder="Ex: 15kg" />
                </Field>
                <Field label="Dimensões (se conhecidas)">
                  <Input value={draft.baggageDimensions} onChange={(e) => update('baggageDimensions', e.target.value)} placeholder="Ex: 50x40x30cm" />
                </Field>
              </div>
              <Field label="Justificativa" required>
                <Textarea value={draft.baggageJustification} onChange={(e) => update('baggageJustification', e.target.value)} />
              </Field>
            </>
          )}
        </div>
      )}

      {/* STEP: advance */}
      {effectiveStep === 'advance' && (
        <div className="space-y-4">
          <Field label="Precisa de adiantamento?">
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: false, l: 'Não' },
                { v: true, l: 'Sim' },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  onClick={() => update('advanceNeeded', o.v)}
                  className={cn('rounded-xl border py-2.5 text-sm font-medium', draft.advanceNeeded === o.v ? 'border-[#004883] bg-[#004883]/5 text-[#004883]' : 'border-gray-200 text-gray-600')}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </Field>

          {draft.advanceNeeded && (
            <>
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex gap-2">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900">O adiantamento deve ser solicitado preferencialmente junto com a viagem, com sete dias corridos de antecedência e, no mínimo, dois dias úteis antes da viagem.</p>
              </div>
              {advanceDeadline && (
                <p className={cn('text-xs font-medium', advanceDeadline.within ? 'text-emerald-700' : 'text-red-700')}>
                  {advanceDeadline.within
                    ? `Dentro do prazo — ${advanceDeadline.days} dias de antecedência.`
                    : `Fora do prazo recomendado — faltam ${advanceDeadline.days} dias para a viagem (mínimo ${advanceDeadline.min}).`}
                </p>
              )}
              <Field label="Valor estimado (R$)" required>
                <Input type="number" value={draft.advanceValue} onChange={(e) => update('advanceValue', e.target.value)} placeholder="0,00" />
              </Field>
              <Field label="Finalidade" required>
                <Input value={draft.advancePurpose} onChange={(e) => update('advancePurpose', e.target.value)} />
              </Field>
              <Field label="Observações">
                <Textarea value={draft.advanceNotes} onChange={(e) => update('advanceNotes', e.target.value)} />
              </Field>
            </>
          )}
        </div>
      )}

      {/* STEP: attachments */}
      {effectiveStep === 'attachments' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Anexos são opcionais para solicitações comuns. Tornam-se obrigatórios apenas quando uma regra específica exigir.</p>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[#004883] file:text-white hover:file:bg-[#003a6b]"
          />
          {files.length > 0 && (
            <div className="space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="truncate text-gray-700">{f.name}</span>
                  <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP: review */}
      {effectiveStep === 'review' && (
        <div className="space-y-4">
          <Card>
            <div className="p-4 space-y-2 text-sm">
              <p className="font-semibold text-gray-900">{selectedTravelers.map((t) => t.full_name).join(', ') || '—'}</p>
              <p className="text-gray-700">{draft.origin} → {draft.destination}</p>
              <p className="text-gray-600">Ida: {draft.departureDate || '—'} {draft.direction === 'ida_e_volta' && `· Volta: ${draft.returnDate || '—'}`}</p>
              <p className="text-gray-600">
                {draft.requestType === 'passagem' ? 'Passagem' : draft.requestType === 'hospedagem' ? 'Hospedagem' : 'Passagem aérea + hospedagem'}
                {' · '}
                {draft.transportMode === 'aereo' ? 'aérea' : 'rodoviária'}
              </p>
              <p className="text-gray-600">Obra: {worksites.find((w) => w.id === draft.worksiteId)?.name ?? '—'}</p>
              <p className="text-gray-600">Solicitado por: {draft.internalRequestedBy || '—'}</p>
              {draft.isEmergency && <p className="text-red-600 font-medium">Viagem emergencial</p>}
            </div>
          </Card>

          <ConformityBlock draft={draft} deadline={deadline} advanceDeadline={advanceDeadline} hasTerceiro={hasTerceiro} />

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 mt-6 sticky bottom-0 bg-[#f5f7fa] pt-3 pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:relative sm:bg-transparent">
        {step > 0 && (
          <Button variant="outline" onClick={back} className="flex-1 sm:flex-none">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>
        )}
        {effectiveStep !== 'review' ? (
          <Button onClick={next} disabled={!canProceed()} className="flex-1">
            Continuar <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={!canProceed() || submitting} loading={submitting} className="flex-1">
            Enviar solicitação
          </Button>
        )}
      </div>
    </div>
  );
}

function DeadlineBanner({ status, minDays, actualDays, isEmergency }: { status: DeadlineStatus; minDays: number | null; actualDays: number | null; isEmergency: boolean }) {
  if (isEmergency) {
    return (
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex gap-2">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900">Viagem emergencial — a solicitação deve ser registrada assim que a necessidade for identificada.</p>
      </div>
    );
  }
  if (status === 'dentro') {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex gap-2">
        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-900">Dentro do prazo da Política de Viagens. Antecedência atual: {actualDays} dias.</p>
      </div>
    );
  }
  if (status === 'proximo') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900">Atenção: o prazo mínimo é de {minDays} dias e faltam {actualDays} dias para a viagem. Envie o pedido o quanto antes.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex gap-2">
      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
      <p className="text-xs text-red-900">Solicitação fora do prazo da Política de Viagens. Prazo mínimo: {minDays} dias. Antecedência atual: {actualDays} dias.</p>
    </div>
  );
}

function ConformityBlock({ draft, deadline, advanceDeadline, hasTerceiro }: { draft: Draft; deadline: any; advanceDeadline: any; hasTerceiro: boolean }) {
  const items: { label: string; status: 'ok' | 'warn' | 'bad' }[] = [
    { label: `Prazo: ${deadline?.status === 'dentro' ? 'dentro da regra' : deadline?.status === 'proximo' ? 'próximo do limite' : 'fora da regra'}`, status: deadline?.status === 'dentro' ? 'ok' : deadline?.status === 'proximo' ? 'warn' : 'bad' },
    { label: `Dados do viajante: ${draft.travelerIds.length > 0 ? 'completos' : 'incompletos'}`, status: draft.travelerIds.length > 0 ? 'ok' : 'bad' },
    { label: `Bagagem especial: ${draft.baggageType !== 'nao' ? 'informada' : 'não aplicável'}`, status: draft.baggageType !== 'nao' ? 'warn' : 'ok' },
    { label: `Solicitação interna: ${draft.internalRequestedBy ? 'confirmada' : 'não informada'}`, status: draft.internalRequestedBy ? 'ok' : 'bad' },
    { label: `Adiantamento: ${draft.advanceNeeded ? 'solicitado' : 'não solicitado'}`, status: 'ok' },
    { label: `Terceiro: ${hasTerceiro ? 'autorização confirmada' : 'não aplicável'}`, status: hasTerceiro ? (draft.travelerTypeConfirmed ? 'ok' : 'bad') : 'ok' },
  ];
  if (deadline?.status === 'fora' && !draft.isEmergency) {
    items.push({ label: `Justificativa: ${draft.justification ? 'registrada' : 'pendente'}`, status: draft.justification ? 'ok' : 'bad' });
    items.push({ label: `Responsável informado: ${draft.justificationResponsible ? 'sim' : 'pendente'}`, status: draft.justificationResponsible ? 'ok' : 'bad' });
  }
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-[#004883]" />
          <p className="text-sm font-semibold text-gray-900">Conformidade com a Política</p>
        </div>
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={cn('h-2 w-2 rounded-full', it.status === 'ok' ? 'bg-emerald-500' : it.status === 'warn' ? 'bg-amber-500' : 'bg-red-500')} />
              <span className="text-gray-700">{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
