const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ItemPedido {
  sku: string;
  quantidade: number;
  descricao: string;
  valorUnitario?: number;
}

export interface Pedido {
  id: string;
  numero: string;
  cliente: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    enderecoCompleto: string;
  };
  valor: number;
  valorFrete: number;
  situacao: string;
  itens?: ItemPedido[];
}

export interface EnvioResultado {
  pedidoId: string;
  pedidoNumero: string;
  trackingCode: string | null;
  volumeIds: string[];
  sucesso: boolean;
  erro?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

export interface EnvioResponse {
  success: boolean;
  message?: string;
  error?: string;
  resultados: EnvioResultado[];
  resumo?: {
    total: number;
    sucessos: number;
    falhas: number;
  };
}

export async function buscarPedidosFMTransportes(data?: string): Promise<ApiResponse<Pedido[]>> {
  const url = data
    ? `${API_URL}/pedidos/hoje/fmtransportes?data=${data}`
    : `${API_URL}/pedidos/hoje/fmtransportes`;

  const response = await fetch(url);
  return response.json();
}

export async function enviarPedidos(pedidoIds: string[]): Promise<EnvioResponse> {
  const response = await fetch(`${API_URL}/enviar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pedidoIds }),
  });
  return response.json();
}

export async function verificarSaude(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}

// Etiquetas

export interface EtiquetaResultado {
  trackingCode: string;
  labelId: string | null;
  labelUrl: string | null;
  sucesso: boolean;
  erro?: string;
}

export interface EtiquetasResponse {
  success: boolean;
  etiquetas: EtiquetaResultado[];
  resumo: {
    total: number;
    sucessos: number;
    falhas: number;
  };
}

export async function gerarEtiquetas(trackingCodes: string[]): Promise<EtiquetasResponse> {
  const response = await fetch(`${API_URL}/etiquetas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trackingCodes }),
  });
  return response.json();
}

// Declaracao de Conteudo

export interface DadosDeclaracao {
  trackingCode: string;
  numeroPedido: string;
  destinatario: {
    nome: string;
    cpfCnpj: string;
    endereco: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  itens: Array<{
    descricao: string;
    quantidade: number;
    valor: number;
  }>;
  valorTotal: number;
  volumes?: number;
}

export interface DeclaracaoResponse {
  success: boolean;
  pdf?: string;
  error?: string;
}

export async function gerarDeclaracao(dados: DadosDeclaracao): Promise<DeclaracaoResponse> {
  const response = await fetch(`${API_URL}/declaracao/base64`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados),
  });
  return response.json();
}

export function montarDadosDeclaracao(pedido: Pedido, trackingCode: string, volumes?: number): DadosDeclaracao {
  const itens = pedido.itens?.map(item => ({
    descricao: item.descricao,
    quantidade: item.quantidade,
    valor: item.valorUnitario || 0,
  })) || [{
    descricao: 'Embalagens',
    quantidade: 1,
    valor: pedido.valor - pedido.valorFrete,
  }];

  return {
    trackingCode,
    numeroPedido: pedido.numero,
    destinatario: {
      nome: pedido.cliente,
      cpfCnpj: pedido.cpfCnpj,
      endereco: pedido.endereco.logradouro,
      numero: pedido.endereco.numero,
      bairro: pedido.endereco.bairro,
      cidade: pedido.endereco.cidade,
      uf: pedido.endereco.uf,
    },
    itens,
    valorTotal: pedido.valor - pedido.valorFrete,
    volumes,
  };
}

// Monitoramento

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  }
  try {
    return await response.json();
  } catch {
    return {
      success: false,
      error: 'Erro ao processar resposta do servidor',
    };
  }
}

export interface EnvioMonitoramento {
  id: number;
  trackingCode: string;
  pedidoNumero: string;
  clienteNome: string;
  clienteTelefone?: string;
  enderecoResumido: string;
  dataEnvio: string;
  ultimoStatus: number;
  ultimoStatusDescricao: string;
  ultimaMovimentacao: string;
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
  ultimaMovimentacao: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

export interface TrackingEvento {
  trackingId: string;
  trackingCode: string;
  status: number;
  statusDescricao: string;
  dataEvento: string;
  receivedBy?: string;
}

export async function listarEnviosMonitoramento(): Promise<ApiResponse<EnvioMonitoramento[]>> {
  const response = await fetch(`${API_URL}/monitoramento`);
  return handleResponse<EnvioMonitoramento[]>(response);
}

export async function obterResumoMonitoramento(): Promise<ApiResponse<MonitoramentoResumo>> {
  const response = await fetch(`${API_URL}/monitoramento/resumo`);
  return handleResponse<MonitoramentoResumo>(response);
}

export async function listarAlertas(horas?: number): Promise<ApiResponse<AlertaEnvio[]>> {
  const url = horas
    ? `${API_URL}/monitoramento/alertas?horas=${horas}`
    : `${API_URL}/monitoramento/alertas`;
  const response = await fetch(url);
  return handleResponse<AlertaEnvio[]>(response);
}

export async function buscarEnvioDetalhe(trackingCode: string): Promise<ApiResponse<{
  envio: EnvioMonitoramento;
  eventos: TrackingEvento[];
}>> {
  const response = await fetch(`${API_URL}/monitoramento/${trackingCode}`);
  return handleResponse<{ envio: EnvioMonitoramento; eventos: TrackingEvento[] }>(response);
}

export async function atualizarTracking(trackingCode?: string): Promise<ApiResponse<any>> {
  const url = trackingCode
    ? `${API_URL}/monitoramento/${trackingCode}/atualizar`
    : `${API_URL}/monitoramento/atualizar`;
  const response = await fetch(url, { method: 'POST' });
  return handleResponse<any>(response);
}
