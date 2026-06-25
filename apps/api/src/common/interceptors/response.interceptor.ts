import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface WrappedResponse<T> {
  code: number;
  message: string;
  data: T;
  requestId: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, WrappedResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<WrappedResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId =
      request.headers['x-request-id'] ||
      `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'success',
        data,
        requestId,
      }))
    );
  }
}
