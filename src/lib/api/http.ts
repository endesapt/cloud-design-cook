import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { AUTH_COOKIE } from "@/lib/auth/token";

export function apiOk(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(error: unknown) {
  if (error instanceof AppError) {
    const response = NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode },
    );

    if (error.code === "UNAUTHORIZED") {
      response.cookies.set({
        name: AUTH_COOKIE,
        value: "",
        maxAge: 0,
        path: "/",
      });
    }

    return response;
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.flatten(),
        },
      },
      { status: 422 },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
    { status: 500 },
  );
}
