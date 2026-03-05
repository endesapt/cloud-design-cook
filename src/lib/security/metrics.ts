import { InstanceStatus, OperationAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getTenantLimits } from "@/lib/quota/enforce";
import { getTenantUsage } from "@/lib/quota/usage";

const METRIC_BUCKET_MINUTES = 5;

export type InstanceRiskMetric = {
  tenantId: string;
  instanceId: string;
  status: InstanceStatus;
  bucketStart: Date;
  cpuPct: number;
  memoryPct: number;
  diskPct: number;
  riskScore: number;
  quotaPressurePct: number;
  errorEvents30m: number;
  churnEvents30m: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function deterministicInt(seed: string, min: number, max: number) {
  const hash = hashString(seed);
  const span = max - min + 1;
  return min + (hash % span);
}

export function metricBucketStart(at: Date) {
  const bucket = new Date(at);
  bucket.setUTCSeconds(0, 0);
  const minutes = bucket.getUTCMinutes();
  const rounded = minutes - (minutes % METRIC_BUCKET_MINUTES);
  bucket.setUTCMinutes(rounded);
  return bucket;
}

function toPct(used: number, max: number) {
  if (max <= 0) return 0;
  return Math.round((used / max) * 100);
}

export function calculateQuotaPressurePct(params: {
  limits: { maxVms: number; maxVcpus: number; maxRamMb: number; maxDiskGb: number };
  usage: { usedVms: number; usedVcpus: number; usedRamMb: number; usedDiskGb: number };
}) {
  return Math.max(
    toPct(params.usage.usedVms, params.limits.maxVms),
    toPct(params.usage.usedVcpus, params.limits.maxVcpus),
    toPct(params.usage.usedRamMb, params.limits.maxRamMb),
    toPct(params.usage.usedDiskGb, params.limits.maxDiskGb),
  );
}

function statusRiskBase(status: InstanceStatus) {
  switch (status) {
    case InstanceStatus.RUNNING:
      return 22;
    case InstanceStatus.STOPPED:
      return 14;
    case InstanceStatus.CREATING:
      return 34;
    case InstanceStatus.STARTING:
      return 38;
    case InstanceStatus.STOPPING:
      return 30;
    case InstanceStatus.TERMINATING:
      return 44;
    case InstanceStatus.ERROR:
      return 78;
    case InstanceStatus.DELETED:
      return 0;
    default:
      return 18;
  }
}

function buildMetric(args: {
  tenantId: string;
  instanceId: string;
  status: InstanceStatus;
  bucketStart: Date;
  quotaPressurePct: number;
  churnEvents30m: number;
  errorEvents30m: number;
}): InstanceRiskMetric {
  const seedBase = `${args.tenantId}:${args.instanceId}:${args.bucketStart.toISOString()}`;

  const running = args.status === InstanceStatus.RUNNING;
  const cpuPct = deterministicInt(`${seedBase}:cpu`, running ? 22 : 2, running ? 87 : 18);
  const memoryPct = deterministicInt(`${seedBase}:mem`, running ? 24 : 4, running ? 92 : 22);
  const diskPct = deterministicInt(`${seedBase}:disk`, 12, 89);
  const jitter = deterministicInt(`${seedBase}:jitter`, -5, 7);

  const churnScore = Math.min(100, args.churnEvents30m * 18);
  const errorScore = Math.min(100, args.errorEvents30m * 25);

  const riskScore = clamp(
    Math.round(
      statusRiskBase(args.status) +
        args.quotaPressurePct * 0.3 +
        churnScore * 0.25 +
        errorScore * 0.35 +
        jitter,
    ),
    0,
    100,
  );

  return {
    tenantId: args.tenantId,
    instanceId: args.instanceId,
    status: args.status,
    bucketStart: args.bucketStart,
    cpuPct,
    memoryPct,
    diskPct,
    riskScore,
    quotaPressurePct: args.quotaPressurePct,
    errorEvents30m: args.errorEvents30m,
    churnEvents30m: args.churnEvents30m,
  };
}

export function buildDeterministicMetric(args: {
  tenantId: string;
  instanceId: string;
  status: InstanceStatus;
  bucketStart: Date;
  quotaPressurePct: number;
  churnEvents30m: number;
  errorEvents30m: number;
}) {
  return buildMetric(args);
}

export async function refreshInstanceRiskMetrics(tenantId: string, now = new Date()) {
  const bucketStart = metricBucketStart(now);
  const windowStart = new Date(now.getTime() - 30 * 60 * 1000);

  const [limits, usage, instances, churnGroups, failureGroups] = await Promise.all([
    getTenantLimits(tenantId),
    getTenantUsage(tenantId),
    prisma.instance.findMany({
      where: {
        tenantId,
        status: { not: InstanceStatus.DELETED },
      },
      select: {
        id: true,
        status: true,
      },
    }),
    prisma.operationLog.groupBy({
      by: ["resourceId"],
      where: {
        tenantId,
        resourceType: "instance",
        resourceId: { not: null },
        createdAt: { gte: windowStart },
        action: {
          in: [OperationAction.INSTANCE_ACTION, OperationAction.UPDATE_INSTANCE],
        },
      },
      _count: {
        resourceId: true,
      },
    }),
    prisma.operationLog.groupBy({
      by: ["resourceId"],
      where: {
        tenantId,
        resourceType: "instance",
        resourceId: { not: null },
        createdAt: { gte: windowStart },
        outcome: "FAILURE",
      },
      _count: {
        resourceId: true,
      },
    }),
  ]);

  const quotaPressurePct = calculateQuotaPressurePct({ limits, usage });

  const churnMap = new Map(
    churnGroups
      .filter((item) => item.resourceId)
      .map((item) => [item.resourceId as string, item._count.resourceId]),
  );

  const failureMap = new Map(
    failureGroups
      .filter((item) => item.resourceId)
      .map((item) => [item.resourceId as string, item._count.resourceId]),
  );

  const metrics = instances.map((instance) => {
    const failureEvents = (failureMap.get(instance.id) ?? 0) + (instance.status === InstanceStatus.ERROR ? 1 : 0);
    return buildMetric({
      tenantId,
      instanceId: instance.id,
      status: instance.status,
      bucketStart,
      quotaPressurePct,
      churnEvents30m: churnMap.get(instance.id) ?? 0,
      errorEvents30m: failureEvents,
    });
  });

  await Promise.all(
    metrics.map((metric) =>
      prisma.instanceMetricSnapshot.upsert({
        where: {
          instanceId_bucketStart: {
            instanceId: metric.instanceId,
            bucketStart: metric.bucketStart,
          },
        },
        update: {
          status: metric.status,
          cpuPct: metric.cpuPct,
          memoryPct: metric.memoryPct,
          diskPct: metric.diskPct,
          riskScore: metric.riskScore,
          quotaPressurePct: metric.quotaPressurePct,
          errorEvents30m: metric.errorEvents30m,
          churnEvents30m: metric.churnEvents30m,
        },
        create: {
          tenantId,
          instanceId: metric.instanceId,
          bucketStart: metric.bucketStart,
          status: metric.status,
          cpuPct: metric.cpuPct,
          memoryPct: metric.memoryPct,
          diskPct: metric.diskPct,
          riskScore: metric.riskScore,
          quotaPressurePct: metric.quotaPressurePct,
          errorEvents30m: metric.errorEvents30m,
          churnEvents30m: metric.churnEvents30m,
        },
      }),
    ),
  );

  return {
    metrics,
    quotaPressurePct,
    bucketStart,
  };
}

export async function getLatestTenantMetrics(tenantId: string, limit = 50) {
  return prisma.instanceMetricSnapshot.findMany({
    where: { tenantId },
    orderBy: [{ bucketStart: "desc" }, { createdAt: "desc" }],
    distinct: ["instanceId"],
    take: limit,
  });
}
