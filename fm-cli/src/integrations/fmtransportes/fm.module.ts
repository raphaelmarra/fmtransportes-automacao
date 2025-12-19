import { Module } from '@nestjs/common';
import { FMTransportesService } from './fm.service';

@Module({
  providers: [FMTransportesService],
  exports: [FMTransportesService],
})
export class FMTransportesModule {}
