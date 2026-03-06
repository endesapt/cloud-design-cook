"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AiInsightCard } from "@/components/domain/ai-insight-card";
import { LogoutButton } from "@/components/domain/logout-button";
import { MetricCard } from "@/components/domain/metric-card";
import { SecurityAlertsTable } from "@/components/domain/security-alerts-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/client/api";
import type { AuthMe, SecurityAlertDto, SecurityOverviewDto, SecurityPlaybook, TenantSummaryDto } from "@/lib/types";

type Playbook = SecurityPlaybook;
type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

type GlobalOverview = {
  scope: "global";
  tenantsCount: number;
  activeAlerts: number;
  severitySummary: Record<string, number>;
  topAlerts: Array<{
    id: string;
    tenantName: string;
    severity: string;
    title: string;
    lastSeenAt: string;
  }>;
};

export default function AdminSecurityCenterPage() {
  const [me, setMe] = useState<AuthMe | null>(null);
  const [tenants, setTenants] = useState<TenantSummaryDto[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [globalOverview, setGlobalOverview] = useState<GlobalOverview | null>(null);
  const [overview, setOverview] = useState<SecurityOverviewDto | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlertDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const canMutate = me?.role === "global_admin";

  const load = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [meData, tenantsData, globalData] = await Promise.all([
        apiFetch<AuthMe>("/api/v1/auth/me"),
        apiFetch<TenantSummaryDto[]>("/api/v1/admin/tenants"),
        apiFetch<GlobalOverview>("/api/v1/admin/security/overview"),
      ]);

      const preferredTenantId = selectedTenantId ?? tenantsData[0]?.id ?? null;

      setMe(meData);
      setTenants(tenantsData);
      setGlobalOverview(globalData);
      setSelectedTenantId(preferredTenantId);

      if (preferredTenantId) {
        const [tenantOverview, tenantAlerts] = await Promise.all([
          apiFetch<SecurityOverviewDto>(`/api/v1/admin/security/overview?tenantId=${preferredTenantId}`),
          apiFetch<SecurityAlertDto[]>(`/api/v1/admin/security/alerts?tenantId=${preferredTenantId}&limit=160`),
        ]);

        setOverview(tenantOverview);
        setAlerts(tenantAlerts);
      } else {
        setOverview(null);
        setAlerts([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load admin security center");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const topTenantName = useMemo(() => {
    const selected = tenants.find((tenant) => tenant.id === selectedTenantId);
    return selected?.name ?? "-";
  }, [selectedTenantId, tenants]);

  async function updateAlertStatus(alertId: string, status: AlertStatus) {
    try {
      setBusyKey(alertId);
      await apiFetch(`/api/v1/security/alerts/${alertId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(`Alert status updated to ${status}`);
      await load(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update alert status");
    } finally {
      setBusyKey(null);
    }
  }

  async function runPlaybook(alertId: string, playbook: Playbook) {
    try {
      setBusyKey(alertId);
      await apiFetch(`/api/v1/security/alerts/${alertId}/playbook`, {
        method: "POST",
        body: JSON.stringify({ playbook }),
      });
      toast.success(`Playbook executed: ${playbook}`);
      await load(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to execute playbook");
    } finally {
      setBusyKey(null);
    }
  }

  async function resetTenantFreeze() {
    if (!selectedTenantId) return;
    try {
      setLoading(true);
      await apiFetch(`/api/v1/admin/security/tenants/${selectedTenantId}/reset-freeze`, {
        method: "POST",
      });
      toast.success("Security snapshot reset and rebuilt");
      await load(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset security snapshot");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Admin AI Security Center"
        description="Cross-tenant security posture, alert triage, and guided remediation"
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Refresh Snapshot
            </Button>
            <LogoutButton />
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-2xl border border-[--line] bg-[--surface-1]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            mode="counter"
            title="Active Alerts"
            description="Open + acknowledged across tenants"
            value={globalOverview?.activeAlerts ?? 0}
          />
          <MetricCard
            mode="counter"
            title="Critical"
            description="Global high-risk alert count"
            value={globalOverview?.severitySummary?.CRITICAL ?? 0}
          />
          <MetricCard
            mode="counter"
            title="Tenants"
            description="Organizations with monitored telemetry"
            value={globalOverview?.tenantsCount ?? 0}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AiInsightCard
          title="Global risk focus"
          description="The model highlights concentrated risk on tenants with repeated alert recurrence and high-severity unresolved signals."
          confidence={89}
        />
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[--brand-red]" />
              Tenant Scope
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="tenantScope" className="text-sm font-medium text-[--ink-2]">
                Selected tenant
              </label>
              <select
                id="tenantScope"
                className="h-10 rounded-lg border border-[--line] bg-[--surface-2] px-3 text-sm"
                value={selectedTenantId ?? ""}
                onChange={(event) => {
                  setSelectedTenantId(event.target.value || null);
                }}
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[--ink-3]">Current: {topTenantName}</span>
              {canMutate && selectedTenantId ? (
                <Button size="sm" variant="secondary" onClick={() => void resetTenantFreeze()}>
                  Reset Demo Freeze
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {overview?.demo?.isFrozen ? (
        <p className="mt-3 rounded-xl border border-[#6b1d2b] bg-[#2a1018] px-3 py-2 text-xs font-semibold text-[#fca5a5]">
          Demo snapshot frozen since {overview.demo.frozenAt ? new Date(overview.demo.frozenAt).toLocaleString() : "n/a"}.
          Use reset to rebuild signals.
        </p>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[--brand-red]" />
            Tenant Alert Stream
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!alerts.length ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              No alerts for selected tenant.
            </p>
          ) : (
            <SecurityAlertsTable
              alerts={alerts}
              canMutate={Boolean(canMutate)}
              busyKey={busyKey}
              onStatusChange={updateAlertStatus}
              onPlaybook={runPlaybook}
            />
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-[--ink-3]">
        Selected tenant evaluation: {overview?.lastEvaluatedAt ? new Date(overview.lastEvaluatedAt).toLocaleString() : "n/a"}
      </p>
      {overview?.lastEvaluationError ? (
        <p className="mt-1 text-xs font-semibold text-[#b91c1c]">Signal engine warning: {overview.lastEvaluationError}</p>
      ) : null}
    </div>
  );
}
