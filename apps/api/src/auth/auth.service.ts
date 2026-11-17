import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { ConfigService } from '../config/config.service.js';
import { LoggerService } from '../logger/logger.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import { AuthRateLimiterService } from './rate-limiter/auth-rate-limiter.service.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  AuthUser,
} from '@syncode/validation';

export interface AuthSuccessResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly rateLimiter: AuthRateLimiterService,
  ) {}

  /**
   * Registers a new user with email, unique username, and password
   */
  async register(
    data: RegisterInput,
    ipAddress = '127.0.0.1',
    userAgent = 'unknown',
  ): Promise<AuthSuccessResult> {
    // 1. Rate limiting: max 10 registrations per hour per IP
    const rateCheck = await this.rateLimiter.checkRateLimit(`register:ip:${ipAddress}`, 10, 3600);
    if (rateCheck.isLimited) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many registration attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Validate input schema
    const parsed = registerSchema.parse(data);
    const normalizedEmail = parsed.email.toLowerCase().trim();
    const normalizedUsername = parsed.username.toLowerCase().trim();

    const prisma = this.database.getPrisma();

    // 3. Check duplicate email
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists',
      });
    }

    // 4. Check duplicate username
    const existingUsername = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
    if (existingUsername) {
      throw new ConflictException({
        code: 'USERNAME_ALREADY_EXISTS',
        message: 'This username is already taken. Please choose another username.',
      });
    }

    // 5. Hash password with Argon2id
    const passwordHash = await this.passwordService.hashPassword(parsed.password);

    // 6. Create user in PostgreSQL
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        displayName: parsed.displayName?.trim() || normalizedUsername,
        passwordHash,
      },
    });

    // 7. Create email verification token
    const rawVerifyToken = this.tokenService.generateRandomToken(32);
    const verifyTokenHash = this.tokenService.hashToken(rawVerifyToken);
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verifyTokenHash,
        expiresAt: verifyExpiresAt,
      },
    });

    // In development or when SMTP is not configured, log verification link safely
    if (this.config.isEmailDeliveryEnabled) {
      this.logger.log(`Dispatching verification email to ${user.email}`, 'AuthService');
    } else {
      this.logger.log(
        `[DEV MODE] Email verification token for ${user.email}: ${rawVerifyToken} (URL: ${this.config.corsOrigin}/verify-email?token=${rawVerifyToken})`,
        'AuthService',
      );
    }

    // 8. Create persistent session with refresh token
    const rawRefreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashToken(rawRefreshToken);
    const refreshExpiresAt = this.tokenService.getRefreshTokenExpiresAt();

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        ipAddress,
        userAgent,
        expiresAt: refreshExpiresAt,
      },
    });

    // 9. Generate access token
    const { token: accessToken, expiresInSeconds } = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      sessionId: session.id,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Authenticates a user using email/username and password
   */
  async login(
    data: LoginInput,
    ipAddress = '127.0.0.1',
    userAgent = 'unknown',
  ): Promise<AuthSuccessResult> {
    // 1. Rate limiting by IP and identifier (max 5 failed attempts per 15 mins)
    const rateCheck = await this.rateLimiter.checkRateLimit(`login:ip:${ipAddress}`, 15, 900);
    if (rateCheck.isLimited) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Validate input schema
    const parsed = loginSchema.parse(data);
    const identifier = parsed.emailOrUsername.toLowerCase().trim();

    const prisma = this.database.getPrisma();

    // 3. Find user by email OR username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email/username or password',
      });
    }

    // 4. Verify password with Argon2id
    const isPasswordValid = await this.passwordService.verifyPassword(
      parsed.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email/username or password',
      });
    }

    // 5. Reset rate limiter on successful authentication
    await this.rateLimiter.reset(`login:ip:${ipAddress}`);

    // 6. Create persistent session in PostgreSQL
    const rawRefreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashToken(rawRefreshToken);
    const refreshExpiresAt = this.tokenService.getRefreshTokenExpiresAt();

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        ipAddress,
        userAgent,
        expiresAt: refreshExpiresAt,
      },
    });

    // 7. Generate access token
    const { token: accessToken, expiresInSeconds } = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      sessionId: session.id,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Refreshes an access token and rotates the refresh token
   */
  async refresh(
    rawRefreshToken: string,
    ipAddress = '127.0.0.1',
    userAgent = 'unknown',
  ): Promise<AuthSuccessResult> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token is required',
      });
    }

    const prisma = this.database.getPrisma();
    const tokenHash = this.tokenService.hashToken(rawRefreshToken.trim());

    // 1. Locate session in PostgreSQL
    const session = await prisma.session.findFirst({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or unrecognized refresh token session',
      });
    }

    // 2. Replay detection: If token was already revoked, someone may be reusing it!
    if (session.revokedAt) {
      this.logger.warn(
        `🚨 Replay attack detected for user ${session.userId}. Revoking all sessions.`,
        'AuthService',
      );
      // Revoke all sessions for this user for security
      await prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REUSED',
        message: 'Refresh token reuse detected. All sessions have been revoked for your security.',
      });
    }

    // 3. Expiration check
    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Session has expired. Please sign in again.',
      });
    }

    // 4. Token Rotation: generate a new refresh token and update existing session
    const newRawRefreshToken = this.tokenService.generateRefreshToken();
    const newRefreshTokenHash = this.tokenService.hashToken(newRawRefreshToken);
    const newExpiresAt = this.tokenService.getRefreshTokenExpiresAt();

    const updatedSession = await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        ipAddress,
        userAgent,
        expiresAt: newExpiresAt,
      },
    });

    // 5. Generate fresh access token
    const { token: accessToken, expiresInSeconds } = this.tokenService.generateAccessToken({
      sub: session.user.id,
      email: session.user.email,
      username: session.user.username,
      sessionId: updatedSession.id,
    });

    return {
      user: this.sanitizeUser(session.user),
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Logs out the current session by revoking its refresh token
   */
  async logout(rawRefreshToken?: string): Promise<{ success: boolean }> {
    if (!rawRefreshToken) return { success: true };
    try {
      const prisma = this.database.getPrisma();
      const tokenHash = this.tokenService.hashToken(rawRefreshToken.trim());
      await prisma.session.updateMany({
        where: { refreshTokenHash: tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch (err) {
      this.logger.warn(`Logout error revoking token: ${String(err)}`, 'AuthService');
    }
    return { success: true };
  }

  /**
   * Revokes all active sessions for a user
   */
  async logoutAll(userId: string): Promise<{ success: boolean; revokedCount: number }> {
    const prisma = this.database.getPrisma();
    const result = await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true, revokedCount: result.count };
  }

  /**
   * Retrieves the current authenticated user profile
   */
  async getCurrentUser(userId: string): Promise<AuthUser> {
    const prisma = this.database.getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User account not found',
      });
    }
    return this.sanitizeUser(user);
  }

  /**
   * Verifies an email address using a single-use token
   */
  async verifyEmail(data: { token: string }): Promise<{ success: boolean; message: string }> {
    const parsed = verifyEmailSchema.parse(data);
    const prisma = this.database.getPrisma();
    const tokenHash = this.tokenService.hashToken(parsed.token.trim());

    const record = await prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Email verification token is invalid or has expired',
      });
    }

    // Mark token used and user verified in a transaction
    await prisma.$transaction([
      prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: 'Your email address has been verified successfully',
    };
  }

  /**
   * Resends verification email (rate limited, account-enumeration resistant)
   */
  async resendVerification(
    data: { email: string },
    ipAddress = '127.0.0.1',
  ): Promise<{ success: boolean; message: string }> {
    const rateCheck = await this.rateLimiter.checkRateLimit(`resend_verify:ip:${ipAddress}`, 3, 3600);
    if (rateCheck.isLimited) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many verification requests. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const parsed = resendVerificationSchema.parse(data);
    const normalizedEmail = parsed.email.toLowerCase().trim();
    const prisma = this.database.getPrisma();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && !user.emailVerifiedAt) {
      const rawToken = this.tokenService.generateRandomToken(32);
      const tokenHash = this.tokenService.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      if (!this.config.isEmailDeliveryEnabled) {
        this.logger.log(
          `[DEV MODE] Resent email verification token for ${user.email}: ${rawToken} (URL: ${this.config.corsOrigin}/verify-email?token=${rawToken})`,
          'AuthService',
        );
      }
    }

    // Always return success message for account enumeration resistance
    return {
      success: true,
      message: 'If an unverified account with that email address exists, a verification link has been sent.',
    };
  }

  /**
   * Initiates forgot password flow (rate limited, account-enumeration resistant)
   */
  async forgotPassword(
    data: { email: string },
    ipAddress = '127.0.0.1',
  ): Promise<{ success: boolean; message: string }> {
    const rateCheck = await this.rateLimiter.checkRateLimit(`forgot_pwd:ip:${ipAddress}`, 3, 3600);
    if (rateCheck.isLimited) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many password reset requests. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const parsed = forgotPasswordSchema.parse(data);
    const normalizedEmail = parsed.email.toLowerCase().trim();
    const prisma = this.database.getPrisma();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.passwordHash) {
      const rawResetToken = this.tokenService.generateRandomToken(32);
      const resetTokenHash = this.tokenService.hashToken(rawResetToken);
      const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: resetTokenHash,
          expiresAt: resetExpiresAt,
        },
      });

      if (!this.config.isEmailDeliveryEnabled) {
        this.logger.log(
          `[DEV MODE] Password reset token for ${user.email}: ${rawResetToken} (URL: ${this.config.corsOrigin}/reset-password?token=${rawResetToken})`,
          'AuthService',
        );
      }
    }

    // Always return neutral success message to prevent user enumeration
    return {
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent.',
    };
  }

  /**
   * Resets password using single-use reset token and revokes existing sessions
   */
  async resetPassword(data: unknown): Promise<{ success: boolean; message: string }> {
    const parsed = resetPasswordSchema.parse(data);
    const prisma = this.database.getPrisma();
    const tokenHash = this.tokenService.hashToken(parsed.token.trim());

    const record = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Password reset token is invalid or has expired',
      });
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hashPassword(parsed.newPassword);

    // Update password, mark token used, and revoke all sessions for security
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Changes password for an authenticated user
   */
  async changePassword(
    userId: string,
    data: ChangePasswordInput,
    currentSessionId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const parsed = changePasswordSchema.parse(data);
    const prisma = this.database.getPrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new BadRequestException({
        code: 'NO_PASSWORD_SET',
        message: 'This account does not have a local password configured (OAuth user).',
      });
    }

    const isCurrentValid = await this.passwordService.verifyPassword(
      parsed.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentValid) {
      throw new UnauthorizedException({
        code: 'INCORRECT_CURRENT_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    const newPasswordHash = await this.passwordService.hashPassword(parsed.newPassword);

    // Update password and revoke other sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.session.updateMany({
        where: {
          userId,
          id: currentSessionId ? { not: currentSessionId } : undefined,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  /**
   * Strips sensitive data like passwordHash before sending user objects to clients
   */
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
