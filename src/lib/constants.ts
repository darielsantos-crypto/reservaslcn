import type { RequestStatus, DeadlineStatus } from './types';

export const BRAND = {
  primary: '#004883',
  navy: '#002b52',
  white: '#ffffff',
  lightGray: '#f5f7fa',
  red: '#dc2626',
};

export const PURPOSES = [
  'baixada',
  'retorno_baixada',
  'admissao_mobilizacao',
  'transferencia_obras',
  'desmobilizacao',
  'visita_tecnica',
  'apoio_operacional',
  'reuniao',
  'treinamento',
  'curso',
  'feira',
  'congresso',
  'workshop',
  'evento_institucional',
  'atendimento_emergencial',
  'viagem_diretoria',
  'outros',
] as const;

export const PURPOSE_LABELS: Record<string, string> = {
  baixada: 'Baixada',
  retorno_baixada: 'Retorno de baixada',
  admissao_mobilizacao: 'Admissão ou mobilização',
  transferencia_obras: 'Transferência entre obras',
  desmobilizacao: 'Desmobilização',
  visita_tecnica: 'Visita técnica',
  apoio_operacional: 'Apoio operacional',
  reuniao: 'Reunião',
  treinamento: 'Treinamento',
  curso: 'Curso',
  feira: 'Feira',
  congresso: 'Congresso',
  workshop: 'Workshop',
  evento_institucional: 'Evento institucional',
  atendimento_emergencial: 'Atendimento emergencial',
  viagem_diretoria: 'Viagem da Diretoria',
  outros: 'Outros',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  aguardando_atendimento: 'Aguardando atendimento',
  em_analise: 'Em análise',
  aguardando_informacoes: 'Aguardando informações',
  em_orcamento: 'Em orçamento',
  em_negociacao: 'Em negociação',
  em_compra: 'Em compra',
  compra_realizada: 'Compra realizada',
  finalizada: 'Finalizada',
  nao_atendida: 'Não atendida',
  cancelada: 'Cancelada',
};

export const STATUS_STYLES: Record<RequestStatus, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviada: 'bg-blue-100 text-blue-800',
  aguardando_atendimento: 'bg-amber-100 text-amber-800',
  em_analise: 'bg-blue-100 text-blue-800',
  aguardando_informacoes: 'bg-amber-100 text-amber-800',
  em_orcamento: 'bg-blue-100 text-blue-800',
  em_negociacao: 'bg-blue-100 text-blue-800',
  em_compra: 'bg-blue-100 text-blue-800',
  compra_realizada: 'bg-emerald-100 text-emerald-800',
  finalizada: 'bg-gray-200 text-gray-700',
  nao_atendida: 'bg-red-100 text-red-800',
  cancelada: 'bg-red-100 text-red-800',
};

export const DEADLINE_LABELS: Record<DeadlineStatus, string> = {
  dentro: 'Dentro do prazo',
  proximo: 'Próximo do limite',
  fora: 'Fora do prazo',
};

export const DEADLINE_STYLES: Record<DeadlineStatus, string> = {
  dentro: 'bg-emerald-100 text-emerald-800',
  proximo: 'bg-amber-100 text-amber-800',
  fora: 'bg-red-100 text-red-800',
};

export const DEADLINE_DOTS: Record<DeadlineStatus, string> = {
  dentro: 'bg-emerald-500',
  proximo: 'bg-amber-500',
  fora: 'bg-red-500',
};

export const NOT_ATTENDED_REASONS = [
  'dados_insuficientes',
  'solicitacao_duplicada',
  'viagem_cancelada',
  'impossibilidade_atendimento',
  'orientacao_alteracao_data',
  'falta_autorizacao_previa',
  'indisponibilidade',
  'incompativel_politica',
  'outro',
];

export const NOT_ATTENDED_LABELS: Record<string, string> = {
  dados_insuficientes: 'Dados insuficientes',
  solicitacao_duplicada: 'Solicitação duplicada',
  viagem_cancelada: 'Viagem cancelada',
  impossibilidade_atendimento: 'Impossibilidade de atendimento',
  orientacao_alteracao_data: 'Orientação para alteração de data',
  falta_autorizacao_previa: 'Falta de autorização prévia informada',
  indisponibilidade: 'Indisponibilidade',
  incompativel_politica: 'Solicitação incompatível com a política',
  outro: 'Outro',
};

export const ATTACHMENT_CATEGORIES = [
  'pdf',
  'imagem',
  'documento',
  'autorizacao',
  'programacao_evento',
  'convocacao',
  'relacao_viajantes',
  'documento_identificacao',
  'bilhete',
  'voucher',
  'comprovante_reserva',
  'nota_fiscal',
  'recibo',
  'cotacao',
  'comprovante_pagamento',
  'email_confirmacao',
  'documento_cancelamento',
  'comprovante_credito',
  'outros',
];

export const ATTACHMENT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  imagem: 'Imagem',
  documento: 'Documento',
  autorizacao: 'Autorização',
  programacao_evento: 'Programação de evento',
  convocacao: 'Convocação',
  relacao_viajantes: 'Relação de viajantes',
  documento_identificacao: 'Documento de identificação',
  bilhete: 'Bilhete',
  voucher: 'Voucher',
  comprovante_reserva: 'Comprovante de reserva',
  nota_fiscal: 'Nota fiscal',
  recibo: 'Recibo',
  cotacao: 'Cotação',
  comprovante_pagamento: 'Comprovante de pagamento',
  email_confirmacao: 'E-mail de confirmação',
  documento_cancelamento: 'Documento de cancelamento',
  comprovante_credito: 'Comprovante de crédito',
  outros: 'Outros',
};

export const FAQ_CATEGORIES = [
  'prazos',
  'passagem',
  'hospedagem',
  'bagagem',
  'adiantamento',
  'alteracoes',
  'aeroporto',
  'terceiros',
  'prestacao_contas',
  'gastos',
  'emergencias',
  'baixada',
];

export const FAQ_CATEGORY_LABELS: Record<string, string> = {
  prazos: 'Prazos',
  passagem: 'Passagem',
  hospedagem: 'Hospedagem',
  bagagem: 'Bagagem',
  adiantamento: 'Adiantamento',
  alteracoes: 'Alterações',
  aeroporto: 'Aeroporto',
  terceiros: 'Terceiros',
  prestacao_contas: 'Prestação de contas',
  gastos: 'Gastos',
  emergencias: 'Emergências',
  baixada: 'Baixada',
};

export const FLEXIBILITY_OPTIONS = [
  'manha',
  'tarde',
  'noite',
  'qualquer_horario',
];

export const FLEXIBILITY_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  qualquer_horario: 'Qualquer horário',
};
