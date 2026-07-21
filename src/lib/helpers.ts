import type { DeadlineStatus, PolicyRule, RequestType } from './types';

export function formatDateBR(date: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTimeBR(date: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(date: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'ontem';
  if (diffD < 30) return `há ${diffD} dias`;
  return formatDateBR(date);
}

export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysUntil(target: string): number {
  return daysBetween(new Date().toISOString().slice(0, 10), target);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(0, daysBetween(checkIn, checkOut));
}

export interface DeadlineInput {
  purpose: string;
  international: boolean;
  is_emergency: boolean;
  departureDate: string | null;
  internalRequestedBy?: string | null;
}

export function resolveMinDays(
  input: DeadlineInput,
  rules: PolicyRule[]
): number {
  if (input.is_emergency) return 0;
  const get = (key: string) => rules.find((r) => r.rule_key === key)?.min_days;
  if (input.international) {
    if (input.purpose === 'viagem_diretoria') {
      return get('diretoria_gerencias_internacional') ?? 30;
    }
    return get('internacional') ?? 60;
  }
  if (
    input.purpose === 'baixada' ||
    input.purpose === 'admissao_mobilizacao' ||
    input.purpose === 'retorno_baixada' ||
    input.purpose === 'transferencia_obras'
  ) {
    return get('baixada_admissao_retorno_transferencia') ?? 30;
  }
  if (input.purpose === 'viagem_diretoria') {
    return get('diretoria_gerencias_nacional') ?? 15;
  }
  return get('demais_nacionais') ?? 30;
}

export function computeDeadlineStatus(
  actualDays: number,
  minDays: number
): DeadlineStatus {
  if (minDays === 0) return 'dentro';
  if (actualDays < minDays) return 'fora';
  if (actualDays - minDays <= 5) return 'proximo';
  return 'dentro';
}

export function generateRequestNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const seq = Math.floor(Math.random() * 90000) + 10000;
  return `LV-${y}-${seq}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function requestTypeLabel(type: RequestType): string {
  switch (type) {
    case 'passagem':
      return 'Passagem';
    case 'hospedagem':
      return 'Hospedagem';
    case 'passagem_hospedagem':
      return 'Passagem + hospedagem';
  }
}
