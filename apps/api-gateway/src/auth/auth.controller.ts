import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Autentica email + senha, devolve accessToken, refreshToken e perfil do usuário.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/refresh
   * Renova accessToken via refreshToken (rotation: invalida o token antigo).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  /**
   * POST /auth/logout
   * Invalida o(s) refresh token(s) do usuário autenticado.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  logout(
    @Req() req: AuthenticatedRequest,
    @Body('refreshToken') refreshToken?: string,
  ) {
    return this.authService.logout(req.user.sub, refreshToken);
  }

  /**
   * GET /auth/me
   * Retorna perfil completo do usuário autenticado com dados do tenant.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user.sub);
  }
}
