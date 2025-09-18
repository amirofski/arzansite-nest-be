import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((body) => {
        const ts = new Date().toISOString();
        // Idempotent: if already wrapped, return as-is (ensure timestamp exists)
        if (body && typeof body === 'object') {
          const hasSuccess = Object.prototype.hasOwnProperty.call(body as any, 'success');
          const hasPayloadKey = ['data', 'items', 'pagination'].some((k) => Object.prototype.hasOwnProperty.call(body as any, k));
          if (hasSuccess && hasPayloadKey) {
            return Object.prototype.hasOwnProperty.call(body as any, 'timestamp')
              ? (body as any)
              : ({ ...(body as any), timestamp: ts } as any);
          }
        }
        return { success: true, data: body as any, timestamp: ts } as any;
      }),
    );
  }
}
