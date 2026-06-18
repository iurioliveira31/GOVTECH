import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PncpModule } from './pncp/pncp.module';
import { SearchModule } from './search/search.module';
import { AiModule } from './ai/ai.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AlertsModule } from './alerts/alerts.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { EmailModule } from './email/email.module';
import { AuditMiddleware } from './common/middleware/audit.middleware';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    // ── Configuração global ─────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // ── Rate Limiting global ────────────────────────────────────────────────
    // Protege contra abuso de API: 100 requests por 60s por IP (configurável via env)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60_000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // ── Módulos de domínio ──────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    PncpModule,
    SearchModule,
    AiModule,
    FavoritesModule,
    AlertsModule,
    // ── Billing & E-mail ───────────────────────────────────────────────────────
    SubscriptionsModule,
    EmailModule,
  ],
  providers: [
    // Rate limiting aplicado globalmente em todos os endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware, AuditMiddleware).forRoutes('*');
  }
}
