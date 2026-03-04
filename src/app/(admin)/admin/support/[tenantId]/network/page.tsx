"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { SupportTenantTabs } from "@/components/domain/support-tenant-tabs";
import { LogoutButton } from "@/components/domain/logout-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/client/api";
import type { NetworkDto, SecurityGroupDto } from "@/lib/types";

export default function SupportTenantNetworkPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = Array.isArray(params.tenantId) ? params.tenantId[0] : params.tenantId;
  const [networks, setNetworks] = useState<NetworkDto[]>([]);
  const [groups, setGroups] = useState<SecurityGroupDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const [networksData, groupsData] = await Promise.all([
        apiFetch<NetworkDto[]>(`/api/v1/networks?tenantId=${tenantId}`),
        apiFetch<SecurityGroupDto[]>(`/api/v1/security-groups?tenantId=${tenantId}`),
      ]);
      setNetworks(networksData);
      setGroups(groupsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tenant network resources");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Support: Tenant Networks" description="Read-only visibility for network resources" right={<LogoutButton />} />
      <SupportTenantTabs tenantId={tenantId} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Networks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-20 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
            ) : networks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
                No networks.
              </p>
            ) : (
              <div className="space-y-2">
                {networks.map((network) => (
                  <div key={network.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3">
                    <p className="font-medium text-[--ink-1]">{network.name}</p>
                    <p className="font-mono text-xs text-[--ink-2]">{network.cidr}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Security Groups Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-20 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
            ) : groups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
                No security groups.
              </p>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <div key={group.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3">
                    <p className="font-medium text-[--ink-1]">{group.name}</p>
                    <p className="text-xs text-[--ink-2]">{group.description ?? "No description"}</p>
                    <p className="text-xs text-[--ink-3]">{group.rules.length} rules</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
