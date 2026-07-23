import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Plane,
  BedDouble,
  Briefcase,
  Wallet,
  Paperclip,
  MessageSquare,
  History,
  ShieldCheck,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { fetchRequestDetail, type RequestWithRelations } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { notify, logAudit, appendStatus } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import {
  STATUS_LABELS,
  STATUS_STYLES,
  DEADLINE_LABELS,
  DEADLINE_STYLES,
  DEADLINE_DOTS,
  PURPOSE_LABELS,
  ATTACHMENT_LABELS,
  FLEXIBILITY_LABELS,
} from '@/lib/constants';
import { formatDateBR, formatDateTimeBR, formatCurrency, formatRelative, requestTypeLabel, cn } from '@/lib/helpers';
import type { RequestStatus } from '@/lib/types';

const TABS = ['resumo', 'viajantes', 'trajeto', 'hospedagem', 'bagagem', 'adiantamento', 'cotacao', 'compra', 'anexos', 'historico'] as const;

export function RequestDetailScreen({ id }: { id: string }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [req, setReq] = useState<RequestWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>('resumo');
  const [comment, setComment] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function reload() {
    const r = await fetchRequestDetail(id);
    setReq(r);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [id]);

  async function changeStatus(next: RequestStatus, note?: string) {
    if (!profile || !req) return;
    setActionLoading(true);
    const prev = req.status;
    await supabase.from('travel_app_requests').update({ status: next, updated_at: new Date().toISOString(), finalized_at: next === 'finalizada' ? new Date().toISOString() : null }).eq('id', req.id);
    await appendStatus(req.id, profile.id, prev, next, note);
    await logAudit(profile.id, 'change_status', { type: 'travel_request', id: req.id }, { previousStatus: prev, newStatus: next });
    await notify(req.requester_id, 'Status atualizado', `${req.request_number} — ${STATUS_LABELS[next]}`, `request/${req.id}`);
    setActionLoading(false);
    reload();
  }

  async function startRequest() {
    if (!profile || !req) return;
    setActionLoading(true);
    await supabase.from('travel_app_requests').update({ assigned_to: profile.id, status: 'em_andamento', updated_at: new Date().toISOString() }).eq('id', req.id);
    await appendStatus(req.id, profile.id, req.status, 'em_andamento', 'Atendimento iniciado');
    await logAudit(profile.id, 'start_request', { type: 'travel_request', id: req.id });
    await notify(req.requester_id, 'Atendimento iniciado', `${req.request_number} está em atendimento`, `request/${req.id}`);
    setActionLoading(false);
    reload();
  }

  async function sendComment() {
    if (!profile || !req || !comment.trim()) return;
    await supabase.from('travel_app_comments').insert({ request_id: req.id, author_id: profile.id, body: comment.trim() });
    setComment('');
    reload();
  }

  async function doCancel() {
    if (!profile || !req || !cancelReason.trim()) return;
    setActionLoading(true);
    await supabase.from('travel_app_requests').update({ status: 'cancelada', cancel_reason: cancelReason, updated_at: new Date().toISOString() }).eq('id', req.id);
    await appendStatus(req.id, profile.id, req.status, 'cancelada', cancelReason);
    await logAudit(profile.id, 'cancel_request', { type: 'travel_request', id: req.id }, { observation: cancelReason });
    setActionLoading(false);
    setCancelOpen(false);
    reload();
  }



  if (loading) return <PageLoader />;
  if (!req) return <EmptyState title="Solicitação não encontrada" />;

  const isGestao = profile?.role === 'gestao_viagens' || profile?.role === 'super_admin';
  const isOwner = req.requester_id === profile?.id;

  const visibleTabs = TABS.filter((t) => {
    if (t === 'cotacao' && !isGestao) return false;
    if (t === 'compra' && !isGestao && !req.purchases?.length) return false;
    if (t === 'trajeto' && req.request_type === 'hospedagem') return false;
    if (t === 'hospedagem' && !req.accommodations?.length) return false;
    if (t === 'bagagem' && !req.baggage?.length) return false;
    if (t === 'adiantamento' && !req.advance) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('my-requests')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="font-mono">{req.request_number}</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            {req.request_type === 'hospedagem' ? `Hospedagem em ${req.accommodations?.[0]?.city ?? '—'}` : `${req.segments?.[0]?.origin ?? '—'} → ${req.segments?.[0]?.destination ?? '—'}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={STATUS_STYLES[req.status]}>{STATUS_LABELS[req.status]}</Badge>
            <Badge className={DEADLINE_STYLES[req.deadline_status]} dot dotClass={DEADLINE_DOTS[req.deadline_status]}>
              {DEADLINE_LABELS[req.deadline_status]}
            </Badge>
            <span className="text-xs text-gray-500">{requestTypeLabel(req.request_type)}</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          <p>Atualizado {formatRelative(req.updated_at)}</p>
          {req.assigned && <p className="mt-0.5">Responsável: <span className="font-medium text-gray-700">{req.assigned.full_name}</span></p>}
        </div>
      </div>

      {/* Conformity */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-[#004883]" />
            <p className="text-sm font-semibold text-gray-900">Conformidade com a Política</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5 text-sm">
            <ConformityItem ok={req.deadline_status !== 'fora'} label={`Prazo: ${DEADLINE_LABELS[req.deadline_status]}`} />
            <ConformityItem ok={true} label={`Viagem: ${req.international ? 'internacional' : 'nacional'}`} />
            <ConformityItem ok={true} label={`Terceiro: ${req.travelers?.some((t) => t.traveler?.traveler_type === 'terceiro') ? 'envolvido' : 'não'}`} warn={req.travelers?.some((t) => t.traveler?.traveler_type === 'terceiro')} />
            {req.request_type !== 'hospedagem' && <ConformityItem ok={true} label={`Bagagem especial: ${req.baggage?.length ? 'informada' : 'não'}`} warn={!!req.baggage?.length} />}
            <ConformityItem ok={true} label={`Adiantamento: ${req.advance?.needed ? 'solicitado' : 'não'}`} />
            <ConformityItem ok={req.justification_confirmed || req.deadline_status !== 'fora'} label={`Justificativa: ${req.justification ? 'registrada' : 'não aplicável'}`} />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium capitalize transition',
              tab === t ? 'bg-[#004883] text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {t === 'cotacao' ? 'Cotação' : t === 'compra' ? 'Compra' : t === 'historico' ? 'Histórico' : t === 'anexos' ? 'Anexos' : t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Card>
        <div className="p-4 sm:p-5">
          {tab === 'resumo' && (
            <div className="space-y-3 text-sm">
              <InfoRow label="Obra" value={req.worksite?.name ?? '—'} />
              <InfoRow label="Finalidade" value={PURPOSE_LABELS[req.purpose] ?? req.purpose} />
              {req.purpose_detail && <InfoRow label="Detalhe" value={req.purpose_detail} />}
              <InfoRow label="Solicitado internamente por" value={req.internal_requested_by ?? '—'} />
              {req.internal_requester_position && <InfoRow label="Cargo" value={req.internal_requester_position} />}
              <InfoRow label="Solicitante" value={req.requester?.full_name ?? '—'} />
              {req.is_emergency && <InfoRow label="Emergencial" value="Sim" />}
              <InfoRow label="Enviado em" value={formatDateTimeBR(req.submitted_at)} />
              {req.observation && <InfoRow label="Observação" value={req.observation} />}
            </div>
          )}

          {tab === 'viajantes' && (
            <div className="space-y-2">
              {req.travelers?.map((t) => (
                <div key={t.id} className="rounded-xl border border-gray-200 p-3">
                  <p className="font-medium text-gray-900 text-sm">{t.traveler?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.traveler?.registration ?? 'Sem matrícula'} · {t.traveler?.position ?? '—'} · {t.traveler?.traveler_type}
                  </p>
                  {isGestao && (t.ticket_number || t.locator) && (
                    <p className="text-xs text-gray-600 mt-1">Bilhete: {t.ticket_number ?? '—'} · Localizador: {t.locator ?? '—'}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'trajeto' && (
            <div className="space-y-3">
              {req.segments?.map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-200 p-3 space-y-1 text-sm">
                  <p className="font-medium text-gray-900">{s.origin} → {s.destination}</p>
                  <p className="text-xs text-gray-500">
                    {s.direction === 'ida_e_volta' ? 'Ida e volta' : s.direction === 'ida' ? 'Somente ida' : 'Somente volta'}
                    {' · '}{s.transport_mode === 'aereo' ? 'Aéreo' : 'Rodoviário'}
                  </p>
                  <p className="text-xs text-gray-500">Ida: {formatDateBR(s.departure_date)} {s.return_date && `· Volta: ${formatDateBR(s.return_date)}`}</p>
                  {s.flexibility && <p className="text-xs text-gray-500">Flexibilidade: {FLEXIBILITY_LABELS[s.flexibility] ?? s.flexibility}</p>}
                  {s.notes && <p className="text-xs text-gray-600 mt-1">{s.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {tab === 'hospedagem' && req.accommodations?.map((a) => (
            <div key={a.id} className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-900 font-medium"><BedDouble className="h-4 w-4" /> Hospedagem</div>
              <InfoRow label="Cidade" value={a.city ?? '—'} />
              <InfoRow label="Check-in / Check-out" value={`${formatDateBR(a.check_in)} — ${formatDateBR(a.check_out)}`} />
              <InfoRow label="Diárias" value={String(a.nights ?? 0)} />
              <InfoRow label="Hóspedes" value={String(a.guests)} />
              {a.suggested_hotel && <InfoRow label="Hotel sugerido" value={a.suggested_hotel} />}
              <InfoRow label="Estacionamento" value={a.needs_parking ? 'Sim' : 'Não'} />
              {a.notes && <InfoRow label="Observações" value={a.notes} />}
            </div>
          ))}

          {tab === 'bagagem' && req.baggage?.map((b) => (
            <div key={b.id} className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-900 font-medium"><Briefcase className="h-4 w-4" /> Bagagem</div>
              <InfoRow label="Tipo" value={b.baggage_type} />
              {b.description && <InfoRow label="Descrição" value={b.description} />}
              {b.quantity && <InfoRow label="Quantidade" value={String(b.quantity)} />}
              {b.approx_weight && <InfoRow label="Peso" value={b.approx_weight} />}
              {b.justification && <InfoRow label="Justificativa" value={b.justification} />}
            </div>
          ))}

          {tab === 'adiantamento' && req.advance && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-900 font-medium"><Wallet className="h-4 w-4" /> Adiantamento</div>
              <InfoRow label="Valor estimado" value={formatCurrency(req.advance.estimated_value)} />
              <InfoRow label="Finalidade" value={req.advance.purpose ?? '—'} />
              <InfoRow label="Dentro do prazo" value={req.advance.within_deadline === null ? '—' : req.advance.within_deadline ? 'Sim' : 'Não'} />
              {req.advance.notes && <InfoRow label="Observações" value={req.advance.notes} />}
            </div>
          )}

          {tab === 'cotacao' && isGestao && (
            <QuotationTab req={req} onChange={reload} />
          )}

          {tab === 'compra' && (isGestao ? <PurchaseTab req={req} onChange={reload} /> : <PurchaseSummary req={req} />)}

          {tab === 'anexos' && (
            <AttachmentsTab req={req} isGestao={isGestao} onChange={reload} />
          )}

          {tab === 'historico' && (
            <div className="space-y-2">
              {req.history?.map((h) => (
                <div key={h.id} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-[#004883] mt-1.5" />
                    <div className="w-px flex-1 bg-gray-200" />
                  </div>
                  <div className="pb-3">
                    <p className="text-gray-900 font-medium">{STATUS_LABELS[h.new_status as RequestStatus] ?? h.new_status}</p>
                    <p className="text-xs text-gray-500">{h.user?.full_name ?? '—'} · {formatDateTimeBR(h.created_at)}</p>
                    {h.note && <p className="text-xs text-gray-600 mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Comments */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-900">Pendências e mensagens</p>
          </div>
          <div className="space-y-2 mb-3">
            {req.comments?.map((c) => (
              <div key={c.id} className={cn('rounded-xl p-3 text-sm', c.author_id === profile?.id ? 'bg-[#004883]/5' : 'bg-gray-50')}>
                <p className="text-gray-800">{c.body}</p>
                <p className="text-[11px] text-gray-500 mt-1">{c.author?.full_name ?? '—'} · {formatRelative(c.created_at)}</p>
              </div>
            ))}
            {(!req.comments || req.comments.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-2">Sem mensagens</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escreva uma mensagem..." onKeyDown={(e) => e.key === 'Enter' && sendComment()} />
            <Button onClick={sendComment} disabled={!comment.trim()}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {isGestao && (
          <>
            {!req.assigned_to && req.status !== 'cancelada' && req.status !== 'finalizada' && (
              <Button onClick={startRequest} loading={actionLoading}>Iniciar atendimento</Button>
            )}
            {req.assigned_to === profile?.id && req.status !== 'finalizada' && req.status !== 'cancelada' && (
              <>
                <StatusSelect current={req.status} onChange={changeStatus} />
              </>
            )}
            <Button variant="outline" onClick={() => setCancelOpen(true)}>Cancelar solicitação</Button>
          </>
        )}
        {!isGestao && isOwner && req.status !== 'finalizada' && req.status !== 'cancelada' && (
          <Button variant="outline" onClick={() => setCancelOpen(true)}>Cancelar solicitação</Button>
        )}
      </div>

      {/* Cancel modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancelar solicitação"
        footer={<><Button variant="outline" onClick={() => setCancelOpen(false)}>Fechar</Button><Button variant="danger" onClick={doCancel} loading={actionLoading} disabled={!cancelReason.trim()}>Confirmar cancelamento</Button></>}>
        <Field label="Motivo do cancelamento" required>
          <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Informe o motivo..." />
        </Field>
      </Modal>

    </div>
  );
}

function ConformityItem({ ok, label, warn }: { ok: boolean; label: string; warn?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', ok && !warn ? 'bg-emerald-500' : warn ? 'bg-amber-500' : 'bg-red-500')} />
      <span className="text-gray-700">{label}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );
}

function StatusSelect({ current, onChange }: { current: RequestStatus; onChange: (s: RequestStatus) => void }) {
  const flow: RequestStatus[] = ['em_andamento', 'orcado', 'aprovado', 'finalizada'];
  return (
    <Select value={current} onChange={(e) => onChange(e.target.value as RequestStatus)} className="w-auto">
      {flow.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
    </Select>
  );
}

function QuotationTab({ req, onChange }: { req: RequestWithRelations; onChange: () => void }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'aerea' | 'rodoviaria' | 'hospedagem'>(req.request_type === 'hospedagem' ? 'hospedagem' : 'aerea');
  const [supplier, setSupplier] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!profile || !req) return;
    setSaving(true);
    await supabase.from('travel_app_quotations').insert({
      request_id: req.id,
      quote_type: type,
      quote_detail: { empresa: supplier || null },
      total_value: value ? Number(value) : null,
      notes,
      created_by: profile.id,
    });
    await supabase.from('travel_app_requests').update({ status: 'orcado', updated_at: new Date().toISOString() }).eq('id', req.id);
    await appendStatus(req.id, profile.id, req.status, 'orcado', 'Orçamento registrado');
    await notify(req.requester_id, 'Pedido orçado', `${req.request_number} — orçamento registrado`, `request/${req.id}`);
    setSaving(false);
    setOpen(false);
    setSupplier(''); setValue(''); setNotes('');
    onChange();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">Cotações registradas</p>
        <Button size="sm" onClick={() => setOpen(true)}>Nova cotação</Button>
      </div>
      {req.quotations?.length === 0 && <p className="text-sm text-gray-400">Nenhuma cotação registrada.</p>}
      {req.quotations?.map((q) => (
        <div key={q.id} className="rounded-xl border border-gray-200 p-3 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-gray-900 capitalize">{q.quote_type}</span>
            <span className="font-semibold text-gray-900">{formatCurrency(q.total_value)}</span>
          </div>
          {q.notes && <p className="text-xs text-gray-500 mt-1">{q.notes}</p>}
          <p className="text-[11px] text-gray-400 mt-1">{formatRelative(q.created_at)}</p>
        </div>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title="Nova cotação"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} loading={saving}>Salvar</Button></>}>
        <div className="space-y-3">
          <Field label="Tipo" required>
            <Select value={type} onChange={(e) => setType(e.target.value as any)}>
              {req.request_type !== 'hospedagem' && <option value="aerea">Aérea</option>}
              {req.request_type !== 'hospedagem' && <option value="rodoviaria">Rodoviária</option>}
              {req.request_type !== 'passagem' && <option value="hospedagem">Hospedagem</option>}
            </Select>
          </Field>
          <Field label="Fornecedor / agência">
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </Field>
          <Field label="Valor total (R$)">
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <Field label="Observações">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function PurchaseSummary({ req }: { req: RequestWithRelations }) {
  return <div className="space-y-3">
    <p className="text-sm font-medium text-gray-900">Dados da viagem</p>
    {req.purchases?.map((p) => <div key={p.id} className="rounded-xl border p-4 text-sm space-y-2">
      {p.airline && <InfoRow label="Companhia / empresa" value={`${p.airline}${p.flight_number ? ` · ${p.flight_number}` : ''}`} />}
      {p.locator && <InfoRow label="Localizador" value={p.locator} />}
      {p.ticket_number && <InfoRow label="Bilhete" value={p.ticket_number} />}
      {p.departure_time && <InfoRow label="Saída" value={p.departure_time} />}
      {p.arrival_time && <InfoRow label="Chegada" value={p.arrival_time} />}
      {p.hotel && <InfoRow label="Hotel" value={p.hotel} />}
      {p.reservation_number && <InfoRow label="Reserva" value={p.reservation_number} />}
      {p.notes && <p className="text-gray-600 pt-2 border-t">{p.notes}</p>}
    </div>)}
  </div>;
}

function PurchaseTab({ req, onChange }: { req: RequestWithRelations; onChange: () => void }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ agency: '', airline: '', flight: '', locator: '', ticket: '', reservation: '', hotel: '', departureTime: '', arrivalTime: '', total: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!profile || !req) return;
    setSaving(true);
    await supabase.from('travel_app_purchases').insert({
      request_id: req.id,
      purchased_at: new Date().toISOString().slice(0, 10),
      agency: form.agency || null,
      airline: form.airline || null,
      flight_number: form.flight || null,
      locator: form.locator || null,
      ticket_number: form.ticket || null,
      reservation_number: form.reservation || null,
      hotel: form.hotel || null,
      departure_time: form.departureTime || null,
      arrival_time: form.arrivalTime || null,
      total_value: form.total ? Number(form.total) : null,
      notes: form.notes || null,
      ticket_issued: !!form.ticket,
      created_by: profile.id,
    });
    await supabase.from('travel_app_requests').update({ status: 'aprovado', updated_at: new Date().toISOString() }).eq('id', req.id);
    await appendStatus(req.id, profile.id, req.status, 'aprovado', 'Compra aprovada e registrada');
    await notify(req.requester_id, 'Compra aprovada', `${req.request_number} — dados da viagem disponíveis`, `request/${req.id}`);
    setSaving(false);
    setOpen(false);
    setForm({ agency: '', airline: '', flight: '', locator: '', ticket: '', reservation: '', hotel: '', departureTime: '', arrivalTime: '', total: '', notes: '' });
    onChange();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">Compras registradas</p>
        <Button size="sm" onClick={() => setOpen(true)}>Registrar compra</Button>
      </div>
      {req.purchases?.length === 0 && <p className="text-sm text-gray-400">Nenhuma compra registrada.</p>}
      {req.purchases?.map((p) => (
        <div key={p.id} className="rounded-xl border border-gray-200 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="font-medium text-gray-900">Compra</span>
            <span className="font-semibold text-gray-900">{formatCurrency(p.total_value)}</span>
          </div>
          {p.airline && <p className="text-xs text-gray-500">Companhia: {p.airline} {p.flight_number ? `· Voo ${p.flight_number}` : ''}</p>}
          {p.locator && <p className="text-xs text-gray-500">Localizador: {p.locator}</p>}
          {p.hotel && <p className="text-xs text-gray-500">Hotel: {p.hotel} {p.reservation_number ? `· Reserva ${p.reservation_number}` : ''}</p>}
          {p.ticket_number && <p className="text-xs text-gray-500">Bilhete: {p.ticket_number}</p>}
          {p.ticket_issued && <Badge className="bg-emerald-100 text-emerald-800 mt-1">Passagem emitida</Badge>}
        </div>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar compra"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} loading={saving}>Salvar</Button></>}>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3"><Field label="Agência"><Input value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} /></Field><Field label="Companhia aérea / empresa de ônibus"><Input value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} /></Field><Field label="Voo / linha"><Input value={form.flight} onChange={(e) => setForm({ ...form, flight: e.target.value })} /></Field><Field label="Localizador"><Input value={form.locator} onChange={(e) => setForm({ ...form, locator: e.target.value })} /></Field>
          <Field label="Número do bilhete"><Input value={form.ticket} onChange={(e) => setForm({ ...form, ticket: e.target.value })} /></Field>
          <Field label="Hotel"><Input value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} /></Field><Field label="Número da reserva"><Input value={form.reservation} onChange={(e) => setForm({ ...form, reservation: e.target.value })} /></Field><Field label="Horário de saída"><Input value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} /></Field><Field label="Horário de chegada"><Input value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} /></Field></div><Field label="Valor total (R$)"><Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} /></Field>
          <Field label="Observações"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

function AttachmentsTab({ req, isGestao, onChange }: { req: RequestWithRelations; isGestao: boolean; onChange: () => void }) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!profile || !req) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${req.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('travel-app-attachments').upload(path, file);
    if (!error) {
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
      onChange();
    }
    setUploading(false);
  }

  async function toggleRelease(attId: string, released: boolean) {
    await supabase.from('travel_app_attachments').update({ released }).eq('id', attId);
    onChange();
  }

  const visible = req.attachments?.filter((a) => isGestao || a.released) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">Anexos</p>
        <label className="cursor-pointer">
          <input type="file" onChange={upload} className="hidden" />
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#004883] text-white h-9 px-3 text-sm font-medium hover:bg-[#003a6b]">
            <Paperclip className="h-4 w-4" /> Enviar
          </span>
        </label>
      </div>
      {uploading && <p className="text-xs text-gray-500">Enviando...</p>}
      {visible.length === 0 && <p className="text-sm text-gray-400">Nenhum anexo.</p>}
      {visible.map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-gray-900 truncate">{a.file_name}</p>
              <p className="text-[11px] text-gray-500">{ATTACHMENT_LABELS[a.category] ?? a.category} · {formatRelative(a.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isGestao && (
              <button onClick={() => toggleRelease(a.id, !a.released)} className={cn('text-xs font-medium px-2 py-1 rounded-lg', a.released ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500 bg-gray-100')}>
                {a.released ? 'Liberado' : 'Liberar'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
