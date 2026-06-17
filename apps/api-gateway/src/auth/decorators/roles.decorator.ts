import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator @Roles() — define quais roles têm permissão para acessar o endpoint.
 *
 * @example
 * @Roles('ADMIN', 'OWNER')
 * @Get('admin-only')
 * adminEndpoint() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
