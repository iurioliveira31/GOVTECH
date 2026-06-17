import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * TenantMiddleware — extrai tenantId do header X-Tenant-ID ou do subdomínio.
 * Popula request.tenantId para uso em serviços e guards.
 *
 * Em produção, o tenantId real vem do JWT (via TenantGuard).
 * Este middleware serve como camada adicional para identificação antecipada
 * útil em logging e observabilidade.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const tenantHeader = req.headers['x-tenant-id'] as string | undefined;

    if (tenantHeader) {
      // Sanitiza para evitar injection via header
      (req as any).tenantIdHint = tenantHeader.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    }

    next();
  }
}
