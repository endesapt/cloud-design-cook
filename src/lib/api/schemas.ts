import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createNetworkSchema = z.object({
  name: z.string().min(2).max(64),
  cidr: z
    .string()
    .regex(/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/u, "CIDR must look like 10.0.0.0/24"),
});

export const createSecurityGroupSchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().max(255).optional(),
});

export const createSecurityGroupRuleSchema = z.object({
  direction: z.enum(["ingress", "egress"]),
  protocol: z.string().min(1).max(16),
  portFrom: z.number().int().min(1).max(65535).optional().nullable(),
  portTo: z.number().int().min(1).max(65535).optional().nullable(),
  cidr: z
    .string()
    .regex(/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/u, "CIDR must look like 0.0.0.0/0"),
});

export const createInstanceSchema = z.object({
  name: z.string().min(2).max(80),
  flavorId: z.string().uuid(),
  networkId: z.string().uuid(),
  securityGroupIds: z.array(z.string().uuid()).min(1),
});

export const instanceActionSchema = z.object({
  action: z.enum(["start", "stop", "reboot", "delete"]),
});

export const createTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/u),
  description: z.string().max(255).optional(),
  maxVms: z.number().int().min(1).max(500),
  maxVcpus: z.number().int().min(1).max(4000),
  maxRamMb: z.number().int().min(256).max(8_388_608),
  maxDiskGb: z.number().int().min(10).max(1_000_000),
});

export const updateTenantSchema = z.object({
  description: z.string().max(255).optional(),
  maxVms: z.number().int().min(1).max(500).optional(),
  maxVcpus: z.number().int().min(1).max(4000).optional(),
  maxRamMb: z.number().int().min(256).max(8_388_608).optional(),
  maxDiskGb: z.number().int().min(10).max(1_000_000).optional(),
});
