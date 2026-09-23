import { UserRoleEnum } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: UserRoleEnum[];
  isEmailVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
