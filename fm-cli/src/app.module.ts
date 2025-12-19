import { Module } from '@nestjs/common';
import { TinyModule } from './integrations/tiny/tiny.module';
import { FMTransportesModule } from './integrations/fmtransportes/fm.module';
import { PedidosController } from './api/pedidos.controller';
import { EnvioController } from './api/envio.controller';
import { HealthController } from './api/health.controller';

@Module({
  imports: [TinyModule, FMTransportesModule],
  controllers: [PedidosController, EnvioController, HealthController],
})
export class AppModule {}
