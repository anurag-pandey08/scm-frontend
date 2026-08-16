"use client"

import Link from "next/link"
import { useSelectedLayoutSegments } from "next/navigation"
import {
  LayoutDashboardIcon,
  PhoneIcon,
  ReceiptIndianRupeeIcon,
  ScrollTextIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { CompanySwitcher } from "@/components/company-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Company } from "@/lib/companies"
import { cn } from "@/lib/utils"

/** Hrefs are relative to the firm — every screen lives under one. */
const NAV = [
  { segment: "dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { segment: "bilty", label: "Bilty Register", icon: ScrollTextIcon },
  { segment: "invoices", label: "Invoices", icon: ReceiptIndianRupeeIcon },
]

export function AppShell({
  company,
  children,
}: {
  company: Company
  children: React.ReactNode
}) {
  // Read below the [company] layout, so the nav highlights the same screen
  // whichever firm's books are open.
  const [current] = useSelectedLayoutSegments()

  return (
    // Printing is always printing a document the app is holding — a bill, an
    // L.R. — never the app itself, so the whole shell drops off the page.
    <div className="flex min-h-svh print:hidden">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="px-2.5 py-3">
          <CompanySwitcher company={company} />
        </div>

        <nav className="flex flex-col gap-1 px-2 py-2">
          {NAV.map((item) => {
            const active = item.segment === current
            return (
              <Link
                key={item.segment}
                href={`/${company.slug}/${item.segment}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto border-t px-4 py-3 text-xs text-muted-foreground">
          {company.detailsConfirmed ? (
            <>
              <p className="font-medium text-foreground">Booking office</p>
              <p className="mt-0.5 leading-relaxed">{company.officeLine}</p>
              <div className="flex flex-wrap gap-x-3">
                {company.phones.map((phone) => (
                  <p key={phone} className="mt-1.5 flex items-center gap-1.5">
                    <PhoneIcon className="size-3" />
                    {phone}
                  </p>
                ))}
              </div>
            </>
          ) : (
            // The letterhead is still placeholder text, and it prints as-is on
            // this firm's L.R.s and bills. Say so where the details would be.
            <p className="flex gap-1.5 leading-relaxed">
              <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
              <span>
                Letterhead details for {company.name} are still to be
                confirmed — its printed L.R.s and bills are not fit to hand out
                yet.
              </span>
            </p>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:px-6">
          <CompanySwitcher company={company} compact className="lg:hidden" />
          <nav className="flex items-center gap-1 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.segment}
                href={`/${company.slug}/${item.segment}`}
                aria-current={item.segment === current ? "page" : undefined}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  item.segment === current
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="ml-auto hidden text-xs text-muted-foreground sm:block">
            {company.jurisdiction}
          </p>
          <div className="ml-auto sm:ml-0">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  )
}
