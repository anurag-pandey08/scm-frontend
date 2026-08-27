"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDateNumeric } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * ISO `yyyy-mm-dd` — what every date on a record is stored and printed as —
 * read as a date at local midnight. Going through `new Date(iso)` instead would
 * parse it as UTC and, anywhere east or west of it, land on the day before or
 * after once it is read back in local time.
 */
function fromISO(value: string): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return undefined
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** Back to `yyyy-mm-dd`, again from the local parts and not from `toISOString`. */
function toISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * A date on a record: the L.R.'s date, the day the driver took the advance, the
 * day the party settled. Drop-in for the `type="date"` input these fields used
 * to be, and it keeps that contract — ISO `yyyy-mm-dd` in, ISO `yyyy-mm-dd` out,
 * empty string for a date not yet set.
 *
 * What changes is what the clerk sees. The native control renders in whatever
 * order the browser's locale prefers, so a date could read back as mm/dd while
 * every register beside it prints dd-mm-yyyy; here both the closed field and the
 * calendar are the books' own order. Most of these dates are also optional —
 * `Paid Date`, `Advance Date`, a bill's `Settled on` — so the popover carries a
 * way to empty one again, which is the part a plain calendar has no room for.
 */
export function DateField({
  id,
  value,
  onValueChange,
  disabled,
  placeholder = "dd-mm-yyyy",
  className,
  "aria-invalid": ariaInvalid,
}: {
  id?: string
  /** ISO `yyyy-mm-dd`, or "" for a date not set. */
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  "aria-invalid"?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const selected = fromISO(value)

  // The books run years back, and clicking a month at a time to reach one is no
  // way to enter an old trip — the caption's dropdowns take the year directly.
  // The range is anchored on the date being edited as well as on today, so a
  // record already dated outside it can still be opened.
  const thisYear = new Date().getFullYear()
  const fromYear = Math.min(thisYear, selected?.getFullYear() ?? thisYear) - 10
  const toYear = Math.max(thisYear, selected?.getFullYear() ?? thisYear) + 1

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" />}
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          "w-full justify-between px-2.5 font-normal tabular-nums",
          !value && "text-muted-foreground",
          className
        )}
      >
        {value ? formatDateNumeric(value) : placeholder}
        <CalendarIcon
          data-icon="inline-end"
          className="text-muted-foreground"
        />
      </PopoverTrigger>

      {/*
        The calendar squares up with the field it drops out of: the popover
        takes the trigger's width from `--anchor-width` (Base UI measures the
        anchor and sets it on the positioner), and the calendar is told to fill
        it — its grid is flex-based, so the day cells share out whatever width
        they are given. `min-w-fit` is the floor: on a field narrower than a
        week of minimum-width cells, the calendar keeps its own size rather
        than being squeezed into an unreadable one.
      */}
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-fit gap-0 p-0"
      >
        <Calendar
          classNames={{ root: "w-full" }}
          // Remounted per value so the calendar always opens on the month of
          // the date being edited rather than on whichever month it was left.
          key={value}
          mode="single"
          autoFocus
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(toYear, 11)}
          defaultMonth={selected}
          selected={selected}
          onSelect={(date) => {
            onValueChange(date ? toISO(date) : "")
            setOpen(false)
          }}
        />
        {value ? (
          <div className="border-t p-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onValueChange("")
                setOpen(false)
              }}
            >
              Clear date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
