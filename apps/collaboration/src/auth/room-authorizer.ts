import { PrismaClient, WorkspaceRole } from '@syncode/database';
import { CollaborationErrorCode } from '@syncode/protocol';

export interface RoomAuthorizationResult {
  roomId: string;
  roomName: string;
  roomSlug: string;
  workspaceId: string;
  workspaceSlug: string;
  role: WorkspaceRole;
  isReadOnly: boolean;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export class AuthorizationError extends Error {
  public readonly code: CollaborationErrorCode;

  constructor(message: string, code: CollaborationErrorCode) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

export class RoomAuthorizer {
  private readonly prisma: PrismaClient;

  constructor(prismaOrDb: PrismaClient | { getPrisma: () => PrismaClient }) {
    this.prisma = 'getPrisma' in prismaOrDb ? prismaOrDb.getPrisma() : prismaOrDb;
  }

  public async authorize(userId: string, roomId: string): Promise<RoomAuthorizationResult> {
    // 1. Fetch user profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new AuthorizationError('User account not found', CollaborationErrorCode.UNAUTHENTICATED);
    }

    // 2. Fetch room and its parent workspace
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        workspace: {
          select: {
            id: true,
            slug: true,
            visibility: true,
            ownerId: true,
          },
        },
      },
    });

    if (!room) {
      throw new AuthorizationError('Collaboration room not found', CollaborationErrorCode.ROOM_NOT_FOUND);
    }

    // 3. Check workspace membership
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: room.workspaceId,
          userId: user.id,
        },
      },
    });

    // Check if user is workspace owner directly
    let effectiveRole: WorkspaceRole | null = membership ? membership.role : null;
    if (room.workspace.ownerId === user.id) {
      effectiveRole = WorkspaceRole.OWNER;
    }

    // If no membership found, check if room/workspace is public
    if (!effectiveRole) {
      if (room.workspace.visibility === 'PUBLIC' && room.visibility === 'PUBLIC') {
        // Public room grants guest viewer access
        effectiveRole = WorkspaceRole.VIEWER;
      } else {
        throw new AuthorizationError(
          'You are not a member of this workspace and room access is restricted',
          CollaborationErrorCode.ROOM_FORBIDDEN,
        );
      }
    }

    const isReadOnly = effectiveRole === WorkspaceRole.VIEWER;

    return {
      roomId: room.id,
      roomName: room.name,
      roomSlug: room.slug,
      workspaceId: room.workspace.id,
      workspaceSlug: room.workspace.slug,
      role: effectiveRole,
      isReadOnly,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
