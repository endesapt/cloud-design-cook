"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { TenantSummaryDto } from "@/lib/types";
import { quotaTone, quotaToneLabel } from "@/lib/ui/quota";

function ratio(current: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

const toneClassName = {
  safe: "text-[--state-safe]",
  watch: "text-[--state-watch]",
  warning: "text-[--state-warning]",
  critical: "text-[--state-critical]",
} as const;

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<TenantSummaryDto[]>("/api/v1/admin/tenants");
      setTenants(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Tenants" description="Quota and utilization control" right={<LogoutButton />} />

      <Card>
        <CardHeader>
          <CardTitle>Tenant Resource Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              No tenants found.
            </p>
          ) : (
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[--ink-1]">{tenant.name}</p>
                      <p className="font-mono text-xs text-[--ink-3]">{tenant.slug}</p>
                      <p className="text-xs font-medium text-[--ink-2]">status: {tenant.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/support/${tenant.id}/instances`}>Support View</Link>
                      </Button>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/tenants/${tenant.id}`}>Edit Quotas</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      {(() => {
                        const used = ratio(tenant.usage.usedVms, tenant.quotas.maxVms);
                        const tone = quotaTone(used);
                        return (
                          <>
                            <div className="mb-1 flex justify-between text-xs text-[--ink-2]">
                              <span>VMs</span>
                              <span>
                                {tenant.usage.usedVms}/{tenant.quotas.maxVms}
                                <span className={`ml-2 font-semibold ${toneClassName[tone]}`}>
                                  {used}% {quotaToneLabel(used)}
                                </span>
                              </span>
                            </div>
                            <Progress value={used} tone={tone} />
                          </>
                        );
                      })()}
                    </div>
                    <div>
                      {(() => {
                        const used = ratio(tenant.usage.usedVcpus, tenant.quotas.maxVcpus);
                        const tone = quotaTone(used);
                        return (
                          <>
                            <div className="mb-1 flex justify-between text-xs text-[--ink-2]">
                              <span>vCPU</span>
                              <span>
                                {tenant.usage.usedVcpus}/{tenant.quotas.maxVcpus}
                                <span className={`ml-2 font-semibold ${toneClassName[tone]}`}>
                                  {used}% {quotaToneLabel(used)}
                                </span>
                              </span>
                            </div>
                            <Progress value={used} tone={tone} />
                          </>
                        );
                      })()}
                    </div>
                    <div>
                      {(() => {
                        const used = ratio(tenant.usage.usedRamMb, tenant.quotas.maxRamMb);
                        const tone = quotaTone(used);
                        return (
                          <>
                            <div className="mb-1 flex justify-between text-xs text-[--ink-2]">
                              <span>RAM MB</span>
                              <span>
                                {tenant.usage.usedRamMb}/{tenant.quotas.maxRamMb}
                                <span className={`ml-2 font-semibold ${toneClassName[tone]}`}>
                                  {used}% {quotaToneLabel(used)}
                                </span>
                              </span>
                            </div>
                            <Progress value={used} tone={tone} />
                          </>
                        );
                      })()}
                    </div>
                    <div>
                      {(() => {
                        const used = ratio(tenant.usage.usedDiskGb, tenant.quotas.maxDiskGb);
                        const tone = quotaTone(used);
                        return (
                          <>
                            <div className="mb-1 flex justify-between text-xs text-[--ink-2]">
                              <span>Disk GB</span>
                              <span>
                                {tenant.usage.usedDiskGb}/{tenant.quotas.maxDiskGb}
                                <span className={`ml-2 font-semibold ${toneClassName[tone]}`}>
                                  {used}% {quotaToneLabel(used)}
                                </span>
                              </span>
                            </div>
                            <Progress value={used} tone={tone} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
