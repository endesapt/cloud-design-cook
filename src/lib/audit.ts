import { OperationAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type LogArgs = {
  tenantId?: string | null;
  userId?: string | null;
  action: OperationAction | keyof typeof OperationAction;
  details?: unknown;
};

export async function writeOperationLog(args: LogArgs) {
  return prisma.operationLog.create({
    data: {
      tenantId: args.tenantId ?? null,
      userId: args.userId ?? null,
      action: args.action as OperationAction,
      details: (args.details as object | undefined) ?? {},
    },
  });
}
