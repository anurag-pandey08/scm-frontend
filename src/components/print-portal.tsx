"use client"

import * as React from "react"
import { createPortal } from "react-dom"

/** Whether we are on the client never changes once we are, so nothing to watch. */
const subscribeNever = () => () => {}

/**
 * Hangs a plain copy of a document on the end of the body while it is on
 * screen, and the printer takes that copy (see the print rules in globals.css).
 *
 * Printing the dialog a document sits in is a losing game: it is centred with a
 * translate the print stylesheet cannot reliably undo, and its body scrolls.
 * Undoing that was tried and does not hold — `translate: none` gets folded into
 * the `transform` shorthand by the CSS optimiser and dropped, while zeroing
 * `--tw-translate-x/y` wins the cascade but the browser goes on resolving
 * `translate` from the old values. A copy in ordinary flow has none of it.
 */
export function PrintPortal({
  open,
  children,
}: {
  open: boolean
  children: React.ReactNode
}) {
  const onClient = React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  )

  if (!onClient || !open) return null
  return createPortal(<div className="print-doc">{children}</div>, document.body)
}
