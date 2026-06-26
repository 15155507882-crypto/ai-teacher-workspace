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
      map((data) => {
        // If controller already returned a formatted response (has numeric code AND message), pass through
        if (
          data &&
          typeof data === 'object' &&
          typeof (data as any).code === 'number' &&
          typeof (data as any).message === 'string'
        ) {
          return { ...(data as any), requestId: (data as any).requestId || requestId };
        }
        return {
          code: 0,
          message: 'success',
          data,
          requestId,
        };
      })
    );
  }
}
