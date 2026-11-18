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
import { RoomsService } from './rooms.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard.js';
import { WorkspaceRolesGuard } from './guards/workspace-roles.guard.js';
import { WorkspaceRoles } from './guards/workspace-roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CurrentMember } from './guards/current-workspace.decorator.js';
import {
  WorkspaceRole,
  type CreateRoomInput,
  type UpdateRoomInput,
} from '@syncode/validation';
import type { WorkspaceMember } from '@syncode/database';

@Controller('workspaces/:id/rooms')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  async createRoom(
    @Param('id') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateRoomInput,
  ) {
    const data = await this.roomsService.createRoom(workspaceId, userId, body);
    return {
      success: true,
      data,
      message: 'Room created successfully',
    };
  }

  @Get()
  async listRooms(@Param('id') workspaceId: string) {
    const data = await this.roomsService.listRooms(workspaceId);
    return {
      success: true,
      data,
    };
  }

  @Get(':roomId')
  async getRoom(
    @Param('id') workspaceId: string,
    @Param('roomId') roomId: string,
  ) {
    const data = await this.roomsService.getRoom(workspaceId, roomId);
    return {
      success: true,
      data,
    };
  }

  @Patch(':roomId')
  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  async updateRoom(
    @Param('id') workspaceId: string,
    @Param('roomId') roomId: string,
    @CurrentUser('sub') userId: string,
    @CurrentMember() member: WorkspaceMember,
    @Body() body: UpdateRoomInput,
  ) {
    const data = await this.roomsService.updateRoom(
      workspaceId,
      roomId,
      userId,
      member.role as WorkspaceRole,
      body,
    );
    return {
      success: true,
      data,
      message: 'Room updated successfully',
    };
  }

  @Delete(':roomId')
  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  )
  async deleteRoom(
    @Param('id') workspaceId: string,
    @Param('roomId') roomId: string,
    @CurrentUser('sub') userId: string,
    @CurrentMember() member: WorkspaceMember,
  ) {
    return this.roomsService.deleteRoom(
      workspaceId,
      roomId,
      userId,
      member.role as WorkspaceRole,
    );
  }
}
