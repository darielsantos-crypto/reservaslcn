import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import { formatDateTimeBR } from '@/lib/helpers';
import type { AuditLog, Profile } from '@/lib/types';

export function AuditScreen() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
      const logs = (data ?? []) as AuditLog[];
      setRows(logs);
      const ids = Array.from(new Set(logs.map((l) => l.user_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: udata } = await supabase.from('profiles').select('*').in('id', ids);
        (udata ?? []).forEach((u) => (users[u.id] = u as Profile));
        setUsers({ ...users });
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Auditoria</h1>
        <p className="text-sm text-gray-500">Histórico completo de ações</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-8 w-8" />} title="Nenhum registro" />
      ) : (
        <div className="space-y-2">
          {rows.map((l) => (
            <Card key={l.id}>
              <div className="p-3.5 flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-[#004883] mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{l.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {l.user_id ? users[l.user_id]?.full_name ?? '—' : '—'} · {formatDateTimeBR(l.created_at)}
                  </p>
                  {l.previous_status && l.new_status && (
                    <p className="text-xs text-gray-600 mt-0.5">{l.previous_status} → {l.new_status}</p>
                  )}
                  {l.observation && <p className="text-xs text-gray-600 mt-0.5">{l.observation}</p>}
                  {l.justification && <p className="text-xs text-gray-600 mt-0.5">Justificativa: {l.justification}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
