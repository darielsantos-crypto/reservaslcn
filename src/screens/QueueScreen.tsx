import { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Plane,
  Search,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Field';
import { EmptyState, PageLoader } from '@/components/ui/Feedback';
import {
  DEADLINE_LABELS,
  DEADLINE_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
} from '@/lib/constants';
import { formatDateBR, requestTypeLabel } from '@/lib/helpers';
import type { DeadlineStatus, RequestStatus, RequestType } from '@/lib/types';

type QueueRow = {
  id: string;
  request_number: string;
  request_type: RequestType;
  status: RequestStatus;
  deadline_status: DeadlineStatus;
  submitted_at: string | null;
  updated_at: string;
  worksite?: { name: string } | null;
  requester?: { full_name: string } | null;
  segment?: Array<{ origin: string; destination: string; departure_date: string | null }>;
  accommodation?: Array<{ city: string | null; check_in: string | null; check_out: string | null }>;
  travelers?: Array<{ traveler?: { full_name: string } | null }>;
};

const STATUS_ORDER: Record<RequestStatus, number> = {
  pedido_recebido: 0,
  em_andamento: 1,
  orcado: 2,
  aprovado: 3,
  finalizada: 4,
  cancelada: 5,
  rascunho: 6,
};

export function QueueScreen({
  title = 'Triagem e compras',
  filterStatus,
}: {
  title?: string;
  filterStatus?: RequestStatus[];
}) {
  const { navigate } = useRouter();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from('travel_app_requests')
        .select(`
          id,
          request_number,
          request_type,
          status,
          deadline_status,
          submitted_at,
          updated_at,
          worksite:travel_app_worksites(name),
          requester:travel_app_profiles!requester_id(full_name),
          segment:travel_app_segments(origin,destination,departure_date),
          accommodation:travel_app_accommodations(city,check_in,check_out),
          travelers:travel_app_request_travelers(traveler:travel_app_travelers(full_name))
        `)
        .neq('status', 'rascunho');

      if (filterStatus?.length) query = query.in('status', filterStatus);
      const { data, error } = await query;
      if (!active) return;
      if (error) console.error('Falha ao carregar fila:', error);
      setRows((data ?? []) as unknown as QueueRow[]);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [filterStatus]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (status && row.status !== status) return false;
        if (!normalizedSearch) return true;
        const segment = row.segment?.[0];
        const accommodation = row.accommodation?.[0];
        const travelerNames = row.travelers
          ?.map((item) => item.traveler?.full_name)
          .filter(Boolean)
          .join(' ') || '';
        const haystack = [
          row.request_number,
          row.worksite?.name,
          row.requester?.full_name,
          travelerNames,
          segment?.origin,
          segment?.destination,
          accommodation?.city,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        const dateA = requestDate(a);
        const dateB = requestDate(b);
        const timeA = dateA ? new Date(`${dateA}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = dateB ? new Date(`${dateB}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        if (timeA !== timeB) return timeA - timeB;
        if (a.deadline_status !== b.deadline_status) {
          const deadlineOrder: Record<DeadlineStatus, number> = { fora: 0, proximo: 1, dentro: 2 };
          return deadlineOrder[a.deadline_status] - deadlineOrder[b.deadline_status];
        }
        if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return new Date(a.submitted_at || a.updated_at).getTime() - new Date(b.submitted_at || b.updated_at).getTime();
      });
  }, [rows, search, status]);

  if (loading) return <PageLoader />;

  return (
    <div className="min-w-0 space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">Pedidos organizados pela data da viagem, com os mais urgentes primeiro.</p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar protocolo, viajante, obra ou destino"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select className="sm:w-56" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS)
            .filter(([key]) => key !== 'rascunho')
            .map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<SlidersHorizontal className="h-8 w-8" />} title="Nenhuma solicitação encontrada" />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border bg-white md:hidden">
            {filtered.map((row) => {
              const date = requestDate(row);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => navigate(`request/${row.id}`)}
                  className="w-full border-b px-4 py-3 text-left last:border-b-0 active:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium text-gray-500">{row.request_number}</span>
                        <Badge className={STATUS_STYLES[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                      </div>
                      <p className="mt-1 truncate font-semibold text-gray-900">{travelerNames(row)}</p>
                      <p className="mt-0.5 truncate text-sm text-gray-700">{requestDescription(row)}</p>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-400" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <span className="flex min-w-0 items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{formatDateBR(date)}</span>
                    <span className="flex min-w-0 items-center gap-1.5 truncate"><Building2 className="h-3.5 w-3.5 shrink-0" />{row.worksite?.name || 'Sem obra'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className={DEADLINE_STYLES[row.deadline_status]}>{DEADLINE_LABELS[row.deadline_status]}</Badge>
                    <span className="text-xs text-gray-500">{requestTypeLabel(row.request_type)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border bg-white md:block">
            <table className="w-full min-w-[1020px] text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Protocolo</th>
                  <th className="px-4 py-3">Viajante</th>
                  <th className="px-4 py-3">Solicitação</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Obra</th>
                  <th className="px-4 py-3">Prazo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">{row.request_number}</td>
                    <td className="max-w-52 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="truncate">{travelerNames(row)}</span>
                      </div>
                    </td>
                    <td className="max-w-64 px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.request_type === 'hospedagem' ? <BedDouble className="h-4 w-4 shrink-0 text-[#004883]" /> : <Plane className="h-4 w-4 shrink-0 text-[#004883]" />}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{requestDescription(row)}</p>
                          <p className="text-xs text-gray-500">{requestTypeLabel(row.request_type)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDateBR(requestDate(row))}</td>
                    <td className="max-w-44 px-4 py-3"><span className="block truncate">{row.worksite?.name || '—'}</span></td>
                    <td className="px-4 py-3"><Badge className={DEADLINE_STYLES[row.deadline_status]}>{DEADLINE_LABELS[row.deadline_status]}</Badge></td>
                    <td className="px-4 py-3"><Badge className={STATUS_STYLES[row.status]}>{STATUS_LABELS[row.status]}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="inline-flex items-center gap-1 font-semibold text-[#004883] hover:underline" onClick={() => navigate(`request/${row.id}`)}>
                        <CircleDollarSign className="h-4 w-4" /> Processar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function requestDate(row: QueueRow) {
  return row.segment?.[0]?.departure_date || row.accommodation?.[0]?.check_in || null;
}

function travelerNames(row: QueueRow) {
  return row.travelers?.map((item) => item.traveler?.full_name).filter(Boolean).join(', ') || 'Viajante não informado';
}

function requestDescription(row: QueueRow) {
  const segment = row.segment?.[0];
  const accommodation = row.accommodation?.[0];
  if (segment) return `${segment.origin} → ${segment.destination}`;
  if (accommodation) return `Hospedagem em ${accommodation.city || 'local a definir'}`;
  return 'Detalhes não informados';
}
