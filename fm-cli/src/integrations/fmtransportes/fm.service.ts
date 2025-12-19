import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PedidoSimulacaoDTO } from '../../core/dto/pedido.dto';
import {
  FMOrderRequest,
  FMOrderResponse,
  FMApiResponse,
  EnvioResultado,
  ESTADO_MAP,
} from './fm.interface';

@Injectable()
export class FMTransportesService {
  private readonly logger = new Logger(FMTransportesService.name);
  private readonly client: AxiosInstance;
  private readonly clientDocument: string;

  constructor() {
    const baseUrl = process.env.FM_API_URL || 'https://integration.fmtransportes.com.br/api';
    const user = process.env.FM_API_USER || 'apikey';
    const password = process.env.FM_API_PASSWORD || '';
    this.clientDocument = process.env.FM_CLIENT_DOCUMENT || '';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 60000,
      auth: {
        username: user,
        password: password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`FMTransportesService inicializado: ${baseUrl}`);
    this.logger.log(`Client Document: ${this.clientDocument}`);
  }

  /**
   * Converte pedido do Tiny para formato FM Transportes
   */
  private pedidoToFMOrder(pedido: PedidoSimulacaoDTO): FMOrderRequest {
    const hoje = new Date().toISOString().split('T')[0];
    const uf = pedido.endereco.uf?.toUpperCase() || 'SP';
    const stateCode = ESTADO_MAP[uf] || 26;

    // Remove caracteres nao numericos do CEP
    const cepNumerico = parseInt(pedido.endereco.cep.replace(/\D/g, ''), 10);

    return {
      clientDocument: this.clientDocument,
      service: 7022, // Standard - fixo conforme MVP 1
      name: pedido.cliente.substring(0, 60),
      document: pedido.cpfCnpj,
      street: pedido.endereco.logradouro.substring(0, 60),
      number: pedido.endereco.numero || 'S/N',
      complement: pedido.endereco.complemento?.substring(0, 30) || undefined,
      neighborhood: pedido.endereco.bairro.substring(0, 40),
      city: pedido.endereco.cidade.substring(0, 40),
      state: stateCode,
      zipCode: cepNumerico,
      volumes: 1,
      email: pedido.email || undefined,
      phone: pedido.telefone?.replace(/\D/g, '') || undefined,
      nature: 'EMBALAGENS PLASTICAS',
      weight: 1.0,
      totalValue: pedido.valor,
      productValue: pedido.valor,
      fiscalDocument: 1, // Declaracao de Conteudo
      orderNumber: pedido.numero,
      declarationNumber: `DC-${pedido.numero}`,
      declarationSerie: 1,
      declarationDate: hoje,
      observation: `Pedido Tiny #${pedido.numero}`,
    };
  }

  /**
   * Envia pedidos para FM Transportes
   * Rate limit: 1 req/s - batch de ate 500 pedidos por chamada
   */
  async enviarPedidos(pedidos: PedidoSimulacaoDTO[]): Promise<EnvioResultado[]> {
    if (pedidos.length === 0) {
      return [];
    }

    this.logger.log(`Enviando ${pedidos.length} pedidos para FM Transportes...`);

    const orders: FMOrderRequest[] = pedidos.map((p) => this.pedidoToFMOrder(p));

    try {
      const response = await this.client.post<FMApiResponse<FMOrderResponse[]>>('/v1/order', {
        orders,
      });

      if (!response.data.success) {
        this.logger.error(`Erro na API FM: ${response.data.message}`);
        return pedidos.map((p) => ({
          pedidoId: p.id,
          pedidoNumero: p.numero,
          trackingCode: null,
          volumeIds: [],
          sucesso: false,
          erro: response.data.message || 'Erro desconhecido',
        }));
      }

      const resultados: EnvioResultado[] = [];
      const dataResponse = response.data.data || [];

      for (let i = 0; i < pedidos.length; i++) {
        const pedido = pedidos[i];
        const fmResponse = dataResponse.find((r) => r.orderNumber === pedido.numero);

        if (fmResponse) {
          resultados.push({
            pedidoId: pedido.id,
            pedidoNumero: pedido.numero,
            trackingCode: fmResponse.trackingCode,
            volumeIds: fmResponse.volumeIds || [],
            sucesso: true,
          });
          this.logger.log(`Pedido ${pedido.numero} enviado. Tracking: ${fmResponse.trackingCode}`);
        } else {
          resultados.push({
            pedidoId: pedido.id,
            pedidoNumero: pedido.numero,
            trackingCode: null,
            volumeIds: [],
            sucesso: false,
            erro: 'Resposta nao encontrada para este pedido',
          });
        }
      }

      return resultados;
    } catch (error: any) {
      this.logger.error(`Erro ao enviar pedidos: ${error.message}`);

      if (error.response?.data) {
        this.logger.error(`Detalhes: ${JSON.stringify(error.response.data)}`);
      }

      return pedidos.map((p) => ({
        pedidoId: p.id,
        pedidoNumero: p.numero,
        trackingCode: null,
        volumeIds: [],
        sucesso: false,
        erro: error.response?.data?.message || error.message,
      }));
    }
  }

  /**
   * Verifica saude da conexao com FM Transportes
   */
  async verificarConexao(): Promise<boolean> {
    try {
      // Faz uma cotacao simples como teste de conectividade
      const response = await this.client.post('/v1/quote', {
        clientDocument: this.clientDocument,
        zipCodeDestination: 1310100, // CEP teste SP
        totalValue: 100,
        totalWeight: 0.5,
        volumes: [{ length: 30, height: 20, width: 15 }],
      });

      const ok = response.data?.success === true;
      this.logger.log(`Conexao FM Transportes: ${ok ? 'OK' : 'FALHA'}`);
      return ok;
    } catch (error: any) {
      this.logger.error(`FM Transportes indisponivel: ${error.message}`);
      return false;
    }
  }
}
