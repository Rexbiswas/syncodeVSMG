import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { LoggerModule } from '../logger/logger.module.js';
import { ConfigModule } from '../config/config.module.js';
import { AuthModule } from '../auth/auth.module.js';

import { WorkspacesController } from './workspaces.controller.js';
import { InvitationsController } from './invitations.controller.js';
import { RoomsController } from './rooms.controller.js';

import { WorkspacesService } from './workspaces.service.js';
import { MembershipsService } from './memberships.service.js';
import { InvitationsService } from './invitations.service.js';
import { RoomsService } from './rooms.service.js';

import { WorkspaceMemberGuard } from './guards/workspace-member.guard.js';
import { WorkspaceRolesGuard } from './guards/workspace-roles.guard.js';

@Module({
  imports: [DatabaseModule, LoggerModule, ConfigModule, AuthModule],
  controllers: [
    WorkspacesController,
    InvitationsController,
    RoomsController,
  ],
  providers: [
    WorkspacesService,
    MembershipsService,
    InvitationsService,
    RoomsService,
    WorkspaceMemberGuard,
    WorkspaceRolesGuard,
  ],
  exports: [
    WorkspacesService,
    MembershipsService,
    InvitationsService,
    RoomsService,
    WorkspaceMemberGuard,
    WorkspaceRolesGuard,
  ],
})
export class WorkspacesModule {}
