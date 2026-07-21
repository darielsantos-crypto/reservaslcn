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
  Truck,
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
  { id: 'home', label: 'Início', icon: Home, roles: ['solicitante'] },
  { id: 'new-request', label: 'Nova solicitação', icon: PlusCircle, roles: ['solicitante'] },
  { id: 'my-requests', label: 'Minhas solicitações', icon: ListChecks, roles: ['solicitante'] },
  { id: 'upcoming', label: 'Próximas viagens', icon: CalendarClock, roles: ['solicitante'] },
  { id: 'policy', label: 'Política e ajuda', icon: HelpCircle, roles: ['solicitante', 'gestao_viagens'] },
  { id: 'profile', label: 'Meu perfil', icon: User, roles: ['solicitante'] },

  { id: 'panel', label: 'Painel', icon: LayoutDashboard, roles: ['gestao_viagens'] },
  { id: 'queue', label: 'Solicitações', icon: Inbox, roles: ['gestao_viagens'] },
  { id: 'waiting', label: 'Aguardando atendimento', icon: Clock, roles: ['gestao_viagens'] },
  { id: 'attendance', label: 'Em atendimento', icon: ListChecks, roles: ['gestao_viagens'] },
  { id: 'purchases', label: 'Compras realizadas', icon: ShoppingCart, roles: ['gestao_viagens'] },
  { id: 'upcoming', label: 'Próximas viagens', icon: CalendarClock, roles: ['gestao_viagens'] },
  { id: 'travelers', label: 'Colaboradores', icon: Users, roles: ['gestao_viagens', 'super_admin'] },
  { id: 'users', label: 'Usuários', icon: Users, roles: ['gestao_viagens', 'super_admin'] },
  { id: 'worksites', label: 'Obras', icon: Building2, roles: ['gestao_viagens', 'super_admin'] },
  { id: 'suppliers', label: 'Fornecedores', icon: Truck, roles: ['gestao_viagens', 'super_admin'] },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, roles: ['gestao_viagens', 'super_admin'] },

  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard, roles: ['super_admin'] },
  { id: 'all-requests', label: 'Todas as solicitações', icon: ListChecks, roles: ['super_admin'] },
  { id: 'rules', label: 'Regras e prazos', icon: Clock, roles: ['super_admin'] },
  { id: 'purposes', label: 'Finalidades', icon: Tag, roles: ['super_admin'] },
  { id: 'faq-admin', label: 'Perguntas frequentes', icon: HelpCircle, roles: ['super_admin'] },
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
