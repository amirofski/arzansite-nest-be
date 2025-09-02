import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest();
    const start = Date.now();

    // Sanitize headers
    const headers = { ...req.headers };
    if (headers['authorization']) headers['authorization'] = 'REDACTED';
    if (headers['cookie']) headers['cookie'] = 'REDACTED';

    const meta = {
      id: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user?.id || req.user?.user_id || undefined,
    };

    return next.handle().pipe(
      tap(() => {
        const res = httpCtx.getResponse();
        const durationMs = Date.now() - start;
        this.logger.log(
          `${meta.method} ${meta.url} ${res.statusCode} - ${durationMs}ms (user=${meta.userId || 'anon'})`
        );
      })
    );
  }
}


