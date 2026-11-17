import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  updateProfileSchema,
  UpdateProfileInput,
  AuthUser,
  SessionItem,
} from '@syncode/validation';

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Retrieves profile for the authenticated user
   */
  async getProfile(userId: string): Promise<AuthUser> {
    const prisma = this.database.getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return this.sanitizeUser(user);
  }

  /**
   * Updates profile fields (displayName, username, avatarUrl)
   */
  async updateProfile(userId: string, data: UpdateProfileInput): Promise<AuthUser> {
    const parsed = updateProfileSchema.parse(data);
    const prisma = this.database.getPrisma();

    // Check if user exists
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Check unique username if changing
    if (parsed.username && parsed.username !== currentUser.username) {
      const existing = await prisma.user.findUnique({
        where: { username: parsed.username },
      });
      if (existing) {
        throw new ConflictException({
          code: 'USERNAME_ALREADY_EXISTS',
          message: 'This username is already taken. Please choose another username.',
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: parsed.displayName !== undefined ? parsed.displayName : currentUser.displayName,
        username: parsed.username !== undefined ? parsed.username : currentUser.username,
        avatarUrl: parsed.avatarUrl !== undefined ? parsed.avatarUrl : currentUser.avatarUrl,
      },
    });

    return this.sanitizeUser(updated);
  }

  /**
   * Lists all active sessions for the user (sensitive tokens excluded)
   */
  async getSessions(userId: string, currentSessionId?: string): Promise<SessionItem[]> {
    const prisma = this.database.getPrisma();
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      isCurrent: Boolean(currentSessionId && s.id === currentSessionId),
    }));
  }

  /**
   * Revokes a specific active session belonging to the user
   */
  async revokeSession(userId: string, sessionId: string): Promise<{ success: boolean; message: string }> {
    const prisma = this.database.getPrisma();
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found or already revoked',
      });
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return {
      success: true,
      message: 'Session revoked successfully',
    };
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      emailVerified: Boolean(user.emailVerifiedAt),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
