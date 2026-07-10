import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [StorageModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
