import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { StatusBadge } from "@/components/bilty/badges"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CompanySlug } from "@/lib/companies"
import { formatDate, formatINR } from "@/lib/format"
import { grossTotal, type Bilty } from "@/lib/types"

export function RecentBiltiesCard({
  company,
  bilties,
}: {
  company: CompanySlug
  bilties: Bilty[]
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Latest bookings</CardTitle>
        <CardDescription>Most recent entries in the LR book</CardDescription>
        <CardAction>
          {/* Every screen lives under a firm — the register this card is
              showing is the one belonging to the firm whose dashboard it is
              on, so the link has to carry the slug. */}
          <Link
            href={`/${company}/bilty`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open register
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>L.R. No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Consignee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Gr. Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bilties.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-28 text-center">
                  <p className="text-sm font-medium">Nothing booked yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The register is empty — book the first bilty.
                  </p>
                </TableCell>
              </TableRow>
            )}
            {bilties.map((bilty) => (
              <TableRow key={bilty.id}>
                <TableCell className="font-medium tabular-nums">
                  {bilty.lrNo}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(bilty.lrDate)}
                </TableCell>
                <TableCell>
                  {bilty.from} → {bilty.to}
                </TableCell>
                <TableCell className="max-w-44 truncate">
                  {bilty.consignee.name}
                </TableCell>
                <TableCell>
                  <StatusBadge status={bilty.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatINR(grossTotal(bilty.charges))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
