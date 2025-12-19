import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PedidoSimulacaoDTO } from '../../core/dto/pedido.dto';
import {
  FMOrderRequest,
  FMOrderResponse,
  FMApiResponse,
  EnvioResultado,
  EtiquetaResultado,
  FMLabelResponse,
  FMLabelDownloadResponse,
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

  /**
   * Solicita geracao de etiqueta para um trackingCode
   * Rate limit: nao documentado, usar com cautela
   */
  async solicitarEtiqueta(trackingCode: string): Promise<{ labelId: string | null; erro?: string }> {
    this.logger.log(`Solicitando etiqueta para tracking: ${trackingCode}`);

    try {
      const response = await this.client.post<FMApiResponse<FMLabelResponse>>('/v1/label', {
        clientDocument: this.clientDocument,
        field: 1, // 1 = trackingCode
        value: trackingCode,
      });

      if (!response.data.success) {
        this.logger.error(`Erro ao solicitar etiqueta: ${response.data.message}`);
        return { labelId: null, erro: response.data.message };
      }

      const labelId = response.data.data?.labelId || null;
      this.logger.log(`Etiqueta solicitada. LabelId: ${labelId}`);
      return { labelId };
    } catch (error: any) {
      this.logger.error(`Erro ao solicitar etiqueta: ${error.message}`);
      return { labelId: null, erro: error.response?.data?.message || error.message };
    }
  }

  /**
   * Baixa URL do PDF da etiqueta
   * A URL expira em 1 hora
   */
  async baixarEtiqueta(labelId: string): Promise<{ url: string | null; erro?: string }> {
    this.logger.log(`Baixando URL da etiqueta: ${labelId}`);

    try {
      const response = await this.client.get<FMApiResponse<FMLabelDownloadResponse>>(
        `/v1/label/${labelId}`,
      );

      if (!response.data.success) {
        this.logger.error(`Erro ao baixar etiqueta: ${response.data.message}`);
        return { url: null, erro: response.data.message };
      }

      const url = response.data.data?.url || null;
      this.logger.log(`Etiqueta disponivel: ${url ? 'SIM' : 'NAO'}`);
      return { url };
    } catch (error: any) {
      this.logger.error(`Erro ao baixar etiqueta: ${error.message}`);
      return { url: null, erro: error.response?.data?.message || error.message };
    }
  }

  /**
   * Gera etiquetas para multiplos trackingCodes
   * Solicita + baixa URL em sequencia
   */
  async gerarEtiquetas(trackingCodes: string[]): Promise<EtiquetaResultado[]> {
    const resultados: EtiquetaResultado[] = [];

    for (const trackingCode of trackingCodes) {
      // 1. Solicitar geracao
      const { labelId, erro: erroSolicitar } = await this.solicitarEtiqueta(trackingCode);

      if (!labelId) {
        resultados.push({
          trackingCode,
          labelId: null,
          labelUrl: null,
          sucesso: false,
          erro: erroSolicitar || 'Falha ao solicitar etiqueta',
        });
        continue;
      }

      // 2. Aguardar processamento (1 segundo)
      await this.delay(1000);

      // 3. Baixar URL
      const { url, erro: erroBaixar } = await this.baixarEtiqueta(labelId);

      if (!url) {
        // Tentar novamente apos mais 2 segundos
        await this.delay(2000);
        const retry = await this.baixarEtiqueta(labelId);

        if (!retry.url) {
          resultados.push({
            trackingCode,
            labelId,
            labelUrl: null,
            sucesso: false,
            erro: erroBaixar || 'Etiqueta em processamento, tente novamente',
          });
          continue;
        }

        resultados.push({
          trackingCode,
          labelId,
          labelUrl: retry.url,
          sucesso: true,
        });
      } else {
        resultados.push({
          trackingCode,
          labelId,
          labelUrl: url,
          sucesso: true,
        });
      }
    }

    return resultados;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
