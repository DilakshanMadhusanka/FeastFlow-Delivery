import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRoleEnum } from '@prisma/client';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';
import { ErrorCode } from '../constants';

export interface TokenPayload {
  userId: string;
  email: string;
  roles: UserRoleEnum[];
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshTokenString(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired', ErrorCode.TOKEN_EXPIRED);
    }
    throw new UnauthorizedError('Invalid access token', ErrorCode.TOKEN_INVALID);
  }
}

export function generatePasswordResetToken(userId: string): string {
  return jwt.sign({ userId, purpose: 'password_reset' }, env.JWT_ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

export function verifyPasswordResetToken(token: string): { userId: string } {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; purpose?: string };
    if (payload.purpose !== 'password_reset') {
      throw new UnauthorizedError('Invalid password reset token');
    }
    return { userId: payload.userId };
  } catch {
    throw new UnauthorizedError('Password reset link is invalid or has expired');
  }
}
