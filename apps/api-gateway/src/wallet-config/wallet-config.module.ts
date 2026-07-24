import { Module } from '@nestjs/common';
import { WalletConfigController } from './wallet-config.controller';
import { WalletConfigService } from './wallet-config.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WalletConfigController],
  providers: [WalletConfigService],
  exports: [WalletConfigService],
})
export class WalletConfigModule {}
