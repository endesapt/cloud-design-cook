import { describe, expect, it } from "vitest";
import { nextAlertStatusForSync, shouldFreezeTenantAfterEvaluation } from "@/lib/security/store";

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

  it("triggers demo freeze only on first detection", () => {
    expect(shouldFreezeTenantAfterEvaluation(true, null, 1)).toBe(true);
    expect(shouldFreezeTenantAfterEvaluation(true, new Date(), 1)).toBe(false);
  });
});
