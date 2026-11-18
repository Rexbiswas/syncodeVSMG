import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvitationsService } from '../workspaces/invitations.service.js';
import { DatabaseService } from '../database/database.service.js';
import { LoggerService } from '../logger/logger.service.js';
import { TokenService } from '../auth/token.service.js';
import { ConfigService } from '../config/config.service.js';
import { WorkspaceRole, InvitationStatus } from '@syncode/validation';

describe('InvitationsService', () => {
  let invitationsService: InvitationsService;
  let mockPrisma: any;
  let mockTokenService: any;
  let mockConfigService: any;
  let mockLogger: any;

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      workspaceMember: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      workspaceInvitation: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockPrisma)),
    };

    mockTokenService = {
      generateRandomToken: vi.fn().mockReturnValue('raw-random-token-12345'),
      hashToken: vi.fn().mockImplementation((t: string) => `sha256-${t}`),
    };

    mockConfigService = {
      corsOrigin: 'http://localhost:3000',
    };

    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mockDatabase = {
      getPrisma: () => mockPrisma,
    } as unknown as DatabaseService;

    invitationsService = new InvitationsService(
      mockDatabase,
      mockTokenService as unknown as TokenService,
      mockConfigService as unknown as ConfigService,
      mockLogger as unknown as LoggerService,
    );
  });

  describe('createInvitation', () => {
    it('should create an invitation with secure random token and hashed storage', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.workspaceInvitation.findFirst.mockResolvedValue(null);

      mockPrisma.workspaceInvitation.create.mockResolvedValue({
        id: 'inv-1',
        workspaceId: 'ws-1',
        email: 'collaborator@example.com',
        role: 'MEMBER',
        tokenHash: 'sha256-raw-random-token-12345',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
        createdAt: new Date(),
        invitedBy: {
          id: 'inviter-id',
          username: 'alice',
          displayName: 'Alice C',
        },
      });

      const res = await invitationsService.createInvitation('ws-1', 'inviter-id', {
        email: 'collaborator@example.com',
        role: WorkspaceRole.MEMBER,
      });

      expect(res.invitation.id).toBe('inv-1');
      expect(res.invitation.status).toBe(InvitationStatus.PENDING);
      expect((res.invitation as any).tokenHash).toBeUndefined();
      expect(res.token).toBe('raw-random-token-12345');
      expect(res.invitationUrl).toBe('http://localhost:3000/invitations/raw-random-token-12345');
      expect(mockTokenService.hashToken).toHaveBeenCalledWith('raw-random-token-12345');
    });

    it('should reject invitation if user is already a member', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({ id: 'existing-member' });

      await expect(
        invitationsService.createInvitation('ws-1', 'inviter-id', {
          email: 'existing@example.com',
          role: WorkspaceRole.MEMBER,
        }),
      ).rejects.toThrowError('already a member');
    });

    it('should reject invitation if active pending invite already exists', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.workspaceInvitation.findFirst.mockResolvedValue({
        id: 'active-invite',
        status: 'PENDING',
      });

      await expect(
        invitationsService.createInvitation('ws-1', 'inviter-id', {
          email: 'pending@example.com',
          role: WorkspaceRole.MEMBER,
        }),
      ).rejects.toThrowError('An active pending invitation');
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and create membership atomically', async () => {
      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        workspaceId: 'ws-1',
        email: 'collaborator@example.com',
        role: 'MEMBER',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 100000),
        workspace: { id: 'ws-1', name: 'Acme Workspace' },
      });

      mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

      const res = await invitationsService.acceptInvitation(
        'valid-token',
        'user-collab-id',
        'collaborator@example.com',
      );

      expect(res.success).toBe(true);
      expect(res.workspaceId).toBe('ws-1');
      expect(mockPrisma.workspaceMember.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'ws-1',
          userId: 'user-collab-id',
          role: 'MEMBER',
        },
      });
      expect(mockPrisma.workspaceInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({ status: 'ACCEPTED' }),
        }),
      );
    });

    it('should reject acceptance if emails do not match', async () => {
      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        workspaceId: 'ws-1',
        email: 'collaborator@example.com',
        role: 'MEMBER',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 100000),
        workspace: { id: 'ws-1', name: 'Acme Workspace' },
      });

      await expect(
        invitationsService.acceptInvitation(
          'valid-token',
          'stranger-id',
          'wrong-email@example.com',
        ),
      ).rejects.toThrowError('issued for "collaborator@example.com"');
    });

    it('should reject acceptance if invitation has expired', async () => {
      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        workspaceId: 'ws-1',
        email: 'collab@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 10000), // in the past
      });

      await expect(
        invitationsService.acceptInvitation(
          'expired-token',
          'collab-id',
          'collab@example.com',
        ),
      ).rejects.toThrowError('expired');
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke a pending invitation', async () => {
      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        workspaceId: 'ws-1',
        status: 'PENDING',
      });

      const res = await invitationsService.revokeInvitation('ws-1', 'admin-id', 'inv-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.workspaceInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'REVOKED' },
      });
    });
  });
});
