import type { QuotaLimits, QuotaUsage } from "@/lib/quota/types";

export function projectUsage(
  usage: QuotaUsage,
  delta: {
    vms?: number;
    vcpus?: number;
    ramMb?: number;
    diskGb?: number;
  },
): QuotaUsage {
  return {
    usedVms: usage.usedVms + (delta.vms ?? 0),
    usedVcpus: usage.usedVcpus + (delta.vcpus ?? 0),
    usedRamMb: usage.usedRamMb + (delta.ramMb ?? 0),
    usedDiskGb: usage.usedDiskGb + (delta.diskGb ?? 0),
  };
}

export function exceedsQuota(limits: QuotaLimits, usage: QuotaUsage) {
  return (
    usage.usedVms > limits.maxVms ||
    usage.usedVcpus > limits.maxVcpus ||
    usage.usedRamMb > limits.maxRamMb ||
    usage.usedDiskGb > limits.maxDiskGb
  );
}
