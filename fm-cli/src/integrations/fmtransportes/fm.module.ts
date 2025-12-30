import { Module } from '@nestjs/common';
import { FMTransportesService } from './fm.service';
import { TrackingService } from './tracking.service';

@Module({
  providers: [FMTransportesService, TrackingService],
  exports: [FMTransportesService, TrackingService],
})
export class FMTransportesModule {}
