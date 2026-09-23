import { Request, Response, NextFunction } from 'express';
import { UserRoleEnum } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { ErrorCode } from '../constants';

export function requireRole(...allowedRoles: UserRoleEnum[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required before role verification.', ErrorCode.UNAUTHORIZED);
    }

    const hasAllowedRole = req.user.roles.some((role) => allowedRoles.includes(role));

    if (!hasAllowedRole) {
      throw new ForbiddenError(
        `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]`,
        ErrorCode.FORBIDDEN
      );
    }

    next();
  };
}
