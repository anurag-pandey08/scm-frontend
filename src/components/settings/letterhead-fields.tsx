"use client"

import * as React from "react"
import { PlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** One labelled control, with the error taking the hint's place when there is one. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * A list that prints as a list — the phone numbers across the top of the L.R.,
 * the booking offices the clerk picks from. Rows are added and dropped rather
 * than typed as one comma-separated string, because the paper treats each one
 * as its own line and so should the form.
 */
export function ListField({
  label,
  id,
  values,
  onValuesChange,
  error,
  hint,
  placeholder,
  addLabel,
  /** What one row is called, for the remove button's label. */
  itemLabel,
  className,
  inputClassName,
}: {
  label: string
  id: string
  values: string[]
  onValuesChange: (values: string[]) => void
  error?: string
  hint?: string
  placeholder?: string
  addLabel: string
  itemLabel: string
  className?: string
  inputClassName?: string
}) {
  const replace = (index: number, value: string) =>
    onValuesChange(values.map((item, i) => (i === index ? value : item)))

  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={`${id}-0`}>{label}</Label>

      <div className="grid gap-2">
        {values.map((value, index) => (
          // Rows have no identity of their own — a phone number is not a
          // record — so the index is the only key there is. Editing in place
          // keeps it stable; adding and removing rebuilds the short list.
          <div key={index} className="flex gap-2">
            <Input
              id={`${id}-${index}`}
              className={inputClassName}
              placeholder={placeholder}
              aria-label={`${itemLabel} ${index + 1}`}
              value={value}
              onChange={(event) => replace(index, event.target.value)}
            />
            <Button
              variant="ghost"
              size="icon"
              // The last row is never removable: a firm with no phone number
              // and no booking office prints a letterhead with a hole in it.
              disabled={values.length === 1}
              aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
              onClick={() =>
                onValuesChange(values.filter((_, i) => i !== index))
              }
            >
              <XIcon />
            </Button>
          </div>
        ))}
      </div>

      <div>
        <Button
          variant="outline"
          size="sm"
          className="mt-0.5"
          onClick={() => onValuesChange([...values, ""])}
        >
          <PlusIcon data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
