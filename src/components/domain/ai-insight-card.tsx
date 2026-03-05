import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AiInsightCard({
  title,
  description,
  confidence,
}: {
  title: string;
  description: string;
  confidence: number;
}) {
  return (
    <Card className="border-[--line-strong] bg-[linear-gradient(145deg,#fff,#fff6f6)]">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.1em] text-[--brand-red-strong]">AI Insight</CardTitle>
        <CardDescription className="font-semibold text-[--ink-1]">{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[--ink-2]">{description}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[--ink-3]">Confidence: {confidence}%</p>
      </CardContent>
    </Card>
  );
}
