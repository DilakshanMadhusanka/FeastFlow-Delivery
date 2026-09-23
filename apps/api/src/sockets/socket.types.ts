import { UserRoleEnum } from '@prisma/client';

export interface SocketUser {
  userId: string;
  email: string;
  roles: UserRoleEnum[];
}

export interface SocketData {
  user?: SocketUser;
  driverId?: string;
}
