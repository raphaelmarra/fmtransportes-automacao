import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { TinyModule } from './integrations/tiny/tiny.module';
import { FMTransportesModule } from './integrations/fmtransportes/fm.module';
import { DeclaracaoModule } from './core/declaracao/declaracao.module';
import { PedidosController } from './api/pedidos.controller';
import { EnvioController } from './api/envio.controller';
import { HealthController } from './api/health.controller';
import { EtiquetasController } from './api/etiquetas.controller';
import { MonitoramentoController } from './api/monitoramento.controller';
import { DeclaracaoController } from './api/declaracao.controller';

@Module({
  imports: [CoreModule, TinyModule, FMTransportesModule, DeclaracaoModule],
  controllers: [
    PedidosController,
    EnvioController,
    HealthController,
    EtiquetasController,
    MonitoramentoController,
    DeclaracaoController,
  ],
})
export class AppModule {}
