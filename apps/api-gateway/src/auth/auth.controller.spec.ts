import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    updateMe: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn((context: ExecutionContext) => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: {} }, // Mock JwtService para evitar erros de injeção
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login and return result', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const expectedResult = { accessToken: 'access', refreshToken: 'refresh' };
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toBe(expectedResult);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh and return tokens', async () => {
      const refreshDto = { refreshToken: 'uuid-123.somehex' };
      const expectedResult = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      mockAuthService.refresh.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshDto);

      expect(service.refresh).toHaveBeenCalledWith(refreshDto);
      expect(result).toBe(expectedResult);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user ID and token', async () => {
      const mockReq = {
        user: { sub: 'user-123', email: 'test@example.com', role: 'USER', tenantId: 'tenant-123' },
      } as any;
      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(mockReq, 'refresh-token-abc');

      expect(service.logout).toHaveBeenCalledWith('user-123', 'refresh-token-abc');
    });
  });

  describe('me', () => {
    it('should return the current user profile', async () => {
      const mockReq = {
        user: { sub: 'user-123', email: 'test@example.com', role: 'USER', tenantId: 'tenant-123' },
      } as any;
      const expectedProfile = { id: 'user-123', email: 'test@example.com', nome: 'Test User' };
      mockAuthService.me.mockResolvedValue(expectedProfile);

      const result = await controller.me(mockReq);

      expect(service.me).toHaveBeenCalledWith('user-123');
      expect(result).toBe(expectedProfile);
    });
  });

  describe('updateMe', () => {
    it('should call authService.updateMe and return updated profile', async () => {
      const mockReq = {
        user: { sub: 'user-123', email: 'test@example.com', role: 'USER', tenantId: 'tenant-123' },
      } as any;
      const updateDto = { nome: 'New Name' };
      const expectedProfile = { id: 'user-123', email: 'test@example.com', nome: 'New Name' };
      mockAuthService.updateMe.mockResolvedValue(expectedProfile);

      const result = await controller.updateMe(mockReq, updateDto);

      expect(service.updateMe).toHaveBeenCalledWith('user-123', updateDto);
      expect(result).toBe(expectedProfile);
    });
  });
});
