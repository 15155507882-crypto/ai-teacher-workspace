import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器异常';
    let code = 50000;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      message =
        typeof exResponse === 'string' ? exResponse : (exResponse as any).message || message;

      if (status === 400 || status === 422) code = 40001;
      else if (status === 401) code = 40100;
      else if (status === 403) code = 40300;
      else if (status === 404) code = 40400;
      else if (status === 409) code = 40900;
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url}`,
        exception instanceof Error ? exception.stack : exception
      );
    }

    response.status(status).json({
      code,
      message: Array.isArray(message) ? message.join('; ') : message,
      data: null,
      requestId: request.headers['x-request-id'] || '',
    });
  }
}
