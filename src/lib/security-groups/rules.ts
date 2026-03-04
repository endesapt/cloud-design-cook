import { ValidationError } from "@/lib/errors/app-error";

export type RuleShape = {
  id?: string;
  direction: "ingress" | "egress";
  protocol: string;
  portFrom: number | null;
  portTo: number | null;
  cidr: string;
};

export function normalizeRuleKey(rule: RuleShape) {
  const protocol = rule.protocol.trim().toLowerCase();
  const cidr = rule.cidr.trim().toLowerCase();
  const portFrom = rule.portFrom === null ? "*" : String(rule.portFrom);
  const portTo = rule.portTo === null ? "*" : String(rule.portTo);
  return `${rule.direction}|${protocol}|${portFrom}|${portTo}|${cidr}`;
}

export function validateRulePortRange(rule: Pick<RuleShape, "portFrom" | "portTo">) {
  if (rule.portFrom !== null && rule.portTo !== null && rule.portFrom > rule.portTo) {
    throw new ValidationError("portFrom must be less than or equal to portTo");
  }
}

export function hasDuplicateRule(rules: RuleShape[], candidate: RuleShape, excludeId?: string) {
  const candidateKey = normalizeRuleKey(candidate);
  return rules.some((rule) => {
    if (excludeId && rule.id === excludeId) return false;
    return normalizeRuleKey(rule) === candidateKey;
  });
}
