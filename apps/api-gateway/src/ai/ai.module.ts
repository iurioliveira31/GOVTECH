import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiService } from '@aplicativo/ai';
import { AiController } from './ai.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AiController],
  providers:   [GeminiService],
  exports:     [GeminiService],
})
export class AiModule {}
