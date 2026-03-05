import { describe, expect, it } from "vitest";
import { buildSecurityAlertCandidates } from "@/lib/security/alerts-engine";
import { nextAlertStatusForSync } from "@/lib/security/store";

describe("e2e smoke: security center contract", () => {
  it("builds security candidates for combined signals", () => {
    const candidates = buildSecurityAlertCandidates({
      tenantId: "tenant-1",
      failedLogins: 7,
      quotaPressurePct: 90,
      errorInstances: [{ id: "vm-1", name: "vm-alpha", failReason: "Mock hypervisor failure" }],
      failureBursts: [{ resourceId: "vm-1", count: 3 }],
      securityGroupSignals: [
        {
          id: "sg-1",
          name: "web",
          exposedRulesCount: 1,
          attachedInstanceCount: 2,
          hasSensitivePort: true,
        },
      ],
    });

    expect(candidates.length).toBeGreaterThanOrEqual(4);
  });

  it("auto-resolves stale open alerts", () => {
    expect(nextAlertStatusForSync("OPEN", false)).toBe("RESOLVED");
  });
});
