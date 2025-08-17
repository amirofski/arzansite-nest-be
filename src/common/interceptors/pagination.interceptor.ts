import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
export class PaginationInterceptor<T>
  implements NestInterceptor<T, PaginatedResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<PaginatedResponse<T>> {
    return next.handle().pipe(
      map((data: any) => {
        if (data && data.data && data.pagination) {
          return {
            success: true,
            data: data.data,
            pagination: data.pagination,
            timestamp: new Date().toISOString(),
          };
        }
        
        // Fallback for non-paginated data
        return {
          success: true,
          data: data,
          pagination: {
            page: 1,
            limit: data?.length || 0,
            total: data?.length || 0,
            pages: 1,
          },
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
