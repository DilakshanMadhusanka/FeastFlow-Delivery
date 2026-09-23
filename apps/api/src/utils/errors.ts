import { ErrorCode, ErrorCodeType, HttpStatus } from '../constants';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCodeType;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCodeType = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', errorCode: ErrorCodeType = ErrorCode.BAD_REQUEST, details?: unknown) {
    super(message, HttpStatus.BAD_REQUEST, errorCode, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', errorCode: ErrorCodeType = ErrorCode.UNAUTHORIZED) {
    super(message, HttpStatus.UNAUTHORIZED, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied', errorCode: ErrorCodeType = ErrorCode.FORBIDDEN) {
    super(message, HttpStatus.FORBIDDEN, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', errorCode: ErrorCodeType = ErrorCode.NOT_FOUND) {
    super(message, HttpStatus.NOT_FOUND, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', errorCode: ErrorCodeType = ErrorCode.CONFLICT) {
    super(message, HttpStatus.CONFLICT, errorCode);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.VALIDATION_ERROR, details);
  }
}
