/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { Pencil, Plus, Power, Search, Trash2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, PageLoader } from '@/components/ui/Feedback';
import { ROLE_LABELS } from '@/lib/nav';
import type { Profile, Role, Worksite } from '@/lib/types';

type UserForm = {
  full_name: string;
  registration: string;
  email: string;
  password: string;
  phone: string;
  position: string;
  city: string;
  state: string;
  role: Role;
  worksiteIds: string[];
};

const EMPTY_FORM: UserForm = {
  full_name: '',
  registration: '',
  email: '',
  password: '',
  phone: '',
  position: '',
  city: '',
  state: '',
  role: 'solicitante',
  worksiteIds: [],
};

export function UsersScreen() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  const [rows, setRows] = useState<Profile[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    const [profilesResult, worksitesResult] = await Promise.all([
      supabase.from('travel_app_profiles').select('*').order('full_name'),
      supabase.from('travel_app_worksites').select('*').eq('active', true).order('name'),
    ]);
    if (profilesResult.error) console.error(profilesResult.error);
    if (worksitesResult.error) console.error(worksitesResult.error);

    let profiles = (profilesResult.data ?? []) as Profile[];
    if (!isSuperAdmin) profiles = profiles.filter((user) => user.role !== 'super_admin');
    setRows(profiles);
    setWorksites((worksitesResult.data ?? []) as Worksite[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [isSuperAdmin]);

  async function getAccessToken() {
    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.data.session?.access_token) return sessionResult.data.session.access_token;
    const refreshed = await supabase.auth.refreshSession();
    return refreshed.data.session?.access_token ?? null;
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  async function openEdit(user: Profile) {
    const { data } = await supabase
      .from('travel_app_user_worksites')
      .select('worksite_id')
      .eq('user_id', user.id);
    const worksiteIds = (data ?? []).map((item: { worksite_id: string }) => item.worksite_id);
    setEditing(user);
    setForm({
      full_name: user.full_name,
      registration: user.registration ?? '',
      email: user.email,
      password: '',
      phone: user.phone ?? '',
      position: user.position ?? '',
      city: user.city ?? '',
      state: user.state ?? '',
      role: user.role,
      worksiteIds,
    });
    setOpen(true);
  }

  function toggleWorksite(id: string) {
    setForm((current) => ({
      ...current,
      worksiteIds: current.worksiteIds.includes(id)
        ? current.worksiteIds.filter((worksiteId) => worksiteId !== id)
        : [...current.worksiteIds, id],
    }));
  }

  async function save() {
    if (!profile || !form.full_name.trim() || !form.email.trim() || (!editing && !form.password)) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('travel_app_profiles').update({
          full_name: form.full_name.trim(),
          registration: form.registration.trim() || null,
          phone: form.phone.trim() || null,
          position: form.position.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim().toUpperCase() || null,
          role: form.role,
          updated_at: new Date().toISOString(),
        }).eq('id', editing.id);
        if (error) throw error;

        const { error: deleteError } = await supabase.from('travel_app_user_worksites').delete().eq('user_id', editing.id);
        if (deleteError) throw deleteError;
        if (form.worksiteIds.length) {
          const { error: linkError } = await supabase.from('travel_app_user_worksites').insert(
            form.worksiteIds.map((worksite_id) => ({ user_id: editing.id, worksite_id })),
          );
          if (linkError) throw linkError;
        }
      } else {
        const token = await getAccessToken();
        if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...form,
            email: form.email.trim().toLowerCase(),
            full_name: form.full_name.trim(),
            state: form.state.trim().toUpperCase(),
          }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Não foi possível criar o usuário.');
      }

      setOpen(false);
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(user: Profile) {
    const { error } = await supabase.from('travel_app_profiles').update({
      active: !user.active,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    if (error) return alert(error.message);
    await load();
  }

  async function remove(user: Profile) {
    if (!confirm(`Excluir ${user.full_name} do sistema de Viagens?`)) return;
    const token = await getAccessToken();
    if (!token) return alert('Sua sessão expirou.');
    const response = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) return alert(result.error ?? 'Não foi possível excluir.');
    await load();
  }

  if (loading) return <PageLoader />;

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = rows.filter((user) => !normalizedSearch || [
    user.full_name,
    user.email,
    user.registration,
    user.position,
  ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch));

  return (
    <div className="space-y-4">
      <div className="page-title-row flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Usuários</h1>
          <p className="text-sm text-gray-500">Defina quem solicita e quais obras cada pessoa pode usar.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo usuário</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, e-mail, matrícula ou cargo" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="Nenhum usuário encontrado" />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="hidden grid-cols-[1.3fr_1.4fr_1fr_.7fr_auto] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
            <span>Nome</span><span>E-mail</span><span>Perfil</span><span>Status</span><span className="text-right">Ações</span>
          </div>
          {filtered.map((user) => (
            <div key={user.id} className="grid gap-2 border-t px-4 py-3 first:border-t-0 md:grid-cols-[1.3fr_1.4fr_1fr_.7fr_auto] md:items-center md:gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.registration || 'Sem matrícula'}{user.position ? ` · ${user.position}` : ''}</p>
              </div>
              <p className="truncate text-sm text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-700">{ROLE_LABELS[user.role]}</p>
              <Badge className={user.active ? 'w-fit bg-emerald-100 text-emerald-800' : 'w-fit bg-gray-100 text-gray-600'}>{user.active ? 'Ativo' : 'Inativo'}</Badge>
              <div className="flex gap-1 md:justify-end">
                <Button size="sm" variant="ghost" onClick={() => openEdit(user)}><Pencil className="h-4 w-4" /><span className="md:hidden">Editar</span></Button>
                <Button size="sm" variant="ghost" onClick={() => toggle(user)}><Power className="h-4 w-4" /><span className="md:hidden">{user.active ? 'Inativar' : 'Ativar'}</span></Button>
                {isSuperAdmin && user.id !== profile?.id && (
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(user)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar usuário' : 'Novo usuário'}
        size="lg"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button loading={saving} disabled={!form.full_name.trim() || !form.email.trim() || (!editing && !form.password)} onClick={save}>Salvar</Button></>}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Nome completo" required><Input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></Field></div>
            <Field label="E-mail" required><Input type="email" value={form.email} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            {!editing && <Field label="Senha temporária" required><Input type="password" minLength={6} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>}
            <Field label="Matrícula"><Input value={form.registration} onChange={(event) => setForm({ ...form, registration: event.target.value })} /></Field>
            <Field label="Telefone"><Input inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="Cargo"><Input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} /></Field>
            <Field label="Perfil">
              <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
                <option value="solicitante">Solicitante</option>
                <option value="gestao_viagens">Gestão de Viagens</option>
                {isSuperAdmin && <option value="super_admin">Super Administrador</option>}
              </Select>
            </Field>
            <Field label="Cidade"><Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
            <Field label="Estado"><Input maxLength={2} value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase() })} /></Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Obras permitidas para este usuário</p>
            <div className="max-h-56 overflow-y-auto rounded-xl border bg-white">
              {worksites.length ? worksites.map((worksite) => (
                <label key={worksite.id} className="flex cursor-pointer items-start gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-gray-50">
                  <input className="mt-1" type="checkbox" checked={form.worksiteIds.includes(worksite.id)} onChange={() => toggleWorksite(worksite.id)} />
                  <span className="text-sm"><b>{worksite.name}</b><span className="text-gray-500"> · {worksite.city || '—'}/{worksite.state || '—'} · CC {worksite.cost_center || '—'}</span></span>
                </label>
              )) : <p className="p-4 text-sm text-gray-500">Cadastre uma obra antes de vincular o usuário.</p>}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
