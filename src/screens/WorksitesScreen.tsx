import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Power } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, PageLoader } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import type { Worksite, WorksiteStatus } from '@/lib/types';

const EMPTY_FORM = {
  name: '',
  code: '',
  cost_center: '',
  city: '',
  state: '',
  manager_name: '',
  status: 'ativa' as WorksiteStatus,
  notes: '',
};

export function WorksitesScreen() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Worksite | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from('travel_app_worksites').select('*').order('name');
    if (error) console.error(error);
    setRows((data ?? []) as Worksite[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(worksite: Worksite) {
    setEditing(worksite);
    setForm({
      name: worksite.name,
      code: worksite.code ?? '',
      cost_center: worksite.cost_center ?? '',
      city: worksite.city ?? '',
      state: worksite.state ?? '',
      manager_name: worksite.manager_name ?? '',
      status: worksite.status,
      notes: worksite.notes ?? '',
    });
    setOpen(true);
  }

  async function save() {
    if (!profile || !form.name.trim() || !form.city.trim() || !form.state.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        code: form.code.trim() || null,
        cost_center: form.cost_center.trim() || null,
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        manager_name: form.manager_name.trim() || null,
        notes: form.notes.trim() || null,
        active: form.status === 'ativa',
        updated_at: new Date().toISOString(),
      };
      const result = editing
        ? await supabase.from('travel_app_worksites').update(payload).eq('id', editing.id)
        : await supabase.from('travel_app_worksites').insert({ ...payload, created_by: profile.id });
      if (result.error) throw result.error;
      setOpen(false);
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível salvar a obra.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(worksite: Worksite) {
    const { error } = await supabase.from('travel_app_worksites').update({
      active: !worksite.active,
      status: worksite.active ? 'inativa' : 'ativa',
      updated_at: new Date().toISOString(),
    }).eq('id', worksite.id);
    if (error) return alert(error.message);
    await load();
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="page-title-row flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Obras</h1>
          <p className="text-sm text-gray-500">Cadastre as obras e centros de custo usados nas solicitações.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Nova obra</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Building2 className="h-8 w-8" />} title="Nenhuma obra cadastrada" />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_.7fr_auto] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
            <span>Obra</span><span>Local</span><span>Centro de custo</span><span>Status</span><span className="text-right">Ações</span>
          </div>
          {rows.map((worksite) => (
            <div key={worksite.id} className="grid gap-2 border-t px-4 py-3 first:border-t-0 md:grid-cols-[1.5fr_1fr_1fr_.7fr_auto] md:items-center md:gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{worksite.name}</p>
                <p className="text-xs text-gray-500">{worksite.code || 'Sem código'}{worksite.manager_name ? ` · Gestor: ${worksite.manager_name}` : ''}</p>
              </div>
              <p className="text-sm text-gray-700">{worksite.city || '—'}/{worksite.state || '—'}</p>
              <p className="text-sm text-gray-700">{worksite.cost_center || '—'}</p>
              <Badge className={worksite.active ? 'w-fit bg-emerald-100 text-emerald-800' : 'w-fit bg-gray-100 text-gray-600'}>{worksite.active ? 'Ativa' : 'Inativa'}</Badge>
              <div className="flex gap-1 md:justify-end">
                <Button size="sm" variant="ghost" onClick={() => openEdit(worksite)}><Pencil className="h-4 w-4" /><span className="md:hidden">Editar</span></Button>
                <Button size="sm" variant="ghost" onClick={() => toggle(worksite)}><Power className="h-4 w-4" /><span className="md:hidden">{worksite.active ? 'Inativar' : 'Ativar'}</span></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar obra' : 'Nova obra'}
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button loading={saving} disabled={!form.name.trim() || !form.city.trim() || !form.state.trim()} onClick={save}>Salvar</Button></>}
      >
        <div className="space-y-3">
          <Field label="Nome da obra" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Código"><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></Field>
            <Field label="Centro de custo"><Input value={form.cost_center} onChange={(event) => setForm({ ...form, cost_center: event.target.value })} /></Field>
            <Field label="Cidade" required><Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
            <Field label="Estado" required><Input maxLength={2} value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase() })} /></Field>
          </div>
          <Field label="Gestor responsável"><Input value={form.manager_name} onChange={(event) => setForm({ ...form, manager_name: event.target.value })} /></Field>
          <Field label="Situação">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as WorksiteStatus })}>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
              <option value="encerrada">Encerrada</option>
            </Select>
          </Field>
          <Field label="Observações"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
