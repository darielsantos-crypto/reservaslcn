import { useEffect, useMemo, useState } from 'react';
import { Inbox, Clock, CheckCircle2, AlertTriangle, CalendarClock, ShoppingCart, Users, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Feedback';
import type { TravelRequest, TravelSegment, Worksite } from '@/lib/types';

type Row = TravelRequest & { worksite?: Worksite | null };

export function OverviewScreen() {
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [segments, setSegments] = useState<Record<string, TravelSegment[]>>({});
  const [counts, setCounts] = useState({ users: 0, worksites: 0, travelers: 0 });

  useEffect(() => {
    (async () => {
      const [r, u, w, t] = await Promise.all([
        supabase.from('travel_app_requests').select('*, worksite:travel_app_worksites(*)').neq('status', 'rascunho').order('updated_at', { ascending: false }),
        supabase.from('travel_app_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('travel_app_worksites').select('id', { count: 'exact', head: true }),
        supabase.from('travel_app_travelers').select('id', { count: 'exact', head: true }),
      ]);
      const reqs = (r.data ?? []) as Row[];
      setRows(reqs);
      setCounts({ users: u.count ?? 0, worksites: w.count ?? 0, travelers: t.count ?? 0 });
      const segs = await Promise.all(reqs.map((row) => supabase.from('travel_app_segments').select('*').eq('request_id', row.id).order('segment_order').limit(1)));
      const sm: Record<string, TravelSegment[]> = {};
      reqs.forEach((row, i) => (sm[row.id] = (segs[i].data ?? []) as TravelSegment[]));
      setSegments(sm);
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Inbox} label="Aguardando atendimento" value={statusCounts['aguardando_atendimento'] ?? 0} tone="amber" onClick={() => navigate('all-requests')} />
        <Stat icon={Clock} label="Em análise" value={statusCounts['em_analise'] ?? 0} tone="blue" onClick={() => navigate('all-requests')} />
        <Stat icon={ShoppingCart} label="Em compra" value={statusCounts['em_compra'] ?? 0} tone="blue" onClick={() => navigate('all-requests')} />
        <Stat icon={CheckCircle2} label="Finalizadas" value={statusCounts['finalizada'] ?? 0} tone="emerald" onClick={() => navigate('all-requests')} />
        <Stat icon={AlertTriangle} label="Fora do prazo" value={rows.filter((r) => r.deadline_status === 'fora').length} tone="red" onClick={() => navigate('all-requests')} />
        <Stat icon={CalendarClock} label="Próximas viagens" value={rows.filter((r) => { const s = segments[r.id]?.[0]; return s?.departure_date && new Date(s.departure_date) >= new Date(); }).length} tone="gray" onClick={() => navigate('upcoming')} />
        <Stat icon={Users} label="Usuários" value={counts.users} tone="blue" onClick={() => navigate('users')} />
        <Stat icon={Building2} label="Obras" value={counts.worksites} tone="gray" onClick={() => navigate('worksites')} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2.5">Solicitações recentes</h2>
        <Card>
          <div className="divide-y divide-gray-100">
            {rows.slice(0, 8).map((r) => {
              const seg = segments[r.id]?.[0];
              return (
                <button key={r.id} onClick={() => navigate(`request/${r.id}`)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{seg ? `${seg.origin} → ${seg.destination}` : r.request_number}</p>
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
  enviada: 'Enviada',
  aguardando_atendimento: 'Aguardando',
  em_analise: 'Em análise',
  aguardando_informacoes: 'Aguardando info',
  em_orcamento: 'Em orçamento',
  em_negociacao: 'Em negociação',
  em_compra: 'Em compra',
  compra_realizada: 'Comprada',
  finalizada: 'Finalizada',
  nao_atendida: 'Não atendida',
  cancelada: 'Cancelada',
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
