import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/token.service.js';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /**
   * Public preview of an invitation by token
   */
  @Get(':token/preview')
  async getInvitationPreview(@Param('token') token: string) {
    const data = await this.invitationsService.getInvitationPreview(token);
    return {
      success: true,
      data,
    };
  }

  /**
   * Accepts a workspace invitation using the one-time token
   */
  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.invitationsService.acceptInvitation(
      token,
      user.sub,
      user.email,
    );
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }
}
