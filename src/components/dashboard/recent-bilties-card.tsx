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
import { formatDate, formatINR } from "@/lib/format"
import { grossTotal, type Bilty } from "@/lib/types"

export function RecentBiltiesCard({ bilties }: { bilties: Bilty[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Latest bookings</CardTitle>
        <CardDescription>Most recent entries in the LR book</CardDescription>
        <CardAction>
          <Link
            href="/bilty"
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
