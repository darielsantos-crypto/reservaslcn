/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import {
  Check,
  ClipboardCheck,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, PageLoader } from '@/components/ui/Feedback';
import { ROLE_LABELS } from '@/lib/nav';
import type { AccessRequest, Profile, Role, Worksite } from '@/lib/types';

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
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [sourceRequest, setSourceRequest] = useState<AccessRequest | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  async function getAccessToken() {
    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.data.session?.access_token) return sessionResult.data.session.access_token;
    const refreshed = await supabase.auth.refreshSession();
    return refreshed.data.session?.access_token ?? null;
  }

  async function loadPendingRequests() {
    const token = await getAccessToken();
    if (!token) return [] as AccessRequest[];
    const response = await fetch('/api/access-requests?status=pendente', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json() as { items?: AccessRequest[]; error?: string };
    if (!response.ok) {
      console.error(result.error || 'Não foi possível carregar as solicitações de acesso.');
      return [] as AccessRequest[];
    }
    return result.items ?? [];
  }

  async function load() {
    const [profilesResult, worksitesResult, accessRequests] = await Promise.all([
      supabase.from('travel_app_profiles').select('*').order('full_name'),
      supabase.from('travel_app_worksites').select('*').eq('active', true).order('name'),
      loadPendingRequests(),
    ]);
    if (profilesResult.error) console.error(profilesResult.error);
    if (worksitesResult.error) console.error(worksitesResult.error);

    let profiles = (profilesResult.data ?? []) as Profile[];
    if (!isSuperAdmin) profiles = profiles.filter((user) => user.role !== 'super_admin');
    setRows(profiles);
    setWorksites((worksitesResult.data ?? []) as Worksite[]);
    setPendingRequests(accessRequests);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [isSuperAdmin]);

  function openNew() {
    setEditing(null);
    setSourceRequest(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openFromRequest(request: AccessRequest) {
    const matchingWorksites = worksites
      .filter((worksite) => {
        const sameName = worksite.name.trim().toLowerCase() === request.worksite_name.trim().toLowerCase();
        const sameCostCenter = request.cost_center && worksite.cost_center?.trim().toLowerCase() === request.cost_center.trim().toLowerCase();
        return sameName || Boolean(sameCostCenter);
      })
      .map((worksite) => worksite.id);

    setEditing(null);
    setSourceRequest(request);
    setForm({
      full_name: request.requester_name,
      registration: request.registration ?? '',
      email: request.email,
      password: '',
      phone: request.phone ?? '',
      position: request.position ?? '',
      city: request.city,
      state: request.state,
      role: 'solicitante',
      worksiteIds: matchingWorksites,
    });
    setOpen(true);
  }

  async function openEdit(user: Profile) {
    const { data } = await supabase
      .from('travel_app_user_worksites')
      .select('worksite_id')
      .eq('user_id', user.id);
    const worksiteIds = (data ?? []).map((item: { worksite_id: string }) => item.worksite_id);
    setSourceRequest(null);
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

  async function updateAccessRequest(id: string, action: 'aprovar' | 'rejeitar') {
    const token = await getAccessToken();
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    const response = await fetch('/api/access-requests', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, action }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar a solicitação.');
  }

  async function save() {
    if (!profile || !form.full_name.trim() || !form.email.trim() || (!editing && !form.password)) return;
    if (!editing && form.worksiteIds.length === 0) {
      alert('Selecione ao menos uma obra permitida para este usuário.');
      return;
    }

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
        if (sourceRequest) await updateAccessRequest(sourceRequest.id, 'aprovar');
      }

      setOpen(false);
      setSourceRequest(null);
      await load();
    } catch (saveError) {
      alert(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  }

  async function rejectRequest(request: AccessRequest) {
    if (!confirm(`Rejeitar a solicitação de acesso de ${request.requester_name}?`)) return;
    setReviewingId(request.id);
    try {
      await updateAccessRequest(request.id, 'rejeitar');
      await load();
    } catch (reviewError) {
      alert(reviewError instanceof Error ? reviewError.message : 'Não foi possível rejeitar a solicitação.');
    } finally {
      setReviewingId(null);
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
    <div className="space-y-5">
      <div className="page-title-row flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Usuários e acessos</h1>
          <p className="text-sm text-gray-500">Cadastre solicitantes e defina quais obras cada pessoa poderá usar.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo usuário</Button>
      </div>

      {pendingRequests.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-700" />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Solicitações de acesso</h2>
                <p className="text-xs text-gray-600">Pedidos enviados pela tela de login aguardando análise.</p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-800">{pendingRequests.length} pendente{pendingRequests.length > 1 ? 's' : ''}</Badge>
          </div>

          <div className="divide-y divide-gray-100">
            {pendingRequests.map((request) => (
              <div key={request.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{request.requester_name}</p>
                  <p className="truncate text-sm text-gray-600">{request.email}{request.registration ? ` · Matrícula ${request.registration}` : ''}</p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium text-gray-800">{request.worksite_name}</p>
                  <p className="truncate text-gray-500">CC {request.cost_center || 'não informado'}</p>
                </div>
                <div className="text-sm text-gray-600">
                  <p>{request.city}/{request.state}</p>
                  <p className="truncate text-gray-500">{request.position || 'Cargo não informado'}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button size="sm" onClick={() => openFromRequest(request)}>
                    <Check className="h-4 w-4" /> Preparar cadastro
                  </Button>
                  <Button size="sm" variant="outline" disabled={reviewingId === request.id} onClick={() => void rejectRequest(request)}>
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
        title={editing ? 'Editar usuário' : sourceRequest ? 'Concluir solicitação de acesso' : 'Novo usuário'}
        size="lg"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button loading={saving} disabled={!form.full_name.trim() || !form.email.trim() || (!editing && (!form.password || form.worksiteIds.length === 0))} onClick={save}>Salvar</Button></>}
      >
        <div className="space-y-4">
          {sourceRequest && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Os dados foram preenchidos a partir da solicitação de acesso para <b>{sourceRequest.worksite_name}</b>. Defina o perfil, a senha temporária e selecione a obra permitida.
            </div>
          )}

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
            <p className="mb-2 text-sm font-medium text-gray-700">Obras permitidas para este usuário <span className="text-red-600">*</span></p>
            <div className="max-h-56 overflow-y-auto rounded-xl border bg-white">
              {worksites.length ? worksites.map((worksite) => (
                <label key={worksite.id} className="flex cursor-pointer items-start gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-gray-50">
                  <input className="mt-1" type="checkbox" checked={form.worksiteIds.includes(worksite.id)} onChange={() => toggleWorksite(worksite.id)} />
                  <span className="text-sm"><b>{worksite.name}</b><span className="text-gray-500"> · {worksite.city || '—'}/{worksite.state || '—'} · CC {worksite.cost_center || '—'}</span></span>
                </label>
              )) : <p className="p-4 text-sm text-gray-500">Cadastre uma obra antes de concluir o acesso deste usuário.</p>}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
