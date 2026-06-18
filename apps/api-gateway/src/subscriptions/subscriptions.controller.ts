import {
  Controller, Post, Get, Body, Req, Headers, RawBodyRequest,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { RegisterDto, StartTrialDto, CreateCheckoutDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';

interface AuthRequest extends Request {
  user: { sub: string; email: string; role: string; tenantId: string };
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  /** POST /subscriptions/register — Criar conta + escolher plano */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.subscriptions.register(dto);
  }

  /** POST /subscriptions/trial — Iniciar trial (usuário já logado) */
  @Post('trial')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  startTrial(@Req() req: AuthRequest, @Body() dto: StartTrialDto) {
    return this.subscriptions.startTrial(req.user.sub, dto);
  }

  /** POST /subscriptions/checkout — Criar sessão Stripe Checkout */
  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  createCheckout(@Req() req: AuthRequest, @Body() dto: CreateCheckoutDto) {
    return this.subscriptions.createCheckout(req.user.sub, dto);
  }

  /** POST /subscriptions/portal — Customer Portal do Stripe */
  @Post('portal')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  createPortal(@Req() req: AuthRequest) {
    return this.subscriptions.createPortal(req.user.sub);
  }

  /** POST /subscriptions/webhook — Stripe Webhook (NUNCA bloqueado por auth) */
  @Post('webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    // rawBody é configurado no main.ts via bodyParser
    const payload = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.subscriptions.handleWebhook(payload, signature);
  }

  /** GET /subscriptions/me — Subscription do usuário logado */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMySubscription(@Req() req: AuthRequest) {
    return this.subscriptions.getMySubscription(req.user.sub);
  }
}
