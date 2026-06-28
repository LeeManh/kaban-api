import { Module } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { LabelsController } from './labels.controller';
import { CardLabelsController } from './card-labels.controller';

@Module({
  controllers: [LabelsController, CardLabelsController],
  providers: [LabelsService],
})
export class LabelsModule {}
