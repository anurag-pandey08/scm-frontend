"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboardIcon,
  PhoneIcon,
  ReceiptIndianRupeeIcon,
  ScrollTextIcon,
} from "lucide-react"

import { COMPANY } from "@/lib/company"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/bilty", label: "Bilty Register", icon: ScrollTextIcon },
  { href: "/invoices", label: "Invoices", icon: ReceiptIndianRupeeIcon },
]

function Monogram({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg bg-chart-1 text-sm font-bold tracking-tight text-white",
        className
      )}
    >
      SCM
    </span>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    // Printing is always printing a document the app is holding — a bill, an
    // L.R. — never the app itself, so the whole shell drops off the page.
    <div className="flex min-h-svh print:hidden">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <Monogram />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              {COMPANY.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {COMPANY.tagline}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-2 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t px-4 py-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Booking office</p>
          <p className="mt-0.5 leading-relaxed">Odhav, Ahmedabad-382415</p>
          <p className="mt-1.5 flex items-center gap-1.5">
            <PhoneIcon className="size-3" />
            {COMPANY.phones[0]}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:px-6">
          <Monogram className="size-8 text-xs lg:hidden" />
          <nav className="flex items-center gap-1 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="ml-auto hidden text-xs text-muted-foreground sm:block">
            {COMPANY.jurisdiction}
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
