import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    // Busca o usuário atualizado no banco de dados para evitar bypass local de sessão
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { emailVerifiedAt: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('Usuário não encontrado.');
    }

    if (!dbUser.emailVerifiedAt) {
      throw new ForbiddenException(
        'Acesso restrito: por favor, confirme seu e-mail para habilitar estas funcionalidades.',
      );
    }

    return true;
  }
}
