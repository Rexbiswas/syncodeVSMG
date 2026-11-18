import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { LoggerService } from '../logger/logger.service.js';
import {
  changeMemberRoleSchema,
  WorkspaceRole,
  type ChangeMemberRoleInput,
  type WorkspaceMemberItem,
} from '@syncode/validation';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: LoggerService,
  ) {}

  private get prisma() {
    return this.database.getPrisma();
  }

  /**
   * Lists all members in a workspace
   */
  async listMembers(workspaceId: string): Promise<WorkspaceMemberItem[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    // Custom sort: OWNER first, then ADMIN, MEMBER, VIEWER
    const rolePriority: Record<WorkspaceRole, number> = {
      [WorkspaceRole.OWNER]: 1,
      [WorkspaceRole.ADMIN]: 2,
      [WorkspaceRole.MEMBER]: 3,
      [WorkspaceRole.VIEWER]: 4,
    };

    const sorted = [...members].sort(
      (a, b) =>
        (rolePriority[a.role as WorkspaceRole] ?? 99) -
        (rolePriority[b.role as WorkspaceRole] ?? 99),
    );

    return sorted.map((m) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      userId: m.userId,
      role: m.role as WorkspaceRole,
      joinedAt: m.joinedAt.toISOString(),
      user: m.user,
    }));
  }

  /**
   * Retrieves a single member's details
   */
  async getMember(
    workspaceId: string,
    targetUserId: string,
  ): Promise<WorkspaceMemberItem> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
      include: {
        user: {
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

    if (!member) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Workspace member not found',
      });
    }

    return {
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role as WorkspaceRole,
      joinedAt: member.joinedAt.toISOString(),
      user: member.user,
    };
  }

  /**
   * Changes a member's role with RBAC hierarchy checks
   */
  async changeRole(
    workspaceId: string,
    actorUserId: string,
    targetUserId: string,
    data: ChangeMemberRoleInput,
  ): Promise<WorkspaceMemberItem> {
    const parsed = changeMemberRoleSchema.parse(data);
    const newRole = parsed.role;

    if (actorUserId === targetUserId) {
      throw new BadRequestException({
        code: 'CANNOT_MODIFY_OWN_ROLE',
        message: 'You cannot modify your own role',
      });
    }

    const actor = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: actorUserId,
        },
      },
    });

    if (!actor || (actor.role !== WorkspaceRole.OWNER && actor.role !== WorkspaceRole.ADMIN)) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only OWNER and ADMIN can change member roles',
      });
    }

    const target = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
    });

    if (!target) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Target member not found in this workspace',
      });
    }

    // Protection for OWNER
    if (target.role === WorkspaceRole.OWNER) {
      throw new BadRequestException({
        code: 'CANNOT_DEMOTE_OWNER',
        message: 'Cannot change owner role. Use transfer ownership instead.',
      });
    }

    // ADMIN hierarchy constraints
    if (actor.role === WorkspaceRole.ADMIN) {
      // Cannot modify another ADMIN
      if (target.role === WorkspaceRole.ADMIN) {
        throw new ForbiddenException({
          code: 'ADMIN_HIERARCHY_VIOLATION',
          message: 'Admins cannot change the role of another admin',
        });
      }

      // Cannot promote to ADMIN (only OWNER can create ADMINs)
      if (newRole === WorkspaceRole.ADMIN) {
        throw new ForbiddenException({
          code: 'ADMIN_HIERARCHY_VIOLATION',
          message: 'Only the workspace owner can promote members to ADMIN',
        });
      }
    }

    const updated = await this.prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
      data: { role: newRole },
      include: {
        user: {
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

    this.logger.log(
      `Role updated in workspace ${workspaceId}: user ${targetUserId} -> ${newRole} by actor ${actorUserId}`,
      'MembershipsService',
    );

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      userId: updated.userId,
      role: updated.role as WorkspaceRole,
      joinedAt: updated.joinedAt.toISOString(),
      user: updated.user,
    };
  }

  /**
   * Removes a member from the workspace
   */
  async removeMember(
    workspaceId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (actorUserId === targetUserId) {
      throw new BadRequestException({
        code: 'USE_LEAVE_ENDPOINT',
        message: 'To leave the workspace, use the leave workspace endpoint',
      });
    }

    const actor = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: actorUserId,
        },
      },
    });

    if (!actor || (actor.role !== WorkspaceRole.OWNER && actor.role !== WorkspaceRole.ADMIN)) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only OWNER and ADMIN can remove members',
      });
    }

    const target = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
    });

    if (!target) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Member not found in this workspace',
      });
    }

    if (target.role === WorkspaceRole.OWNER) {
      throw new BadRequestException({
        code: 'CANNOT_REMOVE_OWNER',
        message: 'Workspace owner cannot be removed',
      });
    }

    if (actor.role === WorkspaceRole.ADMIN) {
      if (target.role === WorkspaceRole.ADMIN) {
        throw new ForbiddenException({
          code: 'ADMIN_HIERARCHY_VIOLATION',
          message: 'Admins cannot remove other admins',
        });
      }
    }

    await this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
    });

    this.logger.log(
      `Member removed from workspace ${workspaceId}: user ${targetUserId} by actor ${actorUserId}`,
      'MembershipsService',
    );

    return {
      success: true,
      message: 'Member removed successfully',
    };
  }

  /**
   * Allows an authenticated member to leave the workspace
   */
  async leaveWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'You are not a member of this workspace',
      });
    }

    if (member.role === WorkspaceRole.OWNER) {
      throw new BadRequestException({
        code: 'OWNER_CANNOT_LEAVE',
        message:
          'Workspace owner cannot leave the workspace. You must transfer ownership or delete the workspace.',
      });
    }

    await this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    this.logger.log(
      `User ${userId} left workspace ${workspaceId}`,
      'MembershipsService',
    );

    return {
      success: true,
      message: 'You have left the workspace',
    };
  }
}
