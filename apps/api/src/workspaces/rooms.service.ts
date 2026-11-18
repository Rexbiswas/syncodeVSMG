import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { LoggerService } from '../logger/logger.service.js';
import {
  createRoomSchema,
  updateRoomSchema,
  WorkspaceRole,
  RoomVisibility,
  type CreateRoomInput,
  type UpdateRoomInput,
  type RoomItem,
} from '@syncode/validation';

@Injectable()
export class RoomsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: LoggerService,
  ) {}

  private get prisma() {
    return this.database.getPrisma();
  }

  /**
   * Creates a room within a workspace
   */
  async createRoom(
    workspaceId: string,
    userId: string,
    data: CreateRoomInput,
  ): Promise<RoomItem> {
    const parsed = createRoomSchema.parse(data);

    // Verify room slug uniqueness within this workspace
    const existing = await this.prisma.room.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId,
          slug: parsed.slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'ROOM_SLUG_EXISTS',
        message: `A room with slug "${parsed.slug}" already exists in this workspace`,
      });
    }

    const room = await this.prisma.room.create({
      data: {
        workspaceId,
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? null,
        createdById: userId,
        visibility: parsed.visibility as unknown as 'PRIVATE' | 'PUBLIC',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    this.logger.log(
      `Room created: "${room.name}" (${room.id}) in workspace ${workspaceId} by user ${userId}`,
      'RoomsService',
    );

    return {
      id: room.id,
      workspaceId: room.workspaceId,
      name: room.name,
      slug: room.slug,
      description: room.description,
      createdById: room.createdById,
      visibility: room.visibility as RoomVisibility,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      createdBy: room.createdBy,
    };
  }

  /**
   * Lists all rooms in a workspace
   */
  async listRooms(workspaceId: string): Promise<RoomItem[]> {
    const rooms = await this.prisma.room.findMany({
      where: { workspaceId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rooms.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      createdById: r.createdById,
      visibility: r.visibility as RoomVisibility,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      createdBy: r.createdBy,
    }));
  }

  /**
   * Gets details of a single room
   */
  async getRoom(workspaceId: string, roomId: string): Promise<RoomItem> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!room || room.workspaceId !== workspaceId) {
      throw new NotFoundException({
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found in this workspace',
      });
    }

    return {
      id: room.id,
      workspaceId: room.workspaceId,
      name: room.name,
      slug: room.slug,
      description: room.description,
      createdById: room.createdById,
      visibility: room.visibility as RoomVisibility,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      createdBy: room.createdBy,
    };
  }

  /**
   * Updates a room's metadata
   */
  async updateRoom(
    workspaceId: string,
    roomId: string,
    actorUserId: string,
    actorRole: WorkspaceRole,
    data: UpdateRoomInput,
  ): Promise<RoomItem> {
    const parsed = updateRoomSchema.parse(data);

    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room || room.workspaceId !== workspaceId) {
      throw new NotFoundException({
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found in this workspace',
      });
    }

    // Role check: VIEWER cannot update. MEMBER can only update rooms they created. OWNER and ADMIN can update any room.
    if (actorRole === WorkspaceRole.VIEWER) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Viewers cannot modify rooms',
      });
    }

    if (
      actorRole === WorkspaceRole.MEMBER &&
      room.createdById !== actorUserId
    ) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Members can only update rooms they created',
      });
    }

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.visibility !== undefined ? { visibility: parsed.visibility as unknown as 'PRIVATE' | 'PUBLIC' } : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    this.logger.log(
      `Room updated: "${updated.name}" (${roomId}) in workspace ${workspaceId} by ${actorUserId}`,
      'RoomsService',
    );

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      createdById: updated.createdById,
      visibility: updated.visibility as RoomVisibility,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      createdBy: updated.createdBy,
    };
  }

  /**
   * Deletes a room
   */
  async deleteRoom(
    workspaceId: string,
    roomId: string,
    actorUserId: string,
    actorRole: WorkspaceRole,
  ): Promise<{ success: boolean; message: string }> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room || room.workspaceId !== workspaceId) {
      throw new NotFoundException({
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found in this workspace',
      });
    }

    // Role check: VIEWER cannot delete. MEMBER can only delete rooms they created. OWNER and ADMIN can delete any room.
    if (actorRole === WorkspaceRole.VIEWER) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Viewers cannot delete rooms',
      });
    }

    if (
      actorRole === WorkspaceRole.MEMBER &&
      room.createdById !== actorUserId
    ) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Members can only delete rooms they created',
      });
    }

    await this.prisma.room.delete({
      where: { id: roomId },
    });

    this.logger.log(
      `Room deleted: "${room.name}" (${roomId}) from workspace ${workspaceId} by ${actorUserId}`,
      'RoomsService',
    );

    return {
      success: true,
      message: 'Room deleted successfully',
    };
  }
}
