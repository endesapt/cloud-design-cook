import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function PageHeader({
  title,
  description,
  onLogout,
  right,
}: {
  title: string;
  description?: string;
  onLogout?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[--line] bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[--ink-1]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[--ink-2]">{description}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {right}
        {onLogout ? (
          <Button variant="secondary" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        ) : null}
      </div>
    </header>
  );
}
