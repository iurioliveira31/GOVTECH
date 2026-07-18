import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
    },
  };

  const mockJwt = {
    signAsync: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should authenticate user and return tokens', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        role: 'USER',
        tenantId: 'tenant-123',
        isActive: true,
      };

      const mockSub = {
        plan: 'PRO',
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodEnd: null,
        hasUsedTrial: true,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockJwt.signAsync as jest.Mock).mockResolvedValue('token-abc');
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(mockSub);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
      expect(result.subscription?.plan).toBe('PRO');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token', async () => {
      const mockStoredToken = {
        id: 'token-id-123',
        userId: 'user-123',
        tokenHash: 'somehash',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'USER',
          tenantId: 'tenant-123',
          isActive: true,
        },
      };

      (mockPrisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(mockStoredToken);
      (mockPrisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
      (mockJwt.signAsync as jest.Mock).mockResolvedValue('new-token-abc');
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.refresh({
        refreshToken: 'uuid-123.somehex',
      });

      expect(result).toHaveProperty('accessToken', 'new-token-abc');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-id-123' },
      });
    });

    it('should throw ForbiddenException if token invalid/expired', async () => {
      (mockPrisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should delete specific refresh token if provided', async () => {
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});

      await service.logout('user-123', 'token-123');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          tokenHash: service.hashToken('token-123'),
        },
      });
    });

    it('should delete all tokens on global logout', async () => {
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});

      await service.logout('user-123');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });
});
