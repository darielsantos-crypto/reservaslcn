import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  Briefcase,
  Bus,
  Check,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Hotel,
  Luggage,
  Plane,
  Plus,
  Trash2,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { fetchMyWorksites, fetchPolicyRules, fetchWorksitesAll } from '@/lib/queries';
import { appendStatus, logAudit, notify } from '@/lib/hooks';
import {
  cn,
  computeDeadlineStatus,
  daysUntil,
  formatDateBR,
  generateRequestNumber,
  nightsBetween,
  resolveMinDays,
} from '@/lib/helpers';
import {
  FLEXIBILITY_LABELS,
  FLEXIBILITY_OPTIONS,
  PURPOSE_LABELS,
  PURPOSES,
} from '@/lib/constants';
import type {
  BaggageType,
  DeadlineStatus,
  Direction,
  PolicyRule,
  RequestType,
  TransportMode,
  TravelerType,
  Worksite,
} from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';

type StepKey = 'type' | 'people' | 'transport' | 'hotel' | 'extras' | 'documents' | 'review';

type TravelerDraft = {
  fullName: string;
  registration: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email: string;
  position: string;
  travelerType: TravelerType;
  notes: string;
};

type Draft = {
  requestType: RequestType | null;
  worksiteId: string;
  travelers: TravelerDraft[];
  purpose: string;
  purposeDetail: string;
  internalRequestedBy: string;
  internalRequesterPosition: string;
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
  hotelCity: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  locationPreference: string;
  estimatedArrival: string;
  needsParking: boolean;
  hotelNotes: string;
  baggageType: BaggageType;
  baggageDescription: string;
  baggageQuantity: string;
  baggageWeight: string;
  baggageJustification: string;
  advanceNeeded: boolean;
  advanceValue: string;
  advancePurpose: string;
  observation: string;
  justification: string;
  justificationResponsible: string;
  justificationConfirmed: boolean;
};

const STORAGE_KEY = 'lucena_travel_request_draft_v4';

const createTraveler = (): TravelerDraft => ({
  fullName: '',
  registration: '',
  cpf: '',
  birthDate: '',
  phone: '',
  email: '',
  position: '',
  travelerType: 'colaborador',
  notes: '',
});

const EMPTY_DRAFT: Draft = {
  requestType: null,
  worksiteId: '',
  travelers: [createTraveler()],
  purpose: '',
  purposeDetail: '',
  internalRequestedBy: '',
  internalRequesterPosition: '',
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
  hotelCity: '',
  checkIn: '',
  checkOut: '',
  guests: 1,
  locationPreference: '',
  estimatedArrival: '',
  needsParking: false,
  hotelNotes: '',
  baggageType: 'nao',
  baggageDescription: '',
  baggageQuantity: '',
  baggageWeight: '',
  baggageJustification: '',
  advanceNeeded: false,
  advanceValue: '',
  advancePurpose: '',
  observation: '',
  justification: '',
  justificationResponsible: '',
  justificationConfirmed: false,
};

const STEP_LABELS: Record<StepKey, string> = {
  type: 'Tipo do pedido',
  people: 'Viajante e obra',
  transport: 'Passagem',
  hotel: 'Hospedagem',
  extras: 'Necessidades adicionais',
  documents: 'Documentos',
  review: 'Conferência',
};

