"use client"

import Link from "next/link"
import { useSelectedLayoutSegments } from "next/navigation"
import {
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  PhoneIcon,
  ReceiptIndianRupeeIcon,
  ScrollTextIcon,
  SettingsIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { useCompany } from "@/components/company-provider"
import { CompanySwitcher } from "@/components/company-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * Hrefs are relative to the firm — every screen lives under one. The order is
 * the order the paperwork happens in: the lorry is placed on a slip, the goods
 * go out on an L.R., the party is billed for them.
 *
 * `short` is what the tablet bar shows — the full labels do not fit across it,
 * and the header nav has no room to wrap.
 *
 * `shared` marks a screen whose data is not the firm's own.
 */
const NAV: {
  segment: string
  label: string
  short: string
  icon: typeof LayoutDashboardIcon
  shared?: boolean
}[] = [
  {
    segment: "dashboard",
    label: "Dashboard",
    short: "Dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    segment: "bilty",
    label: "Bilty Register",
    short: "Bilty",
    icon: ScrollTextIcon,
  },
  {
    segment: "invoices",
    label: "Invoices",
    short: "Invoices",
    icon: ReceiptIndianRupeeIcon,
  },
  {
    segment: "loading-slips",
    label: "Loading Slips",
    short: "Slips",
    icon: ClipboardListIcon,
  },
  // Last of the books, and marked as shared: it is the one register here that
  // does not belong to the firm named above it in the sidebar.
  {
    segment: "trips",
    label: "Trip Register",
    short: "Trips",
    icon: BookOpenIcon,
    shared: true,
  },
  // Not a book at all — the firm's own letterhead, which every one of the
  // screens above prints on. It sits after them for that reason.
  {
    segment: "settings",
    label: "Company Settings",
    short: "Settings",
    icon: SettingsIcon,
  },
]

/** The "Both" tag the shared screen carries wherever it is listed. */
function SharedTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
        className
      )}
      title="Shared by both firms"
    >
      Both
    </span>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  // Whatever the office has the letterhead down as — the sidebar names the firm
  // and prints its booking office, and both follow an edit on the settings
  // screen without a reload.
  const company = useCompany()

  // Read below the [company] layout, so the nav highlights the same screen
  // whichever firm's books are open.
  const [current] = useSelectedLayoutSegments()
  const currentItem = NAV.find((item) => item.segment === current)

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
                {item.shared ? <SharedTag className="ml-auto" /> : null}
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
                Letterhead details for {company.name} are still to be confirmed
                — its printed L.R.s and bills are not fit to hand out yet.
              </span>
            </p>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur lg:gap-3 lg:px-6">
          <CompanySwitcher company={company} compact className="lg:hidden" />

          {/*
            Below md the screens do not fit across the header, so it names
            the open one instead — a crumb after the firm — and hands the rest
            over as a menu. The screen you are on is the button you press to
            leave it, which is the shortest reach on a phone.
          */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="group flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-popup-open:bg-muted md:hidden"
              aria-label={
                currentItem
                  ? `Screen: ${currentItem.label}. Go to another screen`
                  : "Go to a screen"
              }
            >
              <span aria-hidden className="text-muted-foreground">
                /
              </span>
              {currentItem ? (
                <currentItem.icon className="size-4 shrink-0 text-muted-foreground" />
              ) : null}
              <span className="truncate">{currentItem?.label ?? "Menu"}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-popup-open:rotate-180" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-60">
              {NAV.map((item) => {
                const active = item.segment === current
                return (
                  <DropdownMenuItem
                    key={item.segment}
                    className={cn(
                      "gap-2.5 px-2 py-2",
                      active && "bg-muted font-medium"
                    )}
                    render={
                      <Link
                        href={`/${company.slug}/${item.segment}`}
                        aria-current={active ? "page" : undefined}
                      />
                    }
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    <span className="truncate">{item.label}</span>
                    {item.shared ? <SharedTag className="ml-auto" /> : null}
                    {active ? (
                      <CheckIcon
                        className={cn("size-4", !item.shared && "ml-auto")}
                      />
                    ) : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tablets have the width for the whole set, but not for a sidebar. */}
          <nav className="hidden items-center gap-1 md:flex lg:hidden">
            {NAV.map((item) => {
              const active = item.segment === current
              return (
                <Link
                  key={item.segment}
                  href={`/${company.slug}/${item.segment}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {item.short}
                </Link>
              )
            })}
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
