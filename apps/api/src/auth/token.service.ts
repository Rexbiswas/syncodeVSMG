import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import { ConfigService } from '../config/config.service.js';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generates a signed JWT access token
   */
  generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): { token: string; expiresInSeconds: number } {
    const expiresInSeconds = this.parseDurationToSeconds(this.config.jwtAccessExpiresIn);
    const token = this.jwtService.sign(payload, {
      secret: this.config.jwtAccessSecret,
      expiresIn: expiresInSeconds,
    });
    return { token, expiresInSeconds };
  }

  /**
   * Verifies and decodes a JWT access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.jwtAccessSecret,
      });
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is invalid or expired',
      });
    }
  }

  /**
   * Generates a cryptographically secure random refresh token string
   */
  generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Generates a single-use token (for email verification or password reset)
   */
  generateRandomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hashes a sensitive token with SHA-256 for secure database storage
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Calculates the expiration Date for refresh tokens based on configuration
   */
  getRefreshTokenExpiresAt(): Date {
    const daysMatch = this.config.refreshTokenExpiresIn.match(/^(\d+)d$/);
    const days = daysMatch && daysMatch[1] ? parseInt(daysMatch[1], 10) : 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  /**
   * Converts a duration string (e.g. "15m", "1h", "7d", "900") to seconds
   */
  private parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])?$/);
    if (!match) return 900; // default 15 minutes
    const value = parseInt(match[1] ?? '900', 10);
    const unit = match[2] ?? 's';
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return value;
    }
  }
}
