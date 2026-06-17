import { Module } from '@nestjs/common';
import { PncpController } from './pncp.controller';
import { PncpService } from './pncp.service';
import { PncpSyncService } from './pncp-sync.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PncpController],
  providers: [PncpService, PncpSyncService],
  exports: [PncpService],
})
export class PncpModule {}
