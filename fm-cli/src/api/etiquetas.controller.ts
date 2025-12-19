import { Controller, Post, Body, Get, Param, Logger } from '@nestjs/common';
import { FMTransportesService } from '../integrations/fmtransportes/fm.service';
import { EtiquetaResultado } from '../integrations/fmtransportes/fm.interface';

interface GerarEtiquetasDTO {
  trackingCodes: string[];
}

@Controller('etiquetas')
export class EtiquetasController {
  private readonly logger = new Logger(EtiquetasController.name);

  constructor(private readonly fmService: FMTransportesService) {}

  /**
   * POST /etiquetas
   * Gera etiquetas para multiplos trackingCodes
   */
  @Post()
  async gerarEtiquetas(@Body() body: GerarEtiquetasDTO): Promise<{
    success: boolean;
    etiquetas: EtiquetaResultado[];
    resumo: { total: number; sucessos: number; falhas: number };
  }> {
    const { trackingCodes } = body;

    if (!trackingCodes || trackingCodes.length === 0) {
      return {
        success: false,
        etiquetas: [],
        resumo: { total: 0, sucessos: 0, falhas: 0 },
      };
    }

    this.logger.log(`Gerando etiquetas para ${trackingCodes.length} tracking codes`);

    const etiquetas = await this.fmService.gerarEtiquetas(trackingCodes);

    const sucessos = etiquetas.filter((e) => e.sucesso).length;
    const falhas = etiquetas.filter((e) => !e.sucesso).length;

    return {
      success: sucessos > 0,
      etiquetas,
      resumo: {
        total: trackingCodes.length,
        sucessos,
        falhas,
      },
    };
  }

  /**
   * GET /etiquetas/:labelId
   * Baixa URL de uma etiqueta especifica
   */
  @Get(':labelId')
  async baixarEtiqueta(@Param('labelId') labelId: string): Promise<{
    success: boolean;
    url: string | null;
    erro?: string;
  }> {
    this.logger.log(`Baixando etiqueta: ${labelId}`);

    const { url, erro } = await this.fmService.baixarEtiqueta(labelId);

    return {
      success: !!url,
      url,
      erro,
    };
  }
}
