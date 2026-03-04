import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth/token";
import type { SessionUser } from "@/lib/auth/types";

export async function getSessionUserFromCookies(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = verifySessionToken(token);
    return {
      userId: payload.userId,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  } catch {
    return null;
  }
}

export function getSessionUserFromRequest(request: NextRequest): SessionUser {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = verifySessionToken(token);

  return {
    userId: payload.userId,
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role,
    tenantId: payload.tenantId,
  };
}
