import { NextRequest } from "next/server";
import { z } from "zod";
import { ValidationError } from "@/lib/errors/app-error";

export async function parseJson<T extends z.ZodTypeAny>(request: NextRequest, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }

  return schema.parse(body);
}
