import { useEffect, useState } from 'react';
import { Activity, BadgeDollarSign, CheckCircle2, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { Badge } from '@/components/ui/Badge';
import { DEADLINE_LABELS, DEADLINE_STYLES, STATUS_LABELS, STATUS_STYLES } from '@/lib/constants';
import { formatDateBR } from '@/lib/helpers';
import type { DeadlineStatus, RequestStatus } from '@/lib/types';

type PanelRow = {
  id: string;
  request_number: string;
  status: RequestStatus;
  deadline_status: DeadlineStatus;
  worksite?: { name: string } | null;
  segment?: Array<{ origin: string; destination: string; departure_date: string | null }>;
  accommodation?: Array<{ city: string | null; check_in: string | null }>;
  travelers?: Array<{ traveler?: { full_name: string } | null }>;
};

export function GestaoPanelScreen() {
  const { navigate } = useRouter();
  const [rows, setRows] = useState<PanelRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('travel_app_requests')
        .select(`
          id,
          request_number,
          status,
          deadline_status,
          worksite:travel_app_worksites(name),
          segment:travel_app_segments(origin,destination,departure_date),
          accommodation:travel_app_accommodations(city,check_in),
          travelers:travel_app_request_travelers(traveler:travel_app_travelers(full_name))
        `)
        .neq('status', 'rascunho')
        .order('submitted_at', { ascending: true })
        .limit(50);
      if (error) console.error(error);
      setRows((data ?? []) as unknown as PanelRow[]);
    };
    void load();
  }, []);

  const count = (status: RequestStatus) => rows.filter((row) => row.status === status).length;
  const stats = [
    { icon: Inbox, label: 'Recebidos', value: count('pedido_recebido') },
    { icon: Activity, label: 'Em andamento', value: count('em_andamento') },
    { icon: BadgeDollarSign, label: 'Orçados', value: count('orcado') },
    { icon: CheckCircle2, label: 'Finalizados', value: count('finalizada') },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold">Triagem e compras</h1>
        <p className="text-sm text-gray-500">Visão rápida dos pedidos que precisam de atendimento.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <button key={label} type="button" onClick={() => navigate('queue')} className="rounded-2xl border bg-white p-4 text-left hover:bg-gray-50">
            <Icon className="h-5 w-5 text-[#004883]" />
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Próximos pedidos</h2>
        <button className="text-sm font-medium text-[#004883]" onClick={() => navigate('queue')}>Abrir fila completa</button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        {rows.slice(0, 10).map((row) => {
          const segment = row.segment?.[0];
          const accommodation = row.accommodation?.[0];
          const description = segment ? `${segment.origin} → ${segment.destination}` : `Hospedagem em ${accommodation?.city || '—'}`;
          const names = row.travelers?.map((item) => item.traveler?.full_name).filter(Boolean).join(', ') || '—';
          const date = segment?.departure_date || accommodation?.check_in || null;
          return (
            <button key={row.id} type="button" onClick={() => navigate(`request/${row.id}`)} className="grid w-full gap-2 border-b px-4 py-3 text-left last:border-b-0 hover:bg-gray-50 md:grid-cols-[130px_1.2fr_1.5fr_110px_140px_130px] md:items-center">
              <span className="font-mono text-xs font-medium text-gray-500">{row.request_number}</span>
              <span className="truncate text-sm font-medium text-gray-900">{names}</span>
              <span className="truncate text-sm text-gray-700">{description}</span>
              <span className="text-sm text-gray-600">{formatDateBR(date)}</span>
              <Badge className={DEADLINE_STYLES[row.deadline_status]}>{DEADLINE_LABELS[row.deadline_status]}</Badge>
              <Badge className={STATUS_STYLES[row.status]}>{STATUS_LABELS[row.status]}</Badge>
            </button>
          );
        })}
        {rows.length === 0 && <p className="p-8 text-center text-sm text-gray-500">Nenhum pedido recebido.</p>}
      </div>
    </div>
  );
}
