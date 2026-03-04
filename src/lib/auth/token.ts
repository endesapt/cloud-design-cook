import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "@/lib/config";
import type { JwtPayload, SessionUser } from "@/lib/auth/types";
import { UnauthorizedError } from "@/lib/errors/app-error";

export const AUTH_COOKIE = "iaas_session";

export function signSessionToken(payload: SessionUser): string {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, config.jwtSecret, {
    ...options,
  });
}

export function verifySessionToken(token?: string | null): JwtPayload {
  if (!token) {
    throw new UnauthorizedError("Missing authentication token");
  }

  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}
