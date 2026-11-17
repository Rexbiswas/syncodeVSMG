import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/token.service.js';
import type { UpdateProfileInput } from '@syncode/validation';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMyProfile(@CurrentUser('sub') userId: string) {
    const user = await this.usersService.getProfile(userId);
    return {
      success: true,
      data: user,
    };
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser('sub') userId: string,
    @Body() body: UpdateProfileInput,
  ) {
    const user = await this.usersService.updateProfile(userId, body);
    return {
      success: true,
      data: user,
    };
  }

  @Get('me/sessions')
  async getMySessions(@CurrentUser() user: JwtPayload) {
    const sessions = await this.usersService.getSessions(user.sub, user.sessionId);
    return {
      success: true,
      data: sessions,
    };
  }

  @Delete('me/sessions/:id')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @CurrentUser('sub') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.usersService.revokeSession(userId, sessionId);
  }
}
