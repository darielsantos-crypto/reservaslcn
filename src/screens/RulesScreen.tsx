import { useEffect, useState } from 'react';
import { Clock, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { PageLoader } from '@/components/ui/Feedback';
import type { PolicyRule } from '@/lib/types';

export function RulesScreen() {
  const { profile } = useAuth();
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('travel_app_policy_rules').select('*').order('label').then(({ data }) => {
      setRules((data ?? []) as PolicyRule[]);
      setLoading(false);
    });
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    for (const r of rules) {
      await supabase.from('travel_app_policy_rules').update({ min_days: r.min_days, description: r.description, updated_by: profile.id, updated_at: new Date().toISOString() }).eq('id', r.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Regras e prazos</h1>
          <p className="text-sm text-gray-500">Configure os prazos mínimos de antecedência.</p>
        </div>
        <Button onClick={save} loading={saving}><Save className="h-4 w-4" /> Salvar</Button>
      </div>
      {saved && <p className="text-sm text-emerald-600">Regras salvas!</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        {rules.map((r, i) => (
          <Card key={r.id}>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#004883]" />
                <p className="text-sm font-semibold text-gray-900">{r.label}</p>
              </div>
              <Field label="Dias mínimos de antecedência">
                <Input type="number" value={r.min_days} onChange={(e) => setRules(rules.map((rr, idx) => idx === i ? { ...rr, min_days: Number(e.target.value) } : rr))} />
              </Field>
              <Field label="Descrição">
                <Textarea value={r.description ?? ''} onChange={(e) => setRules(rules.map((rr, idx) => idx === i ? { ...rr, description: e.target.value } : rr))} />
              </Field>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
