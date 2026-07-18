import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    console.log("JWT Auth Guard Check. Path:", request.path, "Auth Header:", request.headers.authorization, "Token:", token);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação ausente');
    }

    try {
      const payload = this.jwtService.verify(token);
      // Injeta payload no request para uso downstream
      (request as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  private extractToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
