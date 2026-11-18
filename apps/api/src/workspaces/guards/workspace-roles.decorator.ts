import { SetMetadata } from '@nestjs/common';
import type { WorkspaceRole } from '@syncode/validation';

export const WORKSPACE_ROLES_KEY = 'workspace_roles';

export const WorkspaceRoles = (...roles: WorkspaceRole[]) =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);
