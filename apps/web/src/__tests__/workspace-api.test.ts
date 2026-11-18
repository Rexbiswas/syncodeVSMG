import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceApi } from '../lib/workspace-api';
import { authApi } from '../lib/auth-api';
import { WorkspaceRole, WorkspaceVisibility, RoomVisibility } from '@syncode/validation';

describe('@syncode/web - WorkspaceApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authApi.setAccessToken('mock-jwt-token');
  });

  describe('Workspaces', () => {
    it('should create a workspace with Bearer auth', async () => {
      const mockWorkspace = {
        id: 'ws-123',
        name: 'Core Platform',
        slug: 'core-platform',
        description: 'Main project',
        ownerId: 'user-1',
        visibility: 'PRIVATE',
        role: 'OWNER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { members: 1, rooms: 0 },
        owner: { id: 'user-1', username: 'alice', email: 'alice@example.com' },
        currentUserRole: 'OWNER',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        statusText: 'Created',
        json: vi.fn().mockResolvedValue({ success: true, data: mockWorkspace }),
      } as unknown as Response);

      const res = await workspaceApi.createWorkspace({
        name: 'Core Platform',
        slug: 'core-platform',
        description: 'Main project',
        visibility: WorkspaceVisibility.PRIVATE,
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBe('ws-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/workspaces'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
          }),
        }),
      );
    });

    it('should list all workspaces', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({
          success: true,
          data: [{ id: 'ws-1', name: 'Alpha', slug: 'alpha', role: 'OWNER' }],
        }),
      } as unknown as Response);

      const res = await workspaceApi.listWorkspaces();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });

    it('should transfer workspace ownership', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { id: 'ws-1', ownerId: '00000000-0000-0000-0000-000000000002', role: 'ADMIN' },
        }),
      } as unknown as Response);

      const res = await workspaceApi.transferOwnership('ws-1', {
        newOwnerId: '00000000-0000-0000-0000-000000000002',
      });

      expect(res.success).toBe(true);
      expect(res.data?.role).toBe('ADMIN');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/workspaces/ws-1/transfer-ownership'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('Memberships & Invitations', () => {
    it('should change member role', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { id: 'm-1', role: 'ADMIN' },
        }),
      } as unknown as Response);

      const res = await workspaceApi.changeMemberRole('ws-1', 'user-2', {
        role: WorkspaceRole.ADMIN,
      });

      expect(res.success).toBe(true);
      expect(res.data?.role).toBe('ADMIN');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/workspaces/ws-1/members/user-2/role'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('should send invitation with token response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        statusText: 'Created',
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'inv-1',
            email: 'invitee@example.com',
            role: 'MEMBER',
            invitationUrl: 'http://localhost:3000/invitations/rawtoken',
          },
        }),
      } as unknown as Response);

      const res = await workspaceApi.sendInvitation('ws-1', {
        email: 'invitee@example.com',
        role: WorkspaceRole.MEMBER,
      });

      expect(res.success).toBe(true);
      expect(res.data?.email).toBe('invitee@example.com');
    });

    it('should accept an invitation by token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { success: true, workspaceId: 'ws-1', message: 'Joined' },
        }),
      } as unknown as Response);

      const res = await workspaceApi.acceptInvitation('secret-token');
      expect(res.success).toBe(true);
      expect(res.data?.workspaceId).toBe('ws-1');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/invitations/secret-token/accept'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('Rooms', () => {
    it('should create a room in workspace', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        statusText: 'Created',
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { id: 'room-1', name: 'General', slug: 'general', visibility: 'PRIVATE' },
        }),
      } as unknown as Response);

      const res = await workspaceApi.createRoom('ws-1', {
        name: 'General',
        slug: 'general',
        visibility: RoomVisibility.PRIVATE,
      });

      expect(res.success).toBe(true);
      expect(res.data?.slug).toBe('general');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/workspaces/ws-1/rooms'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should list rooms in workspace', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({
          success: true,
          data: [{ id: 'room-1', name: 'General', slug: 'general' }],
        }),
      } as unknown as Response);

      const res = await workspaceApi.listRooms('ws-1');
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });
  });
});
