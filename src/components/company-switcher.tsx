"use client"

import * as React from "react"
import { useRouter, useSelectedLayoutSegments } from "next/navigation"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  COMPANY_LIST,
  type Company,
  type CompanySlug,
} from "@/lib/companies"
import { rememberCompany } from "@/lib/remember-company"
import { cn } from "@/lib/utils"

export function Monogram({
  company,
  className,
}: {
  company: Company
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold tracking-tight text-white",
        company.accentClass,
        className
      )}
    >
      {company.monogram}
    </span>
  )
}

/**
 * Switches which firm's books are open. The firm lives in the URL rather than
 * in client state, so the switch is a navigation: it lands on the same screen
 * under the other firm, and the address bar always says which book is open.
 */
export function CompanySwitcher({
  company,
  /** Just the tile and the chevron — for the narrow header on small screens. */
  compact,
  className,
}: {
  company: Company
  compact?: boolean
  className?: string
}) {
  const router = useRouter()
  // Everything below `[company]` — ["dashboard"], ["bilty"], and so on — so
  // the clerk stays on the screen they were reading.
  const segments = useSelectedLayoutSegments()

  function switchTo(slug: CompanySlug) {
    if (slug === company.slug) return
    rememberCompany(slug)
    router.push(`/${[slug, ...segments].join("/")}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1.5 rounded-lg text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          compact ? "p-1" : "w-full gap-2.5 p-1.5",
          className
        )}
        aria-label={`Company: ${company.name}. Switch company`}
      >
        <Monogram
          company={company}
          className={compact ? "size-8 text-xs" : undefined}
        />
        {compact ? null : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">
              {company.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {company.tagline}
            </p>
          </div>
        )}
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {COMPANY_LIST.map((option) => {
          const active = option.slug === company.slug
          return (
            <DropdownMenuItem
              key={option.slug}
              onClick={() => switchTo(option.slug)}
              className="gap-2.5"
            >
              <Monogram company={option} className="size-7 text-[0.7rem]" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{option.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {option.detailsConfirmed
                    ? option.officeLine
                    : "Letterhead details pending"}
                </p>
              </div>
              {active ? <CheckIcon className="size-4 shrink-0" /> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
