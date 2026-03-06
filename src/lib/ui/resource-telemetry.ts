import { quotaTone, quotaToneLabel, type QuotaTone } from "@/lib/ui/quota";

type TrendPoint = {
  label: string;
  cpuPct: number;
  ramPct: number;
  diskPct: number;
};

type InstanceTelemetry = {
  cpuPct: number;
  ramPct: number;
  diskPct: number;
  cpuTrend: number[];
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

function buildSeries(seed: string, current: number, points: number, spread: number) {
  const slope = deterministicInt(`${seed}:slope`, -2, 3);
  return Array.from({ length: points }, (_, index) => {
    if (index === points - 1) {
      return clamp(Math.round(current), 0, 100);
    }

    const stepsFromNow = points - 1 - index;
    const drift = -slope * stepsFromNow;
    const jitter = deterministicInt(`${seed}:jitter:${index}`, -spread, spread);
    return clamp(Math.round(current + drift + jitter), 0, 100);
  });
}

function statusRanges(status: string) {
  switch (status) {
    case "RUNNING":
      return {
        cpu: [48, 93] as const,
        ram: [44, 89] as const,
        disk: [24, 84] as const,
      };
    case "ERROR":
      return {
        cpu: [78, 98] as const,
        ram: [68, 96] as const,
        disk: [30, 86] as const,
      };
    case "STARTING":
    case "CREATING":
      return {
        cpu: [24, 58] as const,
        ram: [22, 54] as const,
        disk: [18, 66] as const,
      };
    case "STOPPING":
    case "TERMINATING":
      return {
        cpu: [8, 34] as const,
        ram: [12, 36] as const,
        disk: [18, 70] as const,
      };
    case "STOPPED":
    default:
      return {
        cpu: [2, 22] as const,
        ram: [8, 28] as const,
        disk: [16, 72] as const,
      };
  }
}

export function percent(used: number, limit: number) {
  if (limit <= 0) return 0;
  return clamp(Math.round((used / limit) * 100), 0, 100);
}

export function quotaMeta(valuePct: number): { tone: QuotaTone; label: string } {
  const tone = quotaTone(valuePct);
  return {
    tone,
    label: quotaToneLabel(valuePct),
  };
}

export function buildTenantResourceTrend(params: {
  seed: string;
  current: { cpuPct: number; ramPct: number; diskPct: number };
  points?: number;
}) {
  const points = Math.max(4, params.points ?? 6);
  const cpuSeries = buildSeries(`${params.seed}:cpu`, params.current.cpuPct, points, 5);
  const ramSeries = buildSeries(`${params.seed}:ram`, params.current.ramPct, points, 5);
  const diskSeries = buildSeries(`${params.seed}:disk`, params.current.diskPct, points, 4);

  const result: TrendPoint[] = Array.from({ length: points }, (_, index) => {
    const pointsFromNow = points - 1 - index;
    return {
      label: pointsFromNow === 0 ? "now" : `-${pointsFromNow}h`,
      cpuPct: cpuSeries[index],
      ramPct: ramSeries[index],
      diskPct: diskSeries[index],
    };
  });

  return result;
}

export function buildInstanceTelemetry(seed: string, status: string): InstanceTelemetry {
  const ranges = statusRanges(status);
  const cpuPct = deterministicInt(`${seed}:cpu`, ranges.cpu[0], ranges.cpu[1]);
  const ramPct = deterministicInt(`${seed}:ram`, ranges.ram[0], ranges.ram[1]);
  const diskPct = deterministicInt(`${seed}:disk`, ranges.disk[0], ranges.disk[1]);

  return {
    cpuPct,
    ramPct,
    diskPct,
    cpuTrend: buildSeries(`${seed}:cpu-trend`, cpuPct, 8, 7),
  };
}
