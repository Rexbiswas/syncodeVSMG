import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { LoggerService } from '../logger/logger.service.js';
import { TokenService } from '../auth/token.service.js';
import { ConfigService } from '../config/config.service.js';
import {
  createInvitationSchema,
  WorkspaceRole,
  InvitationStatus,
  type CreateInvitationInput,
  type WorkspaceInvitationItem,
} from '@syncode/validation';

export interface CreateInvitationResult {
  invitation: WorkspaceInvitationItem;
  invitationUrl: string;
  token: string;
}

export interface InvitationPreview {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  invitedBy: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  private get prisma() {
    return this.database.getPrisma();
  }

  /**
   * Creates a secure workspace invitation
   */
  async createInvitation(
    workspaceId: string,
    actorUserId: string,
    data: CreateInvitationInput,
  ): Promise<CreateInvitationResult> {
    const parsed = createInvitationSchema.parse(data);
    const normalizedEmail = parsed.email.toLowerCase().trim();

    // Verify workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    // Check if the user is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const existingMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        throw new ConflictException({
          code: 'ALREADY_MEMBER',
          message: `User with email "${normalizedEmail}" is already a member of this workspace`,
        });
      }
    }

    // Check for an active pending invitation for this workspace and email
    const pendingInvitation = await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        email: normalizedEmail,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvitation) {
      throw new ConflictException({
        code: 'INVITATION_ALREADY_EXISTS',
        message: `An active pending invitation for "${normalizedEmail}" already exists. You can resend or revoke it.`,
      });
    }

    // Generate cryptographically secure random token (40 bytes hex)
    const rawToken = this.tokenService.generateRandomToken(40);
    const tokenHash = this.tokenService.hashToken(rawToken);

    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        invitedById: actorUserId,
        role: parsed.role as WorkspaceRole,
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    const clientUrl = this.config.corsOrigin || 'http://localhost:3000';
    const invitationUrl = `${clientUrl}/invitations/${rawToken}`;

    this.logger.log(
      `Invitation created for workspace ${workspaceId} to email ${normalizedEmail} (Role: ${parsed.role})`,
      'InvitationsService',
    );

    return {
      invitation: {
        id: invitation.id,
        workspaceId: invitation.workspaceId,
        email: invitation.email,
        role: invitation.role as WorkspaceRole,
        status: invitation.status as InvitationStatus,
        expiresAt: invitation.expiresAt.toISOString(),
        acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
        createdAt: invitation.createdAt.toISOString(),
        invitedBy: invitation.invitedBy,
      },
      invitationUrl,
      token: rawToken,
    };
  }

  /**
   * Lists all invitations for a workspace
   */
  async listInvitations(workspaceId: string): Promise<WorkspaceInvitationItem[]> {
    const invitations = await this.prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      include: {
        invitedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const now = new Date();

    return invitations.map((inv) => {
      // Determine if expired on read
      let status = inv.status as InvitationStatus;
      if (status === InvitationStatus.PENDING && inv.expiresAt < now) {
        status = InvitationStatus.EXPIRED;
      }

      return {
        id: inv.id,
        workspaceId: inv.workspaceId,
        email: inv.email,
        role: inv.role as WorkspaceRole,
        status,
        expiresAt: inv.expiresAt.toISOString(),
        acceptedAt: inv.acceptedAt?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
        invitedBy: inv.invitedBy,
      };
    });
  }

  /**
   * Gets invitation details for public preview before accepting
   */
  async getInvitationPreview(token: string): Promise<InvitationPreview> {
    const tokenHash = this.tokenService.hashToken(token);

    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invalid or non-existent invitation token',
      });
    }

    let status = invitation.status as InvitationStatus;
    if (status === InvitationStatus.PENDING && invitation.expiresAt < new Date()) {
      status = InvitationStatus.EXPIRED;
    }

    return {
      id: invitation.id,
      workspaceId: invitation.workspaceId,
      email: invitation.email,
      role: invitation.role as WorkspaceRole,
      status,
      expiresAt: invitation.expiresAt.toISOString(),
      workspace: invitation.workspace,
      invitedBy: invitation.invitedBy,
    };
  }

  /**
   * Accepts an invitation using a single-use token
   */
  async acceptInvitation(
    token: string,
    userId: string,
    userEmail: string,
  ): Promise<{ success: boolean; workspaceId: string; message: string }> {
    const tokenHash = this.tokenService.hashToken(token);

    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
      include: {
        workspace: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invalid or non-existent invitation token',
      });
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException({
        code: 'INVITATION_ALREADY_ACCEPTED',
        message: 'This invitation has already been accepted',
      });
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new BadRequestException({
        code: 'INVITATION_REVOKED',
        message: 'This invitation has been revoked by the workspace administrator',
      });
    }

    if (invitation.expiresAt < new Date()) {
      // Mark as expired in DB
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });

      throw new BadRequestException({
        code: 'INVITATION_EXPIRED',
        message: 'This invitation has expired. Please request a new invitation.',
      });
    }

    // Verify email ownership (must match the invited email)
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException({
        code: 'EMAIL_MISMATCH',
        message: `This invitation was issued for "${invitation.email}". You are currently signed in as "${userEmail}".`,
      });
    }

    // Transactional acceptance: create membership & update invitation status
    await this.prisma.$transaction(async (tx) => {
      // Check if already a member (idempotent safety)
      const existing = await tx.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId,
          },
        },
      });

      if (!existing) {
        await tx.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId,
            role: invitation.role,
          },
        });
      }

      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });
    });

    this.logger.log(
      `Invitation accepted: user ${userId} joined workspace ${invitation.workspaceId} with role ${invitation.role}`,
      'InvitationsService',
    );

    return {
      success: true,
      workspaceId: invitation.workspaceId,
      message: `Successfully joined ${invitation.workspace.name}`,
    };
  }

  /**
   * Revokes a pending invitation
   */
  async revokeInvitation(
    workspaceId: string,
    actorUserId: string,
    invitationId: string,
  ): Promise<{ success: boolean; message: string }> {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found in this workspace',
      });
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException({
        code: 'CANNOT_REVOKE',
        message: `Cannot revoke invitation with status "${invitation.status}"`,
      });
    }

    await this.prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });

    this.logger.log(
      `Invitation ${invitationId} revoked in workspace ${workspaceId} by ${actorUserId}`,
      'InvitationsService',
    );

    return {
      success: true,
      message: 'Invitation revoked successfully',
    };
  }

  /**
   * Resends / regenerates an invitation with a fresh expiration
   */
  async resendInvitation(
    workspaceId: string,
    actorUserId: string,
    invitationId: string,
  ): Promise<CreateInvitationResult> {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found in this workspace',
      });
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException({
        code: 'ALREADY_ACCEPTED',
        message: 'Cannot resend an invitation that has already been accepted',
      });
    }

    const rawToken = this.tokenService.generateRandomToken(40);
    const tokenHash = this.tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: {
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt,
        invitedById: actorUserId,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    const clientUrl = this.config.corsOrigin || 'http://localhost:3000';
    const invitationUrl = `${clientUrl}/invitations/${rawToken}`;

    this.logger.log(
      `Invitation ${invitationId} resent for email ${updated.email} in workspace ${workspaceId}`,
      'InvitationsService',
    );

    return {
      invitation: {
        id: updated.id,
        workspaceId: updated.workspaceId,
        email: updated.email,
        role: updated.role as WorkspaceRole,
        status: updated.status as InvitationStatus,
        expiresAt: updated.expiresAt.toISOString(),
        acceptedAt: updated.acceptedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        invitedBy: updated.invitedBy,
      },
      invitationUrl,
      token: rawToken,
    };
  }
}
