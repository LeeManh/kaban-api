import { Module } from '@nestjs/common';
import { CardsModule } from '../cards/cards.module';
import { StorageModule } from '../storage/storage.module';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';

@Module({
  imports: [StorageModule, CardsModule],
  controllers: [BoardsController],
  providers: [BoardsService],
})
export class BoardsModule {}
