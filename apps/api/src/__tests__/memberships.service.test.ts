import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MembershipsService } from '../workspaces/memberships.service.js';
import { DatabaseService } from '../database/database.service.js';
import { LoggerService } from '../logger/logger.service.js';
import { WorkspaceRole } from '@syncode/validation';

describe('MembershipsService', () => {
  let membershipsService: MembershipsService;
  let mockPrisma: any;
  let mockLogger: any;

  beforeEach(() => {
    mockPrisma = {
      workspaceMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mockDatabase = {
      getPrisma: () => mockPrisma,
    } as unknown as DatabaseService;

    membershipsService = new MembershipsService(
      mockDatabase,
      mockLogger as unknown as LoggerService,
    );
  });

  describe('listMembers', () => {
    it('should list all members sorted by role priority (OWNER first)', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        {
          id: 'm1',
          workspaceId: 'ws-1',
          userId: 'u1',
          role: 'VIEWER',
          joinedAt: new Date(),
          user: { id: 'u1', username: 'viewer', displayName: null, avatarUrl: null, email: 'v@e.com' },
        },
        {
          id: 'm2',
          workspaceId: 'ws-1',
          userId: 'u2',
          role: 'OWNER',
          joinedAt: new Date(),
          user: { id: 'u2', username: 'owner', displayName: null, avatarUrl: null, email: 'o@e.com' },
        },
      ]);

      const members = await membershipsService.listMembers('ws-1');
      expect(members).toHaveLength(2);
      expect(members[0]?.role).toBe(WorkspaceRole.OWNER);
      expect(members[1]?.role).toBe(WorkspaceRole.VIEWER);
    });
  });

  describe('changeRole', () => {
    it('should allow OWNER to change role to ADMIN', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ userId: 'owner-id', role: 'OWNER' }) // actor
        .mockResolvedValueOnce({ userId: 'target-id', role: 'MEMBER' }); // target

      mockPrisma.workspaceMember.update.mockResolvedValue({
        id: 'target-member',
        workspaceId: 'ws-1',
        userId: 'target-id',
        role: 'ADMIN',
        joinedAt: new Date(),
        user: { id: 'target-id', username: 'target', displayName: null, avatarUrl: null, email: 't@e.com' },
      });

      const res = await membershipsService.changeRole('ws-1', 'owner-id', 'target-id', {
        role: WorkspaceRole.ADMIN,
      });

      expect(res.role).toBe(WorkspaceRole.ADMIN);
    });

    it('should prevent ADMIN from promoting someone to ADMIN', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ userId: 'admin-id', role: 'ADMIN' })
        .mockResolvedValueOnce({ userId: 'target-id', role: 'MEMBER' });

      await expect(
        membershipsService.changeRole('ws-1', 'admin-id', 'target-id', {
          role: WorkspaceRole.ADMIN,
        }),
      ).rejects.toThrowError('Only the workspace owner can promote');
    });

    it('should prevent ADMIN from demoting another ADMIN', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ userId: 'admin-id', role: 'ADMIN' })
        .mockResolvedValueOnce({ userId: 'admin-2', role: 'ADMIN' });

      await expect(
        membershipsService.changeRole('ws-1', 'admin-id', 'admin-2', {
          role: WorkspaceRole.MEMBER,
        }),
      ).rejects.toThrowError('Admins cannot change the role of another admin');
    });

    it('should prevent anyone from demoting OWNER through changeRole', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ userId: 'owner-id', role: 'OWNER' })
        .mockResolvedValueOnce({ userId: 'target-owner', role: 'OWNER' });

      await expect(
        membershipsService.changeRole('ws-1', 'owner-id', 'target-owner', {
          role: WorkspaceRole.MEMBER,
        }),
      ).rejects.toThrowError('Cannot change owner role');
    });
  });

  describe('removeMember', () => {
    it('should allow OWNER to remove a member', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ userId: 'owner-id', role: 'OWNER' })
        .mockResolvedValueOnce({ userId: 'member-id', role: 'MEMBER' });

      const res = await membershipsService.removeMember('ws-1', 'owner-id', 'member-id');
      expect(res.success).toBe(true);
      expect(mockPrisma.workspaceMember.delete).toHaveBeenCalled();
    });

    it('should prevent removing OWNER', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ userId: 'admin-id', role: 'ADMIN' })
        .mockResolvedValueOnce({ userId: 'owner-id', role: 'OWNER' });

      await expect(
        membershipsService.removeMember('ws-1', 'admin-id', 'owner-id'),
      ).rejects.toThrowError('Workspace owner cannot be removed');
    });

    it('should prevent ADMIN from removing another ADMIN', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' })
        .mockResolvedValueOnce({ userId: 'admin-2', role: 'ADMIN' });

      await expect(
        membershipsService.removeMember('ws-1', 'admin-1', 'admin-2'),
      ).rejects.toThrowError('Admins cannot remove other admins');
    });
  });

  describe('leaveWorkspace', () => {
    it('should allow non-owner member to leave', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        userId: 'member-id',
        role: 'MEMBER',
      });

      const res = await membershipsService.leaveWorkspace('ws-1', 'member-id');
      expect(res.success).toBe(true);
      expect(mockPrisma.workspaceMember.delete).toHaveBeenCalled();
    });

    it('should prevent OWNER from leaving workspace directly', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        userId: 'owner-id',
        role: 'OWNER',
      });

      await expect(
        membershipsService.leaveWorkspace('ws-1', 'owner-id'),
      ).rejects.toThrowError('Workspace owner cannot leave the workspace');
    });
  });
});
