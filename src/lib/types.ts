import type { InstanceStatus, TenantStatus, UserRole } from "@prisma/client";

export type AuthMe = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
};

export type FlavorDto = {
  id: string;
  name: string;
  vcpus: number;
  ramMb: number;
  diskGb: number;
};

export type NetworkDto = {
  id: string;
  tenantId: string;
  name: string;
  cidr: string;
  createdAt: string;
};

export type SecurityGroupRuleDto = {
  id: string;
  direction: "ingress" | "egress";
  protocol: string;
  portFrom: number | null;
  portTo: number | null;
  cidr: string;
};

export type SecurityGroupDto = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  rules: SecurityGroupRuleDto[];
};

export type InstanceDto = {
  id: string;
  tenantId: string;
  name: string;
  status: InstanceStatus;
  ipv4: string | null;
  createdAt: string;
  flavor: FlavorDto;
  network: NetworkDto;
  securityGroups: Array<{ securityGroup: SecurityGroupDto }>;
};

export type TenantSummaryDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: TenantStatus;
  quotas: {
    maxVms: number;
    maxVcpus: number;
    maxRamMb: number;
    maxDiskGb: number;
  };
  usage: {
    usedVms: number;
    usedVcpus: number;
    usedRamMb: number;
    usedDiskGb: number;
  };
};

export type UserDto = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SecurityAlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type SecurityAlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SecurityAlertType = "AUTH_ANOMALY" | "INSTANCE_FAILURE" | "QUOTA_PRESSURE" | "SG_EXPOSURE";
export type SecurityPlaybook =
  | "STOP_INSTANCE"
  | "QUARANTINE_INSTANCE"
  | "RESTORE_INSTANCE_SG"
  | "SUGGEST_PASSWORD_RESET"
  | "SUGGEST_ACCESS_LOCKDOWN"
  | "SUGGEST_SG_HARDENING"
  | "SUGGEST_CAPACITY_RIGHTSIZING"
  | "SUGGEST_INSTANCE_DIAGNOSTICS";

export type SecurityAlertDto = {
  id: string;
  tenantId: string;
  tenantName?: string;
  tenantSlug?: string;
  type: SecurityAlertType;
  severity: SecurityAlertSeverity;
  status: SecurityAlertStatus;
  title: string;
  description: string;
  targetType: string;
  targetId: string;
  ruleKey: string;
  details: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  recommendedPlaybooks: SecurityPlaybook[];
};

export type InstanceRiskMetricDto = {
  instanceId: string;
  status: InstanceStatus;
  bucketStart: string;
  cpuPct: number;
  memoryPct: number;
  diskPct: number;
  riskScore: number;
  quotaPressurePct: number;
  errorEvents30m: number;
  churnEvents30m: number;
  createdAt: string;
};

export type SecurityOverviewDto = {
  summary: {
    openAlerts: number;
    acknowledgedAlerts: number;
    resolvedLast24h: number;
    criticalOpenAlerts: number;
    riskyInstances: number;
    quotaPressurePct: number;
  };
  metrics: InstanceRiskMetricDto[];
  alerts: SecurityAlertDto[];
  lastEvaluatedAt: string | null;
  lastEvaluationError: string | null;
  demo: {
    isFrozen: boolean;
    frozenAt: string | null;
    mode: "FIRST_DETECTION_FREEZE";
  };
};

export type PlaybookRequestDto = {
  playbook: SecurityPlaybook;
};

export type AlertStatusPatchDto = {
  status: SecurityAlertStatus;
};
