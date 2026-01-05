// Interfaces para Tracking FM Transportes

export interface TrackingRequest {
  clientDocument: string;
  trackingCode?: string;
}

export interface TrackingEvento {
  trackingId: string;
  trackingCode: string;
  status: number;
  statusDescricao: string;
  dataEvento: string;
  receivedBy?: string;
}

export interface TrackingResponse {
  success: boolean;
  data: TrackingEvento[];
  message?: string;
}

export interface EnvioMonitoramento {
  id: number;
  trackingCode: string;
  pedidoNumero: string;
  clienteNome: string;
  clienteTelefone?: string;
  enderecoResumido: string;
  dataEnvio: string | Date; // Date no service, string no JSON
  ultimoStatus: number;
  ultimoStatusDescricao: string;
  ultimaMovimentacao: string | Date; // Date no service, string no JSON
  tempoParadoHoras: number;
  alertaAtivo: boolean;
}

export interface MonitoramentoResumo {
  total: number;
  emTransito: number;
  entregues: number;
  parados24h: number;
  parados48h: number;
}

export interface AlertaEnvio {
  id: number;
  trackingCode: string;
  pedidoNumero: string;
  clienteNome: string;
  clienteTelefone?: string;
  tempoParadoHoras: number;
  ultimoStatus: string;
  ultimaMovimentacao: string | Date; // Date no service, string no JSON
  prioridade: 'alta' | 'media' | 'baixa';
}

// Status FM Transportes (mapeamento completo da documentacao)
export const STATUS_FM: Record<number, string> = {
  0: 'Pedido Criado | Aguardando Postagem Remetente',
  1: 'Encomenda Entregue',
  6: 'Endereco Errado | Endereco Insuficiente | Numero Nao Localizado',
  10: 'Sinistro Liquidado',
  13: 'Endereco Fora do Perimetro Urbano | Zona Rural',
  14: 'Mercadoria Avariada',
  15: 'Embalagem em Analise',
  21: 'Destinatario Ausente | Local Fechado',
  25: 'Em Processo de Devolucao',
  27: 'Roubo de Carga',
  29: 'Retirar Objeto nos Correios',
  30: 'Extravio de Carga',
  38: 'Encomenda Postada nos Correios',
  39: 'Destinatario Mudou-se',
  41: 'Destinatario Desconhecido',
  48: 'Problemas Diversos na Entrega',
  49: 'Area Restrita de Acesso',
  51: 'Endereco Nao Visitado',
  52: 'Recusado na Entrega',
  56: 'Entrega Cancelada',
  57: 'Encomenda Aguardando Tratativa',
  58: 'Favor Desconsiderar Informacao Anterior',
  61: 'Devolvida ao Remetente',
  64: 'Aguardando Reenvio | Nova Tentativa',
  83: 'Coleta Realizada',
  90: 'Encomenda Finalizada',
  92: 'Encomenda Retida para Analise | Posto Fiscal',
  93: 'Problemas Operacionais',
  95: 'Falta de Complemento Fisico',
  101: 'Encomenda Despachada',
  102: 'Encomenda em Transito | Transferencia entre unidades',
  104: 'Processo de Entrega Iniciado',
  106: 'Encomenda Conferida',
  107: 'Encomenda Apreendida',
  108: 'Em Rota | Preparando para entrega',
  109: 'Devolucao Recusada',
  110: 'Transferencia entre unidades',
  111: 'Devolucao em andamento ao remetente',
  112: 'Pacote Fora do Perfil | Peso acima do limite',
  113: 'Pacote Fora do Perfil | Tamanho acima do limite',
  114: 'Rejeito | Encomenda sem cadastro',
  115: 'Rejeito | Encomenda sem identificacao',
  116: 'Rejeito | Encomenda fora do perfil',
  117: 'Rejeito | Divergencia de Volumetria',
  118: 'Devolvido pelos Correios',
  119: 'Encomenda em Buscas',
};

// Status finais (entrega concluida ou problema terminal)
export const STATUS_FINAL = [1, 10, 27, 30, 52, 56, 61, 90, 107, 109, 111, 118];
