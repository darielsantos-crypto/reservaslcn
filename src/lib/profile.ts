import type { Profile, Role } from './types';

type RawProfile = Record<string, unknown>;

export function normalizeRole(value: unknown): Role {
  const role = String(value ?? '').toLowerCase();
  if (role === 'superadmin' || role === 'super_admin' || role === 'admin') return 'super_admin';
  if (role === 'gestor' || role === 'gestao' || role === 'gestao_viagens') return 'gestao_viagens';
  return 'solicitante';
}

export function normalizeProfile(raw: RawProfile | null | undefined): Profile | null {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    full_name: String(raw.full_name ?? raw.name ?? raw.login ?? raw.email ?? 'Usuário'),
    registration: (raw.registration ?? raw.matricula ?? null) as string | null,
    email: String(raw.email ?? ''),
    phone: (raw.phone ?? null) as string | null,
    position: (raw.position ?? raw.job_title ?? null) as string | null,
    city: (raw.city ?? null) as string | null,
    state: (raw.state ?? null) as string | null,
    role: normalizeRole(raw.role),
    active: raw.active !== false,
    created_by: (raw.created_by ?? null) as string | null,
    created_at: String(raw.created_at ?? new Date(0).toISOString()),
    updated_at: String(raw.updated_at ?? raw.created_at ?? new Date(0).toISOString()),
  };
}
