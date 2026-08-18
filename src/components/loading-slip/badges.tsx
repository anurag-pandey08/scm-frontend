import {
  CircleXIcon,
  FileTextIcon,
  PackageCheckIcon,
  SendIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { LoadingSlipStatus } from "@/lib/loading-slip-types"
import { cn } from "@/lib/utils"

/**
 * Same rule as the bilty and bill registers: never colour alone, and only the
 * two states that genuinely mean "done" and "written off" draw on the reserved
 * status palette. A slip still in the office is progress, not judgement.
 */
const STATUS_STYLE: Record<
  LoadingSlipStatus,
  { icon: typeof SendIcon; className: string }
> = {
  Draft: {
    icon: FileTextIcon,
    className: "bg-transparent text-muted-foreground ring-1 ring-border",
  },
  Issued: {
    icon: SendIcon,
    className: "bg-muted text-foreground",
  },
  Loaded: {
    icon: PackageCheckIcon,
    className: "bg-status-good/10 text-status-good-ink",
  },
  Cancelled: {
    icon: CircleXIcon,
    className: "bg-status-critical/10 text-status-critical-ink",
  },
}

export function LoadingSlipStatusBadge({
  status,
  className,
}: {
  status: LoadingSlipStatus
  className?: string
}) {
  const { icon: Icon, className: tone } = STATUS_STYLE[status]
  return (
    <Badge variant="ghost" className={cn("gap-1.5", tone, className)}>
      <Icon />
      {status}
    </Badge>
  )
}
