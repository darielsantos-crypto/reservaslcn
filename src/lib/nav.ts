import type { Role } from '@/lib/types';
import {
  Home,
  PlusCircle,
  ListChecks,
  CalendarClock,
  HelpCircle,
  User,
  LayoutDashboard,
  Inbox,
  ShoppingCart,
  Users,
  Building2,
  BarChart3,
  Settings,
  ShieldCheck,
  Clock,
  Tag,
  ScrollText,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  // Solicitante: somente o necessário para pedir e acompanhar.
  { id: 'home', label: 'Início', icon: Home, roles: ['solicitante'] },
  { id: 'new-request', label: 'Nova solicitação', icon: PlusCircle, roles: ['solicitante'] },
  { id: 'my-requests', label: 'Minhas solicitações', icon: ListChecks, roles: ['solicitante'] },
  { id: 'upcoming', label: 'Próximas viagens', icon: CalendarClock, roles: ['solicitante'] },
  { id: 'policy', label: 'Política e ajuda', icon: HelpCircle, roles: ['solicitante'] },
  { id: 'profile', label: 'Meu perfil', icon: User, roles: ['solicitante'] },

  // Gestão de Viagens: uma fila única, sem menus repetidos por status.
  { id: 'panel', label: 'Painel', icon: LayoutDashboard, roles: ['gestao_viagens'] },
  { id: 'new-request', label: 'Nova solicitação', icon: PlusCircle, roles: ['gestao_viagens'] },
  { id: 'my-requests', label: 'Minhas solicitações', icon: ListChecks, roles: ['gestao_viagens'] },
  { id: 'queue', label: 'Solicitações', icon: Inbox, roles: ['gestao_viagens'] },
  { id: 'upcoming', label: 'Próximas viagens', icon: CalendarClock, roles: ['gestao_viagens'] },
  { id: 'users', label: 'Usuários', icon: Users, roles: ['gestao_viagens'] },
  { id: 'worksites', label: 'Obras', icon: Building2, roles: ['gestao_viagens'] },
  { id: 'policy', label: 'Política e ajuda', icon: HelpCircle, roles: ['gestao_viagens'] },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, roles: ['gestao_viagens'] },

  // Super Admin: visão completa, porém com menu enxuto.
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard, roles: ['super_admin'] },
  { id: 'all-requests', label: 'Solicitações', icon: ListChecks, roles: ['super_admin'] },
  { id: 'worksites', label: 'Obras', icon: Building2, roles: ['super_admin'] },
  { id: 'users', label: 'Usuários', icon: Users, roles: ['super_admin'] },
  { id: 'rules', label: 'Regras e prazos', icon: Clock, roles: ['super_admin'] },
  { id: 'policy', label: 'Política e ajuda', icon: HelpCircle, roles: ['super_admin'] },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, roles: ['super_admin'] },
  { id: 'audit', label: 'Auditoria', icon: ScrollText, roles: ['super_admin'] },
  { id: 'settings', label: 'Configurações', icon: Settings, roles: ['super_admin'] },
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
