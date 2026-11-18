import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { DatabaseService } from '../../database/database.service.js';
import type { JwtPayload } from '../../auth/token.service.js';
import type { Workspace, WorkspaceMember } from '@syncode/database';

export interface WorkspaceRequest extends Request {
  user: JwtPayload;
  workspace: Workspace;
  workspaceMember: WorkspaceMember;
}

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  private get prisma() {
    return this.database.getPrisma();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkspaceRequest>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException({
        code: 'UNAUTHORIZED',
        message: 'Authentication required for workspace access',
      });
    }

    // Extract workspace ID from params (:id or :workspaceId)
    const rawId = request.params.id || request.params.workspaceId;
    const workspaceId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!workspaceId) {
      return true;
    }

    // Check if workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    // Check if user is a member of this workspace
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException({
        code: 'WORKSPACE_ACCESS_DENIED',
        message: 'You are not a member of this workspace',
      });
    }

    // Attach workspace and membership to request for downstream handlers and guards
    request.workspace = workspace;
    request.workspaceMember = member;

    return true;
  }
}
