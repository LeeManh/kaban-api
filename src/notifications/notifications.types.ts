import type { NotificationType } from 'generated/prisma/enums';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  message: string;
  link?: string;
}
