import { useEffect, useState } from 'react';
import { Plus, Users, Pencil, Power } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import { fetchWorksitesAll } from '@/lib/queries';
import type { Traveler, Worksite, TravelerType } from '@/lib/types';

const empty = {
  full_name: '', registration: '', cpf: '', birth_date: '', phone: '', email: '',
  position: '', worksite_id: '', cost_center: '', city: '', state: '',
  traveler_type: 'colaborador' as TravelerType, travel_notes: '',
};

export function TravelersScreen() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Traveler[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Traveler | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    const [t, w] = await Promise.all([
      supabase.from('travelers').select('*').order('full_name'),
      fetchWorksitesAll(),
    ]);
    setRows((t.data ?? []) as Traveler[]);
    setWorksites(w);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(t: Traveler) {
    setEditing(t);
    setForm({
      full_name: t.full_name, registration: t.registration ?? '', cpf: t.cpf ?? '', birth_date: t.birth_date ?? '',
      phone: t.phone ?? '', email: t.email ?? '', position: t.position ?? '', worksite_id: t.worksite_id ?? '',
      cost_center: t.cost_center ?? '', city: t.city ?? '', state: t.state ?? '', traveler_type: t.traveler_type,
      travel_notes: t.travel_notes ?? '',
    });
    setOpen(true);
  }

  async function save() {
    if (!profile) return;
    const payload = { ...form, birth_date: form.birth_date || null, worksite_id: form.worksite_id || null };
    if (editing) {
      await supabase.from('travelers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('travelers').insert({ ...payload, created_by: profile.id });
    }
    setOpen(false);
    load();
  }

  async function toggle(t: Traveler) {
    await supabase.from('travelers').update({ active: !t.active, updated_at: new Date().toISOString() }).eq('id', t.id);
    load();
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Colaboradores</h1>
          <p className="text-sm text-gray-500">{rows.length} cadastrados</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo colaborador</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="Nenhum colaborador" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((t) => (
            <Card key={t.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{t.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.registration ?? 'Sem matrícula'} · {t.position ?? '—'}</p>
                    <p className="text-xs text-gray-500">{worksites.find((w) => w.id === t.worksite_id)?.name ?? 'Sem obra'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={t.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}>{t.active ? 'Ativo' : 'Inativo'}</Badge>
                    <Badge className="bg-blue-50 text-blue-700">{t.traveler_type}</Badge>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(t)}><Power className="h-3.5 w-3.5" /> {t.active ? 'Inativar' : 'Ativar'}</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar colaborador' : 'Novo colaborador'} size="lg"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        <div className="space-y-3">
          <Field label="Nome completo" required><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Matrícula"><Input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} /></Field>
            <Field label="CPF"><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de nascimento"><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo / função"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
            <Field label="Tipo"><Select value={form.traveler_type} onChange={(e) => setForm({ ...form, traveler_type: e.target.value as TravelerType })}>
              <option value="colaborador">Colaborador</option>
              <option value="terceiro">Terceiro</option>
              <option value="necessidades_especiais">Necessidades especiais</option>
            </Select></Field>
          </div>
          <Field label="Obra"><Select value={form.worksite_id} onChange={(e) => setForm({ ...form, worksite_id: e.target.value })}>
            <option value="">Sem obra</option>
            {worksites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Centro de custo"><Input value={form.cost_center} onChange={(e) => setForm({ ...form, cost_center: e.target.value })} /></Field>
            <Field label="Cidade"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          </div>
          <Field label="Observações de viagem"><Textarea value={form.travel_notes} onChange={(e) => setForm({ ...form, travel_notes: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
