/**
 * The stations an L.R. can be booked from and to.
 *
 * Two lists, and the difference between them is the whole design. `STATIONS` in
 * `companies.ts` is the short one — the routes this office actually runs, the
 * ones worth a keystroke. `stations.data.json` is the long one: every populated
 * place in India over five hundred people, about seven thousand of them, built
 * from GeoNames by `scripts/generate-stations.mjs`.
 *
 * The long list is not imported at the top of anything. It is a tenth of a
 * megabyte that a clerk booking Ahmedabad → Mumbai never needs, so it is asked
 * for the first time somebody types into a station box and kept thereafter.
 * Everything below is ordinary synchronous work over a plain array: once the
 * file is here there is no network, no debounce and no spinner between a
 * keystroke and its answers.
 *
 * Neither list is a whitelist. `from` and `to` are free text in the schema —
 * `text(80)` — and they have to be: Odhav is where the office is and is too
 * small for GeoNames, and a clerk will always know a village a gazetteer does
 * not. The lists are there to save typing, not to rule anything out.
 *
 * ---
 *
 * India has five Palis, six Shahpurs and seven Ramgarhs, in different states.
 * A menu can show which is which while it is open, but the register keeps a
 * string, and `Pali` on a bill three months later names nothing in particular —
 * the office cannot tell whether that lorry went to Rajasthan or Chhattisgarh,
 * and neither can the party querying the freight.
 *
 * So the state is carried in the value itself, and only where it is needed:
 *
 *   Ahmedabad          one of them in India, so nothing to disambiguate
 *   Pali, Rajasthan    one of five, so it says which
 *   Udaipur            an office route, and on this firm's book that is
 *                      Rajasthan's — the menu says so, the document need not
 *
 * Because the state ends up inside `from` and `to`, every screen that prints
 * those two strings — the register's Route column, the L.R. itself, the detail
 * sheet, the edit dialog — shows it without being told to.
 */

import { STATIONS } from "@/lib/companies"

/** Between a town and its state, in a value and on the printed document. */
const QUALIFIER = ", "

export interface Station {
  /** The town itself — `Pali`. */
  name: string
  /**
   * Which state holds it. Shown beside the name in the menu, always. Whether
   * it also reaches the document is `label`'s business, not this field's.
   */
  state: string
  /**
   * What goes in the box, into the register and onto the printed paper: the
   * bare name where India has one of them, `Pali, Rajasthan` where it does not.
   */
  label: string
  /**
   * `label` and `name` with case and the punctuation nobody agrees on folded
   * away, plus the words of `name`. All three are what a keystroke is matched
   * against, and all three are worked out once rather than seven thousand
   * times per keystroke. Build a station with `station()` rather than by hand.
   */
  key: string
  nameKey: string
  words: string[]
}

/**
 * A station, with its matching fields filled in.
 *
 * `qualify` is for a name India has more than one of: it is what puts the
 * state into `label`, and so onto the document.
 */
export function station(name: string, state = "", qualify = false): Station {
  return {
    name,
    state,
    label: qualify && state ? `${name}${QUALIFIER}${state}` : name,
    key: fold(qualify && state ? `${name}${QUALIFIER}${state}` : name),
    nameKey: fold(name),
    words: name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  }
}

/**
 * The office's own routes, before the long list has been fetched.
 *
 * No states on them yet — `loadStations` fills in which town each one means
 * once it can see the gazetteer. They are usable as they are in the meantime.
 */
export const OFFICE_STATIONS: Station[] = STATIONS.map((name) => station(name))

interface StationData {
  source: string
  sourceUrl: string
  license: string
  generatedOn: string
  states: string[]
  /** `[name, index into states]`, ordered by population, largest first. */
  cities: [string, number][]
}

export interface StationIndex {
  /** The office's own routes, each now knowing which town it means. */
  pinned: Station[]
  /** Everywhere else in India, biggest first. */
  stations: Station[]
  attribution: string
}

/**
 * Splits the gazetteer into the office's routes and everywhere else, and
 * decides which names have to carry a state.
 */
function index(data: StationData): StationIndex {
  // How many states hold a town of this name. More than one and the name alone
  // does not identify a place, so it is written with its state from here on.
  const namesakes = new Map<string, number>()
  for (const [name] of data.cities) {
    namesakes.set(name, (namesakes.get(name) ?? 0) + 1)
  }

  // Widened: `STATIONS` is a literal union, and these are gazetteer names.
  const own = new Set<string>(STATIONS)

  /**
   * An office route means the biggest town of that name — `Udaipur` on this
   * firm's book is Rajasthan's, not Tripura's. The list is in population order,
   * so the first of a name is that town: it is lifted out to become the pinned
   * entry, and its smaller namesakes stay below, each carrying its own state.
   */
  const claimed = new Map<string, string>()
  const stations: Station[] = []

  for (const [name, stateIndex] of data.cities) {
    const state = data.states[stateIndex]

    if (own.has(name) && !claimed.has(name)) {
      claimed.set(name, state)
      continue
    }

    stations.push(station(name, state, (namesakes.get(name) ?? 0) > 1))
  }

  return {
    // Rebuilt from `STATIONS` rather than from the loop, so the office's routes
    // stay in the order that list puts them in. A route GeoNames has never
    // heard of keeps the stateless entry it started with.
    pinned: OFFICE_STATIONS.map((route) => {
      const state = claimed.get(route.name)
      // Qualified `false`: the state is for the menu to show, not for the
      // document to carry. This office writes "Udaipur".
      return state ? station(route.name, state) : route
    }),
    stations,
    attribution: `${data.source} · ${data.license}`,
  }
}

