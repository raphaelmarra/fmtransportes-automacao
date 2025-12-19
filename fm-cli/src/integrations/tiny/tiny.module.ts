import { Module } from '@nestjs/common';
import { TinyService } from './tiny.service';

@Module({
  providers: [TinyService],
  exports: [TinyService],
})
export class TinyModule {}
