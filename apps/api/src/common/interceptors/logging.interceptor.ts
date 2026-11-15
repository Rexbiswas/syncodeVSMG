import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { LoggerService } from '../../logger/logger.service.js';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl } = req;
    const start = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Math.round((performance.now() - start) * 100) / 100;
          this.logger.log(
            `[${method}] ${originalUrl} ${res.statusCode} - ${duration}ms`,
            'HTTP',
          );
        },
        error: (err) => {
          const duration = Math.round((performance.now() - start) * 100) / 100;
          this.logger.warn(
            `[${method}] ${originalUrl} failed after ${duration}ms: ${err.message}`,
            'HTTP',
          );
        },
      }),
    );
  }
}

