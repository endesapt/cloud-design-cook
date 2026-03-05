import { describe, expect, it } from "vitest";
import { nextAlertStatusForSync } from "@/lib/security/store";

describe("security alert lifecycle sync", () => {
  it("reopens resolved alerts when signal is present again", () => {
    expect(nextAlertStatusForSync("RESOLVED", true)).toBe("OPEN");
  });

  it("keeps acknowledged alerts acknowledged when signal remains", () => {
    expect(nextAlertStatusForSync("ACKNOWLEDGED", true)).toBe("ACKNOWLEDGED");
  });

  it("auto-resolves open alerts when signal disappears", () => {
    expect(nextAlertStatusForSync("OPEN", false)).toBe("RESOLVED");
  });
});
