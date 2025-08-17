import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  errorDetails?: string;
  timestamp: string;
}

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errorCode = 'INTERNAL_ERROR';
        let errorDetails = '';

        if (error instanceof HttpException) {
          status = error.getStatus();
          const response = error.getResponse() as any;
          
          if (typeof response === 'string') {
            message = response;
          } else if (response && response.message) {
            message = Array.isArray(response.message) 
              ? response.message[0] 
              : response.message;
          }
          
          // Map HTTP status codes to error codes
          switch (status) {
            case HttpStatus.BAD_REQUEST:
              errorCode = 'VALIDATION_ERROR';
              break;
            case HttpStatus.UNAUTHORIZED:
              errorCode = 'UNAUTHORIZED';
              break;
            case HttpStatus.FORBIDDEN:
              errorCode = 'FORBIDDEN';
              break;
            case HttpStatus.NOT_FOUND:
              errorCode = 'NOT_FOUND';
              break;
            case HttpStatus.CONFLICT:
              errorCode = 'CONFLICT';
              break;
            default:
              errorCode = 'HTTP_ERROR';
          }
        }

        const errorResponse: ErrorResponse = {
          success: false,
          error: message,
          errorCode,
          errorDetails,
          timestamp: new Date().toISOString(),
        };

        return throwError(() => new HttpException(errorResponse, status));
      }),
    );
  }
}
