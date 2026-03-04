import { redirect } from "next/navigation";
import { NavShell } from "@/components/layout/nav-shell";
import { getSessionUserFromCookies } from "@/lib/auth/session";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "global_admin" || session.role === "support_viewer") {
    if (session.role === "support_viewer") {
      redirect("/admin/support");
    }
    redirect("/admin/overview");
  }

  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/instances", label: "Instances" },
    { href: "/instances/new", label: "Create Instance" },
    { href: "/network", label: "Networks" },
    { href: "/network/security-groups", label: "Security Groups" },
    ...(session.role === "tenant_admin" ? [{ href: "/users", label: "Users" }] : []),
  ];

  return (
    <NavShell title="Tenant Portal" subtitle={session.fullName} items={items}>
      {children}
    </NavShell>
  );
}
