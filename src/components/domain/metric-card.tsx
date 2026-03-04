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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-bold text-[--ink-1]">
          {current}
          <span className="ml-2 text-sm font-medium text-[--ink-2]">/ {limit}</span>
        </div>
        <Progress value={ratio} />
      </CardContent>
    </Card>
  );
}
