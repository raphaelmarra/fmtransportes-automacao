import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TinyService } from '../integrations/tiny/tiny.service';
import { FMTransportesService } from '../integrations/fmtransportes/fm.service';
import { PedidoSimulacaoDTO } from '../core/dto/pedido.dto';

interface EnviarPedidosDTO {
  pedidoIds: string[];
}

@Controller()
export class EnvioController {
  private readonly logger = new Logger(EnvioController.name);

  constructor(
    private readonly tinyService: TinyService,
    private readonly fmService: FMTransportesService,
  ) {}

  /**
   * POST /enviar
   * Envia pedidos selecionados para FM Transportes
   */
  @Post('enviar')
  async enviarPedidos(@Body() body: EnviarPedidosDTO) {
    const { pedidoIds } = body;

    if (!pedidoIds || pedidoIds.length === 0) {
      return {
        success: false,
        error: 'Nenhum pedido selecionado',
        resultados: [],
      };
    }

    this.logger.log(`Recebida solicitacao de envio para ${pedidoIds.length} pedidos`);

    try {
      // Busca os pedidos completos do Tiny
      const todosPedidos = await this.tinyService.buscarPedidosFMTransportesHoje();

      // Filtra apenas os pedidos selecionados
      const pedidosSelecionados: PedidoSimulacaoDTO[] = todosPedidos.filter((p) =>
        pedidoIds.includes(p.id),
      );

      if (pedidosSelecionados.length === 0) {
        return {
          success: false,
          error: 'Nenhum dos pedidos selecionados foi encontrado',
          resultados: [],
        };
      }

      this.logger.log(`Enviando ${pedidosSelecionados.length} pedidos para FM Transportes...`);

      // Envia para FM Transportes
      const resultados = await this.fmService.enviarPedidos(pedidosSelecionados);

      const sucessos = resultados.filter((r) => r.sucesso).length;
      const falhas = resultados.filter((r) => !r.sucesso).length;

      this.logger.log(`Envio concluido: ${sucessos} sucessos, ${falhas} falhas`);

      return {
        success: falhas === 0,
        message: `${sucessos} pedidos enviados com sucesso${falhas > 0 ? `, ${falhas} falhas` : ''}`,
        resultados,
        resumo: {
          total: resultados.length,
          sucessos,
          falhas,
        },
      };
    } catch (error: any) {
      this.logger.error(`Erro ao enviar pedidos: ${error.message}`);
      return {
        success: false,
        error: error.message,
        resultados: [],
      };
    }
  }
}
