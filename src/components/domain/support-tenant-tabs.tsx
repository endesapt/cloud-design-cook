"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const sections = [
  { key: "instances", label: "Instances" },
  { key: "network", label: "Networks" },
  { key: "security-groups", label: "Security Groups" },
  { key: "users", label: "Users" },
];

export function SupportTenantTabs({ tenantId }: { tenantId: string }) {
  const pathname = usePathname();

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Link href="/admin/support" className="rounded-lg border border-[--line] bg-[--surface-2] px-3 py-2 text-xs font-medium text-[--ink-2]">
        Back to Support
      </Link>
      {sections.map((section) => {
        const href = `/admin/support/${tenantId}/${section.key}`;
        const isActive = pathname === href;
        return (
          <Link
            key={section.key}
            href={href}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-medium transition",
              isActive
                ? "border-[--brand-red] bg-[--brand-red] text-[--on-brand]"
                : "border-[--line] bg-[--surface-2] text-[--ink-2] hover:border-[--line-strong]",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
