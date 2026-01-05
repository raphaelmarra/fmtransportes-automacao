import { Module } from '@nestjs/common';
import { DeclaracaoService } from './declaracao.service';

@Module({
  providers: [DeclaracaoService],
  exports: [DeclaracaoService],
})
export class DeclaracaoModule {}
