import { redirect } from "next/navigation";
import { NavShell } from "@/components/layout/nav-shell";
import { getSessionUserFromCookies } from "@/lib/auth/session";

const items = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/support", label: "Support" },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!["global_admin", "support_viewer"].includes(session.role)) {
    redirect("/dashboard");
  }

  const navItems =
    session.role === "support_viewer"
      ? [{ href: "/admin/support", label: "Support" }]
      : [...items];

  return (
    <NavShell title="Admin Console" subtitle={session.fullName} items={navItems}>
      {children}
    </NavShell>
  );
}
