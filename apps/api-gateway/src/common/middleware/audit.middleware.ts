import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * AuditMiddleware — registra cada request para fins de auditoria e observabilidade.
 * Logs estruturados em JSON: método, path, status, duração, tenantId, userId.
 *
 * Em produção, estes logs devem ser ingeridos pelo Loki/CloudWatch.
 */
@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Audit');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.headers['user-agent'] ?? '';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const user = (req as any).user;
      const tenantId = user?.tenantId ?? (req as any).tenantIdHint ?? 'anonymous';

      this.logger.log({
        type: 'http_request',
        method,
        path: originalUrl,
        statusCode,
        durationMs: duration,
        tenantId,
        userId: user?.sub ?? 'unauthenticated',
        ip,
        userAgent,
      });
    });

    next();
  }
}
