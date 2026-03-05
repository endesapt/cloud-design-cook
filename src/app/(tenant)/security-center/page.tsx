"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AiInsightCard } from "@/components/domain/ai-insight-card";
import { LogoutButton } from "@/components/domain/logout-button";
import { MetricCard } from "@/components/domain/metric-card";
import { SecurityAlertsTable } from "@/components/domain/security-alerts-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/client/api";
import type { AuthMe, SecurityAlertDto, SecurityOverviewDto, SecurityPlaybook } from "@/lib/types";

type Playbook = SecurityPlaybook;
type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export default function TenantSecurityCenterPage() {
  const [me, setMe] = useState<AuthMe | null>(null);
  const [overview, setOverview] = useState<SecurityOverviewDto | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlertDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const canMutate = me?.role === "tenant_admin";

  const load = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [meData, overviewData, alertsData] = await Promise.all([
        apiFetch<AuthMe>("/api/v1/auth/me"),
        apiFetch<SecurityOverviewDto>("/api/v1/security/overview"),
        apiFetch<SecurityAlertDto[]>("/api/v1/security/alerts?limit=120"),
      ]);
      setMe(meData);
      setOverview(overviewData);
      setAlerts(alertsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load Security Center");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const topMetricRows = useMemo(() => {
    return [...(overview?.metrics ?? [])].sort((left, right) => right.riskScore - left.riskScore).slice(0, 8);
  }, [overview]);

  const primaryInsight = useMemo(() => {
    const summary = overview?.summary;
    if (!summary) {
      return {
        title: "Security signal model warming up",
        description: "The copilot is calibrating metrics and alert history for your tenant.",
        confidence: 72,
      };
    }

    if (summary.criticalOpenAlerts > 0) {
      return {
        title: "Immediate response recommended",
        description: `${summary.criticalOpenAlerts} high-severity alerts remain active. Prioritize quarantine or stop playbooks on affected resources.`,
        confidence: 92,
      };
    }

    if (summary.quotaPressurePct >= 85) {
      return {
        title: "Capacity pressure is rising",
        description: `Quota pressure is ${summary.quotaPressurePct}%. Consider resource cleanup before service-impacting actions start to fail.`,
        confidence: 88,
      };
    }

    return {
      title: "Security posture is stable",
      description: "No high-priority risk spikes detected in current telemetry and audit behavior.",
      confidence: 81,
    };
  }, [overview]);

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

  return (
    <div>
      <PageHeader
        title="AI Security Center"
        description="Risk analytics, detections, and one-click remediation"
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
            title="Open Alerts"
            description="Current active security signals"
            value={overview?.summary.openAlerts ?? 0}
          />
          <MetricCard
            mode="counter"
            title="Critical"
            description="High-impact unresolved alerts"
            value={overview?.summary.criticalOpenAlerts ?? 0}
          />
          <MetricCard
            mode="quota"
            title="Quota Pressure"
            description="Maximum tenant utilization"
            current={overview?.summary.quotaPressurePct ?? 0}
            limit={100}
          />
        </div>
      )}

      {overview?.demo?.isFrozen ? (
        <p className="mt-3 rounded-xl border border-[#fbcfe8] bg-[#fff1f2] px-3 py-2 text-xs font-semibold text-[#9f1239]">
          Demo snapshot frozen since {overview.demo.frozenAt ? new Date(overview.demo.frozenAt).toLocaleString() : "n/a"}.
          Auto-updates are disabled.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AiInsightCard {...primaryInsight} />
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[--brand-red]" />
              Instance Risk Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!topMetricRows.length ? (
              <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
                No risk metrics yet.
              </p>
            ) : (
              <div className="space-y-2">
                {topMetricRows.map((metric) => (
                  <div key={metric.instanceId} className="rounded-xl border border-[--line] bg-[--surface-2] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs text-[--ink-2]">{metric.instanceId.slice(0, 12)}...</p>
                      <p className="text-xs font-semibold text-[--ink-1]">Risk {metric.riskScore}%</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[--surface-3]">
                      <div className="h-2 rounded-full bg-[--brand-red]" style={{ width: `${metric.riskScore}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[--brand-red]" />
            Alert Stream & Playbooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              No alerts detected.
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
        Last evaluation: {overview?.lastEvaluatedAt ? new Date(overview.lastEvaluatedAt).toLocaleString() : "n/a"}
      </p>
      {overview?.lastEvaluationError ? (
        <p className="mt-1 text-xs font-semibold text-[#b91c1c]">Signal engine warning: {overview.lastEvaluationError}</p>
      ) : null}
    </div>
  );
}
