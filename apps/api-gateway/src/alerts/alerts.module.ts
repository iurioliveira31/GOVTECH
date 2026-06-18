import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertsController } from './alerts.controller';

@Module({ imports: [AuthModule, PrismaModule], controllers: [AlertsController] })
export class AlertsModule {}