export function NewRequestScreen() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<Draft>;
      return {
        ...EMPTY_DRAFT,
        ...parsed,
        travelers: Array.isArray(parsed.travelers) && parsed.travelers.length
          ? parsed.travelers.map((traveler) => ({ ...createTraveler(), ...traveler }))
          : [createTraveler()],
      };
    } catch {
      return EMPTY_DRAFT;
    }
  });
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ id: string; number: string } | null>(null);

  const hasTransport = draft.requestType === 'passagem' || draft.requestType === 'passagem_hospedagem';
  const hasHotel = draft.requestType === 'hospedagem' || draft.requestType === 'passagem_hospedagem';

  const steps = useMemo<StepKey[]>(() => {
    const result: StepKey[] = ['type', 'people'];
    if (hasTransport) result.push('transport');
    if (hasHotel) result.push('hotel');
    result.push('extras', 'documents', 'review');
    return result;
  }, [hasHotel, hasTransport]);

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const referenceDate = hasTransport ? draft.departureDate : draft.checkIn;
  const isEmergency = draft.purpose === 'atendimento_emergencial';

  const deadline = useMemo(() => {
    if (!referenceDate || !draft.purpose) return null;
    const actualDays = daysUntil(referenceDate);
    const minDays = resolveMinDays(
      {
        purpose: draft.purpose,
        international: hasTransport ? draft.international : false,
        is_emergency: isEmergency,
        departureDate: referenceDate,
      },
      rules,
    );
    return {
      actualDays,
      minDays,
      status: computeDeadlineStatus(actualDays, minDays),
    };
  }, [draft.international, draft.purpose, hasTransport, isEmergency, referenceDate, rules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const available = profile.role === 'solicitante'
        ? await fetchMyWorksites(profile.id)
        : (await fetchWorksitesAll()).filter((worksite) => worksite.active);
      setWorksites(available);
      setRules(await fetchPolicyRules());
    };
    void load();
  }, [profile]);

  useEffect(() => {
    setStepIndex((index) => Math.min(index, Math.max(0, steps.length - 1)));
  }, [steps.length]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'requestType') {
        if (value === 'hospedagem') {
          next.international = false;
          next.origin = '';
          next.destination = '';
          next.departureDate = '';
          next.returnDate = '';
          next.transportMode = 'aereo';
          next.baggageType = 'nao';
          next.baggageDescription = '';
          next.baggageQuantity = '';
          next.baggageWeight = '';
          next.baggageJustification = '';
        }
        if (value === 'passagem') {
          next.hotelCity = '';
          next.checkIn = '';
          next.checkOut = '';
          next.guests = 1;
          next.locationPreference = '';
          next.estimatedArrival = '';
          next.hotelNotes = '';
        }
      }
      if (key === 'departureDate' && hasHotel && !next.checkIn) next.checkIn = String(value);
      if (key === 'returnDate' && hasHotel && !next.checkOut) next.checkOut = String(value);
      if (key === 'destination' && hasHotel && !next.hotelCity) next.hotelCity = String(value);
      return next;
    });
  }

  function updateTraveler(index: number, field: keyof TravelerDraft, value: string) {
    setDraft((current) => ({
      ...current,
      travelers: current.travelers.map((traveler, travelerIndex) => (
        travelerIndex === index ? { ...traveler, [field]: value } : traveler
      )),
    }));
  }

  function removeTraveler(index: number) {
    setDraft((current) => ({
      ...current,
      travelers: current.travelers.length === 1
        ? current.travelers
        : current.travelers.filter((_, travelerIndex) => travelerIndex !== index),
    }));
  }

  function stepIsValid(step: StepKey) {
    if (step === 'type') return Boolean(draft.requestType);
    if (step === 'people') {
      return Boolean(
        draft.worksiteId
        && draft.purpose
        && draft.internalRequestedBy.trim()
        && draft.travelers.length
        && draft.travelers.every((traveler) => {
          if (!traveler.fullName.trim() || !traveler.phone.trim()) return false;
          if (traveler.travelerType === 'colaborador' && !traveler.registration.trim()) return false;
          if (hasTransport && (!traveler.cpf.trim() || !traveler.birthDate)) return false;
          return true;
        }),
      );
    }
    if (step === 'transport') {
      if (!hasTransport) return true;
      return Boolean(
        draft.origin.trim()
        && draft.destination.trim()
        && draft.departureDate
        && (draft.direction !== 'ida_e_volta' || draft.returnDate),
      );
    }
    if (step === 'hotel') {
      if (!hasHotel) return true;
      return Boolean(
        draft.hotelCity.trim()
        && draft.checkIn
        && draft.checkOut
        && nightsBetween(draft.checkIn, draft.checkOut) > 0
        && draft.guests >= 1,
      );
    }
    if (step === 'extras') {
      if (draft.advanceNeeded && !draft.advancePurpose.trim()) return false;
      if (
        hasTransport
        && ['ferramentas_equipamentos', 'adicional_especial'].includes(draft.baggageType)
        && (!draft.baggageDescription.trim() || !draft.baggageJustification.trim())
      ) return false;
      return true;
    }
    if (step === 'review' && deadline?.status === 'fora') {
      return Boolean(
        draft.justification.trim()
        && draft.justificationResponsible.trim()
        && draft.justificationConfirmed,
      );
    }
    return true;
  }

  async function submit() {
    if (!profile || !draft.requestType || !stepIsValid('review')) return;
    setSubmitting(true);
    setError('');
    let requestId: string | null = null;

    try {
      const requestNumber = generateRequestNumber();
      const computedDeadline = deadline ?? {
        actualDays: null,
        minDays: null,
        status: 'dentro' as DeadlineStatus,
      };

      const { data: request, error: requestError } = await supabase
        .from('travel_app_requests')
        .insert({
          request_number: requestNumber,
          requester_id: profile.id,
          worksite_id: draft.worksiteId,
          request_type: draft.requestType,
          purpose: draft.purpose,
          purpose_detail: draft.purpose === 'outros' ? draft.purposeDetail || null : null,
          international: hasTransport ? draft.international : false,
          is_emergency: isEmergency,
          internal_requested_by: draft.internalRequestedBy.trim(),
          internal_requester_position: draft.internalRequesterPosition.trim() || null,
          traveler_type_confirmed: true,
          deadline_status: computedDeadline.status,
          deadline_min_days: computedDeadline.minDays,
          deadline_actual_days: computedDeadline.actualDays,
          justification: computedDeadline.status === 'fora' ? draft.justification.trim() : null,
          justification_responsible: computedDeadline.status === 'fora'
            ? draft.justificationResponsible.trim()
            : null,
          justification_confirmed: computedDeadline.status === 'fora'
            ? draft.justificationConfirmed
            : false,
          status: 'pedido_recebido',
          submitted_at: new Date().toISOString(),
          observation: draft.observation.trim() || null,
        })
        .select('id, request_number')
        .single();

      if (requestError || !request) throw new Error(requestError?.message || 'Não foi possível criar a solicitação.');
      requestId = request.id;

      for (const traveler of draft.travelers) {
        const { data: createdTraveler, error: travelerError } = await supabase
          .from('travel_app_travelers')
          .insert({
            full_name: traveler.fullName.trim(),
            registration: traveler.registration.trim() || null,
            cpf: traveler.cpf.trim() || null,
            birth_date: traveler.birthDate || null,
            phone: traveler.phone.trim() || null,
            email: traveler.email.trim().toLowerCase() || null,
            position: traveler.position.trim() || null,
            worksite_id: draft.worksiteId,
            traveler_type: traveler.travelerType,
            travel_notes: traveler.notes.trim() || null,
            created_by: profile.id,
          })
          .select('id')
          .single();
        if (travelerError || !createdTraveler) throw new Error(travelerError?.message || 'Falha ao salvar os dados do viajante.');

        const { error: linkError } = await supabase.from('travel_app_request_travelers').insert({
          request_id: request.id,
          traveler_id: createdTraveler.id,
        });
        if (linkError) throw new Error(linkError.message);
      }

      if (hasTransport) {
        const { error: segmentError } = await supabase.from('travel_app_segments').insert({
          request_id: request.id,
          segment_order: 1,
          origin: draft.origin.trim(),
          destination: draft.destination.trim(),
          direction: draft.direction,
          departure_date: draft.departureDate,
          return_date: draft.direction === 'ida_e_volta' ? draft.returnDate || null : null,
          transport_mode: draft.transportMode,
          preferred_period: draft.preferredPeriod || null,
          flexibility: draft.flexibility,
          notes: draft.segmentNotes.trim() || null,
        });
        if (segmentError) throw new Error(segmentError.message);
      }

      if (hasHotel) {
        const { error: hotelError } = await supabase.from('travel_app_accommodations').insert({
          request_id: request.id,
          city: draft.hotelCity.trim(),
          check_in: draft.checkIn,
          check_out: draft.checkOut,
          nights: nightsBetween(draft.checkIn, draft.checkOut),
          guests: draft.guests,
          location_preference: draft.locationPreference.trim() || null,
          estimated_arrival_time: draft.estimatedArrival.trim() || null,
          needs_parking: draft.needsParking,
          notes: draft.hotelNotes.trim() || null,
        });
        if (hotelError) throw new Error(hotelError.message);
      }

      if (hasTransport && draft.baggageType !== 'nao') {
        const { error: baggageError } = await supabase.from('travel_app_baggage_requests').insert({
          request_id: request.id,
          baggage_type: draft.baggageType,
          description: draft.baggageDescription.trim() || null,
          quantity: draft.baggageQuantity ? Number(draft.baggageQuantity) : null,
          approx_weight: draft.baggageWeight.trim() || null,
          justification: draft.baggageJustification.trim() || null,
        });
        if (baggageError) throw new Error(baggageError.message);
      }

      if (draft.advanceNeeded) {
        const { error: advanceError } = await supabase.from('travel_app_advance_requests').insert({
          request_id: request.id,
          needed: true,
          estimated_value: draft.advanceValue ? Number(draft.advanceValue) : null,
          purpose: draft.advancePurpose.trim(),
          within_deadline: referenceDate ? daysUntil(referenceDate) >= 7 : null,
        });
        if (advanceError) throw new Error(advanceError.message);
      }

      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${request.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('travel-app-attachments')
          .upload(filePath, file, { upsert: false });
        if (uploadError) throw new Error(`Falha no anexo ${file.name}: ${uploadError.message}`);

        const { error: attachmentError } = await supabase.from('travel_app_attachments').insert({
          request_id: request.id,
          category: 'documento',
          label: file.name,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          released: true,
          uploaded_by: profile.id,
        });
        if (attachmentError) throw new Error(attachmentError.message);
      }

      await appendStatus(request.id, profile.id, null, 'pedido_recebido', 'Solicitação enviada');
      await logAudit(profile.id, 'create_request', { type: 'travel_request', id: request.id });

      const { data: managers } = await supabase
        .from('travel_app_profiles')
        .select('id')
        .in('role', ['gestao_viagens', 'super_admin'])
        .eq('active', true);
      const summary = hasTransport
        ? `${draft.origin.trim()} → ${draft.destination.trim()}`
        : `Hospedagem em ${draft.hotelCity.trim()}`;
      await Promise.all((managers ?? []).map((manager) => notify(
        manager.id,
        'Nova solicitação de viagem',
        `${requestNumber} · ${summary}`,
        `request/${request.id}`,
      )));

      localStorage.removeItem(STORAGE_KEY);
      setSuccess({ id: request.id, number: requestNumber });
    } catch (submissionError) {
      console.error(submissionError);
      setError(submissionError instanceof Error ? submissionError.message : 'Não foi possível enviar a solicitação.');
      // O pedido fica rastreável se alguma etapa secundária falhar. Não apagamos dados já gravados.
      if (requestId) {
        await supabase.from('travel_app_requests').update({
          observation: 'Solicitação incompleta por falha técnica. Revisar antes do atendimento.',
        }).eq('id', requestId);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg pt-6 sm:pt-12">
        <Card>
          <div className="p-6 sm:p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Solicitação enviada</h1>
            <p className="mt-2 text-sm text-gray-500">Protocolo {success.number}. Você poderá acompanhar todas as etapas pelo sistema.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => navigate(`request/${success.id}`)}>Acompanhar pedido</Button>
              <Button variant="outline" onClick={() => {
                setDraft(EMPTY_DRAFT);
                setFiles([]);
                setStepIndex(0);
                setSuccess(null);
              }}>Nova solicitação</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-4">
      <header>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Nova solicitação</h1>
            <p className="text-sm text-gray-500">Preencha somente o que for necessário para este pedido.</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-gray-500">{stepIndex + 1} de {steps.length}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#004883] transition-all"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-semibold text-[#004883]">{STEP_LABELS[currentStep]}</p>
      </header>

      <Card>
        <div className="p-4 sm:p-6">
          {currentStep === 'type' && (
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">O que precisa ser reservado?</h2>
                <p className="text-sm text-gray-500">A escolha define automaticamente os próximos campos.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <TypeChoice
                  active={draft.requestType === 'passagem'}
                  icon={Plane}
                  title="Passagem"
                  description="Aérea ou ônibus"
                  onClick={() => update('requestType', 'passagem')}
                />
                <TypeChoice
                  active={draft.requestType === 'hospedagem'}
                  icon={BedDouble}
                  title="Hospedagem"
                  description="Somente hotel"
                  onClick={() => update('requestType', 'hospedagem')}
                />
                <TypeChoice
                  active={draft.requestType === 'passagem_hospedagem'}
                  icon={Hotel}
                  title="Passagem + hospedagem"
                  description="Reserva completa"
                  onClick={() => update('requestType', 'passagem_hospedagem')}
                />
              </div>
            </section>
          )}

          {currentStep === 'people' && (
            <section className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Obra" required hint={worksites.length ? undefined : 'Nenhuma obra disponível para este usuário.'}>
                  <Select value={draft.worksiteId} onChange={(event) => update('worksiteId', event.target.value)}>
                    <option value="">Selecione...</option>
                    {worksites.map((worksite) => (
                      <option key={worksite.id} value={worksite.id}>{worksite.name} · {worksite.city || '—'}/{worksite.state || '—'}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Finalidade" required>
                  <Select value={draft.purpose} onChange={(event) => update('purpose', event.target.value)}>
                    <option value="">Selecione...</option>
                    {PURPOSES.map((purpose) => <option key={purpose} value={purpose}>{PURPOSE_LABELS[purpose]}</option>)}
                  </Select>
                </Field>
                {draft.purpose === 'outros' && (
                  <Field label="Descreva a finalidade" required>
                    <Input value={draft.purposeDetail} onChange={(event) => update('purposeDetail', event.target.value)} />
                  </Field>
                )}
                <Field label="Solicitado internamente por" required hint="Gestor ou responsável que originou o pedido.">
                  <Input value={draft.internalRequestedBy} onChange={(event) => update('internalRequestedBy', event.target.value)} />
                </Field>
                <Field label="Cargo de quem solicitou">
                  <Input value={draft.internalRequesterPosition} onChange={(event) => update('internalRequesterPosition', event.target.value)} />
                </Field>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Quem vai utilizar a reserva?</h2>
                    <p className="text-sm text-gray-500">Os dados ficam vinculados somente a esta solicitação.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => update('travelers', [...draft.travelers, createTraveler()])}>
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </div>

                {draft.travelers.map((traveler, index) => (
                  <div key={index} className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="flex items-center gap-2 text-sm font-semibold"><UserRound className="h-4 w-4 text-[#004883]" />Viajante {index + 1}</p>
                      {draft.travelers.length > 1 && (
                        <button type="button" onClick={() => removeTraveler(index)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Remover viajante">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nome completo" required>
                        <Input value={traveler.fullName} onChange={(event) => updateTraveler(index, 'fullName', event.target.value)} />
                      </Field>
                      <Field label="Tipo de viajante">
                        <Select value={traveler.travelerType} onChange={(event) => updateTraveler(index, 'travelerType', event.target.value)}>
                          <option value="colaborador">Colaborador</option>
                          <option value="terceiro">Terceiro autorizado</option>
                          <option value="necessidades_especiais">Necessidade especial</option>
                        </Select>
                      </Field>
                      <Field label="Matrícula" required={traveler.travelerType === 'colaborador'}>
                        <Input value={traveler.registration} onChange={(event) => updateTraveler(index, 'registration', event.target.value)} />
                      </Field>
                      <Field label="Telefone" required>
                        <Input inputMode="tel" value={traveler.phone} onChange={(event) => updateTraveler(index, 'phone', event.target.value)} />
                      </Field>
                      <Field label="Cargo / função">
                        <Input value={traveler.position} onChange={(event) => updateTraveler(index, 'position', event.target.value)} />
                      </Field>
                      <Field label="E-mail">
                        <Input type="email" value={traveler.email} onChange={(event) => updateTraveler(index, 'email', event.target.value)} />
                      </Field>
                      {hasTransport && (
                        <>
                          <Field label="CPF" required hint="Necessário para emissão da passagem.">
                            <Input inputMode="numeric" value={traveler.cpf} onChange={(event) => updateTraveler(index, 'cpf', event.target.value)} />
                          </Field>
                          <Field label="Data de nascimento" required>
                            <Input type="date" value={traveler.birthDate} onChange={(event) => updateTraveler(index, 'birthDate', event.target.value)} />
                          </Field>
                        </>
                      )}
                      <div className="sm:col-span-2">
                        <Field label="Observação do viajante">
                          <Textarea value={traveler.notes} onChange={(event) => updateTraveler(index, 'notes', event.target.value)} placeholder="Preferências, acessibilidade ou outra informação relevante." />
                        </Field>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {currentStep === 'transport' && (
            <section className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Abrangência">
                  <Select value={draft.international ? 'internacional' : 'nacional'} onChange={(event) => update('international', event.target.value === 'internacional')}>
                    <option value="nacional">Nacional</option>
                    <option value="internacional">Internacional</option>
                  </Select>
                </Field>
                <Field label="Meio de transporte">
                  <Select value={draft.transportMode} onChange={(event) => update('transportMode', event.target.value as TransportMode)}>
                    <option value="aereo">Aéreo</option>
                    <option value="rodoviario">Ônibus</option>
                  </Select>
                </Field>
                <Field label="Origem" required>
                  <Input value={draft.origin} onChange={(event) => update('origin', event.target.value)} />
                </Field>
                <Field label="Destino" required>
                  <Input value={draft.destination} onChange={(event) => update('destination', event.target.value)} />
                </Field>
                <Field label="Trecho">
                  <Select value={draft.direction} onChange={(event) => update('direction', event.target.value as Direction)}>
                    <option value="ida">Somente ida</option>
                    <option value="volta">Somente volta</option>
                    <option value="ida_e_volta">Ida e volta</option>
                  </Select>
                </Field>
                <Field label="Data da viagem" required>
                  <Input type="date" value={draft.departureDate} onChange={(event) => update('departureDate', event.target.value)} />
                </Field>
                {draft.direction === 'ida_e_volta' && (
                  <Field label="Data da volta" required>
                    <Input type="date" min={draft.departureDate || undefined} value={draft.returnDate} onChange={(event) => update('returnDate', event.target.value)} />
                  </Field>
                )}
                <Field label="Período preferencial">
                  <Select value={draft.preferredPeriod} onChange={(event) => update('preferredPeriod', event.target.value)}>
                    <option value="">Sem preferência</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                  </Select>
                </Field>
                <Field label="Flexibilidade de horário">
                  <Select value={draft.flexibility} onChange={(event) => update('flexibility', event.target.value)}>
                    {FLEXIBILITY_OPTIONS.map((option) => <option key={option} value={option}>{FLEXIBILITY_LABELS[option]}</option>)}
                  </Select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Observações do trajeto">
                    <Textarea value={draft.segmentNotes} onChange={(event) => update('segmentNotes', event.target.value)} />
                  </Field>
                </div>
              </div>
              {deadline && <DeadlineAlert deadline={deadline} />}
            </section>
          )}

          {currentStep === 'hotel' && (
            <section className="space-y-5">
              <div>
                <h2 className="font-semibold">Dados da hospedagem</h2>
                <p className="text-sm text-gray-500">Não solicitamos informações de passagem ou bagagem quando o pedido é somente hospedagem.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cidade da hospedagem" required>
                  <Input value={draft.hotelCity} onChange={(event) => update('hotelCity', event.target.value)} />
                </Field>
                <Field label="Quantidade de hóspedes" required>
                  <Input type="number" min={1} value={draft.guests} onChange={(event) => update('guests', Math.max(1, Number(event.target.value) || 1))} />
                </Field>
                <Field label="Check-in" required>
                  <Input type="date" value={draft.checkIn} onChange={(event) => update('checkIn', event.target.value)} />
                </Field>
                <Field label="Check-out" required>
                  <Input type="date" min={draft.checkIn || undefined} value={draft.checkOut} onChange={(event) => update('checkOut', event.target.value)} />
                </Field>
                <Field label="Preferência de localização">
                  <Input value={draft.locationPreference} onChange={(event) => update('locationPreference', event.target.value)} placeholder="Próximo à obra, evento ou compromisso" />
                </Field>
                <Field label="Horário estimado de chegada">
                  <Input value={draft.estimatedArrival} onChange={(event) => update('estimatedArrival', event.target.value)} placeholder="Ex.: 20h" />
                </Field>
                <label className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 text-sm">
                  <input type="checkbox" checked={draft.needsParking} onChange={(event) => update('needsParking', event.target.checked)} />
                  Precisa de estacionamento
                </label>
                <div className="sm:col-span-2">
                  <Field label="Observações da hospedagem">
                    <Textarea value={draft.hotelNotes} onChange={(event) => update('hotelNotes', event.target.value)} />
                  </Field>
                </div>
              </div>
              {deadline && !hasTransport && <DeadlineAlert deadline={deadline} />}
            </section>
          )}

          {currentStep === 'extras' && (
            <section className="space-y-6">
              {hasTransport && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Luggage className="h-5 w-5 text-[#004883]" />
                    <h2 className="font-semibold">Bagagem</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      ['nao', 'Não precisa'],
                      ['mao', 'Mão'],
                      ['despachada', 'Despachada'],
                      ['ferramentas_equipamentos', 'Ferramentas'],
                      ['adicional_especial', 'Especial'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update('baggageType', value as BaggageType)}
                        className={cn(
                          'min-h-12 rounded-xl border px-3 py-2 text-sm font-medium transition',
                          draft.baggageType === value
                            ? 'border-[#004883] bg-[#004883]/5 text-[#004883]'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {['ferramentas_equipamentos', 'adicional_especial'].includes(draft.baggageType) && (
                    <div className="grid gap-3 rounded-2xl bg-gray-50 p-4 sm:grid-cols-2">
                      <Field label="Descrição" required>
                        <Input value={draft.baggageDescription} onChange={(event) => update('baggageDescription', event.target.value)} />
                      </Field>
                      <Field label="Quantidade">
                        <Input type="number" min={1} value={draft.baggageQuantity} onChange={(event) => update('baggageQuantity', event.target.value)} />
                      </Field>
                      <Field label="Peso aproximado">
                        <Input value={draft.baggageWeight} onChange={(event) => update('baggageWeight', event.target.value)} placeholder="Ex.: 12 kg" />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Justificativa" required>
                          <Textarea value={draft.baggageJustification} onChange={(event) => update('baggageJustification', event.target.value)} />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                  <input type="checkbox" checked={draft.advanceNeeded} onChange={(event) => update('advanceNeeded', event.target.checked)} />
                  <WalletCards className="h-5 w-5 text-[#004883]" />
                  <div>
                    <p className="text-sm font-semibold">Precisa de adiantamento?</p>
                    <p className="text-xs text-gray-500">Solicite preferencialmente junto com a viagem.</p>
                  </div>
                </label>
                {draft.advanceNeeded && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Valor estimado">
                      <Input type="number" min={0} step="0.01" value={draft.advanceValue} onChange={(event) => update('advanceValue', event.target.value)} />
                    </Field>
                    <Field label="Finalidade" required>
                      <Input value={draft.advancePurpose} onChange={(event) => update('advancePurpose', event.target.value)} />
                    </Field>
                  </div>
                )}
              </div>

              <Field label="Observações gerais">
                <Textarea value={draft.observation} onChange={(event) => update('observation', event.target.value)} />
              </Field>
            </section>
          )}

          {currentStep === 'documents' && (
            <section className="space-y-4">
              <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-[#004883] hover:bg-[#004883]/5">
                <FileUp className="h-8 w-8 text-[#004883]" />
                <span className="mt-2 font-semibold">Adicionar documentos, se necessário</span>
                <span className="mt-1 text-xs text-gray-500">PDF, imagem, autorização, programação ou documento de identificação.</span>
                <input
                  className="hidden"
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={(event) => setFiles(Array.from(event.target.files || []))}
                />
              </label>
              {files.length > 0 && (
                <div className="divide-y rounded-xl border bg-white">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0 truncate">{file.name}</span>
                      <button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Remover anexo">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {currentStep === 'review' && (
            <section className="space-y-4">
              <div className="rounded-2xl border bg-gray-50 p-4 text-sm">
                <p className="font-semibold text-gray-900">{draft.travelers.map((traveler) => traveler.fullName).join(', ')}</p>
                <p className="mt-1 text-gray-600">{worksites.find((worksite) => worksite.id === draft.worksiteId)?.name || 'Obra não selecionada'}</p>
                <div className="mt-4 space-y-2 border-t pt-4">
                  {hasTransport && (
                    <>
                      <ReviewRow icon={draft.transportMode === 'aereo' ? Plane : Bus} label="Passagem" value={`${draft.origin} → ${draft.destination} · ${formatDateBR(draft.departureDate)}${draft.returnDate ? ` a ${formatDateBR(draft.returnDate)}` : ''}`} />
                      <ReviewRow icon={Luggage} label="Bagagem" value={draft.baggageType === 'nao' ? 'Não solicitada' : baggageLabel(draft.baggageType)} />
                    </>
                  )}
                  {hasHotel && (
                    <ReviewRow icon={BedDouble} label="Hospedagem" value={`${draft.hotelCity} · ${formatDateBR(draft.checkIn)} a ${formatDateBR(draft.checkOut)} · ${draft.guests} hóspede(s)`} />
                  )}
                  {draft.advanceNeeded && <ReviewRow icon={WalletCards} label="Adiantamento" value={draft.advanceValue ? `R$ ${draft.advanceValue}` : draft.advancePurpose} />}
                  <ReviewRow icon={Briefcase} label="Finalidade" value={PURPOSE_LABELS[draft.purpose] || draft.purpose} />
                </div>
              </div>

              {deadline && <DeadlineAlert deadline={deadline} />}

              {deadline?.status === 'fora' && (
                <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div>
                    <p className="font-semibold text-red-800">Solicitação fora do prazo da política</p>
                    <p className="text-sm text-red-700">O pedido não será bloqueado, mas a justificativa ficará registrada.</p>
                  </div>
                  <Field label="Justificativa" required>
                    <Textarea value={draft.justification} onChange={(event) => update('justification', event.target.value)} />
                  </Field>
                  <Field label="Responsável pelo alinhamento" required>
                    <Input value={draft.justificationResponsible} onChange={(event) => update('justificationResponsible', event.target.value)} />
                  </Field>
                  <label className="flex items-start gap-3 text-sm text-red-800">
                    <input className="mt-1" type="checkbox" checked={draft.justificationConfirmed} onChange={(event) => update('justificationConfirmed', event.target.checked)} />
                    Confirmo que esta demanda foi previamente alinhada com o responsável informado.
                  </label>
                </div>
              )}

              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </section>
          )}
        </div>
      </Card>

      <div className="sticky bottom-[4.5rem] z-10 flex gap-2 rounded-2xl border bg-white/95 p-2 shadow-lg backdrop-blur lg:bottom-3">
        <Button
          variant="outline"
          onClick={() => {
            if (stepIndex === 0) navigate(profile?.role === 'solicitante' ? 'home' : 'queue');
            else setStepIndex((index) => Math.max(0, index - 1));
          }}
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        {stepIndex < steps.length - 1 ? (
          <Button className="flex-1" disabled={!stepIsValid(currentStep)} onClick={() => setStepIndex((index) => index + 1)}>
            Continuar <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="flex-1" disabled={!stepIsValid('review')} loading={submitting} onClick={submit}>
            Enviar solicitação
          </Button>
        )}
      </div>
    </div>
  );
}

function TypeChoice({ active, icon: Icon, title, description, onClick }: {
  active: boolean;
  icon: typeof Plane;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-32 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#004883]/30',
        active
          ? 'border-[#004883] bg-[#004883]/5 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      <Icon className={cn('h-6 w-6', active ? 'text-[#004883]' : 'text-gray-500')} />
      <p className="mt-4 font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </button>
  );
}

function DeadlineAlert({ deadline }: { deadline: { actualDays: number; minDays: number; status: DeadlineStatus } }) {
  const styles = deadline.status === 'fora'
    ? 'border-red-200 bg-red-50 text-red-800'
    : deadline.status === 'proximo'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  const title = deadline.status === 'fora'
    ? 'Fora do prazo'
    : deadline.status === 'proximo'
      ? 'Próximo do limite'
      : 'Dentro do prazo';

  return (
    <div className={cn('flex gap-2 rounded-xl border p-3 text-sm', styles)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span><b>{title}.</b> Antecedência atual: {deadline.actualDays} dias. Prazo mínimo: {deadline.minDays} dias.</span>
    </div>
  );
}

function ReviewRow({ icon: Icon, label, value }: { icon: typeof Plane; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#004883]" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function baggageLabel(type: BaggageType) {
  const labels: Record<BaggageType, string> = {
    nao: 'Não solicitada',
    mao: 'Bagagem de mão',
    despachada: 'Bagagem despachada',
    ferramentas_equipamentos: 'Ferramentas ou equipamentos',
    adicional_especial: 'Bagagem especial ou adicional',
  };
  return labels[type];
}
