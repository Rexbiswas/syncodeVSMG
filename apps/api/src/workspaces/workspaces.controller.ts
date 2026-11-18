import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service.js';
import { MembershipsService } from './memberships.service.js';
import { InvitationsService } from './invitations.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard.js';
import { WorkspaceRolesGuard } from './guards/workspace-roles.guard.js';
import { WorkspaceRoles } from './guards/workspace-roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  WorkspaceRole,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type TransferOwnershipInput,
  type ChangeMemberRoleInput,
  type CreateInvitationInput,
} from '@syncode/validation';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly membershipsService: MembershipsService,
    private readonly invitationsService: InvitationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Workspace CRUD & Ownership
  // ---------------------------------------------------------------------------

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorkspace(
    @CurrentUser('sub') userId: string,
    @Body() body: CreateWorkspaceInput,
  ) {
    const data = await this.workspacesService.createWorkspace(userId, body);
    return {
      success: true,
      data,
    };
  }

  @Get()
  async listMyWorkspaces(@CurrentUser('sub') userId: string) {
    const data = await this.workspacesService.listWorkspaces(userId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @UseGuards(WorkspaceMemberGuard)
  async getWorkspace(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.workspacesService.getWorkspace(workspaceId, userId);
    return {
      success: true,
      data,
    };
  }

  @Patch(':id')
  @UseGuards(WorkspaceMemberGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async updateWorkspace(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') actorUserId: string,
    @Body() body: UpdateWorkspaceInput,
  ) {
    const data = await this.workspacesService.updateWorkspace(
      workspaceId,
      actorUserId,
      body,
    );
    return {
      success: true,
      data,
    };
  }

  @Delete(':id')
  @UseGuards(WorkspaceMemberGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  async deleteWorkspace(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') actorUserId: string,
  ) {
    return this.workspacesService.deleteWorkspace(workspaceId, actorUserId);
  }

  @Post(':id/transfer-ownership')
  @UseGuards(WorkspaceMemberGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  async transferOwnership(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') currentOwnerId: string,
    @Body() body: TransferOwnershipInput,
  ) {
    const data = await this.workspacesService.transferOwnership(
      workspaceId,
      currentOwnerId,
      body,
    );
    return {
      success: true,
      data,
      message: 'Workspace ownership transferred successfully',
    };
  }

  // ---------------------------------------------------------------------------
  // Memberships
  // ---------------------------------------------------------------------------

  @Get(':id/members')
  @UseGuards(WorkspaceMemberGuard)
  async listMembers(@Param('id') workspaceId: string) {
    const data = await this.membershipsService.listMembers(workspaceId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id/members/:userId')
  @UseGuards(WorkspaceMemberGuard)
  async getMember(
    @Param('id') workspaceId: string,
    @Param('userId') targetUserId: string,
  ) {
    const data = await this.membershipsService.getMember(
      workspaceId,
      targetUserId,
    );
    return {
      success: true,
      data,
    };
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(WorkspaceMemberGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async changeMemberRole(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') actorUserId: string,
    @Param('userId') targetUserId: string,
    @Body() body: ChangeMemberRoleInput,
  ) {
    const data = await this.membershipsService.changeRole(
      workspaceId,
      actorUserId,
      targetUserId,
      body,
    );
    return {
      success: true,
      data,
      message: 'Member role updated successfully',
    };
  }

  @Delete(':id/members/:userId')
  @UseGuards(WorkspaceMemberGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async removeMember(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') actorUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.membershipsService.removeMember(
      workspaceId,
      actorUserId,
      targetUserId,
    );
  }

  @Post(':id/leave')
  @UseGuards(WorkspaceMemberGuard)
  async leaveWorkspace(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.membershipsService.leaveWorkspace(workspaceId, userId);
  }

  // ---------------------------------------------------------------------------
  // Invitations (Workspace Scoped)
  // ---------------------------------------------------------------------------

  @Post(':id/invitations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(WorkspaceMemberGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async sendInvitation(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') actorUserId: string,
    @Body() body: CreateInvitationInput,
  ) {
    const result = await this.invitationsService.createInvitation(
      workspaceId,
      actorUserId,
      body,
    );
    return {
      success: true,
      data: result.invitation,
      invitationUrl: result.invitationUrl,
      message: 'Invitation sent successfully',
    };
  }

  @Get(':id/invitations')
  @UseGuards(WorkspaceMemberGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async listInvitations(@Param('id') workspaceId: string) {
    const data = await this.invitationsService.listInvitations(workspaceId);
    return {
      success: true,
      data,
    };
  }

  @Post(':id/invitations/:invitationId/revoke')
  @UseGuards(WorkspaceMemberGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async revokeInvitation(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') actorUserId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.invitationsService.revokeInvitation(
      workspaceId,
      actorUserId,
      invitationId,
    );
  }

  @Post(':id/invitations/:invitationId/resend')
  @UseGuards(WorkspaceMemberGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async resendInvitation(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') actorUserId: string,
    @Param('invitationId') invitationId: string,
  ) {
    const result = await this.invitationsService.resendInvitation(
      workspaceId,
      actorUserId,
      invitationId,
    );
    return {
      success: true,
      data: result.invitation,
      invitationUrl: result.invitationUrl,
      message: 'Invitation resent successfully',
    };
  }
}
