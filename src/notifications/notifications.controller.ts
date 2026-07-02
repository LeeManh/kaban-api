import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ResponseMessage('Lấy danh sách thông báo thành công')
  findAll(@GetUser('sub') userId: string, @Query('unread') unread?: string) {
    return this.notificationsService.findAll(userId, unread === 'true');
  }

  @Get('unread-count')
  @ResponseMessage('Lấy số thông báo chưa đọc thành công')
  unreadCount(@GetUser('sub') userId: string) {
    return this.notificationsService.unreadCount(userId);
  }

  @Patch('read-all')
  @ResponseMessage('Đánh dấu đã đọc tất cả thành công')
  markAllRead(@GetUser('sub') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Patch(':id/read')
  @ResponseMessage('Đánh dấu đã đọc thành công')
  markRead(
    @GetUser('sub') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markRead(userId, notificationId);
  }
}
