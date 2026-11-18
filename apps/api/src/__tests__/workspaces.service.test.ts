import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspacesService } from '../workspaces/workspaces.service.js';
import { DatabaseService } from '../database/database.service.js';
import { LoggerService } from '../logger/logger.service.js';
import { WorkspaceRole, WorkspaceVisibility } from '@syncode/validation';

describe('WorkspacesService', () => {
  let workspacesService: WorkspacesService;
  let mockPrisma: any;
  let mockLogger: any;

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      workspaceMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockPrisma)),
    };

    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mockDatabase = {
      getPrisma: () => mockPrisma,
    } as unknown as DatabaseService;

    workspacesService = new WorkspacesService(
      mockDatabase,
      mockLogger as unknown as LoggerService,
    );
  });

  describe('createWorkspace', () => {
    it('should create a workspace and assign creator as OWNER', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);
      mockPrisma.workspace.create.mockResolvedValue({
        id: 'ws-uuid-1',
        name: 'Acme Dev',
        slug: 'acme-dev',
        description: 'Team workspace',
        ownerId: 'user-1',
        visibility: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice C',
          avatarUrl: null,
          email: 'alice@example.com',
        },
      });

      mockPrisma.workspaceMember.create.mockResolvedValue({
        id: 'member-1',
        workspaceId: 'ws-uuid-1',
        userId: 'user-1',
        role: 'OWNER',
      });

      const result = await workspacesService.createWorkspace('user-1', {
        name: 'Acme Dev',
        slug: 'acme-dev',
        description: 'Team workspace',
        visibility: WorkspaceVisibility.PRIVATE,
      });

      expect(result.id).toBe('ws-uuid-1');
      expect(result.slug).toBe('acme-dev');
      expect(result.role).toBe(WorkspaceRole.OWNER);
      expect(result.owner.email).toBe('alice@example.com');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException if slug already exists', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'existing-ws',
        slug: 'taken-slug',
      });

      await expect(
        workspacesService.createWorkspace('user-1', {
          name: 'Taken Slug Workspace',
          slug: 'taken-slug',
        }),
      ).rejects.toThrowError('already taken');
    });
  });

  describe('listWorkspaces', () => {
    it('should list all workspaces where user is a member', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        {
          id: 'm1',
          role: 'OWNER',
          joinedAt: new Date(),
          workspace: {
            id: 'ws-1',
            name: 'Workspace Alpha',
            slug: 'workspace-alpha',
            description: null,
            ownerId: 'user-1',
            visibility: 'PRIVATE',
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 2, rooms: 1 },
          },
        },
      ]);

      const list = await workspacesService.listWorkspaces('user-1');
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe('ws-1');
      expect(list[0]?.role).toBe(WorkspaceRole.OWNER);
      expect(list[0]?._count?.members).toBe(2);
    });
  });

  describe('getWorkspace', () => {
    it('should return workspace details for active member', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        name: 'Workspace Alpha',
        slug: 'workspace-alpha',
        description: null,
        ownerId: 'user-1',
        visibility: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice C',
          avatarUrl: null,
          email: 'alice@example.com',
        },
        _count: { members: 3, rooms: 2 },
      });

      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        role: 'ADMIN',
      });

      const detail = await workspacesService.getWorkspace('ws-1', 'user-2');
      expect(detail.id).toBe('ws-1');
      expect(detail.currentUserRole).toBe(WorkspaceRole.ADMIN);
      expect(detail._count?.members).toBe(3);
    });

    it('should throw ForbiddenException if private and user is not a member', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        visibility: 'PRIVATE',
        owner: { id: 'user-1' },
      });
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(
        workspacesService.getWorkspace('ws-1', 'stranger-user'),
      ).rejects.toThrowError('not a member');
    });
  });

  describe('updateWorkspace', () => {
    it('should update workspace when actor is OWNER', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        role: 'OWNER',
      });

      mockPrisma.workspace.update.mockResolvedValue({
        id: 'ws-1',
        name: 'Renamed Workspace',
        slug: 'workspace-alpha',
        description: 'New description',
        ownerId: 'user-1',
        visibility: 'PUBLIC',
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice C',
          avatarUrl: null,
          email: 'alice@example.com',
        },
        _count: { members: 1, rooms: 0 },
      });

      const result = await workspacesService.updateWorkspace('ws-1', 'user-1', {
        name: 'Renamed Workspace',
        description: 'New description',
        visibility: WorkspaceVisibility.PUBLIC,
      });

      expect(result.name).toBe('Renamed Workspace');
      expect(result.visibility).toBe(WorkspaceVisibility.PUBLIC);
    });

    it('should throw ForbiddenException when actor is MEMBER', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        role: 'MEMBER',
      });

      await expect(
        workspacesService.updateWorkspace('ws-1', 'user-member', {
          name: 'Disallowed Name Change',
        }),
      ).rejects.toThrowError('Only workspace OWNER or ADMIN');
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete workspace when actor is OWNER', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        name: 'Workspace Alpha',
        ownerId: 'user-1',
      });

      const res = await workspacesService.deleteWorkspace('ws-1', 'user-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
      });
    });

    it('should reject deletion when actor is not OWNER', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        name: 'Workspace Alpha',
        ownerId: 'user-1',
      });

      await expect(
        workspacesService.deleteWorkspace('ws-1', 'user-admin'),
      ).rejects.toThrowError('Only the workspace OWNER can delete');
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership to another active member atomically', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        ownerId: 'user-1',
      });

      mockPrisma.workspaceMember.findUnique.mockResolvedValue({
        id: 'target-member',
        userId: '00000000-0000-0000-0000-000000000002',
        role: 'ADMIN',
      });

      mockPrisma.workspace.update.mockResolvedValue({
        id: 'ws-1',
        name: 'Transferred Workspace',
        slug: 'transferred',
        description: null,
        ownerId: '00000000-0000-0000-0000-000000000002',
        visibility: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: '00000000-0000-0000-0000-000000000002',
          username: 'bob',
          displayName: 'Bob',
          avatarUrl: null,
          email: 'bob@example.com',
        },
        _count: { members: 2, rooms: 1 },
      });

      const result = await workspacesService.transferOwnership('ws-1', 'user-1', {
        newOwnerId: '00000000-0000-0000-0000-000000000002',
      });

      expect(result.ownerId).toBe('00000000-0000-0000-0000-000000000002');
      expect(result.role).toBe(WorkspaceRole.ADMIN);
    });

    it('should reject transfer if target is not a member', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws-1',
        ownerId: 'user-1',
      });

      mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(
        workspacesService.transferOwnership('ws-1', 'user-1', {
          newOwnerId: '00000000-0000-0000-0000-000000000099',
        }),
      ).rejects.toThrowError('must be an existing member');
    });
  });
});
