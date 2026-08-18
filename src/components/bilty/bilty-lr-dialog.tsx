"use client"

import * as React from "react"
import { PencilIcon, PrinterIcon } from "lucide-react"

import { StatusBadge } from "@/components/bilty/badges"
import { BiltyLr } from "@/components/bilty/bilty-lr"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Company } from "@/lib/companies"
import { formatDate, formatINR } from "@/lib/format"
import { grossTotal, type Bilty } from "@/lib/types"

/** The book is carbon-copied; each copy goes to a different party. */
const COPIES = [
  "Consignee Copy",
  "Consignor Copy",
  "Lorry Copy",
  "Office Copy",
] as const

export function BiltyLrDialog({
  bilty,
  company,
  open,
  onOpenChange,
  onEdit,
}: {
  bilty: Bilty | null
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (bilty: Bilty) => void
}) {
  const [copy, setCopy] = React.useState<string>(COPIES[0])

  if (!bilty) return null

  return (
    <>
      <PrintPortal open={open}>
        <BiltyLr bilty={bilty} company={company} copy={copy} />
      </PrintPortal>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="grid max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              L.R. No. {bilty.lrNo}
              <StatusBadge status={bilty.status} />
            </DialogTitle>
            <DialogDescription>
              {formatDate(bilty.lrDate)} · {bilty.from} → {bilty.to} ·{" "}
              {bilty.lorryNo} · {formatINR(grossTotal(bilty.charges))}
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-4 overflow-auto bg-neutral-100 px-4 py-4">
            <BiltyLr
              bilty={bilty}
              company={company}
              copy={copy}
              className="shadow-sm"
            />
          </div>

          <DialogFooter className="sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Select value={copy} onValueChange={(v) => v && setCopy(v)}>
                <SelectTrigger
                  className="w-40"
                  aria-label="Which copy to print"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COPIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onEdit(bilty)
                }}
              >
                <PencilIcon data-icon="inline-start" />
                Edit bilty
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
