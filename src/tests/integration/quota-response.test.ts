import { describe, expect, it } from "vitest";
import { QuotaExceededError } from "@/lib/errors/app-error";

describe("quota error contract", () => {
  it("uses fixed machine code", () => {
    const error = new QuotaExceededError("Quota exceeded", {
      limit: 1,
      current: 2,
    });

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe("QUOTA_EXCEEDED");
    expect(error.details).toEqual({ limit: 1, current: 2 });
  });
});
