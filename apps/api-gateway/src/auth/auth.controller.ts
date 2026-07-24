import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, UpdateMeDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

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
  @Throttle({ login: { limit: 5, ttl: 60000 } })
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
  }  /**
   * PUT /auth/me
   * Atualiza perfil do usuário autenticado.
   */
  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(req.user.sub, dto);
  }

  /**
   * POST /auth/verify-email
   * Valida o token JWT e confirma o e-mail do usuário.
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  /**
   * POST /auth/resend-verification
   * Reenvia o e-mail com um novo token JWT de confirmação para o usuário autenticado.
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  resendVerification(@Req() req: AuthenticatedRequest) {
    return this.authService.resendVerification(req.user.sub);
  }

  /**
   * POST /auth/mfa/verify
   * Valida o token provisório do MFA e o código de 6 dígitos.
   */
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  verifyMfa(
    @Body('mfaToken') mfaToken: string,
    @Body('code') code: string,
  ) {
    return this.authService.verifyMfa(mfaToken, code);
  }
}
