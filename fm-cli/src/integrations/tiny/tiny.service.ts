import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  PedidoTinyDTO,
  PedidoSimulacaoDTO,
  PedidoDetalhadoTinyDTO,
  mapDetalhadoToPedidoSimulacao,
} from '../../core/dto/pedido.dto';

@Injectable()
export class TinyService {
  private readonly logger = new Logger(TinyService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.TINY_API_URL || 'http://tiny.sdebot.top:3011/api/tiny';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
    this.logger.log(`TinyService inicializado: ${this.baseUrl}`);
  }

  async buscarPedidos(dataInicial: string, dataFinal: string): Promise<PedidoTinyDTO[]> {
    try {
      this.logger.debug(`Buscando pedidos: ${dataInicial} a ${dataFinal}`);

      const response = await this.client.get('/pedidos', {
        params: { dataInicial, dataFinal },
      });

      const pedidosRaw = response.data?.data?.retorno?.pedidos ||
                      response.data?.retorno?.pedidos ||
                      response.data?.pedidos ||
                      [];

      const pedidos = pedidosRaw.map((p: any) => p.pedido || p);
      this.logger.log(`Encontrados ${pedidos.length} pedidos`);

      return pedidos;
    } catch (error) {
      this.logger.error(`Erro ao buscar pedidos: ${error.message}`);
      throw new Error(`Falha ao conectar com Tiny API: ${error.message}`);
    }
  }

  async buscarDetalhePedido(idPedido: string): Promise<PedidoDetalhadoTinyDTO | null> {
    try {
      const response = await this.client.get(`/pedidos/${idPedido}`);

      const pedido = response.data?.data?.retorno?.pedido ||
                     response.data?.retorno?.pedido ||
                     response.data?.pedido ||
                     null;

      return pedido;
    } catch (error) {
      this.logger.error(`Erro ao buscar detalhe do pedido ${idPedido}: ${error.message}`);
      return null;
    }
  }

  async buscarPedidosHoje(data?: string): Promise<PedidoTinyDTO[]> {
    const dataConsulta = data || this.formatarData(new Date());
    return this.buscarPedidos(dataConsulta, dataConsulta);
  }

  private readonly statusExcluidos = [
    'enviado',
    'entregue',
    'cancelado',
  ];

  /**
   * Filtra pedidos elegiveis para FM Transportes
   * Criterios:
   * - nome_transportador contem "FM TRANSPORT"
   * - situacao NAO esta em: enviado, entregue, cancelado
   */
  private filtrarPedidosFMTransportes(pedidos: PedidoDetalhadoTinyDTO[]): PedidoDetalhadoTinyDTO[] {
    return pedidos.filter((p) => {
      const transportadorOk = p.nome_transportador
        ?.toUpperCase()
        .includes('FM TRANSPORT');

      const situacaoNormalizada = p.situacao?.toLowerCase() || '';
      const situacaoOk = !this.statusExcluidos.some((status) =>
        situacaoNormalizada.includes(status),
      );

      return transportadorOk && situacaoOk;
    });
  }

  /**
   * Busca pedidos FM Transportes de hoje COM detalhes completos
   */
  async buscarPedidosFMTransportesHoje(data?: string): Promise<PedidoSimulacaoDTO[]> {
    const pedidosSimples = await this.buscarPedidosHoje(data);

    this.logger.log(`Buscando detalhes de ${pedidosSimples.length} pedidos para filtrar FM Transportes...`);

    const pedidosDetalhados: PedidoDetalhadoTinyDTO[] = [];

    const batchSize = 5;
    for (let i = 0; i < pedidosSimples.length; i += batchSize) {
      const batch = pedidosSimples.slice(i, i + batchSize);
      const detalhes = await Promise.all(
        batch.map((p) => this.buscarDetalhePedido(p.id)),
      );

      for (const detalhe of detalhes) {
        if (detalhe) {
          pedidosDetalhados.push(detalhe);
        }
      }
    }

    const fmTransportes = this.filtrarPedidosFMTransportes(pedidosDetalhados);

    this.logger.log(`Encontrados ${fmTransportes.length} pedidos FM Transportes de ${pedidosDetalhados.length} total`);
    return fmTransportes.map(mapDetalhadoToPedidoSimulacao);
  }

  async verificarConexao(): Promise<boolean> {
    try {
      const response = await this.client.get('/info');
      this.logger.log('Conexao com Tiny API OK');
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Tiny API indisponivel: ${error.message}`);
      return false;
    }
  }

  private formatarData(date: Date): string {
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
}
