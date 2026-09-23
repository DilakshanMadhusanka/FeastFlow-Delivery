import { Response } from 'express';
import { ApiResponse } from '@food-delivery/shared';
import { HttpStatus } from '../constants';

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = HttpStatus.OK
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(payload);
}

export function sendCreated<T>(
  res: Response,
  data?: T,
  message: string = 'Resource created successfully'
): Response {
  return sendSuccess(res, data, message, HttpStatus.CREATED);
}

export function sendError(
  res: Response,
  message: string,
  errorCode: string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  details?: unknown
): Response {
  const payload: ApiResponse = {
    success: false,
    message,
    errorCode,
    details,
  };
  return res.status(statusCode).json(payload);
}
