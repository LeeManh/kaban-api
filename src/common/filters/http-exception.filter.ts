import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  errors?: FieldError[];
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, errors } = isHttpException
      ? this.extractBody(exception)
      : {
          message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
          errors: undefined,
        };

    if (!isHttpException) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
      Sentry.captureException(exception);
    }

    const body: ErrorResponse = {
      statusCode: status,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    response.status(status).json(body);
  }

  private extractBody(
    exception: HttpException,
  ): Pick<ErrorResponse, 'message' | 'errors'> {
    const body = exception.getResponse();
    if (typeof body === 'string') return { message: body };

    const { message, errors } = body as Pick<
      ErrorResponse,
      'message' | 'errors'
    >;
    return { message: message ?? exception.message, errors };
  }
}
