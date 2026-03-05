import { SecurityAlertType, SecurityPlaybook } from "@prisma/client";

export function recommendedPlaybooksForAlert(type: SecurityAlertType, targetType: string): SecurityPlaybook[] {
  if (type === SecurityAlertType.AUTH_ANOMALY) {
    return [SecurityPlaybook.SUGGEST_ACCESS_LOCKDOWN, SecurityPlaybook.SUGGEST_PASSWORD_RESET];
  }

  if (type === SecurityAlertType.QUOTA_PRESSURE) {
    return [SecurityPlaybook.SUGGEST_CAPACITY_RIGHTSIZING];
  }

  if (type === SecurityAlertType.SG_EXPOSURE) {
    return [SecurityPlaybook.SUGGEST_SG_HARDENING];
  }

  if (type === SecurityAlertType.INSTANCE_FAILURE && targetType === "instance") {
    return [
      SecurityPlaybook.QUARANTINE_INSTANCE,
      SecurityPlaybook.STOP_INSTANCE,
      SecurityPlaybook.SUGGEST_INSTANCE_DIAGNOSTICS,
    ];
  }

  return [SecurityPlaybook.SUGGEST_INSTANCE_DIAGNOSTICS];
}
