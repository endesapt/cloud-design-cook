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

function ratio(current: number, max: number) {
  if (max <= 0) return 0;
  return Math.round((current / max) * 100);
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantSummaryDto[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<TenantSummaryDto[]>("/api/v1/admin/tenants");
      setTenants(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tenants");
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
          {tenants.length === 0 ? (
            <p className="text-sm text-[--ink-2]">No tenants found.</p>
          ) : (
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[--ink-1]">{tenant.name}</p>
                      <p className="font-mono text-xs text-[--ink-3]">{tenant.slug}</p>
                    </div>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/admin/tenants/${tenant.id}`}>Edit Quotas</Link>
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-[--ink-2]">
                        <span>VMs</span>
                        <span>
                          {tenant.usage.usedVms}/{tenant.quotas.maxVms}
                        </span>
                      </div>
                      <Progress value={ratio(tenant.usage.usedVms, tenant.quotas.maxVms)} />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-[--ink-2]">
                        <span>vCPU</span>
                        <span>
                          {tenant.usage.usedVcpus}/{tenant.quotas.maxVcpus}
                        </span>
                      </div>
                      <Progress value={ratio(tenant.usage.usedVcpus, tenant.quotas.maxVcpus)} />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-[--ink-2]">
                        <span>RAM MB</span>
                        <span>
                          {tenant.usage.usedRamMb}/{tenant.quotas.maxRamMb}
                        </span>
                      </div>
                      <Progress value={ratio(tenant.usage.usedRamMb, tenant.quotas.maxRamMb)} />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-[--ink-2]">
                        <span>Disk GB</span>
                        <span>
                          {tenant.usage.usedDiskGb}/{tenant.quotas.maxDiskGb}
                        </span>
                      </div>
                      <Progress value={ratio(tenant.usage.usedDiskGb, tenant.quotas.maxDiskGb)} />
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
