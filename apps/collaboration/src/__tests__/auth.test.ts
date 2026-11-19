import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { WorkspaceRole } from '@syncode/database';
import { CollaborationErrorCode } from '@syncode/protocol';
import { TokenVerifier, AuthenticationError } from '../auth/token-verifier.js';
import { RoomAuthorizer, AuthorizationError } from '../auth/room-authorizer.js';

describe('Collaboration Engine - Authentication & Room Authorization', () => {
  const secret = 'test_jwt_secret_key_1234567890123456';
  const tokenVerifier = new TokenVerifier(secret);

  describe('TokenVerifier', () => {
    it('should successfully verify a valid JWT token', () => {
      const payload = {
        sub: 'user-123',
        email: 'dev@syncode.dev',
        username: 'coder',
      };
      const token = jwt.sign(payload, secret, { expiresIn: '15m' });

      const verified = tokenVerifier.verify(token);
      expect(verified.id).toBe('user-123');
      expect(verified.email).toBe('dev@syncode.dev');
      expect(verified.username).toBe('coder');
    });

    it('should reject an expired JWT token with TOKEN_EXPIRED code', () => {
      const payload = { sub: 'user-123', email: 'dev@syncode.dev' };
      const expiredToken = jwt.sign(payload, secret, { expiresIn: '-1s' });

      expect(() => tokenVerifier.verify(expiredToken)).toThrowError(AuthenticationError);
      try {
        tokenVerifier.verify(expiredToken);
      } catch (err: unknown) {
        expect((err as AuthenticationError).code).toBe(CollaborationErrorCode.TOKEN_EXPIRED);
      }
    });

    it('should reject a token with invalid signature with INVALID_TOKEN code', () => {
      const token = jwt.sign({ sub: 'user-123', email: 'dev@syncode.dev' }, 'wrong_secret');

      expect(() => tokenVerifier.verify(token)).toThrowError(AuthenticationError);
      try {
        tokenVerifier.verify(token);
      } catch (err: unknown) {
        expect((err as AuthenticationError).code).toBe(CollaborationErrorCode.INVALID_TOKEN);
      }
    });

    it('should reject missing or empty token', () => {
      expect(() => tokenVerifier.verify('')).toThrowError(AuthenticationError);
    });
  });

  describe('RoomAuthorizer', () => {
    const mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      room: {
        findUnique: vi.fn(),
      },
      workspaceMember: {
        findUnique: vi.fn(),
      },
    };

    const authorizer = new RoomAuthorizer(mockPrisma as any);

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should authorize a workspace member with MEMBER role (write access)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'member@syncode.dev',
        username: 'member1',
        displayName: 'Member One',
        avatarUrl: null,
      });

      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        name: 'Main Editor',
        slug: 'main-editor',
        workspaceId: 'ws-1',
        visibility: 'PRIVATE',
        workspace: {
          id: 'ws-1',
          slug: 'team-alpha',
          visibility: 'PRIVATE',
          ownerId: 'owner-id',
        },
      });

      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: WorkspaceRole.MEMBER,
      });

      const result = await authorizer.authorize('user-1', 'room-1');
      expect(result.role).toBe(WorkspaceRole.MEMBER);
      expect(result.isReadOnly).toBe(false);
      expect(result.user.username).toBe('member1');
    });

    it('should enforce isReadOnly=true for VIEWER role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-viewer',
        email: 'viewer@syncode.dev',
        username: 'viewer1',
        displayName: null,
        avatarUrl: null,
      });

      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        name: 'Main Editor',
        slug: 'main-editor',
        workspaceId: 'ws-1',
        visibility: 'PRIVATE',
        workspace: {
          id: 'ws-1',
          slug: 'team-alpha',
          visibility: 'PRIVATE',
          ownerId: 'owner-id',
        },
      });

      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: 'ws-1',
        userId: 'user-viewer',
        role: WorkspaceRole.VIEWER,
      });

      const result = await authorizer.authorize('user-viewer', 'room-1');
      expect(result.role).toBe(WorkspaceRole.VIEWER);
      expect(result.isReadOnly).toBe(true);
    });

    it('should reject non-members attempting to access private workspace room', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'outsider',
        email: 'outsider@syncode.dev',
        username: 'outsider',
      });

      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        workspaceId: 'ws-1',
        visibility: 'PRIVATE',
        workspace: {
          id: 'ws-1',
          visibility: 'PRIVATE',
          ownerId: 'owner-id',
        },
      });

      mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(authorizer.authorize('outsider', 'room-1')).rejects.toThrowError(AuthorizationError);
      try {
        await authorizer.authorize('outsider', 'room-1');
      } catch (err: unknown) {
        expect((err as AuthorizationError).code).toBe(CollaborationErrorCode.ROOM_FORBIDDEN);
      }
    });

    it('should grant guest VIEWER access for public room in public workspace', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'public-guest',
        email: 'guest@syncode.dev',
        username: 'guest',
        displayName: null,
        avatarUrl: null,
      });

      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-public',
        name: 'Public Showcase',
        slug: 'public-showcase',
        workspaceId: 'ws-public',
        visibility: 'PUBLIC',
        workspace: {
          id: 'ws-public',
          slug: 'open-source',
          visibility: 'PUBLIC',
          ownerId: 'someone-else',
        },
      });

      mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

      const result = await authorizer.authorize('public-guest', 'room-public');
      expect(result.role).toBe(WorkspaceRole.VIEWER);
      expect(result.isReadOnly).toBe(true);
    });

    it('should throw ROOM_NOT_FOUND when room does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await expect(authorizer.authorize('user-1', 'nonexistent-room')).rejects.toThrowError(AuthorizationError);
    });
  });
});
