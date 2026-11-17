process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_min16chars_long';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth/auth.service.js';
import { PasswordService } from '../auth/password.service.js';
import { TokenService } from '../auth/token.service.js';
import { AuthRateLimiterService } from '../auth/rate-limiter/auth-rate-limiter.service.js';
import { ConfigService } from '../config/config.service.js';
import { LoggerService } from '../logger/logger.service.js';
import { DatabaseService } from '../database/database.service.js';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let authService: AuthService;
  let passwordService: PasswordService;
  let tokenService: TokenService;
  let mockPrisma: any;
  let mockRateLimiter: any;
  let mockLogger: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      session: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      verificationToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      passwordResetToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (tasks) => {
        if (typeof tasks === 'function') return tasks(mockPrisma);
        return Promise.all(tasks);
      }),
    };

    const mockDatabaseService = {
      getPrisma: () => mockPrisma,
    } as unknown as DatabaseService;

    const configService = new ConfigService();
    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as LoggerService;

    passwordService = new PasswordService();
    tokenService = new TokenService(new JwtService(), configService);

    mockRateLimiter = {
      checkRateLimit: vi.fn().mockResolvedValue({ isLimited: false, remaining: 10, retryAfterSeconds: 0 }),
      reset: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthRateLimiterService;

    authService = new AuthService(
      mockDatabaseService,
      configService,
      mockLogger,
      passwordService,
      tokenService,
      mockRateLimiter,
    );
  });

  describe('register', () => {
    it('should register a new user, issue tokens, and create a session', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const mockCreatedUser = {
        id: 'user-uuid-1',
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice Cooper',
        avatarUrl: null,
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);
      mockPrisma.verificationToken.create.mockResolvedValue({ id: 'token-uuid-1' });
      mockPrisma.session.create.mockResolvedValue({ id: 'session-uuid-1' });

      const result = await authService.register({
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice Cooper',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(result.user.email).toBe('alice@example.com');
      expect(result.user.username).toBe('alice');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
      expect(mockPrisma.session.create).toHaveBeenCalledOnce();
    });

    it('should reject registration if email is already taken', async () => {
      mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.email) return { id: 'existing-id', email: 'alice@example.com' };
        return null;
      });

      await expect(
        authService.register({
          email: 'alice@example.com',
          username: 'alice_new',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      ).rejects.toThrowError('An account with this email address already exists');
    });

    it('should reject registration if username is already taken', async () => {
      mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.username) return { id: 'existing-id', username: 'alice' };
        return null;
      });

      await expect(
        authService.register({
          email: 'new_alice@example.com',
          username: 'alice',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      ).rejects.toThrowError('This username is already taken');
    });
  });

  describe('login', () => {
    it('should authenticate user and return session tokens on valid credentials', async () => {
      const passwordHash = await passwordService.hashPassword('Password123!');
      const mockUser = {
        id: 'user-uuid-1',
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        passwordHash,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue({ id: 'session-123' });

      const result = await authService.login({
        emailOrUsername: 'alice@example.com',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('alice@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockRateLimiter.reset).toHaveBeenCalledOnce();
    });

    it('should reject login if password is incorrect', async () => {
      const passwordHash = await passwordService.hashPassword('CorrectPassword123!');
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'alice@example.com',
        username: 'alice',
        passwordHash,
      });

      await expect(
        authService.login({
          emailOrUsername: 'alice@example.com',
          password: 'WrongPassword999#',
        }),
      ).rejects.toThrowError('Invalid email/username or password');
    });
  });

  describe('refresh token rotation & replay detection', () => {
    it('should rotate refresh token and issue new access token', async () => {
      const rawToken = 'test-refresh-token';
      const tokenHash = tokenService.hashToken(rawToken);

      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          emailVerifiedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);
      mockPrisma.session.update.mockResolvedValue({
        ...mockSession,
        refreshTokenHash: 'new-hash',
      });

      const result = await authService.refresh(rawToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(rawToken);
      expect(mockPrisma.session.update).toHaveBeenCalledOnce();
    });

    it('should detect replay attack and revoke all user sessions if a revoked token is presented', async () => {
      const rawToken = 'compromised-token';
      const tokenHash = tokenService.hashToken(rawToken);

      const mockRevokedSession = {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: new Date(Date.now() - 5000), // already revoked!
        user: { id: 'user-1' },
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockRevokedSession);

      await expect(authService.refresh(rawToken)).rejects.toThrowError(
        'Refresh token reuse detected. All sessions have been revoked for your security.',
      );

      // Verify all sessions were revoked for user-1
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });

    it('should reject expired session', async () => {
      const rawToken = 'expired-token';
      const tokenHash = tokenService.hashToken(rawToken);

      const mockExpiredSession = {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: tokenHash,
        expiresAt: new Date(Date.now() - 100000), // in the past
        revokedAt: null,
        user: { id: 'user-1' },
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockExpiredSession);

      await expect(authService.refresh(rawToken)).rejects.toThrowError('Session has expired');
    });
  });

  describe('email verification', () => {
    it('should verify email address with valid token and mark used', async () => {
      const rawToken = 'valid-verification-token';
      const tokenHash = tokenService.hashToken(rawToken);

      mockPrisma.verificationToken.findFirst.mockResolvedValue({
        id: 'vt-1',
        userId: 'user-1',
        tokenHash,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });

      const res = await authService.verifyEmail({ token: rawToken });
      expect(res.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });

    it('should reject invalid or expired verification token', async () => {
      mockPrisma.verificationToken.findFirst.mockResolvedValue(null);

      await expect(authService.verifyEmail({ token: 'invalid' })).rejects.toThrowError(
        'Email verification token is invalid or has expired',
      );
    });
  });

  describe('password reset flow', () => {
    it('should reset password, mark token used, and revoke all active sessions', async () => {
      const rawToken = 'valid-reset-token';
      const tokenHash = tokenService.hashToken(rawToken);

      mockPrisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'prt-1',
        userId: 'user-1',
        tokenHash,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });

      const res = await authService.resetPassword({
        token: rawToken,
        newPassword: 'BrandNewPassword123!',
        confirmNewPassword: 'BrandNewPassword123!',
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });
  });
});
