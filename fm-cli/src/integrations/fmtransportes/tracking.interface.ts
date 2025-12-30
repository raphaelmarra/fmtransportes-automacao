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
  dataEnvio: Date;
  ultimoStatus: number;
  ultimoStatusDescricao: string;
  ultimaMovimentacao: Date;
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
  ultimaMovimentacao: Date;
  prioridade: 'alta' | 'media' | 'baixa';
}

// Status FM Transportes (mapeamento)
export const STATUS_FM: Record<number, string> = {
  0: 'Pedido criado',
  1: 'Em separacao',
  2: 'Coletado',
  3: 'Em transito',
  4: 'Saiu para entrega',
  5: 'Entregue',
  6: 'Devolvido',
  7: 'Extraviado',
  8: 'Cancelado',
  9: 'Aguardando retirada',
  10: 'Primeira tentativa',
  11: 'Segunda tentativa',
  12: 'Terceira tentativa',
};

export const STATUS_FINAL = [5, 6, 7, 8]; // Entregue, Devolvido, Extraviado, Cancelado
