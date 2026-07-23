import { useEffect, useState } from 'react';
import { BedDouble, CalendarClock, CheckCircle2, Clock3, Plane, PlusCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { STATUS_LABELS, STATUS_STYLES } from '@/lib/constants';
import { formatDateBR } from '@/lib/helpers';
import type { RequestStatus, RequestType } from '@/lib/types';

type HomeRow = {
  id: string;
  request_number: string;
  status: RequestStatus;
  request_type: RequestType;
  segment?: Array<{ origin: string; destination: string; departure_date: string | null }>;
  accommodation?: Array<{ city: string | null; check_in: string | null }>;
  travelers?: Array<{ traveler?: { full_name: string } | null }>;
};

export function HomeScreen() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [rows, setRows] = useState<HomeRow[]>([]);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('travel_app_requests')
        .select(`
          id,
          request_number,
          status,
          request_type,
          segment:travel_app_segments(origin,destination,departure_date),
          accommodation:travel_app_accommodations(city,check_in),
          travelers:travel_app_request_travelers(traveler:travel_app_travelers(full_name))
        `)
        .eq('requester_id', profile.id)
        .neq('status', 'rascunho')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) console.error(error);
      setRows((data ?? []) as unknown as HomeRow[]);
    };
    void load();
  }, [profile]);

  const active = rows.filter((row) => ['pedido_recebido', 'em_andamento', 'orcado', 'aprovado'].includes(row.status));
  const finalized = rows.filter((row) => row.status === 'finalizada');
  const upcoming = rows.filter((row) => {
    const date = row.segment?.[0]?.departure_date || row.accommodation?.[0]?.check_in;
    return Boolean(date && new Date(`${date}T12:00:00`) >= new Date());
  });

  const stats = [
    { icon: Clock3, label: 'Em andamento', value: active.length },
    { icon: CheckCircle2, label: 'Finalizadas', value: finalized.length },
    { icon: CalendarClock, label: 'Próximas viagens', value: upcoming.length },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Olá, {profile?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500">Solicite e acompanhe suas viagens em um só lugar.</p>
        <Button className="mt-5" onClick={() => navigate('new-request')}><PlusCircle className="h-5 w-5" /> Nova solicitação</Button>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border bg-white p-3 sm:p-4">
            <Icon className="h-5 w-5 text-[#004883]" />
            <p className="mt-2 text-xl font-semibold sm:text-2xl">{value}</p>
            <p className="text-[11px] text-gray-500 sm:text-xs">{label}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Pedidos recentes</h2>
          <button className="text-sm font-medium text-[#004883]" onClick={() => navigate('my-requests')}>Ver todos</button>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white">
          {rows.slice(0, 8).map((row) => {
            const segment = row.segment?.[0];
            const accommodation = row.accommodation?.[0];
            const names = row.travelers?.map((item) => item.traveler?.full_name).filter(Boolean).join(', ') || 'Viajante não informado';
            const title = segment ? `${segment.origin} → ${segment.destination}` : `Hospedagem em ${accommodation?.city || '—'}`;
            const date = segment?.departure_date || accommodation?.check_in || null;
            return (
              <button key={row.id} type="button" onClick={() => navigate(`request/${row.id}`)} className="flex w-full items-center gap-3 border-b p-4 text-left last:border-b-0 hover:bg-gray-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#004883]/10 text-[#004883]">
                  {row.request_type === 'hospedagem' ? <BedDouble className="h-5 w-5" /> : <Plane className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{title}</p>
                  <p className="truncate text-sm text-gray-500">{names} · {formatDateBR(date)} · {row.request_number}</p>
                </div>
                <Badge className={STATUS_STYLES[row.status]}>{STATUS_LABELS[row.status]}</Badge>
              </button>
            );
          })}
          {rows.length === 0 && <p className="p-8 text-center text-sm text-gray-500">Nenhuma solicitação ainda.</p>}
        </div>
      </section>
    </div>
  );
}
