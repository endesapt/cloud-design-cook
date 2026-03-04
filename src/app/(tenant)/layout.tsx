import { redirect } from "next/navigation";
import { NavShell } from "@/components/layout/nav-shell";
import { getSessionUserFromCookies } from "@/lib/auth/session";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/instances", label: "Instances" },
  { href: "/instances/new", label: "Create Instance" },
  { href: "/network", label: "Network & SG" },
];

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "global_admin") {
    redirect("/admin/overview");
  }

  return (
    <NavShell title="Tenant Portal" subtitle={session.fullName} items={items}>
      {children}
    </NavShell>
  );
}
