import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '../users/users.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('UsersService', () => {
  let usersService: UsersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      session: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };

    const mockDatabase = {
      getPrisma: () => mockPrisma,
    } as unknown as DatabaseService;

    usersService = new UsersService(mockDatabase);
  });

  describe('getProfile', () => {
    it('should return user profile without sensitive fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice Cooper',
        avatarUrl: null,
        passwordHash: 'secret-hash-never-leaked',
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await usersService.getProfile('user-uuid-1');
      expect(profile.id).toBe('user-uuid-1');
      expect(profile.email).toBe('alice@example.com');
      expect((profile as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(usersService.getProfile('non-existent')).rejects.toThrowError('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice Old',
        avatarUrl: null,
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice New Name',
        avatarUrl: 'https://example.com/avatar.png',
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await usersService.updateProfile('user-uuid-1', {
        displayName: 'Alice New Name',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(updated.displayName).toBe('Alice New Name');
      expect(updated.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('should prevent updating to an already taken username', async () => {
      mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.id === 'user-uuid-1') {
          return { id: 'user-uuid-1', username: 'alice' };
        }
        if (where.username === 'bob') {
          return { id: 'user-uuid-2', username: 'bob' };
        }
        return null;
      });

      await expect(
        usersService.updateProfile('user-uuid-1', { username: 'bob' }),
      ).rejects.toThrowError('This username is already taken');
    });
  });

  describe('getSessions & revokeSession', () => {
    it('should list sessions without sensitive refreshTokenHash', async () => {
      const now = new Date();
      mockPrisma.session.findMany.mockResolvedValue([
        {
          id: 'sess-1',
          userId: 'user-1',
          refreshTokenHash: 'sha256-hash-secret',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          expiresAt: new Date(Date.now() + 100000),
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const sessions = await usersService.getSessions('user-1', 'sess-1');
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe('sess-1');
      expect(sessions[0]?.isCurrent).toBe(true);
      expect((sessions[0] as any).refreshTokenHash).toBeUndefined();
    });

    it('should revoke a session by setting revokedAt', async () => {
      mockPrisma.session.findFirst.mockResolvedValue({
        id: 'sess-1',
        userId: 'user-1',
      });

      mockPrisma.session.update.mockResolvedValue({
        id: 'sess-1',
        revokedAt: new Date(),
      });

      const res = await usersService.revokeSession('user-1', 'sess-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });
});
