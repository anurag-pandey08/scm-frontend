import {
  CircleCheckIcon,
  CircleXIcon,
  FileTextIcon,
  SendIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { InvoiceStatus } from "@/lib/invoice-types"
import { cn } from "@/lib/utils"

/**
 * Same rule as the bilty register: never colour alone, and only the two states
 * that genuinely mean "settled" and "written off" draw on the reserved status
 * palette. A draft or a bill in the post is progress, not judgement.
 */
const STATUS_STYLE: Record<
  InvoiceStatus,
  { icon: typeof SendIcon; className: string }
> = {
  Draft: {
    icon: FileTextIcon,
    className: "bg-transparent text-muted-foreground ring-1 ring-border",
  },
  Raised: {
    icon: SendIcon,
    className: "bg-muted text-foreground",
  },
  Paid: {
    icon: CircleCheckIcon,
    className: "bg-status-good/10 text-status-good-ink",
  },
  Cancelled: {
    icon: CircleXIcon,
    className: "bg-status-critical/10 text-status-critical-ink",
  },
}

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus
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
