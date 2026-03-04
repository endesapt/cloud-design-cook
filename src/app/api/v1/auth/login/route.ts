import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseJson } from "@/lib/api/parse";
import { loginSchema } from "@/lib/api/schemas";
import { apiError } from "@/lib/api/http";
import { UnauthorizedError } from "@/lib/errors/app-error";
import { AUTH_COOKIE, signSessionToken } from "@/lib/auth/token";
import { writeOperationLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJson(request, loginSchema);

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        role: true,
        tenantId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
    });

    const response = NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
        },
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    await writeOperationLog({
      tenantId: user.tenantId,
      userId: user.id,
      action: "LOGIN",
      details: { email: user.email },
    });

    return response;
  } catch (error) {
    return apiError(error);
  }
}
