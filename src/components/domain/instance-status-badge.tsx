import { InstanceStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export function InstanceStatusBadge({ status }: { status: InstanceStatus }) {
  if (status === InstanceStatus.RUNNING) {
    return <Badge variant="success">RUNNING</Badge>;
  }

  if (status === InstanceStatus.STARTING) {
    return <Badge variant="info">STARTING</Badge>;
  }

  if (status === InstanceStatus.CREATING) {
    return <Badge variant="info">CREATING</Badge>;
  }

  if (status === InstanceStatus.STOPPING) {
    return <Badge variant="warning">STOPPING</Badge>;
  }

  if (status === InstanceStatus.STOPPED) {
    return <Badge variant="warning">STOPPED</Badge>;
  }

  if (status === InstanceStatus.TERMINATING) {
    return <Badge variant="danger">TERMINATING</Badge>;
  }

  if (status === InstanceStatus.ERROR) {
    return <Badge variant="danger">ERROR</Badge>;
  }

  return <Badge variant="neutral">DELETED</Badge>;
}
