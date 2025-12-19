import { Controller, Get, Query, Logger } from '@nestjs/common';
import { TinyService } from '../integrations/tiny/tiny.service';

@Controller('pedidos')
export class PedidosController {
  private readonly logger = new Logger(PedidosController.name);

  constructor(private readonly tinyService: TinyService) {}

  /**
   * GET /pedidos/hoje/fmtransportes
   * Retorna pedidos de hoje (ou data especificada) filtrados para FM Transportes
   */
  @Get('hoje/fmtransportes')
  async getPedidosFMTransportesHoje(@Query('data') data?: string) {
    this.logger.log(`Buscando pedidos FM Transportes: ${data || 'hoje'}`);

    try {
      const pedidos = await this.tinyService.buscarPedidosFMTransportesHoje(data);

      return {
        success: true,
        data: pedidos,
        total: pedidos.length,
        dataConsulta: data || new Date().toLocaleDateString('pt-BR'),
      };
    } catch (error: any) {
      this.logger.error(`Erro ao buscar pedidos: ${error.message}`);
      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
      };
    }
  }
}
