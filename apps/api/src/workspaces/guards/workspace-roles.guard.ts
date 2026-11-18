import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WORKSPACE_ROLES_KEY } from './workspace-roles.decorator.js';
import type { WorkspaceRequest } from './workspace-member.guard.js';
import type { WorkspaceRole } from '@syncode/validation';

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<WorkspaceRequest>();
    const member = request.workspaceMember;

    if (!member) {
      throw new ForbiddenException({
        code: 'MEMBERSHIP_REQUIRED',
        message: 'Workspace membership is required to perform this action',
      });
    }

    const hasRole = requiredRoles.includes(member.role as WorkspaceRole);
    if (!hasRole) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Requires one of roles: [${requiredRoles.join(', ')}]. Current role: ${member.role}`,
      });
    }

    return true;
  }
}
