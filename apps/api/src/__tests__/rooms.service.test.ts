import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomsService } from '../workspaces/rooms.service.js';
import { DatabaseService } from '../database/database.service.js';
import { LoggerService } from '../logger/logger.service.js';
import { RoomVisibility, WorkspaceRole } from '@syncode/validation';

describe('RoomsService', () => {
  let roomsService: RoomsService;
  let mockPrisma: any;
  let mockLogger: any;

  beforeEach(() => {
    mockPrisma = {
      room: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
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

    roomsService = new RoomsService(
      mockDatabase,
      mockLogger as unknown as LoggerService,
    );
  });

  describe('createRoom', () => {
    it('should create a room when slug is unique in workspace', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);
      mockPrisma.room.create.mockResolvedValue({
        id: 'room-1',
        workspaceId: 'ws-1',
        name: 'Backend Core',
        slug: 'backend-core',
        description: 'Room for backend sync',
        createdById: 'user-1',
        visibility: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice C',
        },
      });

      const res = await roomsService.createRoom('ws-1', 'user-1', {
        name: 'Backend Core',
        slug: 'backend-core',
        description: 'Room for backend sync',
        visibility: RoomVisibility.PRIVATE,
      });

      expect(res.id).toBe('room-1');
      expect(res.slug).toBe('backend-core');
      expect(res.visibility).toBe(RoomVisibility.PRIVATE);
      expect(mockPrisma.room.create).toHaveBeenCalled();
    });

    it('should reject room creation if slug is duplicate within same workspace', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'existing-room',
        workspaceId: 'ws-1',
        slug: 'backend-core',
      });

      await expect(
        roomsService.createRoom('ws-1', 'user-1', {
          name: 'Backend Core Duplicate',
          slug: 'backend-core',
        }),
      ).rejects.toThrowError('already exists in this workspace');
    });
  });

  describe('listRooms', () => {
    it('should list all rooms in workspace with creator info', async () => {
      mockPrisma.room.findMany.mockResolvedValue([
        {
          id: 'room-1',
          workspaceId: 'ws-1',
          name: 'Room A',
          slug: 'room-a',
          description: null,
          createdById: 'u1',
          visibility: 'PRIVATE',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'u1', username: 'alice', displayName: null },
        },
      ]);

      const rooms = await roomsService.listRooms('ws-1');
      expect(rooms).toHaveLength(1);
      expect(rooms[0]?.name).toBe('Room A');
    });
  });

  describe('updateRoom', () => {
    it('should allow room creator (MEMBER) to update room', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        workspaceId: 'ws-1',
        createdById: 'member-author',
      });

      mockPrisma.room.update.mockResolvedValue({
        id: 'room-1',
        workspaceId: 'ws-1',
        name: 'Updated Name',
        slug: 'room-1',
        description: null,
        createdById: 'member-author',
        visibility: 'PUBLIC',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'member-author', username: 'author', displayName: null },
      });

      const res = await roomsService.updateRoom(
        'ws-1',
        'room-1',
        'member-author',
        WorkspaceRole.MEMBER,
        { name: 'Updated Name', visibility: RoomVisibility.PUBLIC },
      );

      expect(res.name).toBe('Updated Name');
    });

    it('should prevent non-creator MEMBER from updating room', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        workspaceId: 'ws-1',
        createdById: 'member-author',
      });

      await expect(
        roomsService.updateRoom(
          'ws-1',
          'room-1',
          'other-member',
          WorkspaceRole.MEMBER,
          { name: 'Illegal Update' },
        ),
      ).rejects.toThrowError('Members can only update rooms they created');
    });

    it('should allow ADMIN to update room created by someone else', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        workspaceId: 'ws-1',
        createdById: 'member-author',
      });

      mockPrisma.room.update.mockResolvedValue({
        id: 'room-1',
        workspaceId: 'ws-1',
        name: 'Admin Updated',
        slug: 'room-1',
        description: null,
        createdById: 'member-author',
        visibility: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'member-author', username: 'author', displayName: null },
      });

      const res = await roomsService.updateRoom(
        'ws-1',
        'room-1',
        'admin-user',
        WorkspaceRole.ADMIN,
        { name: 'Admin Updated' },
      );

      expect(res.name).toBe('Admin Updated');
    });
  });

  describe('deleteRoom', () => {
    it('should allow room creator (MEMBER) to delete room', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        workspaceId: 'ws-1',
        name: 'My Room',
        createdById: 'member-author',
      });

      const res = await roomsService.deleteRoom(
        'ws-1',
        'room-1',
        'member-author',
        WorkspaceRole.MEMBER,
      );
      expect(res.success).toBe(true);
      expect(mockPrisma.room.delete).toHaveBeenCalledWith({ where: { id: 'room-1' } });
    });

    it('should reject deletion by non-creator MEMBER', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        workspaceId: 'ws-1',
        name: 'My Room',
        createdById: 'member-author',
      });

      await expect(
        roomsService.deleteRoom(
          'ws-1',
          'room-1',
          'other-member',
          WorkspaceRole.MEMBER,
        ),
      ).rejects.toThrowError('Members can only delete rooms they created');
    });

    it('should reject deletion by VIEWER', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        workspaceId: 'ws-1',
        createdById: 'author',
      });

      await expect(
        roomsService.deleteRoom(
          'ws-1',
          'room-1',
          'viewer-user',
          WorkspaceRole.VIEWER,
        ),
      ).rejects.toThrowError('Viewers cannot delete rooms');
    });
  });
});
