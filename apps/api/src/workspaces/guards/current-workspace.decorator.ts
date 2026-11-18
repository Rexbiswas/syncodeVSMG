import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { WorkspaceRequest } from './workspace-member.guard.js';

export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<WorkspaceRequest>();
    return request.workspace;
  },
);

export const CurrentMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<WorkspaceRequest>();
    return request.workspaceMember;
  },
);
