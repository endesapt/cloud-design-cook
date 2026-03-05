import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { quotaTone, quotaToneLabel } from "@/lib/ui/quota";

type CounterMetricCardProps = {
  mode: "counter";
  value: number;
};

type QuotaMetricCardProps = {
  mode: "quota";
  current: number;
  limit: number;
};

type MetricCardProps = {
  title: string;
  description: string;
} & (CounterMetricCardProps | QuotaMetricCardProps);

const toneTextClass: Record<ReturnType<typeof quotaTone>, string> = {
  safe: "text-[--state-safe]",
  watch: "text-[--state-watch]",
  warning: "text-[--state-warning]",
  critical: "text-[--state-critical]",
};

export function MetricCard(props: MetricCardProps) {
  const isQuota = props.mode === "quota";
  const ratio = isQuota && props.limit > 0 ? (props.current / props.limit) * 100 : 0;
  const safeRatio = Math.max(0, Math.min(100, ratio));
  const tone = quotaTone(safeRatio);

  return (
    <Card className="border-[--line-strong]">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.08em] text-[--ink-2]">{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {props.mode === "counter" ? (
          <div className="text-3xl font-bold leading-none text-[--ink-1]">{props.value.toLocaleString()}</div>
        ) : (
          <>
            <div className="text-3xl font-bold leading-none text-[--ink-1]">
              {props.current.toLocaleString()}
              <span className="ml-2 text-sm font-medium text-[--ink-2]">/ {props.limit.toLocaleString()}</span>
            </div>
            <p className="text-xs font-semibold text-[--ink-3]">
              {Math.round(safeRatio)}% used
              <span className={`ml-2 ${toneTextClass[tone]}`}>{quotaToneLabel(safeRatio)}</span>
            </p>
            <Progress value={safeRatio} tone={tone} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
