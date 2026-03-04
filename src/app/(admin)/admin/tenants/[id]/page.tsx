"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/domain/logout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";

type TenantDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  maxVms: number;
  maxVcpus: number;
  maxRamMb: number;
  maxDiskGb: number;
};

export default function AdminTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDto | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<TenantDto>(`/api/v1/admin/tenants/${params.id}`);
      setTenant(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tenant");
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!tenant) return;

    try {
      setSaving(true);
      await apiFetch(`/api/v1/admin/tenants/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: tenant.description,
          maxVms: Number(tenant.maxVms),
          maxVcpus: Number(tenant.maxVcpus),
          maxRamMb: Number(tenant.maxRamMb),
          maxDiskGb: Number(tenant.maxDiskGb),
        }),
      });
      toast.success("Tenant quotas updated");
      router.push("/admin/tenants");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save tenant");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Edit Tenant Quotas" description="Update allocation limits" right={<LogoutButton />} />

      {!tenant ? (
        <div className="h-40 animate-pulse rounded-2xl border border-[--line] bg-[--surface-1]" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {tenant.name} <span className="font-mono text-xs text-[--ink-3]">({tenant.slug})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-[--ink-2]">Description</label>
                <Input
                  value={tenant.description ?? ""}
                  onChange={(e) => setTenant((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--ink-2]">Max VMs</label>
                <Input
                  type="number"
                  value={tenant.maxVms}
                  onChange={(e) => setTenant((prev) => (prev ? { ...prev, maxVms: Number(e.target.value) } : prev))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--ink-2]">Max vCPU</label>
                <Input
                  type="number"
                  value={tenant.maxVcpus}
                  onChange={(e) => setTenant((prev) => (prev ? { ...prev, maxVcpus: Number(e.target.value) } : prev))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--ink-2]">Max RAM (MB)</label>
                <Input
                  type="number"
                  value={tenant.maxRamMb}
                  onChange={(e) => setTenant((prev) => (prev ? { ...prev, maxRamMb: Number(e.target.value) } : prev))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[--ink-2]">Max Disk (GB)</label>
                <Input
                  type="number"
                  value={tenant.maxDiskGb}
                  onChange={(e) => setTenant((prev) => (prev ? { ...prev, maxDiskGb: Number(e.target.value) } : prev))}
                />
              </div>

              <div className="md:col-span-2">
                <Button className="min-w-48" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Quotas"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
