import { useEffect, useState } from 'react';
import { PlusCircle, Inbox, Clock, CheckCircle2, CalendarClock, ListChecks, Home } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RequestCard } from '@/components/RequestCard';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import type { TravelRequest, TravelSegment, Worksite } from '@/lib/types';

type Row = TravelRequest & { worksite?: Worksite | null };

export function HomeScreen() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Row[]>([]);
  const [segments, setSegments] = useState<Record<string, TravelSegment[]>>({});
  const [travelerNames, setTravelerNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from('travel_app_requests')
        .select('*, worksite:travel_app_worksites(*)')
        .eq('requester_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      const rows = (data ?? []) as Row[];
      setRequests(rows);
      const segPromises = rows.map((r) =>
        supabase.from('travel_app_segments').select('*').eq('request_id', r.id).order('segment_order').limit(1)
      );
      const segResults = await Promise.all(segPromises);
      const segMap: Record<string, TravelSegment[]> = {};
      rows.forEach((r, i) => (segMap[r.id] = (segResults[i].data ?? []) as TravelSegment[]));
      setSegments(segMap);

      const trtPromises = rows.map((r) =>
        supabase
          .from('travel_app_request_travelers')
          .select('traveler:travel_app_travelers(full_name)')
          .eq('request_id', r.id)
          .limit(1)
      );
      const trtResults = await Promise.all(trtPromises);
      const nameMap: Record<string, string> = {};
      rows.forEach((r, i) => {
        const row = trtResults[i].data?.[0] as any;
        nameMap[r.id] = row?.traveler?.full_name ?? '—';
      });
      setTravelerNames(nameMap);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <PageLoader />;

  const firstName = profile?.full_name.split(' ')[0] ?? '';

  const inProgress = requests.filter((r) =>
    ['enviada', 'aguardando_atendimento', 'em_analise', 'em_orcamento', 'em_negociacao', 'em_compra'].includes(r.status)
  );
  const waitingInfo = requests.filter((r) => r.status === 'aguardando_informacoes');
  const purchased = requests.filter((r) => r.status === 'compra_realizada');
  const upcoming = requests
    .filter((r) => {
      const seg = segments[r.id]?.[0];
      return seg?.departure_date && new Date(seg.departure_date) >= new Date();
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Olá, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">Pronto para organizar sua próxima viagem?</p>
      </div>

      <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate('new-request')}>
        <PlusCircle className="h-5 w-5" /> Nova solicitação
      </Button>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Em andamento" value={inProgress.length} tone="blue" />
        <StatCard icon={Inbox} label="Aguardando informação" value={waitingInfo.length} tone="amber" />
        <StatCard icon={CheckCircle2} label="Compras realizadas" value={purchased.length} tone="emerald" />
        <StatCard icon={CalendarClock} label="Próximas viagens" value={upcoming.length} tone="gray" />
      </div>

      <Section title="Próximas viagens" onMore={() => navigate('upcoming')}>
        {upcoming.length === 0 ? (
          <EmptyState icon={<CalendarClock className="h-8 w-8" />} title="Nenhuma viagem próxima" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {upcoming.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                segments={segments[r.id]}
                travelers={[{ traveler: { full_name: travelerNames[r.id] } }]}
                onClick={() => navigate(`request/${r.id}`)}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Últimos pedidos" onMore={() => navigate('my-requests')}>
        {requests.length === 0 ? (
          <EmptyState icon={<ListChecks className="h-8 w-8" />} title="Você ainda não criou solicitações" description="Comece pela opção Nova solicitação." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {requests.slice(0, 6).map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                segments={segments[r.id]}
                travelers={[{ traveler: { full_name: travelerNames[r.id] } }]}
                onClick={() => navigate(`request/${r.id}`)}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Home; label: string; value: number; tone: 'blue' | 'amber' | 'emerald' | 'gray' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <Card>
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

function Section({ title, onMore, children }: { title: string; onMore?: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {onMore && (
          <button onClick={onMore} className="text-xs font-medium text-[#004883] hover:underline">
            Ver todas
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
