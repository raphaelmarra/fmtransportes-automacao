import { Controller, Get, Logger } from '@nestjs/common';
import { TinyService } from '../integrations/tiny/tiny.service';
import { FMTransportesService } from '../integrations/fmtransportes/fm.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly tinyService: TinyService,
    private readonly fmService: FMTransportesService,
  ) {}

  /**
   * GET /health
   * Verifica status das conexoes com APIs externas
   */
  @Get()
  async getHealth() {
    this.logger.log('Verificando saude das conexoes...');

    const [tinyOk, fmOk] = await Promise.all([
      this.tinyService.verificarConexao(),
      this.fmService.verificarConexao(),
    ]);

    const status = tinyOk && fmOk ? 'healthy' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        tiny: {
          status: tinyOk ? 'ok' : 'error',
          url: process.env.TINY_API_URL || 'http://tiny.sdebot.top:3011/api/tiny',
        },
        fmtransportes: {
          status: fmOk ? 'ok' : 'error',
          url: process.env.FM_API_URL || 'https://integration.fmtransportes.com.br/api',
        },
      },
    };
  }
}
