import { useEffect, useState } from 'react';
import { CalendarClock, MapPin } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { RequestCard } from '@/components/RequestCard';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import type { TravelRequest, TravelSegment, Worksite } from '@/lib/types';

type Row = TravelRequest & { worksite?: Worksite | null };

export function UpcomingScreen() {
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
        .not('status', 'in', '("cancelada","nao_atendida")')
        .order('updated_at', { ascending: false });
      const r = (data ?? []) as Row[];
      const [segs, accs] = await Promise.all([
        Promise.all(r.map((row) => supabase.from('travel_app_segments').select('*').eq('request_id', row.id).order('segment_order').limit(1))),
        Promise.all(r.map((row) => supabase.from('travel_app_accommodations').select('city,check_in,check_out').eq('request_id', row.id).limit(1)))
      ]);
      const sm: Record<string, TravelSegment[]> = {};
      r.forEach((row, i) => {
        const found=(segs[i].data ?? []) as TravelSegment[];
        const a=(accs[i].data ?? [])[0] as any;
        sm[row.id]=found.length?found:(a?[{id:`hotel-${row.id}`,request_id:row.id,segment_order:1,origin:'Hospedagem',destination:a.city,direction:'ida_e_volta',departure_date:a.check_in,return_date:a.check_out,transport_mode:null,preferred_period:null,flexibility:null,notes:null,created_at:''} as TravelSegment]:[]);
      });
      setSegments(sm);
      const upcoming = r.filter((row) => {
        const s = sm[row.id]?.[0];
        return s?.departure_date && new Date(s.departure_date) >= new Date();
      }).sort((a, b) => {
        const da = sm[a.id]?.[0]?.departure_date ?? '';
        const db = sm[b.id]?.[0]?.departure_date ?? '';
        return da.localeCompare(db);
      });
      setRows(upcoming);
      const trts = await Promise.all(upcoming.map((row) => supabase.from('travel_app_request_travelers').select('traveler:travel_app_travelers(full_name)').eq('request_id', row.id).limit(1)));
      const nm: Record<string, string> = {};
      upcoming.forEach((row, i) => {
        const t = trts[i].data?.[0] as any;
        nm[row.id] = t?.traveler?.full_name ?? '—';
      });
      setNames(nm);
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Próximas viagens</h1>
        <p className="text-sm text-gray-500">{rows.length} viagem(ns)</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<CalendarClock className="h-8 w-8" />} title="Nenhuma viagem próxima" />
      ) : (
        <div className="rounded-2xl border bg-white divide-y">
          {rows.map((r) => (
            <RequestCard key={r.id} request={r} segments={segments[r.id]} travelers={[{ traveler: { full_name: names[r.id] } }]} onClick={() => navigate(`request/${r.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
