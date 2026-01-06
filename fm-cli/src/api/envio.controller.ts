import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TinyService } from '../integrations/tiny/tiny.service';
import { FMTransportesService } from '../integrations/fmtransportes/fm.service';
import { DatabaseService } from '../core/database.service';
import { PedidoSimulacaoDTO } from '../core/dto/pedido.dto';

interface EnviarPedidosDTO {
  data?: string;
  pedidoIds: string[];
}

@Controller()
export class EnvioController {
  private readonly logger = new Logger(EnvioController.name);

  constructor(
    private readonly tinyService: TinyService,
    private readonly fmService: FMTransportesService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * POST /enviar
   * Envia pedidos selecionados para FM Transportes
   */
  @Post('enviar')
  async enviarPedidos(@Body() body: EnviarPedidosDTO) {
    const { pedidoIds, data } = body;

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
      const todosPedidos = await this.tinyService.buscarPedidosFMTransportesHoje(data);

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

      // Salvar pedidos enviados com sucesso no banco
      for (const resultado of resultados) {
        if (resultado.sucesso && resultado.trackingCode) {
          const pedido = pedidosSelecionados.find((p) => p.id === resultado.pedidoId);
          if (pedido) {
            await this.salvarPedidoEnviado(resultado, pedido);
          }
        }
      }

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

  private async salvarPedidoEnviado(
    resultado: { trackingCode: string | null; volumeIds: string[]; pedidoNumero: string },
    pedido: PedidoSimulacaoDTO,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO fm_pedidos_enviados (
          tracking_code, volume_ids, pedido_tiny_id, pedido_numero,
          cliente_nome, cliente_cpf_cnpj, cliente_email, cliente_telefone,
          endereco_logradouro, endereco_numero, endereco_complemento,
          endereco_bairro, endereco_cidade, endereco_uf, endereco_cep,
          itens, valor_total, valor_frete, situacao_original, volumes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (tracking_code) DO NOTHING`,
        [
          resultado.trackingCode,
          JSON.stringify(resultado.volumeIds),
          pedido.id,
          pedido.numero,
          pedido.cliente,
          pedido.cpfCnpj,
          pedido.email,
          pedido.telefone,
          pedido.endereco.logradouro,
          pedido.endereco.numero,
          pedido.endereco.complemento,
          pedido.endereco.bairro,
          pedido.endereco.cidade,
          pedido.endereco.uf,
          pedido.endereco.cep,
          JSON.stringify(pedido.itens),
          pedido.valor,
          pedido.valorFrete,
          pedido.situacao,
          1, // volumes default
        ],
      );
      this.logger.log(`Pedido ${pedido.numero} salvo no banco (tracking: ${resultado.trackingCode})`);
    } catch (error: any) {
      this.logger.error(`Erro ao salvar pedido ${pedido.numero}: ${error.message}`);
    }
  }
}
