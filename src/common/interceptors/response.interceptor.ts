import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { map, Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

type SuccessResponse<T> = {
  statusCode: number;
  message: string;
  data: T;
};

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept<T>(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Thành công';

    return next.handle().pipe(
      map(
        (data: T): SuccessResponse<T> => ({
          statusCode: response.statusCode,
          message,
          data,
        }),
      ),
    );
  }
}
