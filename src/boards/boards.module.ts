import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';

@Module({
  imports: [StorageModule],
  controllers: [BoardsController],
  providers: [BoardsService],
})
export class BoardsModule {}
