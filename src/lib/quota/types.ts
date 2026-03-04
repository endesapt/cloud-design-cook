export type QuotaUsage = {
  usedVms: number;
  usedVcpus: number;
  usedRamMb: number;
  usedDiskGb: number;
};

export type QuotaLimits = {
  maxVms: number;
  maxVcpus: number;
  maxRamMb: number;
  maxDiskGb: number;
};
