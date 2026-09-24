"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A tick box.
 *
 * Base UI renders a `<span>` with a hidden `<input>` beside it, so the label,
 * the keyboard and the form behave as they would around a native box while the
 * box itself is ours to draw.
 *
 * `indeterminate` draws the dash instead of the tick — the state a "select
 * all" box is in when some of the rows under it are ticked and some are not.
 * Base UI keeps it separate from `checked`, which is the right way round: a
 * half-ticked box that reported itself as ticked would be a box that deletes
 * rows nobody chose. The mark is picked here rather than in CSS because the
 * component is handed the flag anyway, and a conditional reads plainer than a
 * pair of variants hiding each other.
 */
function Checkbox({
  className,
  indeterminate,
  ...props
}: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      indeterminate={indeterminate}
      className={cn(
        // `inline-flex` rather than leaving the display alone: Base UI's root
        // is a `<span>`, and an inline box ignores a width outright. Without it
        // the tick box renders as a sliver a pixel or two across, and a table
        // lays the column out as though there were nothing in it.
        "peer inline-flex size-4 shrink-0 items-center justify-center rounded-[min(var(--radius-md),5px)] border border-input bg-background shadow-xs transition-all outline-none dark:bg-input/30",
        "hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        // The filled states are stated twice, once plain and once under
        // `dark:`, and the second is not redundant. Tailwind compiles a
        // `data-checked:` variant to `:where([data-checked]…)`, and `:where()`
        // counts for nothing, so the plain rule weighs one class. It compiles
        // `dark:` to `:is(.dark *)`, which counts, so `dark:bg-input/30` above
        // weighs two and outranks it. With only the plain rule the dark theme
        // paints the empty box's background behind a ticked box's mark — and
        // that mark is `primary-foreground`, which under the dark theme is
        // nearly the colour of the card it would be sitting on. A tick nobody
        // can see.
        "data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        "data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:data-indeterminate:bg-primary",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        {indeterminate ? (
          <MinusIcon className="size-3.5" />
        ) : (
          <CheckIcon className="size-3.5" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
