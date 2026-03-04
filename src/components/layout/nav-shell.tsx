"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  href: string;
  label: string;
};

export function NavShell({
  title,
  subtitle,
  items,
  children,
}: {
  title: string;
  subtitle: string;
  items: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff4f4,transparent_38%),linear-gradient(180deg,#fafafa,#f3f4f6)]">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-72 rounded-2xl border border-[--line] bg-white/90 p-4 shadow-sm backdrop-blur md:block">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[--brand-red]">MTS Cloud Concept</p>
            <h1 className="mt-2 text-2xl font-bold text-[--ink-1]">{title}</h1>
            <p className="mt-1 text-sm text-[--ink-2]">{subtitle}</p>
          </div>
          <nav className="space-y-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-[--brand-red] text-white shadow-sm"
                      : "text-[--ink-2] hover:bg-[--surface-2] hover:text-[--ink-1]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 rounded-xl border border-[--line] bg-[--surface-2] p-3 text-xs text-[--ink-2]">
            Demo mode: mock lifecycle only. No hypervisor.
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
