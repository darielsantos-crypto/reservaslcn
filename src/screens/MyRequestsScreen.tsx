import { useEffect, useMemo, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { RequestCard } from '@/components/RequestCard';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { STATUS_LABELS } from '@/lib/constants';
import type { TravelRequest, TravelSegment, Worksite } from '@/lib/types';

type Row = TravelRequest & { worksite?: Worksite | null };

export function MyRequestsScreen() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [segments, setSegments] = useState<Record<string, TravelSegment[]>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from('travel_app_requests')
        .select('*, worksite:travel_app_worksites(*)')
        .eq('requester_id', profile.id)
        .order('updated_at', { ascending: false });
      const r = (data ?? []) as Row[];
      setRows(r);
      const segs = await Promise.all(
        r.map((row) => supabase.from('travel_app_segments').select('*').eq('request_id', row.id).order('segment_order').limit(1))
      );
      const segMap: Record<string, TravelSegment[]> = {};
      r.forEach((row, i) => (segMap[row.id] = (segs[i].data ?? []) as TravelSegment[]));
      setSegments(segMap);
      const trts = await Promise.all(
        r.map((row) =>
          supabase.from('travel_app_request_travelers').select('traveler:travel_app_travelers(full_name)').eq('request_id', row.id).limit(1)
        )
      );
      const nm: Record<string, string> = {};
      r.forEach((row, i) => {
        const t = trts[i].data?.[0] as any;
        nm[row.id] = t?.traveler?.full_name ?? '—';
      });
      setNames(nm);
      setLoading(false);
    })();
  }, [profile]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (search) {
        const seg = segments[r.id]?.[0];
        const route = seg ? `${seg.origin} ${seg.destination}` : '';
        const hay = `${r.request_number ?? ''} ${route} ${names[r.id] ?? ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, status, search, segments, names]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Minhas solicitações</h1>
        <p className="text-sm text-gray-500">{filtered.length} solicitação(ões)</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por número, rota, colaborador..." className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-56">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Filter className="h-8 w-8" />} title="Nenhuma solicitação encontrada" description="Ajuste os filtros ou crie uma nova solicitação." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              segments={segments[r.id]}
              travelers={[{ traveler: { full_name: names[r.id] } }]}
              onClick={() => navigate(`request/${r.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
