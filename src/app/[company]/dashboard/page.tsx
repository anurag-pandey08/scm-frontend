import type { Metadata } from "next"
import {
  BanknoteIcon,
  ScrollTextIcon,
  TruckIcon,
  WalletIcon,
} from "lucide-react"

import { FreightTrendCard } from "@/components/dashboard/freight-trend-card"
import { PaymentSplitCard } from "@/components/dashboard/payment-split-card"
import { RecentBiltiesCard } from "@/components/dashboard/recent-bilties-card"
import { StatTile } from "@/components/dashboard/stat-tile"
import { TopRoutesCard } from "@/components/dashboard/top-routes-card"
import { Card, CardContent } from "@/components/ui/card"
import { lrRange, monthOverMonth, monthPoints } from "@/lib/analytics"
import { ApiError } from "@/lib/api/client"
import { fetchDashboard } from "@/lib/api/dashboard"
import { withAuth } from "@/lib/api/server"
import { companyFromParams, type CompanyParams } from "@/lib/company-route"
import type { Dashboard } from "@/lib/schemas/dashboard"
import { formatDate, formatINR, formatNumber } from "@/lib/format"

export async function generateMetadata({
  params,
}: {
  params: CompanyParams
}): Promise<Metadata> {
  const company = await companyFromParams(params)
  return { title: `Dashboard — ${company.name}` }
}

/**
 * The firm's book at a glance, read on the server.
 *
 * Rendered rather than queried, unlike the register: nothing on this screen is
 * worked on, so there is no mutation for a cache to stay coherent with and
 * nothing to refetch. One request on the server, one snapshot in Postgres, and
 * the page arrives with its figures already on it.
 *
 * The window is the API's — thirty days counted back from the office's own
 * today — and it comes back with the figures, so the header states which
 * thirty days the reader is looking at rather than asserting a period the
 * server may have worked out differently.
 */
export default async function DashboardPage({
  params,
}: {
  params: CompanyParams
}) {
  const company = await companyFromParams(params)

  let dashboard: Dashboard
  try {
    dashboard = await fetchDashboard(company.slug, await withAuth())
  } catch (cause) {
    // Narrowed to the one line the card shows. An ApiError carries a stack and
    // a cause chain as well, and handing the object itself to a component
    // crashes React's server renderer on this version of Next — the screen
    // wants the sentence, not the exception.
    return (
      <Unreachable message={cause instanceof ApiError ? cause.message : null} />
    )
  }

  const { window, kpis } = dashboard
  const monthly = monthPoints(dashboard.monthly)
  const { changePct } = monthOverMonth(monthly)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Booking and collection at a glance
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Last {window.days} days · {formatDate(window.start)} –{" "}
          {formatDate(window.end)}
        </p>
      </header>

      {/* min-w-0 on every grid child: without it a track refuses to shrink
          below its content, so a wide table or chart widens the whole page
          instead of scrolling or reflowing inside its own card. */}
      <section className="grid gap-4 *:min-w-0 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Bilties booked"
          value={formatNumber(kpis.biltiesBooked)}
          icon={ScrollTextIcon}
          sub={`${lrRange(kpis)} · ${kpis.cancelled} cancelled`}
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
        <PaymentSplitCard slices={dashboard.paymentSplit} days={window.days} />
      </section>

      <section className="grid gap-4 *:min-w-0 lg:grid-cols-3">
        <TopRoutesCard
          routes={dashboard.topRoutes}
          origin={company.origin}
          days={window.days}
        />
        <div className="lg:col-span-2">
          <RecentBiltiesCard
            company={company.slug}
            bilties={dashboard.recent}
          />
        </div>
      </section>
    </div>
  )
}

/**
 * What the screen says when the book cannot be read.
 *
 * A dashboard with no figures on it has nothing to show, so unlike the
 * register there is no shell worth rendering around the gap — better to say
 * plainly that the book could not be read than to draw four tiles of zeroes a
 * reader could take for a quiet month.
 */
function Unreachable({ message }: { message: string | null }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Booking and collection at a glance
        </p>
      </header>

      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm font-medium">Could not read the book</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {message ??
              "Something went wrong working out this month's figures."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
