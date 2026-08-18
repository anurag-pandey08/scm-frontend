import type { Metadata } from "next"
import { BanknoteIcon, ScrollTextIcon, TruckIcon, WalletIcon } from "lucide-react"

import { FreightTrendCard } from "@/components/dashboard/freight-trend-card"
import { PaymentSplitCard } from "@/components/dashboard/payment-split-card"
import { RecentBiltiesCard } from "@/components/dashboard/recent-bilties-card"
import { StatTile } from "@/components/dashboard/stat-tile"
import { TopRoutesCard } from "@/components/dashboard/top-routes-card"
import {
  getKpis,
  getMonthOverMonth,
  getMonthlyFreight,
  getPaymentSplit,
  getRecentBilties,
  getTopRoutes,
  WINDOW_DAYS,
  WINDOW_START,
} from "@/lib/analytics"
import { companyFromParams, type CompanyParams } from "@/lib/company-route"
import { TODAY } from "@/lib/data"
import { formatDate, formatINR, formatNumber } from "@/lib/format"

export async function generateMetadata({
  params,
}: {
  params: CompanyParams
}): Promise<Metadata> {
  const company = await companyFromParams(params)
  return { title: `Dashboard — ${company.name}` }
}

export default async function DashboardPage({
  params,
}: {
  params: CompanyParams
}) {
  const { slug } = await companyFromParams(params)

  const kpis = getKpis(slug)
  const monthly = getMonthlyFreight(slug)
  const { changePct } = getMonthOverMonth(slug)

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
          Last {WINDOW_DAYS} days · {formatDate(WINDOW_START)} –{" "}
          {formatDate(TODAY)}
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
        <PaymentSplitCard slices={getPaymentSplit(slug)} />
      </section>

      <section className="grid gap-4 *:min-w-0 lg:grid-cols-3">
        <TopRoutesCard routes={getTopRoutes(slug)} />
        <div className="lg:col-span-2">
          <RecentBiltiesCard bilties={getRecentBilties(slug)} />
        </div>
      </section>
    </div>
  )
}
