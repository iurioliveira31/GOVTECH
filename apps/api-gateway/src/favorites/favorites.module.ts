import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FavoritesController } from './favorites.controller';

@Module({ imports: [AuthModule, PrismaModule], controllers: [FavoritesController] })
export class FavoritesModule {}
