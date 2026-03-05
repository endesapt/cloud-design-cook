import { describe, expect, it } from "vitest";
import { InstanceStatus } from "@prisma/client";
import { buildDeterministicMetric, calculateQuotaPressurePct, metricBucketStart } from "@/lib/security/metrics";

describe("security metrics", () => {
  it("rounds metric buckets to 5-minute boundaries", () => {
    const date = new Date("2026-03-05T10:13:44.000Z");
    const bucket = metricBucketStart(date);

    expect(bucket.toISOString()).toBe("2026-03-05T10:10:00.000Z");
  });

  it("builds deterministic metrics for the same seed", () => {
    const input = {
      tenantId: "tenant-1",
      instanceId: "instance-1",
      status: InstanceStatus.RUNNING,
      bucketStart: new Date("2026-03-05T10:10:00.000Z"),
      quotaPressurePct: 82,
      churnEvents30m: 2,
      errorEvents30m: 1,
    };

    const first = buildDeterministicMetric(input);
    const second = buildDeterministicMetric(input);

    expect(first).toEqual(second);
  });

  it("computes quota pressure as max dimension utilization", () => {
    const quotaPressure = calculateQuotaPressurePct({
      limits: {
        maxVms: 4,
        maxVcpus: 16,
        maxRamMb: 32000,
        maxDiskGb: 500,
      },
      usage: {
        usedVms: 2,
        usedVcpus: 14,
        usedRamMb: 12000,
        usedDiskGb: 200,
      },
    });

    expect(quotaPressure).toBe(88);
  });
});
