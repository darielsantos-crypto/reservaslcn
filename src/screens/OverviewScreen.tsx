import { useEffect, useMemo, useState } from 'react';
import { Inbox, Clock, CheckCircle2, AlertTriangle, CalendarClock, ShoppingCart, Users, Building2, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Feedback';
import type { TravelRequest, TravelSegment, Accommodation, Worksite } from '@/lib/types';

type Row = TravelRequest & { worksite?: Worksite | null };

export function OverviewScreen() {
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [segments, setSegments] = useState<Record<string, TravelSegment[]>>({});
  const [accommodations, setAccommodations] = useState<Record<string, Accommodation[]>>({});
  const [counts, setCounts] = useState({ users: 0, worksites: 0, travelers: 0, accessRequests: 0 });

  useEffect(() => {
    (async () => {
      const [r, u, w, t, a] = await Promise.all([
        supabase.from('travel_app_requests').select('*, worksite:travel_app_worksites(*)').neq('status', 'rascunho').order('updated_at', { ascending: false }),
        supabase.from('travel_app_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('travel_app_worksites').select('id', { count: 'exact', head: true }),
        supabase.from('travel_app_travelers').select('id', { count: 'exact', head: true }),
        supabase.from('travel_app_access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      ]);
      const reqs = (r.data ?? []) as Row[];
      setRows(reqs);
      setCounts({ users: u.count ?? 0, worksites: w.count ?? 0, travelers: t.count ?? 0, accessRequests: a.count ?? 0 });
      const segs = await Promise.all(reqs.map((row) => supabase.from('travel_app_segments').select('*').eq('request_id', row.id).order('segment_order').limit(1)));
      const sm: Record<string, TravelSegment[]> = {};
      reqs.forEach((row, i) => (sm[row.id] = (segs[i].data ?? []) as TravelSegment[]));
      setSegments(sm);
      const accs = await Promise.all(reqs.map((row) => supabase.from('travel_app_accommodations').select('*').eq('request_id', row.id).limit(1)));
      const am: Record<string, Accommodation[]> = {};
      reqs.forEach((row, i) => (am[row.id] = (accs[i].data ?? []) as Accommodation[]));
      setAccommodations(am);
      setLoading(false);
    })();
  }, []);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Visão geral</h1>
        <p className="text-sm text-gray-500">Indicadores da operação</p>
      </div>

      {counts.accessRequests > 0 && (
        <button
          type="button"
          onClick={() => navigate('users')}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-700"><UserPlus className="h-5 w-5" /></span>
            <span><b className="block text-sm text-gray-900">{counts.accessRequests} solicitação{counts.accessRequests > 1 ? 'ões' : ''} de acesso pendente{counts.accessRequests > 1 ? 's' : ''}</b><span className="text-xs text-gray-600">Revise os dados e conclua o cadastro do usuário e da obra.</span></span>
          </span>
          <span className="text-sm font-semibold text-[#004883]">Abrir</span>
        </button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Inbox} label="Pedidos recebidos" value={statusCounts['pedido_recebido'] ?? 0} tone="amber" onClick={() => navigate('all-requests')} />
        <Stat icon={Clock} label="Em andamento" value={statusCounts['em_andamento'] ?? 0} tone="blue" onClick={() => navigate('all-requests')} />
        <Stat icon={ShoppingCart} label="Orçados" value={statusCounts['orcado'] ?? 0} tone="blue" onClick={() => navigate('all-requests')} />
        <Stat icon={CheckCircle2} label="Finalizadas" value={statusCounts['finalizada'] ?? 0} tone="emerald" onClick={() => navigate('all-requests')} />
        <Stat icon={AlertTriangle} label="Fora do prazo" value={rows.filter((r) => r.deadline_status === 'fora').length} tone="red" onClick={() => navigate('all-requests')} />
        <Stat icon={CalendarClock} label="Próximas viagens" value={rows.filter((r) => { const s = segments[r.id]?.[0]; const a=accommodations[r.id]?.[0]; const d=s?.departure_date||a?.check_in; return d && new Date(d) >= new Date(); }).length} tone="gray" onClick={() => navigate('upcoming')} />
        <Stat icon={Users} label="Usuários" value={counts.users} tone="blue" onClick={() => navigate('users')} />
        <Stat icon={Building2} label="Obras" value={counts.worksites} tone="gray" onClick={() => navigate('worksites')} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2.5">Solicitações recentes</h2>
        <Card>
          <div className="divide-y divide-gray-100">
            {rows.slice(0, 8).map((r) => {
              const seg = segments[r.id]?.[0];
              const acc = accommodations[r.id]?.[0];
              return (
                <button key={r.id} onClick={() => navigate(`request/${r.id}`)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{seg ? `${seg.origin} → ${seg.destination}` : acc ? `Hospedagem em ${acc.city ?? 'local a definir'}` : r.request_number}</p>
                    <p className="text-xs text-gray-500">{r.request_number} · {r.worksite?.name ?? '—'}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{STATUS_LABELS_SHORT[r.status]}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

const STATUS_LABELS_SHORT: Record<string, string> = {
  pedido_recebido: 'Pedido recebido',
  em_andamento: 'Em andamento',
  orcado: 'Orçado',
  aprovado: 'Aprovado',
  finalizada: 'Finalizado',
  cancelada: 'Cancelado',
};

function Stat({ icon: Icon, label, value, tone, onClick }: { icon: typeof Inbox; label: string; value: number; tone: 'amber' | 'blue' | 'emerald' | 'gray' | 'red'; onClick?: () => void }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <Card hover={!!onClick} onClick={onClick}>
      <div className="p-3.5 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
          <p className="text-[11px] text-gray-500 mt-1">{label}</p>
        </div>
      </div>
    </Card>
  );
}
