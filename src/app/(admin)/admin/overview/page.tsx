"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { MetricCard } from "@/components/domain/metric-card";
import { FlavorBar, StatusPie } from "@/components/domain/overview-charts";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";

type OverviewDto = {
  tenantsCount: number;
  statusSummary: Record<string, number>;
  flavorSummary: Array<{ flavorId: string; flavorName: string; count: number }>;
  securitySummary: {
    activeAlerts: number;
    criticalAlerts: number;
  };
  recentOperations: Array<{
    id: string;
    action: string;
    createdAt: string;
    tenant: string | null;
    user: string | null;
  }>;
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch<OverviewDto>("/api/v1/admin/overview");
      setData(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load admin overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusData = useMemo(
    () =>
      Object.entries(data?.statusSummary ?? {}).map(([name, value]) => ({
        name,
        value,
      })),
    [data],
  );

  const flavorData = useMemo(
    () =>
      (data?.flavorSummary ?? []).map((item) => ({
        name: item.flavorName,
        value: item.count,
      })),
    [data],
  );

  const totalInstances = statusData.reduce((acc, item) => acc + item.value, 0);

  return (
    <div>
      <PageHeader title="Global Overview" description="Multi-tenant IaaS control plane" right={<LogoutButton />} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-2xl border border-[--line] bg-[--surface-1]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Tenants"
              description="Registered organizations"
              current={data?.tenantsCount ?? 0}
              limit={data?.tenantsCount ?? 1}
            />
            <MetricCard title="Instances" description="Total instances" current={totalInstances} limit={Math.max(totalInstances, 1)} />
            <MetricCard
              title="Running"
              description="Currently active instances"
              current={data?.statusSummary.RUNNING ?? 0}
              limit={Math.max(totalInstances, 1)}
            />
            <MetricCard
              title="Sec Alerts"
              description="Open + acknowledged security alerts"
              current={data?.securitySummary.activeAlerts ?? 0}
              limit={Math.max((data?.securitySummary.activeAlerts ?? 0) + 1, 1)}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <StatusPie data={statusData} />
            <FlavorBar data={flavorData} />
          </div>
        </>
      )}

      <Card className="mt-6 border-[--line-strong]">
        <CardHeader>
          <CardTitle>AI Security Copilot</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[--ink-2]">
            Critical alerts: <span className="font-semibold text-[--ink-1]">{data?.securitySummary.criticalAlerts ?? 0}</span>
          </p>
          <Button asChild size="sm">
            <Link href="/admin/security-center">Open Security Center</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Global Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.recentOperations?.length ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              No recent operations.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.recentOperations.map((event) => (
                <div key={event.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-[--brand-red-soft] px-2 py-0.5 font-mono text-xs font-semibold text-[--brand-red-strong]">
                      {event.action}
                    </span>
                    <span className="text-xs font-medium text-[--ink-3]">{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-[--ink-2]">
                    tenant: {event.tenant ?? "-"} | user: {event.user ?? "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
