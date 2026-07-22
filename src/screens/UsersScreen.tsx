import { useEffect, useState } from 'react';
import { Plus, Users, Pencil, Power, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
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
  const [saving, setSaving] = useState(false);

  async function load() {
    const [p, w] = await Promise.all([
      supabase.from('travel_app_profiles').select('*').order('full_name'),
      supabase.from('travel_app_worksites').select('*').eq('active', true).order('name'),
    ]);
    let profiles = (p.data ?? []) as Profile[];
    if (!isSuperAdmin) profiles = profiles.filter((u) => u.role !== 'super_admin');
    setRows(profiles);
    setWorksites((w.data ?? []) as Worksite[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [isSuperAdmin]);

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
    const refreshed = await supabase.auth.refreshSession();
    return refreshed.data.session?.access_token ?? null;
  }

  async function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  async function openEdit(u: Profile) {
    const { data } = await supabase.from('travel_app_user_worksites').select('worksite_id').eq('user_id', u.id);
    setEditing(u);
    setForm({ full_name: u.full_name, registration: u.registration ?? '', email: u.email, password: '', phone: u.phone ?? '', position: u.position ?? '', city: u.city ?? '', state: u.state ?? '', role: u.role, worksiteIds: (data ?? []).map((x: any) => x.worksite_id) });
    setOpen(true);
  }

  function toggleWorksite(id: string) {
    setForm((f) => ({ ...f, worksiteIds: f.worksiteIds.includes(id) ? f.worksiteIds.filter((x) => x !== id) : [...f.worksiteIds, id] }));
  }

  async function save() {
    if (!profile || !form.full_name || !form.email || (!editing && !form.password)) return;
    setSaving(true);
    try {
      if (editing) {
        const { password: _p, worksiteIds, ...fields } = form;
        const { error } = await supabase.from('travel_app_profiles').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', editing.id);
        if (error) throw error;
        await supabase.from('travel_app_user_worksites').delete().eq('user_id', editing.id);
        if (worksiteIds.length) await supabase.from('travel_app_user_worksites').insert(worksiteIds.map((worksite_id) => ({ user_id: editing.id, worksite_id })));
      } else {
        const token = await getAccessToken();
        if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
        const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Não foi possível criar o usuário.');
      }
      setOpen(false);
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function toggle(u: Profile) {
    await supabase.from('travel_app_profiles').update({ active: !u.active, updated_at: new Date().toISOString() }).eq('id', u.id);
    load();
  }

  async function remove(u: Profile) {
    if (!confirm(`Excluir ${u.full_name} somente do sistema de Viagens?`)) return;
    const token = await getAccessToken();
    if (!token) return alert('Sua sessão expirou.');
    const response = await fetch(`/api/admin/users?id=${encodeURIComponent(u.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) return alert(result.error ?? 'Não foi possível excluir.');
    load();
  }

  if (loading) return <PageLoader />;

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h1 className="text-lg font-semibold">Usuários</h1><p className="text-sm text-gray-500">{rows.length} cadastrados no sistema de Viagens</p></div>
      <Button onClick={openNew}><Plus className="h-4 w-4"/>Novo usuário</Button>
    </div>
    {rows.length === 0 ? <EmptyState icon={<Users className="h-8 w-8"/>} title="Nenhum usuário cadastrado"/> :
      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="hidden md:grid grid-cols-[1.3fr_1.4fr_1fr_.8fr_auto] gap-3 px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50"><span>Nome</span><span>E-mail</span><span>Perfil</span><span>Status</span><span>Ações</span></div>
        {rows.map((u) => <div key={u.id} className="grid md:grid-cols-[1.3fr_1.4fr_1fr_.8fr_auto] gap-2 md:gap-3 items-center px-4 py-3 border-t first:border-t-0">
          <div><p className="font-medium text-gray-900">{u.full_name}</p><p className="text-xs text-gray-500 md:hidden">{u.position ?? '—'}</p></div>
          <p className="text-sm text-gray-600 truncate">{u.email}</p>
          <p className="text-sm text-gray-700">{ROLE_LABELS[u.role]}</p>
          <Badge className={u.active ? 'bg-emerald-100 text-emerald-800 w-fit' : 'bg-gray-100 text-gray-600 w-fit'}>{u.active ? 'Ativo' : 'Inativo'}</Badge>
          <div className="flex gap-1 justify-start md:justify-end"><Button size="sm" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-4 w-4"/></Button><Button size="sm" variant="ghost" onClick={() => toggle(u)}><Power className="h-4 w-4"/></Button>{isSuperAdmin && u.id !== profile?.id && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(u)}><Trash2 className="h-4 w-4"/></Button>}</div>
        </div>)}
      </div>}

    <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar usuário' : 'Novo usuário'} footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} loading={saving}>Salvar</Button></>}>
      <div className="space-y-3">
        <Field label="Nome completo" required><Input value={form.full_name} onChange={(e)=>setForm({...form,full_name:e.target.value})}/></Field>
        <Field label="E-mail" required><Input type="email" value={form.email} disabled={!!editing} onChange={(e)=>setForm({...form,email:e.target.value})}/></Field>
        {!editing && <Field label="Senha temporária" required><Input type="password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/></Field>}
        <div className="grid sm:grid-cols-2 gap-3"><Field label="Matrícula"><Input value={form.registration} onChange={(e)=>setForm({...form,registration:e.target.value})}/></Field><Field label="Telefone"><Input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/></Field><Field label="Cargo"><Input value={form.position} onChange={(e)=>setForm({...form,position:e.target.value})}/></Field><Field label="Perfil"><Select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value as Role})}><option value="solicitante">Solicitante</option><option value="gestao_viagens">Gestão de Viagens</option>{isSuperAdmin && <option value="super_admin">Super Administrador</option>}</Select></Field><Field label="Cidade"><Input value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})}/></Field><Field label="Estado"><Input maxLength={2} value={form.state} onChange={(e)=>setForm({...form,state:e.target.value.toUpperCase()})}/></Field></div>
        <div><p className="text-sm font-medium text-gray-700 mb-2">Obras que este usuário pode solicitar</p><div className="max-h-44 overflow-auto rounded-xl border divide-y">{worksites.length ? worksites.map((w)=><label key={w.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"><input type="checkbox" checked={form.worksiteIds.includes(w.id)} onChange={()=>toggleWorksite(w.id)}/><span className="text-sm"><b>{w.name}</b><span className="text-gray-500"> · {w.city ?? '—'}/{w.state ?? '—'}</span></span></label>) : <p className="p-3 text-sm text-gray-500">Cadastre uma obra primeiro.</p>}</div></div>
      </div>
    </Modal>
  </div>;
}
