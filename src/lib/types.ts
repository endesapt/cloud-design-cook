import type { InstanceStatus, UserRole } from "@prisma/client";

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
