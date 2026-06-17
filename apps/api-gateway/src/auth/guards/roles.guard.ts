import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard — RBAC (Role-Based Access Control)
 * Verifica se o usuário autenticado possui os roles necessários para o endpoint.
 * Deve ser usado APÓS o JwtAuthGuard (que popula request.user).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se nenhum role exigido, qualquer usuário autenticado pode acessar
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      throw new ForbiddenException('Role de usuário não encontrado no token');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Acesso negado. Roles necessários: ${requiredRoles.join(', ')}. Role atual: ${user.role}`,
      );
    }

    return true;
  }
}
