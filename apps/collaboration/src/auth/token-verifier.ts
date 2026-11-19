import jwt from 'jsonwebtoken';
import { CollaborationErrorCode } from '@syncode/protocol';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
}

export class AuthenticationError extends Error {
  public readonly code: CollaborationErrorCode;

  constructor(message: string, code: CollaborationErrorCode = CollaborationErrorCode.UNAUTHENTICATED) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

export class TokenVerifier {
  constructor(private readonly secret: string) {}

  public verify(token: string): AuthenticatedUser {
    if (!token || typeof token !== 'string') {
      throw new AuthenticationError('Authentication token is required', CollaborationErrorCode.UNAUTHENTICATED);
    }

    try {
      const decoded = jwt.verify(token, this.secret) as {
        sub?: string;
        id?: string;
        email?: string;
        username?: string;
      };

      const userId = decoded.sub || decoded.id;
      if (!userId || !decoded.email) {
        throw new AuthenticationError('Invalid token payload: missing user identity', CollaborationErrorCode.INVALID_TOKEN);
      }

      return {
        id: userId,
        email: decoded.email,
        username: decoded.username || decoded.email.split('@')[0] || 'user',
      };
    } catch (err: unknown) {
      if (err instanceof AuthenticationError) {
        throw err;
      }

      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Authentication token has expired', CollaborationErrorCode.TOKEN_EXPIRED);
      }

      if (err instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid authentication token signature', CollaborationErrorCode.INVALID_TOKEN);
      }

      throw new AuthenticationError('Token verification failed', CollaborationErrorCode.UNAUTHENTICATED);
    }
  }
}
