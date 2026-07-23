/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BedDouble,
  Briefcase,
  Bus,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Hotel,
  MessageSquare,
  Paperclip,
  Plane,
  Send,
  ShieldCheck,
  UserRound,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { fetchRequestDetail, type RequestWithRelations } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { appendStatus, logAudit, notify } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, PageLoader } from '@/components/ui/Feedback';
import {
  DEADLINE_LABELS,
  DEADLINE_STYLES,
  PURPOSE_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from '@/lib/constants';
import {
  cn,
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatRelative,
  requestTypeLabel,
} from '@/lib/helpers';
import type { Purchase, QuoteType, RequestStatus, TransportMode } from '@/lib/types';

const FLOW: Array<{ status: RequestStatus; label: string }> = [
  { status: 'pedido_recebido', label: 'Pedido recebido' },
  { status: 'em_andamento', label: 'Em andamento' },
  { status: 'orcado', label: 'Orçado' },
  { status: 'aprovado', label: 'Aprovado' },
  { status: 'finalizada', label: 'Finalizado' },
];

export function RequestDetailScreen({ id }: { id: string }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [request, setRequest] = useState<RequestWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const isManagement = profile?.role === 'gestao_viagens' || profile?.role === 'super_admin';
  const isOwner = request?.requester_id === profile?.id;

  async function reload() {
    setLoading(true);
    const result = await fetchRequestDetail(id);
    setRequest(result);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, [id]);

  async function transition(next: RequestStatus, note: string) {
    if (!profile || !request) return;
    setActionLoading(true);
    try {
      const previous = request.status;
      const { error } = await supabase.from('travel_app_requests').update({
        status: next,
        updated_at: new Date().toISOString(),
        finalized_at: next === 'finalizada' ? new Date().toISOString() : null,
      }).eq('id', request.id);
      if (error) throw error;
      await appendStatus(request.id, profile.id, previous, next, note);
      await logAudit(profile.id, 'change_status', { type: 'travel_request', id: request.id }, { previousStatus: previous, newStatus: next });
      await notify(
        request.requester_id,
        next === 'finalizada' ? 'Viagem finalizada' : 'Status atualizado',
        `${request.request_number} · ${STATUS_LABELS[next]}`,
        `request/${request.id}`,
      );
      await reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.');
    } finally {
      setActionLoading(false);
    }
  }

  async function startProcessing() {
    if (!profile || !request) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('travel_app_requests').update({
        assigned_to: profile.id,
        status: 'em_andamento',
        updated_at: new Date().toISOString(),
      }).eq('id', request.id);
      if (error) throw error;
      await appendStatus(request.id, profile.id, request.status, 'em_andamento', 'Processamento iniciado');
      await notify(request.requester_id, 'Pedido em andamento', `${request.request_number} entrou em processamento`, `request/${request.id}`);
      await reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível iniciar o processamento.');
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelRequest() {
    if (!profile || !request || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('travel_app_requests').update({
        status: 'cancelada',
        cancel_reason: cancelReason.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', request.id);
      if (error) throw error;
      await appendStatus(request.id, profile.id, request.status, 'cancelada', cancelReason.trim());
      await notify(request.requester_id, 'Solicitação cancelada', `${request.request_number} · ${cancelReason.trim()}`, `request/${request.id}`);
      setCancelOpen(false);
      setCancelReason('');
      await reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível cancelar.');
    } finally {
      setActionLoading(false);
    }
  }

  async function sendComment() {
    if (!profile || !request || !comment.trim()) return;
    const body = comment.trim();
    const { error } = await supabase.from('travel_app_comments').insert({
      request_id: request.id,
      author_id: profile.id,
      body,
    });
    if (error) return alert(error.message);
    setComment('');
    const recipient = profile.id === request.requester_id ? request.assigned_to : request.requester_id;
    if (recipient) await notify(recipient, 'Nova mensagem', `${request.request_number} · ${body.slice(0, 90)}`, `request/${request.id}`);
    await reload();
  }

  if (loading) return <PageLoader />;
  if (!request) return <EmptyState title="Solicitação não encontrada" />;

  const segment = request.segments?.[0];
  const accommodation = request.accommodations?.[0];
  const transportMode = segment?.transport_mode as TransportMode | null;
  const requestTitle = segment
    ? `${segment.origin} → ${segment.destination}`
    : `Hospedagem em ${accommodation?.city || 'local a definir'}`;
  const canCancel = request.status !== 'finalizada' && request.status !== 'cancelada' && (isManagement || isOwner);

  return (
    <div className="space-y-4 pb-4">
      <button
        type="button"
        onClick={() => navigate(isManagement ? 'queue' : 'my-requests')}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium text-gray-500">{request.request_number}</p>
          <h1 className="mt-1 truncate text-xl font-semibold text-gray-900">{requestTitle}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={STATUS_STYLES[request.status]}>{STATUS_LABELS[request.status]}</Badge>
            <Badge className={DEADLINE_STYLES[request.deadline_status]}>{DEADLINE_LABELS[request.deadline_status]}</Badge>
            <span className="text-xs text-gray-500">{requestTypeLabel(request.request_type)}</span>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          <p>Atualizado {formatRelative(request.updated_at)}</p>
          {request.assigned && <p>Responsável: <b className="text-gray-700">{request.assigned.full_name}</b></p>}
        </div>
      </header>

      <Workflow status={request.status} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="p-4 sm:p-5">
              <SectionTitle icon={Briefcase} title="Solicitação" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Info label="Obra" value={request.worksite?.name || '—'} />
                <Info label="Finalidade" value={PURPOSE_LABELS[request.purpose] || request.purpose} />
                <Info label="Solicitante" value={request.requester?.full_name || '—'} />
                <Info label="Solicitado internamente por" value={request.internal_requested_by || '—'} />
                <Info label="Enviado em" value={formatDateTimeBR(request.submitted_at)} />
                <Info label="Tipo" value={requestTypeLabel(request.request_type)} />
              </div>
              {request.observation && <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{request.observation}</p>}
            </div>
          </Card>

          <Card>
            <div className="p-4 sm:p-5">
              <SectionTitle icon={UserRound} title="Viajantes" />
              <div className="mt-4 divide-y rounded-xl border bg-white">
                {request.travelers?.map((item) => (
                  <div key={item.id} className="p-3 sm:p-4">
                    <p className="font-semibold text-gray-900">{item.traveler?.full_name || '—'}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Matrícula: {item.traveler?.registration || '—'}</span>
                      <span>{item.traveler?.position || 'Cargo não informado'}</span>
                      <span>{item.traveler?.phone || 'Telefone não informado'}</span>
                    </div>
                    {item.traveler?.travel_notes && <p className="mt-2 text-sm text-gray-600">{item.traveler.travel_notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {segment && (
            <Card>
              <div className="p-4 sm:p-5">
                <SectionTitle icon={transportMode === 'rodoviario' ? Bus : Plane} title="Passagem" />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Info label="Trajeto" value={`${segment.origin} → ${segment.destination}`} />
                  <Info label="Transporte" value={transportMode === 'rodoviario' ? 'Ônibus' : 'Aéreo'} />
                  <Info label="Data" value={formatDateBR(segment.departure_date)} />
                  {segment.return_date && <Info label="Volta" value={formatDateBR(segment.return_date)} />}
                  <Info label="Período preferencial" value={segment.preferred_period || 'Sem preferência'} />
                  <Info label="Flexibilidade" value={segment.flexibility || '—'} />
                </div>
                {request.baggage?.length ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <b>Bagagem:</b> {baggageLabel(request.baggage[0].baggage_type)}
                    {request.baggage[0].description ? ` · ${request.baggage[0].description}` : ''}
                  </div>
                ) : null}
              </div>
            </Card>
          )}

          {accommodation && (
            <Card>
              <div className="p-4 sm:p-5">
                <SectionTitle icon={BedDouble} title="Hospedagem" />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Info label="Cidade" value={accommodation.city || '—'} />
                  <Info label="Hóspedes" value={String(accommodation.guests)} />
                  <Info label="Check-in" value={formatDateBR(accommodation.check_in)} />
                  <Info label="Check-out" value={formatDateBR(accommodation.check_out)} />
                  <Info label="Diárias" value={String(accommodation.nights || '—')} />
                  <Info label="Localização" value={accommodation.location_preference || 'Sem preferência'} />
                </div>
              </div>
            </Card>
          )}

          {request.advance?.needed && (
            <Card>
              <div className="p-4 sm:p-5">
                <SectionTitle icon={WalletCards} title="Adiantamento" />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Info label="Valor estimado" value={formatCurrency(request.advance.estimated_value)} />
                  <Info label="Finalidade" value={request.advance.purpose || '—'} />
                </div>
              </div>
            </Card>
          )}

          <Messages request={request} comment={comment} setComment={setComment} sendComment={sendComment} profileId={profile?.id} />
          <Attachments request={request} isManagement={isManagement} profileId={profile?.id} onChange={reload} />
          <HistoryList request={request} />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          {request.purchases?.length ? <PurchaseSummary purchases={request.purchases} /> : null}

          {isManagement && request.status !== 'cancelada' && request.status !== 'finalizada' && (
            <Card>
              <div className="p-4 sm:p-5">
                <SectionTitle icon={CircleDollarSign} title="Processamento" />
                <p className="mt-2 text-sm text-gray-500">Avance conforme a compra for sendo realizada.</p>
                <div className="mt-4 space-y-2">
                  {request.status === 'pedido_recebido' && (
                    <Button className="w-full" loading={actionLoading} onClick={startProcessing}>Iniciar processamento</Button>
                  )}
                  {request.status === 'em_andamento' && (
                    <Button className="w-full" onClick={() => setQuoteOpen(true)}>Registrar orçamento</Button>
                  )}
                  {request.status === 'orcado' && (
                    <Button className="w-full" onClick={() => setPurchaseOpen(true)}>Registrar compra</Button>
                  )}
                  {request.status === 'aprovado' && (
                    <Button className="w-full" loading={actionLoading} onClick={() => transition('finalizada', 'Solicitação finalizada e dados liberados ao solicitante')}>Finalizar solicitação</Button>
                  )}
                  {request.status === 'em_andamento' && request.quotations?.length ? (
                    <Button className="w-full" variant="outline" onClick={() => setQuoteOpen(true)}>Adicionar outra cotação</Button>
                  ) : null}
                </div>

                {request.quotations?.length ? (
                  <div className="mt-5 space-y-2 border-t pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Orçamentos registrados</p>
                    {request.quotations.map((quotation) => (
                      <div key={quotation.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium capitalize">{quoteTypeLabel(quotation.quote_type)}</span>
                          <b>{formatCurrency(quotation.total_value)}</b>
                        </div>
                        {quotation.notes && <p className="mt-1 text-xs text-gray-500">{quotation.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </Card>
          )}

          <Card>
            <div className="p-4 sm:p-5">
              <SectionTitle icon={ShieldCheck} title="Política" />
              <div className="mt-4 space-y-2 text-sm">
                <PolicyLine label="Prazo" value={DEADLINE_LABELS[request.deadline_status]} ok={request.deadline_status !== 'fora'} />
                <PolicyLine label="Dados do viajante" value="Registrados" ok />
                <PolicyLine label="Bagagem especial" value={request.baggage?.length ? 'Informada' : 'Não aplicável'} ok />
                <PolicyLine label="Justificativa" value={request.justification ? 'Registrada' : 'Não aplicável'} ok={request.deadline_status !== 'fora' || Boolean(request.justification)} />
              </div>
            </div>
          </Card>

          {canCancel && (
            <Button className="w-full" variant="outline" onClick={() => setCancelOpen(true)}>
              <XCircle className="h-4 w-4" /> Cancelar solicitação
            </Button>
          )}
        </aside>
      </div>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} request={request} profileId={profile?.id} onSaved={reload} />
      <PurchaseModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} request={request} profileId={profile?.id} onSaved={reload} />

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar solicitação"
        footer={(
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button variant="danger" loading={actionLoading} disabled={!cancelReason.trim()} onClick={cancelRequest}>Confirmar</Button>
          </>
        )}
      >
        <Field label="Motivo" required>
          <Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Informe o motivo do cancelamento." />
        </Field>
      </Modal>
    </div>
  );
}

function Workflow({ status }: { status: RequestStatus }) {
  if (status === 'cancelada') {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">Solicitação cancelada</div>;
  }
  const currentIndex = Math.max(0, FLOW.findIndex((item) => item.status === status));
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white p-4">
      <div className="flex min-w-[650px] items-center">
        {FLOW.map((item, index) => {
          const completed = index <= currentIndex;
          return (
            <div key={item.status} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold', completed ? 'bg-[#004883] text-white' : 'bg-gray-100 text-gray-400')}>
                  {completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <span className={cn('whitespace-nowrap text-[11px] font-medium', completed ? 'text-[#004883]' : 'text-gray-400')}>{item.label}</span>
              </div>
              {index < FLOW.length - 1 && <div className={cn('mx-2 h-0.5 flex-1', index < currentIndex ? 'bg-[#004883]' : 'bg-gray-200')} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Plane; title: string }) {
  return <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-[#004883]" /><h2 className="font-semibold text-gray-900">{title}</h2></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 text-sm text-gray-900">{value}</p></div>;
}

function PolicyLine({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-gray-500">{label}</span><span className={cn('flex items-center gap-1 font-medium', ok ? 'text-emerald-700' : 'text-red-700')}><span className={cn('h-2 w-2 rounded-full', ok ? 'bg-emerald-500' : 'bg-red-500')} />{value}</span></div>;
}

function Messages({ request, comment, setComment, sendComment, profileId }: {
  request: RequestWithRelations;
  comment: string;
  setComment: (value: string) => void;
  sendComment: () => void;
  profileId?: string;
}) {
  return (
    <Card>
      <div className="p-4 sm:p-5">
        <SectionTitle icon={MessageSquare} title="Mensagens" />
        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {request.comments?.length ? request.comments.map((item) => (
            <div key={item.id} className={cn('rounded-xl p-3 text-sm', item.author_id === profileId ? 'bg-[#004883]/5' : 'bg-gray-50')}>
              <p className="text-gray-800">{item.body}</p>
              <p className="mt-1 text-[11px] text-gray-500">{item.author?.full_name || '—'} · {formatRelative(item.created_at)}</p>
            </div>
          )) : <p className="py-3 text-center text-sm text-gray-400">Sem mensagens.</p>}
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escreva uma mensagem" onKeyDown={(event) => { if (event.key === 'Enter') sendComment(); }} />
          <Button aria-label="Enviar mensagem" disabled={!comment.trim()} onClick={sendComment}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </Card>
  );
}

function Attachments({ request, isManagement, profileId, onChange }: {
  request: RequestWithRelations;
  isManagement: boolean;
  profileId?: string;
  onChange: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const visible = request.attachments?.filter((item) => isManagement || item.released || item.uploaded_by === profileId) || [];

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profileId) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${request.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('travel-app-attachments').upload(path, file);
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('travel_app_attachments').insert({
        request_id: request.id,
        category: 'documento',
        label: file.name,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        released: !isManagement,
        uploaded_by: profileId,
      });
      if (error) throw error;
      await onChange();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao enviar o arquivo.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function toggleRelease(id: string, released: boolean) {
    await supabase.from('travel_app_attachments').update({ released }).eq('id', id);
    await onChange();
  }

  return (
    <Card>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon={Paperclip} title="Documentos" />
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={upload} />
            <span className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004883] px-3 text-sm font-medium text-white">{uploading ? 'Enviando...' : 'Adicionar'}</span>
          </label>
        </div>
        <div className="mt-4 divide-y rounded-xl border">
          {visible.length ? visible.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{item.file_name}</span></div>
              {isManagement && (
                <button type="button" className={cn('rounded-lg px-2 py-1 text-xs font-medium', item.released ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')} onClick={() => toggleRelease(item.id, !item.released)}>
                  {item.released ? 'Liberado' : 'Liberar'}
                </button>
              )}
            </div>
          )) : <p className="p-4 text-center text-sm text-gray-400">Nenhum documento.</p>}
        </div>
      </div>
    </Card>
  );
}

function HistoryList({ request }: { request: RequestWithRelations }) {
  return (
    <Card>
      <div className="p-4 sm:p-5">
        <SectionTitle icon={Clock3} title="Histórico" />
        <div className="mt-4 space-y-3">
          {request.history?.length ? request.history.map((item) => (
            <div key={item.id} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#004883]" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{STATUS_LABELS[item.new_status as RequestStatus] || item.new_status}</p>
                <p className="text-xs text-gray-500">{item.user?.full_name || 'Sistema'} · {formatDateTimeBR(item.created_at)}</p>
                {item.note && <p className="mt-1 text-xs text-gray-600">{item.note}</p>}
              </div>
            </div>
          )) : <p className="text-sm text-gray-400">Sem histórico.</p>}
        </div>
      </div>
    </Card>
  );
}

function PurchaseSummary({ purchases }: { purchases: Purchase[] }) {
  return (
    <Card>
      <div className="p-4 sm:p-5">
        <SectionTitle icon={CheckCircle2} title="Dados confirmados" />
        <p className="mt-2 text-sm text-gray-500">Informações disponíveis para o viajante.</p>
        <div className="mt-4 space-y-3">
          {purchases.map((purchase) => (
            <div key={purchase.id} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-sm">
              {purchase.airline && <Info label="Companhia / empresa" value={`${purchase.airline}${purchase.flight_number ? ` · ${purchase.flight_number}` : ''}`} />}
              {purchase.locator && <div className="mt-3"><Info label="Localizador" value={purchase.locator} /></div>}
              {purchase.ticket_number && <div className="mt-3"><Info label="Bilhete" value={purchase.ticket_number} /></div>}
              {purchase.departure_time && <div className="mt-3"><Info label="Saída" value={purchase.departure_time} /></div>}
              {purchase.arrival_time && <div className="mt-3"><Info label="Chegada" value={purchase.arrival_time} /></div>}
              {purchase.hotel && <div className="mt-3"><Info label="Hotel" value={purchase.hotel} /></div>}
              {purchase.reservation_number && <div className="mt-3"><Info label="Reserva" value={purchase.reservation_number} /></div>}
              {purchase.notes && <p className="mt-3 border-t border-emerald-200 pt-3 text-gray-700">{purchase.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function QuoteModal({ open, onClose, request, profileId, onSaved }: {
  open: boolean;
  onClose: () => void;
  request: RequestWithRelations;
  profileId?: string;
  onSaved: () => Promise<void>;
}) {
  const segment = request.segments?.[0];
  const hasHotel = Boolean(request.accommodations?.length);
  const defaultType: QuoteType = !segment ? 'hospedagem' : segment.transport_mode === 'rodoviario' ? 'rodoviaria' : 'aerea';
  const [type, setType] = useState<QuoteType>(defaultType);
  const [company, setCompany] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const allowedTypes = useMemo<QuoteType[]>(() => {
    const types: QuoteType[] = [];
    if (segment) types.push(segment.transport_mode === 'rodoviario' ? 'rodoviaria' : 'aerea');
    if (hasHotel) types.push('hospedagem');
    return types.length ? types : ['hospedagem'];
  }, [hasHotel, segment]);

  useEffect(() => {
    if (!allowedTypes.includes(type)) setType(allowedTypes[0]);
  }, [allowedTypes, type]);

  async function save() {
    if (!profileId || !value) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('travel_app_quotations').insert({
        request_id: request.id,
        quote_type: type,
        quote_detail: { empresa: company.trim() || null },
        total_value: Number(value),
        notes: notes.trim() || null,
        created_by: profileId,
      });
      if (error) throw error;
      const { error: statusError } = await supabase.from('travel_app_requests').update({ status: 'orcado', updated_at: new Date().toISOString() }).eq('id', request.id);
      if (statusError) throw statusError;
      await appendStatus(request.id, profileId, request.status, 'orcado', 'Orçamento registrado');
      await notify(request.requester_id, 'Pedido orçado', `${request.request_number} · orçamento registrado`, `request/${request.id}`);
      setCompany('');
      setValue('');
      setNotes('');
      onClose();
      await onSaved();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível registrar o orçamento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar orçamento" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={saving} disabled={!value} onClick={save}>Salvar orçamento</Button></>}>
      <div className="space-y-3">
        {allowedTypes.length > 1 && (
          <Field label="Tipo" required>
            <Select value={type} onChange={(event) => setType(event.target.value as QuoteType)}>
              {allowedTypes.map((item) => <option key={item} value={item}>{quoteTypeLabel(item)}</option>)}
            </Select>
          </Field>
        )}
        <Field label={type === 'hospedagem' ? 'Hotel / agência' : 'Companhia / agência'}>
          <Input value={company} onChange={(event) => setCompany(event.target.value)} />
        </Field>
        <Field label="Valor total" required>
          <Input type="number" min={0} step="0.01" value={value} onChange={(event) => setValue(event.target.value)} />
        </Field>
        <Field label="Observações">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function PurchaseModal({ open, onClose, request, profileId, onSaved }: {
  open: boolean;
  onClose: () => void;
  request: RequestWithRelations;
  profileId?: string;
  onSaved: () => Promise<void>;
}) {
  const hasTransport = Boolean(request.segments?.length);
  const hasHotel = Boolean(request.accommodations?.length);
  const [form, setForm] = useState({
    agency: '',
    company: '',
    flight: '',
    locator: '',
    ticket: '',
    departureTime: '',
    arrivalTime: '',
    hotel: '',
    reservation: '',
    total: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!profileId || !form.total) return;
    if (hasTransport && !form.company.trim()) return alert('Informe a companhia aérea ou empresa de ônibus.');
    if (hasHotel && !form.hotel.trim()) return alert('Informe o hotel.');
    setSaving(true);
    try {
      const { error } = await supabase.from('travel_app_purchases').insert({
        request_id: request.id,
        purchase_type: request.request_type,
        purchased_at: new Date().toISOString().slice(0, 10),
        agency: form.agency.trim() || null,
        airline: hasTransport ? form.company.trim() || null : null,
        flight_number: hasTransport ? form.flight.trim() || null : null,
        locator: hasTransport ? form.locator.trim() || null : null,
        ticket_number: hasTransport ? form.ticket.trim() || null : null,
        departure_time: hasTransport ? form.departureTime.trim() || null : null,
        arrival_time: hasTransport ? form.arrivalTime.trim() || null : null,
        hotel: hasHotel ? form.hotel.trim() || null : null,
        reservation_number: hasHotel ? form.reservation.trim() || null : null,
        total_value: Number(form.total),
        notes: form.notes.trim() || null,
        ticket_issued: hasTransport && Boolean(form.ticket.trim()),
        accommodation_reserved: hasHotel && Boolean(form.reservation.trim()),
        docs_sent_to_requester: false,
        created_by: profileId,
      });
      if (error) throw error;
      const { error: statusError } = await supabase.from('travel_app_requests').update({ status: 'aprovado', updated_at: new Date().toISOString() }).eq('id', request.id);
      if (statusError) throw statusError;
      await appendStatus(request.id, profileId, request.status, 'aprovado', 'Compra registrada');
      await notify(request.requester_id, 'Compra realizada', `${request.request_number} · dados disponíveis para consulta`, `request/${request.id}`);
      setForm({ agency: '', company: '', flight: '', locator: '', ticket: '', departureTime: '', arrivalTime: '', hotel: '', reservation: '', total: '', notes: '' });
      onClose();
      await onSaved();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível registrar a compra.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar compra" size="lg" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={saving} disabled={!form.total} onClick={save}>Salvar compra</Button></>}>
      <div className="space-y-4">
        <Field label="Agência">
          <Input value={form.agency} onChange={(event) => setForm({ ...form, agency: event.target.value })} />
        </Field>
        {hasTransport && (
          <div className="rounded-2xl border p-4">
            <p className="mb-3 flex items-center gap-2 font-semibold"><Plane className="h-4 w-4 text-[#004883]" />Passagem</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Companhia / empresa de ônibus" required><Input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></Field>
              <Field label="Voo / linha"><Input value={form.flight} onChange={(event) => setForm({ ...form, flight: event.target.value })} /></Field>
              <Field label="Localizador"><Input value={form.locator} onChange={(event) => setForm({ ...form, locator: event.target.value })} /></Field>
              <Field label="Número do bilhete"><Input value={form.ticket} onChange={(event) => setForm({ ...form, ticket: event.target.value })} /></Field>
              <Field label="Horário de saída"><Input value={form.departureTime} onChange={(event) => setForm({ ...form, departureTime: event.target.value })} /></Field>
              <Field label="Horário de chegada"><Input value={form.arrivalTime} onChange={(event) => setForm({ ...form, arrivalTime: event.target.value })} /></Field>
            </div>
          </div>
        )}
        {hasHotel && (
          <div className="rounded-2xl border p-4">
            <p className="mb-3 flex items-center gap-2 font-semibold"><Hotel className="h-4 w-4 text-[#004883]" />Hospedagem</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Hotel" required><Input value={form.hotel} onChange={(event) => setForm({ ...form, hotel: event.target.value })} /></Field>
              <Field label="Número da reserva"><Input value={form.reservation} onChange={(event) => setForm({ ...form, reservation: event.target.value })} /></Field>
            </div>
          </div>
        )}
        <Field label="Valor total" required><Input type="number" min={0} step="0.01" value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} /></Field>
        <Field label="Observações para o solicitante"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function quoteTypeLabel(type: QuoteType) {
  if (type === 'aerea') return 'Passagem aérea';
  if (type === 'rodoviaria') return 'Passagem rodoviária';
  return 'Hospedagem';
}

function baggageLabel(type: string) {
  const labels: Record<string, string> = {
    mao: 'Bagagem de mão',
    despachada: 'Bagagem despachada',
    ferramentas_equipamentos: 'Ferramentas ou equipamentos',
    adicional_especial: 'Bagagem especial ou adicional',
  };
  return labels[type] || type;
}
