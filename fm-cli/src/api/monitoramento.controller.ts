import { Controller, Get, Param, Query, Post, Logger } from '@nestjs/common';
import { TrackingService } from '../integrations/fmtransportes/tracking.service';

@Controller('monitoramento')
export class MonitoramentoController {
  private readonly logger = new Logger(MonitoramentoController.name);

  constructor(private readonly trackingService: TrackingService) {}

  /**
   * GET /monitoramento
   * Lista todos os envios com status de monitoramento
   */
  @Get()
  async listarEnvios() {
    this.logger.log('Listando todos os envios');
    const envios = await this.trackingService.listarEnvios();
    return {
      success: true,
      data: envios,
      total: envios.length,
    };
  }

  /**
   * GET /monitoramento/resumo
   * Retorna resumo do monitoramento (totais, alertas)
   */
  @Get('resumo')
  async obterResumo() {
    this.logger.log('Obtendo resumo do monitoramento');
    const resumo = await this.trackingService.obterResumo();
    return {
      success: true,
      data: resumo,
    };
  }

  /**
   * GET /monitoramento/alertas
   * Lista envios com alerta (parados ha mais de X horas)
   */
  @Get('alertas')
  async listarAlertas(@Query('horas') horas?: string) {
    const horasMinimo = horas ? parseInt(horas, 10) : 24;
    this.logger.log(`Listando alertas (parados > ${horasMinimo}h)`);
    const alertas = await this.trackingService.listarAlertas(horasMinimo);
    return {
      success: true,
      data: alertas,
      total: alertas.length,
    };
  }

  /**
   * GET /monitoramento/:trackingCode
   * Busca detalhes de um envio especifico com historico de eventos
   */
  @Get(':trackingCode')
  async buscarEnvio(@Param('trackingCode') trackingCode: string) {
    this.logger.log(`Buscando envio: ${trackingCode}`);
    const { envio, eventos } = await this.trackingService.buscarEnvio(trackingCode);

    if (!envio) {
      return {
        success: false,
        message: 'Envio nao encontrado',
      };
    }

    return {
      success: true,
      data: {
        envio,
        eventos,
      },
    };
  }

  /**
   * POST /monitoramento/atualizar
   * Atualiza tracking de todos os envios em transito
   */
  @Post('atualizar')
  async atualizarTodos() {
    this.logger.log('Atualizando tracking de todos os envios');
    const resultado = await this.trackingService.atualizarTodosTrackings();
    return {
      success: true,
      message: `Atualizado: ${resultado.atualizados} sucesso, ${resultado.erros} erros`,
      data: resultado,
    };
  }

  /**
   * POST /monitoramento/:trackingCode/atualizar
   * Atualiza tracking de um envio especifico
   */
  @Post(':trackingCode/atualizar')
  async atualizarEnvio(@Param('trackingCode') trackingCode: string) {
    this.logger.log(`Atualizando tracking: ${trackingCode}`);
    const { envio, eventos } = await this.trackingService.buscarEnvio(trackingCode);

    if (!envio) {
      return {
        success: false,
        message: 'Envio nao encontrado',
      };
    }

    return {
      success: true,
      message: 'Tracking atualizado',
      data: {
        envio,
        eventos,
      },
    };
  }
}
