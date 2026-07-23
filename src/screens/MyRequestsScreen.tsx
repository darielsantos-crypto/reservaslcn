import { useEffect, useMemo, useState } from 'react';
import { BedDouble, CalendarDays, ChevronRight, Filter, Plane, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, PageLoader } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { DEADLINE_LABELS, DEADLINE_STYLES, STATUS_LABELS, STATUS_STYLES } from '@/lib/constants';
import { formatDateBR, requestTypeLabel } from '@/lib/helpers';
import type { Accommodation, DeadlineStatus, RequestStatus, RequestType, TravelRequest, TravelSegment, Worksite } from '@/lib/types';

type Row = TravelRequest & {
  worksite?: Worksite | null;
  segment?: TravelSegment[];
  accommodation?: Accommodation[];
  travelers?: Array<{ traveler?: { full_name: string } | null }>;
};

export function MyRequestsScreen() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('travel_app_requests')
        .select(`
          *,
          worksite:travel_app_worksites(*),
          segment:travel_app_segments(*),
          accommodation:travel_app_accommodations(*),
          travelers:travel_app_request_travelers(traveler:travel_app_travelers(full_name))
        `)
        .eq('requester_id', profile.id)
        .neq('status', 'rascunho')
        .order('updated_at', { ascending: false });
      if (!active) return;
      if (error) console.error('Falha ao carregar solicitações:', error);
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [profile]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (!normalized) return true;
      const segment = row.segment?.[0];
      const accommodation = row.accommodation?.[0];
      const names = row.travelers?.map((item) => item.traveler?.full_name).filter(Boolean).join(' ') || '';
      return [
        row.request_number,
        row.worksite?.name,
        segment?.origin,
        segment?.destination,
        accommodation?.city,
        names,
      ].filter(Boolean).join(' ').toLowerCase().includes(normalized);
    });
  }, [rows, search, status]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Acompanhar pedidos</h1>
        <p className="text-sm text-gray-500">Consulte o andamento e os dados liberados de cada viagem.</p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar protocolo, rota ou viajante" className="pl-9" />
        </div>
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className="sm:w-56">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).filter(([key]) => key !== 'rascunho').map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Filter className="h-8 w-8" />} title="Nenhuma solicitação encontrada" description="Ajuste os filtros ou crie uma nova solicitação." />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white">
          {filtered.map((row) => {
            const segment = row.segment?.[0];
            const accommodation = row.accommodation?.[0];
            const date = segment?.departure_date || accommodation?.check_in || null;
            const title = segment
              ? `${segment.origin} → ${segment.destination}`
              : `Hospedagem em ${accommodation?.city || 'local a definir'}`;
            const travelers = row.travelers?.map((item) => item.traveler?.full_name).filter(Boolean).join(', ') || 'Viajante não informado';
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => navigate(`request/${row.id}`)}
                className="w-full border-b px-4 py-4 text-left last:border-b-0 hover:bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#004883]/10 text-[#004883]">
                    {row.request_type === 'hospedagem' ? <BedDouble className="h-5 w-5" /> : <Plane className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{title}</p>
                        <p className="mt-0.5 truncate text-sm text-gray-500">{travelers}</p>
                      </div>
                      <Badge className={STATUS_STYLES[row.status as RequestStatus]}>{STATUS_LABELS[row.status as RequestStatus]}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                      <span className="font-mono">{row.request_number}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDateBR(date)}</span>
                      <span>{row.worksite?.name || 'Sem obra'}</span>
                      <span>{requestTypeLabel(row.request_type as RequestType)}</span>
                      <Badge className={DEADLINE_STYLES[row.deadline_status as DeadlineStatus]}>{DEADLINE_LABELS[row.deadline_status as DeadlineStatus]}</Badge>
                    </div>
                  </div>
                  <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
