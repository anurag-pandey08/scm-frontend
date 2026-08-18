import {
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  TruckIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { PAYMENT_COLOR } from "@/lib/palette"
import type { BiltyStatus, PaymentType } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Status never rides on colour alone — every badge carries an icon and its
 * label. Only the two states that genuinely mean "good" and "bad" draw on the
 * reserved status palette; in-transit and booked are progress, not judgement,
 * so they stay in neutral ink.
 */
const STATUS_STYLE: Record<
  BiltyStatus,
  { icon: typeof TruckIcon; className: string }
> = {
  Delivered: {
    icon: CircleCheckIcon,
    className: "bg-status-good/10 text-status-good-ink",
  },
  "In Transit": {
    icon: TruckIcon,
    className: "bg-muted text-foreground",
  },
  Booked: {
    icon: ClockIcon,
    className: "bg-transparent text-muted-foreground ring-1 ring-border",
  },
  Cancelled: {
    icon: CircleXIcon,
    className: "bg-status-critical/10 text-status-critical-ink",
  },
}

export function StatusBadge({
  status,
  className,
}: {
  status: BiltyStatus
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

/**
 * The dot repeats the payment type's categorical slot from the dashboard donut,
 * so "orange means To Pay" holds across the whole app. The label carries the
 * meaning; the dot is only a cross-reference.
 */
export function PaymentBadge({
  type,
  className,
}: {
  type: PaymentType
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm whitespace-nowrap",
        className
      )}
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ background: PAYMENT_COLOR[type] }}
      />
      {type}
    </span>
  )
}
