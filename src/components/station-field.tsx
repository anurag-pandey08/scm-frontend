"use client"

import * as React from "react"

import {
  Autocomplete,
  AutocompleteCollection,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@/components/ui/autocomplete"
import {
  canonicalStation,
  loadStations,
  OFFICE_STATIONS,
  searchStations,
  type Station,
  type StationIndex,
} from "@/lib/stations"

/**
 * Every box on every screen that names a place a lorry goes: the From and To on
 * an L.R., on a trip, on a loading slip and on a bill, and the station a firm
 * books from in its settings.
 *
 * It types like a text box and suggests like a menu, which is what a station
 * actually is: usually one of the dozen routes this office runs, occasionally
 * somewhere it has never booked before, and once in a while a village that is
 * on no list anywhere.
 *
 * Those three cases are why the app had two different wrong answers before
 * this. The L.R. used a Select over nineteen stations, which could not name the
 * twentieth. The trip, slip and bill gave up and used plain text boxes — their
 * own labels said so, "typed, not picked" — which named anywhere at all but
 * helped with nothing and let the same town be spelt three ways across three
 * documents. This does both jobs: the list is help, never a gate.
 *
 * Three things happen in order as the clerk works:
 *
 *   before typing   the firm's own routes, which is the common case and wants
 *                   no search at all
 *   while typing    those routes first if they still match, then the rest of
 *                   India underneath, nearest spelling and biggest town first
 *   on leaving      whatever is in the box is the value, tidied to the list's
 *                   spelling where that names one place and left alone where
 *                   it does not — see `canonicalStation`
 *
 * Picking one of five Palis writes `Pali, Rajasthan`, because the register
 * keeps the box's text and nothing else; `stations.ts` explains when a state
 * is carried and when it is not.
 *
 * The long list is fetched on first focus rather than on mount, so a screen
 * full of these costs nothing until one is used. Until it lands — and if it
 * never does, which offline it will not on a cold start — the firm's own
 * stations are still there and the box still takes typing. There is no state
 * in which this field cannot be filled in.
 */

/** Stands in until the long list lands — one array, so the memo below holds. */
const NONE: Station[] = []

export function StationField({
  id,
  value,
  onValueChange,
  onBlur,
  placeholder,
  disabled,
  maxLength = 80,
  "aria-invalid": ariaInvalid,
}: {
  id: string
  value: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  /**
   * What the schema behind this box allows — 80 on an L.R. and a letterhead,
   * 120 on a trip, slip or bill. Stopping the clerk at the limit is kinder than
   * letting them finish a name the save will reject.
   */
  maxLength?: number
  "aria-invalid"?: boolean
}) {
  const [index, setIndex] = React.useState<StationIndex | null>(null)

  // Kicked off by the first focus on any station box on the screen; `pending`
  // inside `loadStations` makes the second one free.
  const fetchOnce = React.useCallback(() => {
    if (index) return
    void loadStations().then(setIndex, () => {
      // Nothing to report. The pinned stations below still work, and so does
      // typing — a station box that has lost its gazetteer is a smaller box,
      // not a broken one.
    })
  }, [index])

  const stations = index?.stations ?? NONE
  const routes = index?.pinned ?? OFFICE_STATIONS

  const groups = React.useMemo(() => {
    const { pinned, rest } = searchStations({
      query: value,
      stations,
      pinned: routes,
      limit: 50,
    })

    return [
      pinned.length ? { label: "This office books", items: pinned } : null,
      rest.length ? { label: "Elsewhere in India", items: rest } : null,
    ].filter((group) => group !== null)
  }, [value, stations, routes])

  return (
    <Autocomplete
      items={groups}
      value={value}
      onValueChange={onValueChange}
      // The list is already filtered and ranked by `searchStations`, which
      // knows about the pinned routes and about which town is bigger. Base UI's
      // own substring filter knows neither, and would undo both.
      filter={null}
      // `label`, not `name`: picking the Pali in Rajasthan has to put which
      // Pali it was into the box, because the box is what the register keeps.
      itemToStringValue={(station: Station) => station.label}
      openOnInputClick
      autoHighlight
    >
      <AutocompleteInput
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        autoComplete="off"
        maxLength={maxLength}
        onFocus={fetchOnce}
        onBlur={() => {
          // `bhiwandi` and `BHIWANDI` are the same station and should print the
          // same way. Anything the list has never heard of — and any name that
          // could be five places — is left exactly as it was typed.
          const tidied = canonicalStation(value, index)
          if (tidied !== value) onValueChange(tidied)
          onBlur?.()
        }}
      />

      <AutocompleteContent>
        <AutocompleteEmpty>
          {value.trim()
            ? `No station matches “${value.trim()}”. It can still be written in.`
            : null}
        </AutocompleteEmpty>

        <AutocompleteList>
          {(group: { label: string; items: Station[] }) => (
            <AutocompleteGroup key={group.label} items={group.items}>
              <AutocompleteGroupLabel>{group.label}</AutocompleteGroupLabel>
              <AutocompleteCollection>
                {(station: Station) => (
                  <AutocompleteItem key={station.label} value={station}>
                    {/* The name alone, so the column stays scannable — the
                        state sits to the right whether or not the value will
                        carry it. */}
                    <span className="flex-1 truncate">{station.name}</span>
                    {station.state ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {station.state}
                      </span>
                    ) : null}
                  </AutocompleteItem>
                )}
              </AutocompleteCollection>
            </AutocompleteGroup>
          )}
        </AutocompleteList>

        {/* GeoNames is CC BY 4.0, and this is where the credit is owed. Only
            shown once the long list is in use — before then nothing of theirs
            is on the screen. */}
        {index && groups.length > 1 ? (
          <p className="border-t px-3 py-1.5 text-[0.6875rem] text-muted-foreground">
            {index.attribution}
          </p>
        ) : null}
      </AutocompleteContent>
    </Autocomplete>
  )
}
