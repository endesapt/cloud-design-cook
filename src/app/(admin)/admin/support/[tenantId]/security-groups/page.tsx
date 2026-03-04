"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { SupportTenantTabs } from "@/components/domain/support-tenant-tabs";
import { LogoutButton } from "@/components/domain/logout-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/client/api";
import type { SecurityGroupDto } from "@/lib/types";

export default function SupportTenantSecurityGroupsPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = Array.isArray(params.tenantId) ? params.tenantId[0] : params.tenantId;
  const [groups, setGroups] = useState<SecurityGroupDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const data = await apiFetch<SecurityGroupDto[]>(`/api/v1/security-groups?tenantId=${tenantId}`);
      setGroups(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load security groups");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Support: Security Groups" description="Tenant security policy inspection" right={<LogoutButton />} />
      <SupportTenantTabs tenantId={tenantId} />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Security Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              No security groups.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="rounded-xl border border-[--line] bg-[--surface-2] p-3">
                  <p className="font-medium text-[--ink-1]">{group.name}</p>
                  <p className="mb-2 text-xs text-[--ink-2]">{group.description ?? "No description"}</p>
                  {group.rules.length === 0 ? (
                    <p className="text-xs text-[--ink-3]">No rules.</p>
                  ) : (
                    <div className="space-y-1">
                      {group.rules.map((rule) => (
                        <p key={rule.id} className="font-mono text-xs text-[--ink-2]">
                          {rule.direction} {rule.protocol} {rule.portFrom ?? "*"}-{rule.portTo ?? "*"} {rule.cidr}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
