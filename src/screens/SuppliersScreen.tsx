import { useEffect, useState } from 'react';
import { Plus, Truck, Pencil, Power } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import type { Supplier } from '@/lib/types';

const empty = { name: '', type: '', contact_name: '', phone: '', email: '', notes: '' };

export function SuppliersScreen() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setRows((data ?? []) as Supplier[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, type: s.type ?? '', contact_name: s.contact_name ?? '', phone: s.phone ?? '', email: s.email ?? '', notes: s.notes ?? '' });
    setOpen(true);
  }

  async function save() {
    if (!profile) return;
    if (editing) {
      await supabase.from('suppliers').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('suppliers').insert({ ...form, created_by: profile.id });
    }
    setOpen(false);
    load();
  }

  async function toggle(s: Supplier) {
    await supabase.from('suppliers').update({ active: !s.active, updated_at: new Date().toISOString() }).eq('id', s.id);
    load();
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Fornecedores</h1>
          <p className="text-sm text-gray-500">{rows.length} cadastrados</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo fornecedor</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Truck className="h-8 w-8" />} title="Nenhum fornecedor" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((s) => (
            <Card key={s.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.type ?? '—'} · {s.contact_name ?? 'Sem contato'}</p>
                    {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
                  </div>
                  <Badge className={s.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}>{s.active ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(s)}><Power className="h-3.5 w-3.5" /> {s.active ? 'Inativar' : 'Ativar'}</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar fornecedor' : 'Novo fornecedor'}
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        <div className="space-y-3">
          <Field label="Nome" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Tipo"><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Ex: Agência de viagens" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contato"><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Observações"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
