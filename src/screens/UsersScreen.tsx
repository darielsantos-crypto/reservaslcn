import { useEffect, useState } from 'react';
import { Plus, Users, Pencil, Power, Trash2, Link2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import { ROLE_LABELS } from '@/lib/nav';
import type { Profile, Worksite, Role } from '@/lib/types';

const empty = { full_name: '', registration: '', email: '', password: '', phone: '', position: '', city: '', state: '', role: 'solicitante' as Role, worksiteIds: [] as string[] };

export function UsersScreen() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  const [rows, setRows] = useState<Profile[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState(empty);
  const [linkOpen, setLinkOpen] = useState<Profile | null>(null);
  const [linkIds, setLinkIds] = useState<string[]>([]);

  async function load() {
    const [p, w] = await Promise.all([
      supabase.from('travel_app_profiles').select('*').order('full_name'),
      supabase.from('travel_app_worksites').select('*').order('name'),
    ]);
    setRows((p.data ?? []) as Profile[]);
    setWorksites((w.data ?? []) as Worksite[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function getAccessToken() {
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;

    if (!session?.access_token) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error || !refreshed.session?.access_token) return null;
      session = refreshed.session;
    }

    return session.access_token;
  }

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(u: Profile) {
    setEditing(u);
    setForm({ full_name: u.full_name, registration: u.registration ?? '', email: u.email, password: '', phone: u.phone ?? '', position: u.position ?? '', city: u.city ?? '', state: u.state ?? '', role: u.role, worksiteIds: [] });
    setOpen(true);
  }

  async function save() {
    if (!profile) return;
    if (editing) {
      const { password: _password, worksiteIds: _worksiteIds, ...profileFields } = form;
      await supabase.from('travel_app_profiles').update({
        ...profileFields,
        updated_at: new Date().toISOString(),
      }).eq('id', editing.id);
    } else {
      const token = await getAccessToken();
      if (!token) {
        alert('Sua sessão expirou. Entre novamente.');
        return;
      }
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        alert(result.error ?? 'Não foi possível criar o usuário.');
        return;
      }
    }
    setOpen(false);
    load();
  }

  async function toggle(u: Profile) {
    await supabase.from('travel_app_profiles').update({ active: !u.active, updated_at: new Date().toISOString() }).eq('id', u.id);
    load();
  }

  async function remove(u: Profile) {
    if (!confirm(`Excluir usuário ${u.full_name}? Esta ação não pode ser desfeita.`)) return;
    const token = await getAccessToken();
    if (!token) return alert('Sua sessão expirou. Entre novamente.');
    const response = await fetch(`/api/admin/users?id=${encodeURIComponent(u.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok) return alert(result.error ?? 'Não foi possível excluir o usuário.');
    load();
  }

  async function openLink(u: Profile) {
    const { data } = await supabase.from('travel_app_user_worksites').select('worksite_id').eq('user_id', u.id);
    setLinkIds((data ?? []).map((d: any) => d.worksite_id));
    setLinkOpen(u);
  }

  async function saveLinks() {
    if (!linkOpen) return;
    await supabase.from('travel_app_user_worksites').delete().eq('user_id', linkOpen.id);
    if (linkIds.length) {
      await supabase.from('travel_app_user_worksites').insert(linkIds.map((id) => ({ user_id: linkOpen.id, worksite_id: id })));
    }
    setLinkOpen(null);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500">{rows.length} cadastrados</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo usuário</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="Nenhum usuário" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((u) => (
            <Card key={u.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                    <p className="text-xs text-gray-500">{ROLE_LABELS[u.role]} · {u.position ?? '—'}</p>
                  </div>
                  <Badge className={u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}>{u.active ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => openLink(u)}><Link2 className="h-3.5 w-3.5" /> Obras</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(u)}><Power className="h-3.5 w-3.5" /> {u.active ? 'Inativar' : 'Ativar'}</Button>
                  {isSuperAdmin && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(u)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar usuário' : 'Novo usuário'}
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        <div className="space-y-3">
          <Field label="Nome completo" required><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="E-mail" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} /></Field>
          {!editing && <Field label="Senha temporária" required><Input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo de 8 caracteres" /></Field>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Matrícula"><Input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
            <Field label="Perfil"><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} disabled={!isSuperAdmin}>
              <option value="solicitante">Solicitante</option>
              <option value="gestao_viagens">Gestão de Viagens</option>
              {isSuperAdmin && <option value="super_admin">Super Administrador</option>}
            </Select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Estado"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>

      <Modal open={!!linkOpen} onClose={() => setLinkOpen(null)} title={`Vincular obras — ${linkOpen?.full_name ?? ''}`}
        footer={<><Button variant="outline" onClick={() => setLinkOpen(null)}>Cancelar</Button><Button onClick={saveLinks}>Salvar</Button></>}>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {worksites.map((w) => {
            const sel = linkIds.includes(w.id);
            return (
              <button key={w.id} onClick={() => setLinkIds(sel ? linkIds.filter((i) => i !== w.id) : [...linkIds, w.id])}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left ${sel ? 'bg-[#004883]/5 border border-[#004883]/30' : 'hover:bg-gray-50 border border-transparent'}`}>
                <span className="text-sm text-gray-900">{w.name}</span>
                <span className={`h-4 w-4 rounded-full border ${sel ? 'bg-[#004883] border-[#004883]' : 'border-gray-300'}`} />
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
