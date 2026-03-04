"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";
import type { AuthMe, TenantSummaryDto } from "@/lib/types";

export default function AdminSupportPage() {
  const [me, setMe] = useState<AuthMe | null>(null);
  const [tenants, setTenants] = useState<TenantSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [meData, tenantsData] = await Promise.all([
        apiFetch<AuthMe>("/api/v1/auth/me"),
        apiFetch<TenantSummaryDto[]>("/api/v1/admin/tenants"),
      ]);
      setMe(meData);
      setTenants(tenantsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load support context");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Support Console" description="Switch tenant context for diagnostics and support actions" right={<LogoutButton />} />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Access Mode</CardTitle>
          <CardDescription>
            Current role: <span className="font-semibold">{me?.role ?? "-"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[--ink-2]">
            {me?.role === "support_viewer"
              ? "Read-only mode enabled. You can inspect tenant resources."
              : "Full support mode enabled. You can inspect and manage tenant resources."}
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-4">
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Select a tenant to open support pages.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-xl border border-[--line] bg-[--surface-2]" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-2]">
              No tenants found.
            </p>
          ) : (
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[--line] bg-[--surface-2] p-3">
                  <div>
                    <p className="font-medium text-[--ink-1]">{tenant.name}</p>
                    <p className="text-xs text-[--ink-3]">
                      {tenant.slug} · {tenant.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/admin/support/${tenant.id}/instances`}>Instances</Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/admin/support/${tenant.id}/network`}>Networks</Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/admin/support/${tenant.id}/security-groups`}>Security Groups</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/admin/support/${tenant.id}/users`}>Users</Link>
                    </Button>
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
