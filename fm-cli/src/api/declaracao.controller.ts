import { Controller, Post, Body, Res, HttpStatus, Logger, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { DeclaracaoService, DadosDeclaracao } from '../core/declaracao/declaracao.service';

interface GerarDeclaracaoDTO {
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
    sku: string;
    descricao: string;
    quantidade: number;
    valor: number;
  }>;
  valorTotal: number;
  volumes?: number;
}

interface GerarMultiplasDeclaracoesDTO {
  declaracoes: GerarDeclaracaoDTO[];
}

@Controller('declaracao')
export class DeclaracaoController {
  private readonly logger = new Logger(DeclaracaoController.name);

  constructor(private readonly declaracaoService: DeclaracaoService) {}

  /**
   * POST /declaracao
   * Gera declaracao em PDF e retorna como download
   */
  @Post()
  async gerarDeclaracao(
    @Body() body: GerarDeclaracaoDTO,
    @Res() res: Response,
  ): Promise<void> {
    this.validarInput(body);

    try {
      const dados: DadosDeclaracao = this.mapearParaDados(body);
      const pdfBuffer = await this.declaracaoService.gerarDeclaracao(dados);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="declaracao-${body.numeroPedido}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      this.logger.error('Erro ao gerar declaracao:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerar PDF',
      });
    }
  }

  /**
   * POST /declaracao/base64
   * Gera declaracao em PDF e retorna como base64
   */
  @Post('base64')
  async gerarDeclaracaoBase64(
    @Body() body: GerarDeclaracaoDTO,
  ): Promise<{ success: boolean; pdf?: string; error?: string }> {
    this.validarInput(body);

    try {
      const dados: DadosDeclaracao = this.mapearParaDados(body);
      const pdfBuffer = await this.declaracaoService.gerarDeclaracao(dados);
      const base64 = pdfBuffer.toString('base64');

      this.logger.log(`Declaracao gerada para pedido ${body.numeroPedido}`);

      return {
        success: true,
        pdf: `data:application/pdf;base64,${base64}`,
      };
    } catch (error) {
      this.logger.error('Erro ao gerar declaracao:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerar PDF',
      };
    }
  }

  /**
   * POST /declaracao/multiplas
   * Gera multiplas declaracoes em um unico PDF
   */
  @Post('multiplas')
  async gerarMultiplasDeclaracoes(
    @Body() body: GerarMultiplasDeclaracoesDTO,
  ): Promise<{ success: boolean; pdf?: string; error?: string; total?: number }> {
    if (!body.declaracoes || body.declaracoes.length === 0) {
      return {
        success: false,
        error: 'Nenhuma declaracao fornecida',
      };
    }

    try {
      const declaracoes: DadosDeclaracao[] = body.declaracoes.map((d) => this.mapearParaDados(d));
      const pdfBuffer = await this.declaracaoService.gerarMultiplasDeclaracoes(declaracoes);
      const base64 = pdfBuffer.toString('base64');

      this.logger.log(`${declaracoes.length} declaracoes geradas`);

      return {
        success: true,
        pdf: `data:application/pdf;base64,${base64}`,
        total: declaracoes.length,
      };
    } catch (error) {
      this.logger.error('Erro ao gerar multiplas declaracoes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerar PDF',
      };
    }
  }

  private mapearParaDados(body: GerarDeclaracaoDTO): DadosDeclaracao {
    return {
      trackingCode: body.trackingCode,
      numeroPedido: body.numeroPedido,
      destinatario: body.destinatario,
      itens: body.itens.map((item) => ({
        sku: item.sku || '',
        descricao: item.descricao || '',
        quantidade: item.quantidade,
        valor: item.valor,
      })),
      valorTotal: body.valorTotal,
      volumes: body.volumes,
    };
  }

  private validarInput(body: GerarDeclaracaoDTO): void {
    if (!body) {
      throw new BadRequestException('Dados da declaracao sao obrigatorios');
    }
    if (!body.trackingCode) {
      throw new BadRequestException('trackingCode e obrigatorio');
    }
    if (!body.numeroPedido) {
      throw new BadRequestException('numeroPedido e obrigatorio');
    }
    if (!body.destinatario) {
      throw new BadRequestException('destinatario e obrigatorio');
    }
    if (!body.destinatario.nome) {
      throw new BadRequestException('destinatario.nome e obrigatorio');
    }
    if (!Array.isArray(body.itens) || body.itens.length === 0) {
      throw new BadRequestException('itens deve ser um array com pelo menos 1 item');
    }
    if (typeof body.valorTotal !== 'number' || body.valorTotal < 0) {
      throw new BadRequestException('valorTotal deve ser um numero positivo');
    }
  }
}
