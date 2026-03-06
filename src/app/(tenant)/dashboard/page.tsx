"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/domain/metric-card";
import { ResourceConsumptionPanel } from "@/components/domain/resource-consumption-panel";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import { buildTenantResourceTrend, percent } from "@/lib/ui/resource-telemetry";

type QuotaReport = {
  limits: { maxVms: number; maxVcpus: number; maxRamMb: number; maxDiskGb: number };
  usage: { usedVms: number; usedVcpus: number; usedRamMb: number; usedDiskGb: number };
};

type ActivityItem = {
  id: string;
  action: string;
  createdAt: string;
  user: string | null;
  details: Record<string, unknown>;
};

type SecurityOverview = {
  summary: {
    openAlerts: number;
    criticalOpenAlerts: number;
    quotaPressurePct: number;
  };
  lastEvaluatedAt: string | null;
};

export default function DashboardPage() {
  const [quota, setQuota] = useState<QuotaReport | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [securityOverview, setSecurityOverview] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const [quotaReport, activityFeed, security] = await Promise.all([
        apiFetch<QuotaReport>("/api/v1/quota"),
        apiFetch<ActivityItem[]>("/api/v1/logs"),
        apiFetch<SecurityOverview>("/api/v1/security/overview"),
      ]);
      setQuota(quotaReport);
      setActivity(activityFeed);
      setSecurityOverview(security);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  const cards = useMemo(() => {
    if (!quota) return [];
    return [
      {
        mode: "quota" as const,
        title: "Instances",
        description: "Allocated VM slots",
        current: quota.usage.usedVms,
        limit: quota.limits.maxVms,
      },
      {
        mode: "quota" as const,
        title: "vCPU",
        description: "Compute quota usage",
        current: quota.usage.usedVcpus,
        limit: quota.limits.maxVcpus,
      },
      {
        mode: "quota" as const,
        title: "RAM (MB)",
        description: "Memory pool",
        current: quota.usage.usedRamMb,
        limit: quota.limits.maxRamMb,
      },
      {
        mode: "quota" as const,
        title: "Disk (GB)",
        description: "Persistent disk usage",
        current: quota.usage.usedDiskGb,
        limit: quota.limits.maxDiskGb,
      },
    ];
  }, [quota]);

  const resourcePanel = useMemo(() => {
    if (!quota) return null;

    const cpuPct = percent(quota.usage.usedVcpus, quota.limits.maxVcpus);
    const ramPct = percent(quota.usage.usedRamMb, quota.limits.maxRamMb);
    const diskPct = percent(quota.usage.usedDiskGb, quota.limits.maxDiskGb);
    const seed = [
      quota.usage.usedVcpus,
      quota.usage.usedRamMb,
      quota.usage.usedDiskGb,
      securityOverview?.lastEvaluatedAt ?? "na",
    ].join(":");

    return {
      trendData: buildTenantResourceTrend({
        seed: `tenant-dashboard:${seed}`,
        current: {
          cpuPct,
          ramPct,
          diskPct,
        },
      }),
      resources: [
        {
          key: "cpuPct" as const,
          label: "CPU",
          valuePct: cpuPct,
          detail: `${quota.usage.usedVcpus}/${quota.limits.maxVcpus} vCPU`,
        },
        {
          key: "ramPct" as const,
          label: "RAM",
          valuePct: ramPct,
          detail: `${quota.usage.usedRamMb}/${quota.limits.maxRamMb} MB`,
        },
        {
          key: "diskPct" as const,
          label: "Disk",
          valuePct: diskPct,
          detail: `${quota.usage.usedDiskGb}/${quota.limits.maxDiskGb} GB`,
        },
      ],
    };
  }, [quota, securityOverview?.lastEvaluatedAt]);

  return (
    <div>
      <PageHeader title="Tenant Dashboard" description="Live tenant quota and activity overview" right={<LogoutButton />} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-2xl border border-[--line] bg-[--surface-1]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))}
        </div>
      )}

      {resourcePanel ? (
        <div className="mt-6">
          <ResourceConsumptionPanel
            title="Resource Consumption Trend"
            description="CPU, RAM, and Disk utilization context for capacity decisions."
            trendData={resourcePanel.trendData}
            resources={resourcePanel.resources}
            isMockHistory
          />
        </div>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-[--brand-red]" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] p-4">
              <p className="text-sm text-[--ink-2]">No activity yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {activity.slice(0, 10).map((item) => (
                <li key={item.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-[--brand-red-soft] px-2 py-0.5 font-mono text-xs font-semibold text-[--brand-red-strong]">
                      {item.action}
                    </span>
                    <span className="text-xs font-medium text-[--ink-3]">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-[--ink-2]">{item.user ?? "system"}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-[--line-strong]">
        <CardHeader>
          <CardTitle className="text-base">AI Security Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[--ink-1]">
              Open alerts: {securityOverview?.summary.openAlerts ?? 0} | Critical:{" "}
              {securityOverview?.summary.criticalOpenAlerts ?? 0}
            </p>
            <p className="text-xs text-[--ink-3]">
              Last evaluation:{" "}
              {securityOverview?.lastEvaluatedAt ? new Date(securityOverview.lastEvaluatedAt).toLocaleString() : "n/a"}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/security-center">Open Security Center</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Cpu className="h-5 w-5 text-[--brand-red]" />
            <p className="text-sm font-medium text-[--ink-2]">Compute limits are enforced server-side.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <MemoryStick className="h-5 w-5 text-[--brand-red]" />
            <p className="text-sm font-medium text-[--ink-2]">Mock lifecycle simulates async provisioning.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <HardDrive className="h-5 w-5 text-[--brand-red]" />
            <p className="text-sm font-medium text-[--ink-2]">Operation log keeps action history for tenant operations.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
