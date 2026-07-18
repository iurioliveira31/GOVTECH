import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    // rawBody necessário para verificação de assinatura do Stripe Webhook
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  // ── Segurança: Helmet (HTTP Security Headers) ─────────────────────────────
  // OWASP: Content-Security-Policy, X-Frame-Options, HSTS, etc.
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: nodeEnv === 'production',
    }),
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: nodeEnv === 'production' ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Validação Global (class-validator) ───────────────────────────────────
  // whitelist: remove propriedades não decoradas (previne mass-assignment)
  // forbidNonWhitelisted: rejeita requests com propriedades extras
  // transform: converte tipos automaticamente (string → number, etc.)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // ── Filtros e Interceptors Globais ─────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  // ── Prefixo global da API ─────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);
  Logger.log(
    `🚀 API Gateway rodando em http://localhost:${port}/api/v1 [${nodeEnv}]`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  Logger.error('Falha fatal ao iniciar API Gateway', err, 'Bootstrap');
  process.exit(1);
});
