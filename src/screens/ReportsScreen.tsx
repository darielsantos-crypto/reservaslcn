import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import { STATUS_LABELS, PURPOSE_LABELS } from '@/lib/constants';
import { formatCurrency, formatDateBR } from '@/lib/helpers';
import type { TravelRequest, Worksite, Purchase } from '@/lib/types';

type Row = TravelRequest & { worksite?: Worksite | null; purchases?: Purchase[] };

export function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [purpose, setPurpose] = useState('');
  const [status, setStatus] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('travel_app_requests')
        .select('*, worksite:travel_app_worksites(*)')
        .neq('status', 'rascunho')
        .order('created_at', { ascending: false });
      const r = (data ?? []) as Row[];
      const pur = await Promise.all(r.map((row) => supabase.from('travel_app_purchases').select('*').eq('request_id', row.id)));
      r.forEach((row, i) => (row.purchases = (pur[i].data ?? []) as Purchase[]));
      setRows(r);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (purpose && r.purpose !== purpose) return false;
      if (status && r.status !== status) return false;
      if (deadline && r.deadline_status !== deadline) return false;
      return true;
    });
  }, [rows, purpose, status, deadline]);

  const metrics = useMemo(() => {
    const total = filtered.length;
    const outOfDeadline = filtered.filter((r) => r.deadline_status === 'fora').length;
    const withinPct = total ? Math.round(((total - outOfDeadline) / total) * 100) : 100;
    const totalPassengers = filtered.length;
    const totalValue = filtered.reduce((sum, r) => sum + (r.purchases?.reduce((s, p) => s + (p.total_value ?? 0), 0) ?? 0), 0);
    const byWorksite: Record<string, number> = {};
    filtered.forEach((r) => {
      const name = r.worksite?.name ?? 'Sem obra';
      byWorksite[name] = (byWorksite[name] ?? 0) + 1;
    });
    const cancellations = filtered.filter((r) => r.status === 'cancelada').length;
    return { total, outOfDeadline, withinPct, totalPassengers, totalValue, byWorksite, cancellations };
  }, [filtered]);

  function exportCSV() {
    const headers = ['Número', 'Status', 'Finalidade', 'Obra', 'Origem', 'Destino', 'Ida', 'Volta', 'Prazo', 'Valor Total'];
    const lines = filtered.map((r) => [
      r.request_number, STATUS_LABELS[r.status], PURPOSE_LABELS[r.purpose] ?? r.purpose,
      r.worksite?.name ?? '', '', '', formatDateBR(r.created_at), '', r.deadline_status,
      r.purchases?.reduce((s, p) => s + (p.total_value ?? 0), 0) ?? 0,
    ].join(';'));
    const csv = [headers.join(';'), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'relatorio_viagens.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">{filtered.length} solicitação(ões)</p>
        </div>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4" /> Exportar CSV</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="sm:w-48">
          <option value="">Todas as finalidades</option>
          {Object.entries(PURPOSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={deadline} onChange={(e) => setDeadline(e.target.value)} className="sm:w-48">
          <option value="">Todos os prazos</option>
          <option value="dentro">Dentro do prazo</option>
          <option value="proximo">Próximo do limite</option>
          <option value="fora">Fora do prazo</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Total de solicitações" value={String(metrics.total)} />
        <Metric label="Dentro do prazo" value={`${metrics.withinPct}%`} />
        <Metric label="Valor total" value={formatCurrency(metrics.totalValue)} />
        <Metric label="Cancelamentos" value={String(metrics.cancellations)} />
        <Metric label="Não atendidas" value={String(0)} />
        <Metric label="Fora do prazo" value={String(metrics.outOfDeadline)} />
      </div>

      <Card>
        <div className="p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Solicitações por obra</p>
          {Object.keys(metrics.byWorksite).length === 0 ? (
            <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="Sem dados" />
          ) : (
            <div className="space-y-2">
              {Object.entries(metrics.byWorksite).map(([name, count]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span className="text-gray-600">{name}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="p-3.5">
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] text-gray-500 mt-1.5">{label}</p>
      </div>
    </Card>
  );
}
