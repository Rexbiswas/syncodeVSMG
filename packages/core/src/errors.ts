/**
 * Base Application Error
 */
export abstract class AppError extends Error {
  public abstract readonly code: string;
  public abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
    };
  }
}

export class ConfigurationError extends AppError {
  public readonly code = 'CONFIGURATION_ERROR';
  public readonly statusCode = 500;
}

export class DatabaseConnectionError extends AppError {
  public readonly code = 'DATABASE_CONNECTION_ERROR';
  public readonly statusCode = 503;
}

export class RedisConnectionError extends AppError {
  public readonly code = 'REDIS_CONNECTION_ERROR';
  public readonly statusCode = 503;
}

export class ServiceUnavailableError extends AppError {
  public readonly code = 'SERVICE_UNAVAILABLE';
  public readonly statusCode = 503;
}

export class ValidationError extends AppError {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;
}

export class NotFoundError extends AppError {
  public readonly code = 'NOT_FOUND';
  public readonly statusCode = 404;
}

