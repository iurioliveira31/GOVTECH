import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody = exception.getResponse();

      if (typeof resBody === 'object' && resBody !== null) {
        message = (resBody as any).message || exception.message;
        details = (resBody as any).error || null;
      } else if (typeof resBody === 'string') {
        message = resBody;
      } else {
        message = exception.message;
      }
    } else {
      // Registrar erros não tratados (500) para monitoramento
      this.logger.error(
        `Erro não tratado na rota ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
      
      if (exception instanceof Error) {
        message = exception.message;
      }
    }

    // Estrutura unificada de erro
    response.status(status).json({
      success: false,
      error: {
        message: Array.isArray(message) ? message[0] : message,
        code: status,
        details: Array.isArray(message) ? message : details,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
