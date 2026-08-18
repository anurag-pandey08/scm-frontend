"use client"

import { PencilIcon, PrinterIcon } from "lucide-react"

import { InvoiceBill } from "@/components/invoice/invoice-bill"
import { InvoiceStatusBadge } from "@/components/invoice/badges"
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
import { invoiceTotal, type Invoice } from "@/lib/invoice-types"

export function InvoiceBillDialog({
  invoice,
  company,
  open,
  onOpenChange,
  onEdit,
}: {
  invoice: Invoice | null
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (invoice: Invoice) => void
}) {
  if (!invoice) return null

  return (
    <>
      <PrintPortal open={open}>
        <InvoiceBill invoice={invoice} company={company} />
      </PrintPortal>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="grid max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Bill No. {invoice.billNo}
              <InvoiceStatusBadge status={invoice.status} />
            </DialogTitle>
            <DialogDescription>
              {formatDate(invoice.billDate)} · {invoice.party.name} ·{" "}
              {formatINR(invoiceTotal(invoice))}
              {invoice.status === "Paid" && invoice.paidOn
                ? ` · settled ${formatDate(invoice.paidOn)}`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-4 overflow-auto bg-neutral-100 px-4 py-4">
            <InvoiceBill
              invoice={invoice}
              company={company}
              className="shadow-sm"
            />
          </div>

          {invoice.remarks ? (
            <p className="text-xs text-muted-foreground">{invoice.remarks}</p>
          ) : null}

          <DialogFooter className="sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Total{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatINR(invoiceTotal(invoice))}
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onEdit(invoice)
                }}
              >
                <PencilIcon data-icon="inline-start" />
                Edit bill
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
