import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { ErrorCode, HttpStatus } from '../constants';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): Response {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.errorCode, err.statusCode, err.details);
  }

  // Handle Prisma Known Request Errors
  if ('code' in err && typeof err.code === 'string') {
    if (err.code === 'P2002') {
      return sendError(
        res,
        'A record with this unique identifier already exists.',
        ErrorCode.CONFLICT,
        HttpStatus.CONFLICT
      );
    }
    if (err.code === 'P2025') {
      return sendError(
        res,
        'The requested record was not found.',
        ErrorCode.NOT_FOUND,
        HttpStatus.NOT_FOUND
      );
    }
  }

  // Handle Syntax Errors (e.g. malformed JSON body)
  if ('type' in err && err.type === 'entity.parse.failed') {
    return sendError(
      res,
      'Malformed JSON payload in request body.',
      ErrorCode.BAD_REQUEST,
      HttpStatus.BAD_REQUEST
    );
  }

  console.error('💥 Unhandled Exception:', err);

  return sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal server error',
    ErrorCode.INTERNAL_SERVER_ERROR,
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}
