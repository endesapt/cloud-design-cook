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
  status: "ACTIVE" | "DELETING";
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
  const [deleting, setDeleting] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

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

  async function onSafeDelete() {
    if (!tenant) return;

    const confirmed = window.confirm(
      "Safe delete works only for empty tenant. Continue precheck delete?",
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      await apiFetch(`/api/v1/admin/tenants/${tenant.id}`, {
        method: "DELETE",
      });
      toast.success("Tenant deleted");
      router.replace("/admin/tenants");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tenant delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function onForceDelete() {
    if (!tenant) return;
    if (confirmInput !== tenant.slug) {
      toast.error(`Type tenant slug (${tenant.slug}) to confirm force delete`);
      return;
    }

    try {
      setDeleting(true);
      await apiFetch(`/api/v1/admin/tenants/${tenant.id}?force=true`, {
        method: "DELETE",
      });
      toast.success("Tenant force deletion queued");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Force delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Edit Tenant Quotas" description="Update allocation limits" right={<LogoutButton />} />

      {!tenant ? (
        <div className="h-40 animate-pulse rounded-2xl border border-[--line] bg-[--surface-1]" />
      ) : (
        <>
          <Card>
          <CardHeader>
            <CardTitle>
              {tenant.name} <span className="font-mono text-xs text-[--ink-3]">({tenant.slug})</span>
            </CardTitle>
            <p className="text-xs font-medium text-[--ink-2]">Status: {tenant.status}</p>
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

          <Card className="mt-6 border-red-200">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[--ink-2]">
              Safe delete works only for an empty tenant. Force delete sets tenant to DELETING and asynchronously terminates all tenant instances.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" disabled={deleting || tenant.status === "DELETING"} onClick={onSafeDelete}>
                Safe Delete
              </Button>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-900">
                Force Delete Confirmation
              </p>
              <p className="mt-1 text-xs text-red-800">Type slug: {tenant.slug}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input value={confirmInput} onChange={(event) => setConfirmInput(event.target.value)} placeholder={tenant.slug} />
                <Button
                  variant="destructive"
                  disabled={deleting || tenant.status === "DELETING"}
                  onClick={onForceDelete}
                >
                  Force Delete
                </Button>
              </div>
            </div>
          </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
