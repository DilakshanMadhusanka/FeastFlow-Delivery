import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token';
import { UnauthorizedError } from '../utils/errors';
import { ErrorCode } from '../constants';
import { userRepository } from '../repositories/user.repository';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required.', ErrorCode.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token is missing.', ErrorCode.UNAUTHORIZED);
    }

    const payload = verifyAccessToken(token);

    // Verify user is still active in database
    const user = await userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account is inactive or no longer exists.', ErrorCode.ACCOUNT_INACTIVE);
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.userRoles.map((ur) => ur.role.name),
      isEmailVerified: user.isEmailVerified,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const payload = verifyAccessToken(token);
          const user = await userRepository.findById(payload.userId);
          if (user && user.isActive) {
            req.user = {
              id: user.id,
              email: user.email,
              name: user.name,
              roles: user.userRoles.map((ur) => ur.role.name),
              isEmailVerified: user.isEmailVerified,
            };
          }
        } catch {
          // In optionalAuth, invalid token simply leaves req.user undefined
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(allowedRoles: any[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication is required.');
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      throw new UnauthorizedError('You do not have permission to access this resource.');
    }

    next();
  };
}

