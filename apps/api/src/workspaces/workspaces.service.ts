import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { LoggerService } from '../logger/logger.service.js';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  transferOwnershipSchema,
  WorkspaceRole,
  WorkspaceVisibility,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type TransferOwnershipInput,
  type WorkspaceItem,
  type WorkspaceDetail,
} from '@syncode/validation';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: LoggerService,
  ) {}

  private get prisma() {
    return this.database.getPrisma();
  }

  /**
   * Creates a new workspace and sets the creator as OWNER
   */
  async createWorkspace(
    userId: string,
    data: CreateWorkspaceInput,
  ): Promise<WorkspaceDetail> {
    const parsed = createWorkspaceSchema.parse(data);

    // Verify slug uniqueness
    const existing = await this.prisma.workspace.findUnique({
      where: { slug: parsed.slug },
    });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_ALREADY_EXISTS',
        message: `Workspace slug "${parsed.slug}" is already taken`,
      });
    }

    // Atomic creation of workspace and OWNER membership
    const result = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: parsed.name,
          slug: parsed.slug,
          description: parsed.description ?? null,
          visibility: parsed.visibility as unknown as 'PRIVATE' | 'PUBLIC',
          ownerId: userId,
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      });

      const member = await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER,
        },
      });

      return { workspace, member };
    });

    this.logger.log(
      `Workspace created: ${result.workspace.name} (${result.workspace.id}) by user ${userId}`,
      'WorkspacesService',
    );

    return {
      id: result.workspace.id,
      name: result.workspace.name,
      slug: result.workspace.slug,
      description: result.workspace.description,
      ownerId: result.workspace.ownerId,
      visibility: result.workspace.visibility as WorkspaceVisibility,
      role: WorkspaceRole.OWNER,
      createdAt: result.workspace.createdAt.toISOString(),
      updatedAt: result.workspace.updatedAt.toISOString(),
      _count: {
        members: 1,
        rooms: 0,
      },
      owner: result.workspace.owner,
      currentUserRole: WorkspaceRole.OWNER,
    };
  }

  /**
   * Lists all workspaces where the user is an active member
   */
  async listWorkspaces(userId: string): Promise<WorkspaceItem[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: true,
                rooms: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      description: m.workspace.description,
      ownerId: m.workspace.ownerId,
      visibility: m.workspace.visibility as WorkspaceVisibility,
      role: m.role as WorkspaceRole,
      createdAt: m.workspace.createdAt.toISOString(),
      updatedAt: m.workspace.updatedAt.toISOString(),
      _count: m.workspace._count,
    }));
  }

  /**
   * Gets single workspace details by ID or slug
   */
  async getWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceDetail> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
            rooms: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId,
        },
      },
    });

    if (!membership && workspace.visibility === 'PRIVATE') {
      throw new ForbiddenException({
        code: 'WORKSPACE_ACCESS_DENIED',
        message: 'You are not a member of this private workspace',
      });
    }

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      ownerId: workspace.ownerId,
      visibility: workspace.visibility as WorkspaceVisibility,
      role: (membership?.role as WorkspaceRole) ?? WorkspaceRole.VIEWER,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      _count: workspace._count,
      owner: workspace.owner,
      currentUserRole: (membership?.role as WorkspaceRole) ?? WorkspaceRole.VIEWER,
    };
  }

  /**
   * Updates workspace properties (name, description, visibility)
   */
  async updateWorkspace(
    workspaceId: string,
    actorUserId: string,
    data: UpdateWorkspaceInput,
  ): Promise<WorkspaceDetail> {
    const parsed = updateWorkspaceSchema.parse(data);

    // Verify actor role
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: actorUserId,
        },
      },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only workspace OWNER or ADMIN can modify workspace settings',
      });
    }

    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.visibility !== undefined ? { visibility: parsed.visibility as unknown as 'PRIVATE' | 'PUBLIC' } : {}),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
            rooms: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      ownerId: updated.ownerId,
      visibility: updated.visibility as WorkspaceVisibility,
      role: membership.role as WorkspaceRole,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      _count: updated._count,
      owner: updated.owner,
      currentUserRole: membership.role as WorkspaceRole,
    };
  }

  /**
   * Deletes a workspace entirely (OWNER only)
   */
  async deleteWorkspace(
    workspaceId: string,
    actorUserId: string,
  ): Promise<{ success: boolean; message: string }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    if (workspace.ownerId !== actorUserId) {
      throw new ForbiddenException({
        code: 'OWNER_ONLY',
        message: 'Only the workspace OWNER can delete this workspace',
      });
    }

    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    this.logger.log(
      `Workspace deleted: ${workspace.name} (${workspaceId}) by owner ${actorUserId}`,
      'WorkspacesService',
    );

    return {
      success: true,
      message: 'Workspace deleted successfully',
    };
  }

  /**
   * Transfers ownership to another active member (OWNER only, atomic)
   */
  async transferOwnership(
    workspaceId: string,
    currentOwnerId: string,
    data: TransferOwnershipInput,
  ): Promise<WorkspaceDetail> {
    const parsed = transferOwnershipSchema.parse(data);
    const newOwnerId = parsed.newOwnerId;

    if (currentOwnerId === newOwnerId) {
      throw new BadRequestException({
        code: 'CANNOT_TRANSFER_TO_SELF',
        message: 'You are already the owner of this workspace',
      });
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    if (workspace.ownerId !== currentOwnerId) {
      throw new ForbiddenException({
        code: 'OWNER_ONLY',
        message: 'Only the current workspace OWNER can transfer ownership',
      });
    }

    // Verify target user is an active member
    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: newOwnerId,
        },
      },
    });

    if (!targetMember) {
      throw new BadRequestException({
        code: 'TARGET_NOT_MEMBER',
        message: 'Target user must be an existing member of the workspace',
      });
    }

    // Atomic transaction: demote current owner to ADMIN, promote target to OWNER, update workspace.ownerId
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: currentOwnerId,
          },
        },
        data: { role: WorkspaceRole.ADMIN },
      });

      await tx.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: newOwnerId,
          },
        },
        data: { role: WorkspaceRole.OWNER },
      });

      return tx.workspace.update({
        where: { id: workspaceId },
        data: { ownerId: newOwnerId },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
              rooms: true,
            },
          },
        },
      });
    });

    this.logger.log(
      `Ownership transferred for workspace ${workspaceId}: from ${currentOwnerId} to ${newOwnerId}`,
      'WorkspacesService',
    );

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      ownerId: updated.ownerId,
      visibility: updated.visibility as WorkspaceVisibility,
      role: WorkspaceRole.ADMIN, // Current caller is now ADMIN
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      _count: updated._count,
      owner: updated.owner,
      currentUserRole: WorkspaceRole.ADMIN,
    };
  }
}
