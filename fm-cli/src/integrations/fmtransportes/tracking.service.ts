import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  TrackingRequest,
  TrackingResponse,
  TrackingEvento,
  EnvioMonitoramento,
  MonitoramentoResumo,
  AlertaEnvio,
  STATUS_FM,
  STATUS_FINAL,
} from './tracking.interface';
import { DatabaseService } from '../../core/database.service';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  private readonly client: AxiosInstance;
  private readonly clientDocument: string;

  constructor(private readonly db: DatabaseService) {
    const baseUrl = process.env.FM_API_URL || 'https://integration.fmtransportes.com.br/api';
    const user = process.env.FM_API_USER || 'apikey';
    const password = process.env.FM_API_PASSWORD || '';
    this.clientDocument = process.env.FM_CLIENT_DOCUMENT || '';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      auth: {
        username: user,
        password: password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('TrackingService inicializado');
  }

  /**
   * Busca tracking de todos os envios ou de um especifico
   */
  async buscarTracking(trackingCode?: string): Promise<TrackingEvento[]> {
    try {
      const payload: TrackingRequest = {
        clientDocument: this.clientDocument,
      };

      if (trackingCode) {
        payload.trackingCode = trackingCode;
      }

      const response = await this.client.post<TrackingResponse>('/v1/tracking', payload);

      if (!response.data.success) {
        this.logger.error(`Erro ao buscar tracking: ${response.data.message}`);
        return [];
      }

      return response.data.data || [];
    } catch (error: any) {
      this.logger.error(`Erro ao buscar tracking: ${error.message}`);
      return [];
    }
  }

  /**
   * Lista todos os envios com status de monitoramento
   */
  async listarEnvios(): Promise<EnvioMonitoramento[]> {
    // Buscar envios do banco
    const envios = await this.db.query<any[]>(`
      SELECT
        p.id,
        p.tracking_code,
        p.pedido_numero,
        p.cliente_nome,
        p.cliente_telefone,
        CONCAT(p.endereco_cidade, ' - ', p.endereco_uf) as endereco_resumido,
        p.data_envio,
        COALESCE(
          (SELECT status FROM fm_tracking_eventos WHERE tracking_code = p.tracking_code ORDER BY data_evento DESC LIMIT 1),
          0
        ) as ultimo_status,
        COALESCE(
          (SELECT data_evento FROM fm_tracking_eventos WHERE tracking_code = p.tracking_code ORDER BY data_evento DESC LIMIT 1),
          p.data_envio
        ) as ultima_movimentacao
      FROM fm_pedidos_enviados p
      ORDER BY p.data_envio DESC
    `);

    const agora = new Date();

    return envios.map(e => {
      const ultimaMov = new Date(e.ultima_movimentacao);
      const diffMs = agora.getTime() - ultimaMov.getTime();
      const tempoParadoHoras = Math.floor(diffMs / (1000 * 60 * 60));

      return {
        id: e.id,
        trackingCode: e.tracking_code,
        pedidoNumero: e.pedido_numero,
        clienteNome: e.cliente_nome,
        clienteTelefone: e.cliente_telefone,
        enderecoResumido: e.endereco_resumido,
        dataEnvio: new Date(e.data_envio),
        ultimoStatus: e.ultimo_status,
        ultimoStatusDescricao: STATUS_FM[e.ultimo_status] || 'Desconhecido',
        ultimaMovimentacao: ultimaMov,
        tempoParadoHoras,
        alertaAtivo: tempoParadoHoras >= 24 && !STATUS_FINAL.includes(e.ultimo_status),
      };
    });
  }

  /**
   * Busca detalhes de um envio especifico com historico
   */
  async buscarEnvio(trackingCode: string): Promise<{
    envio: EnvioMonitoramento | null;
    eventos: TrackingEvento[];
  }> {
    // Buscar envio do banco
    const envios = await this.db.query<any[]>(`
      SELECT
        p.*,
        CONCAT(p.endereco_cidade, ' - ', p.endereco_uf) as endereco_resumido
      FROM fm_pedidos_enviados p
      WHERE p.tracking_code = $1
    `, [trackingCode]);

    if (envios.length === 0) {
      return { envio: null, eventos: [] };
    }

    const e = envios[0];

    // Buscar eventos do banco
    const eventosDb = await this.db.query<TrackingEvento[]>(`
      SELECT
        tracking_id as "trackingId",
        tracking_code as "trackingCode",
        status,
        status_descricao as "statusDescricao",
        data_evento as "dataEvento",
        received_by as "receivedBy"
      FROM fm_tracking_eventos
      WHERE tracking_code = $1
      ORDER BY data_evento DESC
    `, [trackingCode]);

    // Buscar eventos atualizados da API FM
    const eventosApi = await this.buscarTracking(trackingCode);

    // Sincronizar novos eventos no banco
    for (const evento of eventosApi) {
      await this.sincronizarEvento(evento);
    }

    // Usar eventos da API se existirem, senao do banco
    const eventos = eventosApi.length > 0 ? eventosApi : eventosDb;

    const ultimoEvento = eventos[0];
    const agora = new Date();
    const ultimaMov = ultimoEvento ? new Date(ultimoEvento.dataEvento) : new Date(e.data_envio);
    const diffMs = agora.getTime() - ultimaMov.getTime();
    const tempoParadoHoras = Math.floor(diffMs / (1000 * 60 * 60));

    const envio: EnvioMonitoramento = {
      id: e.id,
      trackingCode: e.tracking_code,
      pedidoNumero: e.pedido_numero,
      clienteNome: e.cliente_nome,
      clienteTelefone: e.cliente_telefone,
      enderecoResumido: e.endereco_resumido,
      dataEnvio: new Date(e.data_envio),
      ultimoStatus: ultimoEvento?.status || 0,
      ultimoStatusDescricao: ultimoEvento?.statusDescricao || STATUS_FM[0],
      ultimaMovimentacao: ultimaMov,
      tempoParadoHoras,
      alertaAtivo: tempoParadoHoras >= 24 && !STATUS_FINAL.includes(ultimoEvento?.status || 0),
    };

    return { envio, eventos };
  }

  /**
   * Sincroniza evento da API no banco local
   */
  private async sincronizarEvento(evento: TrackingEvento): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO fm_tracking_eventos
          (tracking_code, tracking_id, status, status_descricao, data_evento, received_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tracking_code, tracking_id) DO NOTHING
      `, [
        evento.trackingCode,
        evento.trackingId,
        evento.status,
        evento.statusDescricao || STATUS_FM[evento.status],
        evento.dataEvento,
        evento.receivedBy,
      ]);
    } catch (error: any) {
      this.logger.warn(`Erro ao sincronizar evento: ${error.message}`);
    }
  }

  /**
   * Retorna resumo do monitoramento
   */
  async obterResumo(): Promise<MonitoramentoResumo> {
    const envios = await this.listarEnvios();

    const total = envios.length;
    const entregues = envios.filter(e => STATUS_FINAL.includes(e.ultimoStatus)).length;
    const emTransito = total - entregues;
    const parados24h = envios.filter(e => e.tempoParadoHoras >= 24 && !STATUS_FINAL.includes(e.ultimoStatus)).length;
    const parados48h = envios.filter(e => e.tempoParadoHoras >= 48 && !STATUS_FINAL.includes(e.ultimoStatus)).length;

    return {
      total,
      emTransito,
      entregues,
      parados24h,
      parados48h,
    };
  }

  /**
   * Lista envios com alerta (parados ha mais de X horas)
   */
  async listarAlertas(horasMinimo: number = 24): Promise<AlertaEnvio[]> {
    const envios = await this.listarEnvios();

    return envios
      .filter(e => e.tempoParadoHoras >= horasMinimo && !STATUS_FINAL.includes(e.ultimoStatus))
      .map(e => ({
        id: e.id,
        trackingCode: e.trackingCode,
        pedidoNumero: e.pedidoNumero,
        clienteNome: e.clienteNome,
        clienteTelefone: e.clienteTelefone,
        tempoParadoHoras: e.tempoParadoHoras,
        ultimoStatus: e.ultimoStatusDescricao,
        ultimaMovimentacao: e.ultimaMovimentacao,
        prioridade: (e.tempoParadoHoras >= 48 ? 'alta' : e.tempoParadoHoras >= 24 ? 'media' : 'baixa') as 'alta' | 'media' | 'baixa',
      }))
      .sort((a, b) => b.tempoParadoHoras - a.tempoParadoHoras);
  }

  /**
   * Atualiza tracking de todos os envios em transito
   */
  async atualizarTodosTrackings(): Promise<{ atualizados: number; erros: number }> {
    const envios = await this.listarEnvios();
    const emTransito = envios.filter(e => !STATUS_FINAL.includes(e.ultimoStatus));

    let atualizados = 0;
    let erros = 0;

    for (const envio of emTransito) {
      try {
        const eventos = await this.buscarTracking(envio.trackingCode);
        for (const evento of eventos) {
          await this.sincronizarEvento(evento);
        }
        atualizados++;
        // Rate limit: 1 req/segundo
        await this.delay(1100);
      } catch {
        erros++;
      }
    }

    this.logger.log(`Tracking atualizado: ${atualizados} sucesso, ${erros} erros`);
    return { atualizados, erros };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
