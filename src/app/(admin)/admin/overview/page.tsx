"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { MetricCard } from "@/components/domain/metric-card";
import { FlavorBar, StatusPie } from "@/components/domain/overview-charts";
import { apiFetch } from "@/lib/client/api";

type OverviewDto = {
  tenantsCount: number;
  statusSummary: Record<string, number>;
  flavorSummary: Array<{ flavorId: string; flavorName: string; count: number }>;
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

  const load = useCallback(async () => {
    try {
      const response = await apiFetch<OverviewDto>("/api/v1/admin/overview");
      setData(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load admin overview");
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

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Tenants" description="Registered organizations" current={data?.tenantsCount ?? 0} limit={data?.tenantsCount ?? 1} />
        <MetricCard title="Instances" description="Total instances" current={totalInstances} limit={Math.max(totalInstances, 1)} />
        <MetricCard
          title="Running"
          description="Currently active instances"
          current={data?.statusSummary.RUNNING ?? 0}
          limit={Math.max(totalInstances, 1)}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <StatusPie data={statusData} />
        <FlavorBar data={flavorData} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Global Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.recentOperations?.length ? (
            <p className="text-sm text-[--ink-2]">No recent operations.</p>
          ) : (
            <div className="space-y-2">
              {data.recentOperations.map((event) => (
                <div key={event.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-[--brand-red]">{event.action}</span>
                    <span className="text-xs text-[--ink-3]">{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-[--ink-2]">
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
