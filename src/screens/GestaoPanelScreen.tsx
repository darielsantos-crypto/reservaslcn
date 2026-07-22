import { useEffect, useMemo, useState } from 'react';
import { Inbox, Clock, ShoppingCart, CheckCircle2, CalendarClock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Feedback';
import { RequestCard } from '@/components/RequestCard';
import type { TravelRequest, TravelSegment, Worksite } from '@/lib/types';

type Row = TravelRequest & { worksite?: Worksite | null };

export function GestaoPanelScreen() {
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [segments, setSegments] = useState<Record<string, TravelSegment[]>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('travel_app_requests')
        .select('*, worksite:travel_app_worksites(*)')
        .neq('status', 'rascunho')
        .order('updated_at', { ascending: false });
      const r = (data ?? []) as Row[];
      setRows(r);
      const segs = await Promise.all(r.map((row) => supabase.from('travel_app_segments').select('*').eq('request_id', row.id).order('segment_order').limit(1)));
      const sm: Record<string, TravelSegment[]> = {};
      r.forEach((row, i) => (sm[row.id] = (segs[i].data ?? []) as TravelSegment[]));
      setSegments(sm);
      const trts = await Promise.all(r.map((row) => supabase.from('travel_app_request_travelers').select('traveler:travel_app_travelers(full_name)').eq('request_id', row.id).limit(1)));
      const nm: Record<string, string> = {};
      r.forEach((row, i) => {
        const t = trts[i].data?.[0] as any;
        nm[row.id] = t?.traveler?.full_name ?? '—';
      });
      setNames(nm);
      setLoading(false);
    })();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  const today = new Date().toISOString().slice(0, 10);
  const purchasesToday = rows.filter((r) => r.status === 'compra_realizada' && r.updated_at.slice(0, 10) === today).length;
  const upcoming = rows.filter((r) => {
    const seg = segments[r.id]?.[0];
    return seg?.departure_date && new Date(seg.departure_date) >= new Date() && !['finalizada', 'cancelada', 'nao_atendida'].includes(r.status);
  });
  const outOfDeadline = rows.filter((r) => r.deadline_status === 'fora' && !['finalizada', 'cancelada', 'nao_atendida'].includes(r.status));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Painel operacional</h1>
        <p className="text-sm text-gray-500">Visão geral das solicitações</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Inbox} label="Aguardando atendimento" value={counts['aguardando_atendimento'] ?? 0} tone="amber" onClick={() => navigate('queue')} />
        <Stat icon={Clock} label="Em análise" value={counts['em_analise'] ?? 0} tone="blue" onClick={() => navigate('attendance')} />
        <Stat icon={ShoppingCart} label="Em compra" value={counts['em_compra'] ?? 0} tone="blue" onClick={() => navigate('attendance')} />
        <Stat icon={CheckCircle2} label="Compras hoje" value={purchasesToday} tone="emerald" onClick={() => navigate('purchases')} />
        <Stat icon={CalendarClock} label="Viagens próximas" value={upcoming.length} tone="gray" onClick={() => navigate('upcoming')} />
        <Stat icon={AlertTriangle} label="Fora do prazo" value={outOfDeadline.length} tone="red" onClick={() => navigate('queue')} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2.5">Fila de atendimento</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.filter((r) => ['enviada', 'aguardando_atendimento'].includes(r.status)).slice(0, 6).map((r) => (
            <RequestCard key={r.id} request={r} segments={segments[r.id]} travelers={[{ traveler: { full_name: names[r.id] } }]} onClick={() => navigate(`request/${r.id}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}

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
