import { describe, expect, it } from "vitest";
import { buildAlertFingerprint, buildSecurityAlertCandidates } from "@/lib/security/alerts-engine";

describe("security alert engine", () => {
  it("creates auth anomaly when failed login threshold is reached", () => {
    const candidates = buildSecurityAlertCandidates({
      tenantId: "tenant-1",
      failedLogins: 5,
      quotaPressurePct: 40,
      errorInstances: [],
      failureBursts: [],
      securityGroupSignals: [],
    });

    expect(candidates.some((candidate) => candidate.type === "AUTH_ANOMALY")).toBe(true);
  });

  it("applies high severity for quota pressure >= 95%", () => {
    const candidates = buildSecurityAlertCandidates({
      tenantId: "tenant-1",
      failedLogins: 0,
      quotaPressurePct: 97,
      errorInstances: [],
      failureBursts: [],
      securityGroupSignals: [],
    });

    const quotaAlert = candidates.find((candidate) => candidate.type === "QUOTA_PRESSURE");
    expect(quotaAlert?.severity).toBe("HIGH");
  });

  it("creates SG exposure alert for exposed security group", () => {
    const candidates = buildSecurityAlertCandidates({
      tenantId: "tenant-1",
      failedLogins: 0,
      quotaPressurePct: 0,
      errorInstances: [],
      failureBursts: [],
      securityGroupSignals: [
        {
          id: "sg-1",
          name: "default",
          exposedRulesCount: 2,
          attachedInstanceCount: 3,
          hasSensitivePort: true,
        },
      ],
    });

    expect(candidates.some((candidate) => candidate.type === "SG_EXPOSURE")).toBe(true);
  });

  it("builds deterministic fingerprint", () => {
    const candidate = {
      type: "INSTANCE_FAILURE" as const,
      severity: "HIGH" as const,
      title: "t",
      description: "d",
      targetType: "instance",
      targetId: "instance-1",
      ruleKey: "instance-error-state",
      details: {},
    };

    const first = buildAlertFingerprint("tenant-1", candidate);
    const second = buildAlertFingerprint("tenant-1", candidate);

    expect(first).toBe(second);
    expect(first).toContain("tenant-1");
  });
});
