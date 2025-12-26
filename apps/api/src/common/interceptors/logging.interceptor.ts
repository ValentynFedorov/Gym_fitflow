import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest() as any;
    const { method, url } = request;
    const started = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - started;
        // eslint-disable-next-line no-console
        console.log(`${method} ${url} - ${duration}ms`);
      }),
    );
  }
}
