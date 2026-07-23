import type { Role } from '@/lib/types';
import {
  Home,
  PlusCircle,
  ListChecks,
  HelpCircle,
  User,
  Inbox,
  Users,
  Building2,
  ShieldCheck,
  Settings,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: typeof Home;
  roles: Role[];
  mobile?: boolean;
}

/**
 * Menu propositalmente enxuto: cadastrar, solicitar, acompanhar e comprar.
 * Relatórios, auditoria e configurações técnicas não ficam expostos na rotina diária.
 */
export const NAV_ITEMS: NavItem[] = [
  // Solicitante
  { id: 'home', label: 'Início', shortLabel: 'Início', icon: Home, roles: ['solicitante'], mobile: true },
  { id: 'new-request', label: 'Solicitar viagem', shortLabel: 'Solicitar', icon: PlusCircle, roles: ['solicitante'], mobile: true },
  { id: 'my-requests', label: 'Acompanhar pedidos', shortLabel: 'Acompanhar', icon: ListChecks, roles: ['solicitante'], mobile: true },
  { id: 'policy', label: 'Política e ajuda', shortLabel: 'Ajuda', icon: HelpCircle, roles: ['solicitante'], mobile: true },
  { id: 'profile', label: 'Meu perfil', icon: User, roles: ['solicitante'] },

  // Gestão de Viagens
  { id: 'queue', label: 'Triagem e compras', shortLabel: 'Triagem', icon: Inbox, roles: ['gestao_viagens'], mobile: true },
  { id: 'new-request', label: 'Solicitar viagem', shortLabel: 'Solicitar', icon: PlusCircle, roles: ['gestao_viagens'], mobile: true },
  { id: 'my-requests', label: 'Meus pedidos', shortLabel: 'Pedidos', icon: ListChecks, roles: ['gestao_viagens'], mobile: true },
  { id: 'users', label: 'Cadastrar usuários', shortLabel: 'Usuários', icon: Users, roles: ['gestao_viagens'], mobile: true },
  { id: 'worksites', label: 'Cadastrar obras', icon: Building2, roles: ['gestao_viagens'] },
  { id: 'policy', label: 'Política e ajuda', icon: HelpCircle, roles: ['gestao_viagens'] },

  // Super Administrador
  { id: 'overview', label: 'Acompanhamento', shortLabel: 'Visão geral', icon: Home, roles: ['super_admin'], mobile: true },
  { id: 'all-requests', label: 'Triagem e compras', shortLabel: 'Triagem', icon: Inbox, roles: ['super_admin'], mobile: true },
  { id: 'new-request', label: 'Solicitar viagem', shortLabel: 'Solicitar', icon: PlusCircle, roles: ['super_admin'], mobile: true },
  { id: 'users', label: 'Cadastrar usuários', shortLabel: 'Usuários', icon: Users, roles: ['super_admin'], mobile: true },
  { id: 'worksites', label: 'Cadastrar obras', shortLabel: 'Obras', icon: Building2, roles: ['super_admin'] },
  { id: 'policy', label: 'Política e ajuda', icon: HelpCircle, roles: ['super_admin'] },
];

export const ROLE_LABELS: Record<Role, string> = {
  solicitante: 'Solicitante',
  gestao_viagens: 'Gestão de Viagens',
  super_admin: 'Super Administrador',
};

export const ROLE_ICONS: Record<Role, typeof Home> = {
  solicitante: User,
  gestao_viagens: ShieldCheck,
  super_admin: Settings,
};
