import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../auth/types/jwt-payload.type';

/**
 * Lấy user hiện tại (đã được JWT Guard gắn vào `request.user`) trong controller.
 *
 * @example
 *   me(@GetUser() user: JwtPayload) {}      // lấy cả payload
 *   me(@GetUser('sub') userId: string) {}   // lấy 1 field
 */
export const GetUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
