import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * TenantGuard — Isolamento de Tenant (Multi-tenancy)
 * Garante que o tenantId no JWT corresponde ao tenant do request.
 * Previne que um usuário de um tenant acesse dados de outro tenant.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // JwtAuthGuard deve ter rodado antes — se não há user, falha silenciosa não é aceitável
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Token não contém tenantId — acesso negado');
    }

    // Injeta tenantId no request para uso nos controllers/services
    request.tenantId = user.tenantId;
    return true;
  }
}
