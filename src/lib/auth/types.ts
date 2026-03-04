import type { UserRole } from "@prisma/client";

export type SessionUser = {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
};

export type JwtPayload = SessionUser & {
  iat?: number;
  exp?: number;
};
