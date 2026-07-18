import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RefreshDto } from './dto/auth.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Login
  // ──────────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    // 1. Buscar usuário pelo email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      // Tempo constante para evitar enumeração de usuário
      await bcrypt.compare('dummy', '$2b$10$dummyhashtopreventtimingattacks');
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 2. Gerar tokens
    const { accessToken, refreshToken, refreshTokenHash } = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    // 3. Salvar refresh token hasheado no banco
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    // 4. Atualizar lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Buscar subscription para retornar no login (frontend seta cookies)
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
      select: {
        plan: true,
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        hasUsedTrial: true,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nome: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            hasUsedTrial: subscription.hasUsedTrial,
          }
        : null,
    };
  }


  // ──────────────────────────────────────────────────────────────────────────
  // Refresh Token Rotation
  // ──────────────────────────────────────────────────────────────────────────

  async refresh(dto: RefreshDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, email: true, role: true, tenantId: true, isActive: true },
        },
      },
    });

    if (!stored || !stored.user.isActive) {
      throw new ForbiddenException('Refresh token inválido ou expirado');
    }

    // Rotation: invalidar token antigo
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const { accessToken, refreshToken, refreshTokenHash } = await this.generateTokens({
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
      tenantId: stored.user.tenantId,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: stored.user.id,
        tenantId: stored.user.tenantId,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Logout
  // ──────────────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.deleteMany({
        where: { userId, tokenHash },
      });
    } else {
      // Logout global: invalida todos os refresh tokens do usuário
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Me — perfil do usuário autenticado
  // ──────────────────────────────────────────────────────────────────────────

  private get userProfileSelect() {
    return {
      id: true,
      email: true,
      name: true,
      telefone: true,
      role: true,
      tenantId: true,
      isActive: true,
      mfaEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      tenant: {
        select: { id: true, name: true, slug: true, status: true },
      },
    };
  }

  private mapUserToProfile(user: any) {
    return {
      id: user.id,
      email: user.email,
      nome: user.name,
      telefone: user.telefone,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt,
      memberSince: user.createdAt,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: this.userProfileSelect,
    });

    return this.mapUserToProfile(user);
  }

  async updateMe(userId: string, dto: import('./dto/auth.dto').UpdateMeDto) {
    const updateData: any = {};
    if (dto.nome !== undefined) updateData.name = dto.nome;
    if (dto.telefone !== undefined) updateData.telefone = dto.telefone;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: this.userProfileSelect,
    });

    return this.mapUserToProfile(user);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  public async generateTokens(payload: JwtPayload) {
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    // Refresh token é um UUID opaco (não contém dados) — hasheado no banco
    const refreshToken = crypto.randomUUID() + '.' + crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);

    return { accessToken, refreshToken, refreshTokenHash };
  }

  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
