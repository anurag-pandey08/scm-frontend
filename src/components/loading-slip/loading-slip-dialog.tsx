"use client"

import { PencilIcon, PrinterIcon } from "lucide-react"

import { LoadingSlipStatusBadge } from "@/components/loading-slip/badges"
import { LoadingSlipSheet } from "@/components/loading-slip/loading-slip"
import { PrintPortal } from "@/components/print-portal"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Company } from "@/lib/companies"
import { formatDate, formatINR } from "@/lib/format"
import { slipBalance, type LoadingSlip } from "@/lib/loading-slip-types"

export function LoadingSlipDialog({
  slip,
  company,
  open,
  onOpenChange,
  onEdit,
}: {
  slip: LoadingSlip | null
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (slip: LoadingSlip) => void
}) {
  if (!slip) return null

  return (
    <>
      <PrintPortal open={open}>
        <LoadingSlipSheet slip={slip} company={company} />
      </PrintPortal>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="grid max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Loading Slip No. {slip.slipNo}
              <LoadingSlipStatusBadge status={slip.status} />
            </DialogTitle>
            <DialogDescription>
              {formatDate(slip.slipDate)} · {slip.party || "party not entered"}{" "}
              · {slip.vehicleNo || "no lorry"} · {slip.from} → {slip.to}
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-4 overflow-auto bg-neutral-100 px-4 py-4">
            <LoadingSlipSheet
              slip={slip}
              company={company}
              className="shadow-sm"
            />
          </div>

          <DialogFooter className="sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Balance{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatINR(slipBalance(slip))}
              </span>{" "}
              of {formatINR(slip.totalFreight)} hire
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onEdit(slip)
                }}
              >
                <PencilIcon data-icon="inline-start" />
                Edit slip
              </Button>
              <Button onClick={() => window.print()}>
                <PrinterIcon data-icon="inline-start" />
                Print
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
