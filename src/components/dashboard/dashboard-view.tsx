"use client"

import * as React from "react"
import {
  BanknoteIcon,
  ScrollTextIcon,
  TruckIcon,
  WalletIcon,
} from "lucide-react"

import { useCompany } from "@/components/company-provider"
import { DashboardWindowSelect } from "@/components/dashboard/dashboard-window"
import { FreightTrendCard } from "@/components/dashboard/freight-trend-card"
import { PaymentSplitCard } from "@/components/dashboard/payment-split-card"
import { RecentBiltiesCard } from "@/components/dashboard/recent-bilties-card"
import { StatTile } from "@/components/dashboard/stat-tile"
import { TopRoutesCard } from "@/components/dashboard/top-routes-card"
import { useDashboard } from "@/components/dashboard/use-dashboard"
import { Card } from "@/components/ui/card"
import { TruckLoadingOverlay } from "@/components/ui/truck-loader"
import { monthOverMonth, toKpis, toMonthPoints } from "@/lib/analytics"
import { ApiError } from "@/lib/api/client"
import type { DashboardQuery } from "@/lib/api/dashboard"
import { formatDate, formatINR, formatNumber } from "@/lib/format"

/**
 * The dashboard, as the office reads it.
 *
 * Every figure here is Postgres's — counted, summed and bucketed against one
 * snapshot, so nothing on the screen can disagree with anything else on it.
 * That is a change from what this used to do: it once held both firms' whole
 * books in memory and added them up in the browser on every render.
 *
 * What is left is the reading — the tiles, the two charts, the lanes and the
 * top of the register — plus the one control, which is how far back to look.
 */
export function DashboardView({ query }: { query: DashboardQuery }) {
  const company = useCompany()
  const { data, isFetching, isError, error } = useDashboard(company.slug, query)

  // The window is a navigation before it is a query — the URL is rewritten and
  // the figures re-read on the server — so the page hears about it from the
  // selector rather than from its own query.
  const [windowPending, setWindowPending] = React.useState(false)
  const busy = isFetching || windowPending

  if (isError && !data) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <Header query={query} onPendingChange={setWindowPending} />
        <Card className="px-4 py-12 text-center">
          <p className="text-sm font-medium">Could not read the dashboard</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof ApiError
              ? error.message
              : "Something went wrong reading the book."}
          </p>
        </Card>
      </div>
    )
  }

  // Only null on the very first render of a page whose prefetch failed, and
  // that case is the branch above. Everything below can assume figures.
  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <Header query={query} onPendingChange={setWindowPending} />
        <div className="relative">
          <Card className="px-4 py-24" />
          <TruckLoadingOverlay show label="Reading the book…" />
        </div>
      </div>
    )
  }

  const kpis = toKpis(data.kpis)
  const monthly = toMonthPoints(data.monthly)
  const changePct = monthOverMonth(monthly)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <Header
        query={query}
        onPendingChange={setWindowPending}
        window={data.window}
      />

      {/* One overlay for the whole reading rather than one per card: the
          figures are taken against a single snapshot, so they go stale
          together and should be covered together. */}
      <div className="relative flex flex-col gap-5">
        {/* min-w-0 on every grid child: without it a track refuses to shrink
            below its content, so a wide table or chart widens the whole page
            instead of scrolling or reflowing inside its own card. */}
        <section className="grid gap-4 *:min-w-0 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Bilties booked"
            value={formatNumber(kpis.biltiesBooked)}
            icon={ScrollTextIcon}
            sub={`${kpis.lrRange} · ${kpis.cancelled} cancelled`}
          />
          <StatTile
            label="Freight booked"
            value={formatINR(kpis.freightBooked)}
            icon={BanknoteIcon}
            sub="Freight, hamali, A.O.C. and station charges"
          />
          <StatTile
            label="Still to collect"
            value={formatINR(kpis.receivable)}
            icon={WalletIcon}
            sub={`${kpis.receivableCount} LRs on To Pay or TBB terms`}
          />
          <StatTile
            label="On the road"
            value={formatNumber(kpis.inTransit)}
            icon={TruckIcon}
            sub={`${kpis.delivered} delivered · ${kpis.awaitingDispatch} awaiting dispatch`}
          />
        </section>

        <section className="grid gap-4 *:min-w-0 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FreightTrendCard data={monthly} changePct={changePct} />
          </div>
          <PaymentSplitCard slices={data.paymentSplit} />
        </section>

        <section className="grid gap-4 *:min-w-0 lg:grid-cols-3">
          <TopRoutesCard routes={data.topRoutes} />
          <div className="lg:col-span-2">
            <RecentBiltiesCard company={company.slug} bilties={data.recent} />
          </div>
        </section>

        <TruckLoadingOverlay show={busy} label="Reading the book…" />
      </div>
    </div>
  )
}

/**
 * The heading and the window.
 *
 * Repeated across the three states rather than lifted above them, because the
 * error and loading branches are whole pages in their own right and a shared
 * wrapper would only be a fourth component to keep in step.
 *
 * The dates come from the API rather than from the browser's clock: the office
 * day is Asia/Kolkata whatever the reader's machine thinks, and a header that
 * disagreed with the figures under it would be worse than no header.
 */
function Header({
  query,
  onPendingChange,
  window,
}: {
  query: DashboardQuery
  onPendingChange: (pending: boolean) => void
  window?: { days: number; start: string; end: string }
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Booking and collection at a glance
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {window ? (
          <p className="text-xs text-muted-foreground">
            {formatDate(window.start)} – {formatDate(window.end)}
          </p>
        ) : null}
        <DashboardWindowSelect
          query={query}
          onPendingChange={onPendingChange}
        />
      </div>
    </header>
  )
}