let pending: Promise<StationIndex> | null = null

/**
 * Fetches the long list, once.
 *
 * The promise itself is the cache, so twenty boxes opening at once share one
 * request rather than racing. A failed load clears it, because the next attempt
 * should be allowed to work — a field that has lost its list falls back to the
 * office's own routes and stays typeable either way.
 */
export function loadStations(): Promise<StationIndex> {
  pending ??= import("./stations.data.json")
    .then((module) => {
      // TypeScript reads the generated file's pairs as `(string | number)[]`
      // rather than as tuples. The generator is what guarantees the shape.
      return index(module.default as unknown as StationData)
    })
    .catch((cause) => {
      pending = null
      throw cause
    })

  return pending
}

/** Folds case and the punctuation nobody agrees on: `St. John's` → `stjohns`. */
function fold(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

/**
 * How well a station answers what has been typed, or -1 for not at all.
 *
 * Lower is better, and the bands are deliberately coarse — within a band the
 * caller keeps the list's own order, which is population, and that is a better
 * tiebreak than any string metric would be. Typing `mum` should offer Mumbai
 * before Mumbra because more freight goes to Mumbai, not because it is shorter.
 *
 *   0  the whole thing, as typed
 *   1  it starts with it             — `bhiw` → Bhiwandi, `pali, raj` → Pali
 *   2  a later word starts with it   — `mumbai` → Navi Mumbai
 *   3  it appears somewhere inside   — `nagar` → Ahmadnagar
 *
 * Both the qualified name and the bare one are matched, so a clerk who types
 * `pali` sees all five and one who types `pali, raj` sees the one they meant.
 */
function score({ key, nameKey, words }: Station, query: string) {
  if (nameKey === query || key === query) return 0
  if (nameKey.startsWith(query) || key.startsWith(query)) return 1
  if (words.some((word) => word.startsWith(query))) return 2
  return nameKey.includes(query) ? 3 : -1
}

/**
 * The stations worth offering for what has been typed, best first.
 *
 * `pinned` are the office's own routes and jump the queue when they match at
 * all — a firm that books Rajkot every day should not have to scroll past
 * somewhere bigger with a nearer spelling. They are also what fills the list
 * before anything has been typed.
 *
 * Nothing is deduplicated here: `loadStations` has already taken the office's
 * routes out of the long list, so a station appears in exactly one of the two.
 */
export function searchStations({
  query,
  stations,
  pinned,
  limit = 50,
}: {
  query: string
  stations: readonly Station[]
  pinned: readonly Station[]
  limit?: number
}): { pinned: Station[]; rest: Station[] } {
  const folded = fold(query)

  if (!folded) {
    return { pinned: [...pinned], rest: [] }
  }

  const matched: { station: Station; score: number; rank: number }[] = []
  for (let rank = 0; rank < stations.length; rank++) {
    const entry = stations[rank]
    const result = score(entry, folded)
    if (result < 0) continue

    matched.push({ station: entry, score: result, rank })
  }

  matched.sort((a, b) => a.score - b.score || a.rank - b.rank)

  return {
    pinned: pinned.filter((entry) => score(entry, folded) >= 0),
    rest: matched.slice(0, limit).map((entry) => entry.station),
  }
}

/**
 * The settled spelling of something already typed, if the list knows one.
 *
 * Run when a station box is left, so `bhiwandi` and `BHIWANDI` both end up
 * printed as Bhiwandi, and `pali, rajasthan` as `Pali, Rajasthan`.
 *
 * What it will not do is pick a state on the clerk's behalf. `Pali` names five
 * towns; the honest thing is to leave the box saying `Pali` rather than send a
 * lorry to Rajasthan because that one happens to be the biggest. An unknown
 * station is not an error either — a village's spelling stands as typed.
 */
export function canonicalStation(
  value: string,
  loaded: StationIndex | null
): string {
  const folded = fold(value)
  if (!folded) return value

  const pinned = loaded?.pinned ?? OFFICE_STATIONS
  const stations = loaded?.stations ?? []

  // Written out in full — `Pali, Rajasthan` — or the name of somewhere there is
  // only one of. Either way it names one place and can be tidied to match.
  const exact =
    pinned.find((entry) => entry.key === folded) ??
    stations.find((entry) => entry.key === folded)
  if (exact) return exact.label

  // Just a name. An office route wins it outright: `udaipur` on this firm's
  // book is the Udaipur this firm books to, whatever else shares the name.
  const route = pinned.find((entry) => entry.nameKey === folded)
  if (route) return route.label

  const namesakes = stations.filter((entry) => entry.nameKey === folded)

  // One of them in India: the name settles the place, so take the whole label.
  if (namesakes.length === 1) return namesakes[0].label

  // Several. Which state is the clerk's to say and this will not guess one —
  // but the spelling is not in doubt, so `ramgarh` is at least made Ramgarh.
  if (namesakes.length > 1) return namesakes[0].name

  return value.trim()
}
