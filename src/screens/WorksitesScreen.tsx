import { useEffect, useState } from 'react';
import { Plus, Building2, Pencil, Power } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import type { Worksite } from '@/lib/types';

const empty = { name: '', code: '', cost_center: '', city: '', state: '', manager_name: '', status: 'ativa' as 'ativa' | 'inativa' | 'encerrada', notes: '' };

export function WorksitesScreen() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Worksite | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await supabase.from('worksites').select('*').order('name');
    setRows((data ?? []) as Worksite[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(w: Worksite) { setEditing(w); setForm({ name: w.name, code: w.code ?? '', cost_center: w.cost_center ?? '', city: w.city ?? '', state: w.state ?? '', manager_name: w.manager_name ?? '', status: w.status, notes: w.notes ?? '' }); setOpen(true); }

  async function save() {
    if (!profile) return;
    if (editing) {
      await supabase.from('worksites').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('worksites').insert({ ...form, created_by: profile.id });
    }
    setOpen(false);
    load();
  }

  async function toggle(w: Worksite) {
    await supabase.from('worksites').update({ active: !w.active, updated_at: new Date().toISOString() }).eq('id', w.id);
    load();
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Obras</h1>
          <p className="text-sm text-gray-500">{rows.length} cadastradas</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Nova obra</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Building2 className="h-8 w-8" />} title="Nenhuma obra cadastrada" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((w) => (
            <Card key={w.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{w.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{w.code ?? 'Sem código'} · {w.city ?? '—'}/{w.state ?? '—'}</p>
                    {w.manager_name && <p className="text-xs text-gray-500 mt-0.5">Gestor: {w.manager_name}</p>}
                  </div>
                  <Badge className={w.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}>{w.active ? 'Ativa' : 'Inativa'}</Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(w)}><Power className="h-3.5 w-3.5" /> {w.active ? 'Inativar' : 'Ativar'}</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar obra' : 'Nova obra'}
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        <div className="space-y-3">
          <Field label="Nome" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Centro de custo"><Input value={form.cost_center} onChange={(e) => setForm({ ...form, cost_center: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Estado"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          </div>
          <Field label="Gestor responsável"><Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} /></Field>
          <Field label="Situação"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
            <option value="ativa">Ativa</option><option value="inativa">Inativa</option><option value="encerrada">Encerrada</option>
          </Select></Field>
          <Field label="Observações"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
