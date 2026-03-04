import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function MetricCard({
  title,
  description,
  current,
  limit,
}: {
  title: string;
  description: string;
  current: number;
  limit: number;
}) {
  const ratio = limit > 0 ? (current / limit) * 100 : 0;

  return (
    <Card className="border-[--line-strong]">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.08em] text-[--ink-2]">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5">
        <div className="text-3xl font-bold leading-none text-[--ink-1]">
          {current}
          <span className="ml-2 text-sm font-medium text-[--ink-2]">/ {limit}</span>
        </div>
        <p className="text-xs font-semibold text-[--ink-3]">{Math.round(ratio)}% used</p>
        <Progress value={ratio} />
      </CardContent>
    </Card>
  );
}
