import { useEffect, useState } from 'react';
import { Plus, HelpCircle, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import { FAQ_CATEGORIES, FAQ_CATEGORY_LABELS } from '@/lib/constants';
import type { FaqItem } from '@/lib/types';

const empty = { category: 'prazos', question: '', answer: '', sort_order: 0 };

export function FaqAdminScreen() {
  const [rows, setRows] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await supabase.from('travel_app_faq_items').select('*').order('category').order('sort_order');
    setRows((data ?? []) as FaqItem[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(f: FaqItem) {
    setEditing(f);
    setForm({ category: f.category, question: f.question, answer: f.answer, sort_order: f.sort_order });
    setOpen(true);
  }

  async function save() {
    if (editing) {
      await supabase.from('travel_app_faq_items').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('travel_app_faq_items').insert(form);
    }
    setOpen(false);
    load();
  }

  async function remove(f: FaqItem) {
    if (!confirm('Excluir esta pergunta?')) return;
    await supabase.from('travel_app_faq_items').delete().eq('id', f.id);
    load();
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Perguntas frequentes</h1>
          <p className="text-sm text-gray-500">{rows.length} cadastradas</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Nova pergunta</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<HelpCircle className="h-8 w-8" />} title="Nenhuma pergunta" />
      ) : (
        <div className="space-y-2">
          {rows.map((f) => (
            <Card key={f.id}>
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{f.question}</p>
                  <p className="text-sm text-gray-600 mt-1">{f.answer}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{FAQ_CATEGORY_LABELS[f.category] ?? f.category}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar pergunta' : 'Nova pergunta'} size="lg"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        <div className="space-y-3">
          <Field label="Categoria"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {FAQ_CATEGORIES.map((c) => <option key={c} value={c}>{FAQ_CATEGORY_LABELS[c] ?? c}</option>)}
          </Select></Field>
          <Field label="Pergunta" required><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></Field>
          <Field label="Resposta" required><Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} className="min-h-[120px]" /></Field>
          <Field label="Ordem"><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
