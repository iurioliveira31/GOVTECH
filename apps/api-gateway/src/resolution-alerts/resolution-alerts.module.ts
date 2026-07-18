import { Module } from '@nestjs/common';
import { ResolutionAlertsController } from './resolution-alerts.controller';
import { ResolutionAlertsService } from './resolution-alerts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, EmailModule, AuthModule],
  controllers: [ResolutionAlertsController],
  providers: [ResolutionAlertsService],
})
export class ResolutionAlertsModule {}
