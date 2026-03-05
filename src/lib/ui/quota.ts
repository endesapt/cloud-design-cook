export type QuotaTone = "safe" | "watch" | "warning" | "critical";

export function quotaTone(ratio: number): QuotaTone {
  if (ratio >= 95) return "critical";
  if (ratio >= 85) return "warning";
  if (ratio >= 70) return "watch";
  return "safe";
}

export function quotaToneLabel(ratio: number) {
  const tone = quotaTone(ratio);
  if (tone === "critical") return "Critical";
  if (tone === "warning") return "Warning";
  if (tone === "watch") return "Watch";
  return "Safe";
}
