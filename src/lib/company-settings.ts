import { COMPANIES, type Company, type CompanySlug } from "./companies"

/**
 * The letterhead as the office may rewrite it for itself.
 *
 * There is no backend yet, so a firm's details live in two places: the printed
 * letterhead transcribed into `companies.ts`, and whatever the office has since
 * typed over it on the settings screen. This module owns the second half —
 * reading it out of the browser, checking it still looks like a letterhead, and
 * laying it over the first.
 *
 * Left out on purpose:
 *   `slug`             the firm's identity and its URL; renaming it would strand
 *                      every bilty, bill and slip filed under it
 *   `accentClass`      the tile colour that tells the two books apart at a
 *                      glance — a safeguard, not a preference
 *   `detailsConfirmed` whether the real letterhead has landed. A firm cannot
 *                      declare its own paperwork fit to hand out by typing in a
 *                      box; that is settled in the code, against the book.
 */
export const EDITABLE_FIELDS = [
  "name",
  "monogram",
  "tagline",
  "lrTagline",
  "billTagline",
  "address",
  "officeLine",
  "emails",
  "phones",
  "pan",
  "jurisdiction",
  "bank",
  "origin",
  "bookingOffices",
] as const satisfies readonly (keyof Company)[]

export type EditableField = (typeof EDITABLE_FIELDS)[number]

/** A firm's letterhead, whole — the shape the office edits and the browser keeps. */
export type CompanyDetails = Pick<Company, EditableField>

/**
 * One key per firm, so the two letterheads are stored as separately as they are
 * kept. Prefixed like the `scm.company` cookie.
 */
const STORAGE_PREFIX = "scm.letterhead."

function storageKey(slug: CompanySlug) {
  return `${STORAGE_PREFIX}${slug}`
}

/** The letterhead half of a firm — what the settings screen loads into its form. */
export function detailsOf(company: Company): CompanyDetails {
  return {
    name: company.name,
    monogram: company.monogram,
    tagline: company.tagline,
    lrTagline: company.lrTagline,
    billTagline: company.billTagline,
    address: company.address,
    officeLine: company.officeLine,
    emails: { ...company.emails },
    phones: [...company.phones],
    pan: company.pan,
    jurisdiction: company.jurisdiction,
    bank: { ...company.bank },
    origin: company.origin,
    bookingOffices: [...company.bookingOffices],
  }
}

/** The firm as it now reads: the printed letterhead with the office's edits over it. */
export function applyDetails(
  base: Company,
  details: CompanyDetails | null
): Company {
  return details ? { ...base, ...details } : base
}

export function sameDetails(a: CompanyDetails, b: CompanyDetails): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function strings(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

/**
 * Rebuilds a letterhead field by field, falling back to the printed one for
 * anything missing or the wrong shape.
 *
 * Local storage is not a database — it survives past the code that wrote it and
 * anyone can edit it by hand. Reading it this way means a half-written or stale
 * record degrades to the printed letterhead one field at a time instead of
 * putting `undefined` on a bilty, and a field added to `Company` later simply
 * takes its printed value until the office saves over it.
 */
function parseDetails(raw: unknown, base: Company): CompanyDetails {
  const saved = object(raw)
  const emails = object(saved.emails)
  const bank = object(saved.bank)

  return {
    name: str(saved.name, base.name),
    monogram: str(saved.monogram, base.monogram),
    tagline: str(saved.tagline, base.tagline),
    lrTagline: str(saved.lrTagline, base.lrTagline),
    billTagline: str(saved.billTagline, base.billTagline),
    address: str(saved.address, base.address),
    officeLine: str(saved.officeLine, base.officeLine),
    emails: {
      lr: str(emails.lr, base.emails.lr),
      bill: str(emails.bill, base.emails.bill),
    },
    phones: strings(saved.phones, base.phones),
    pan: str(saved.pan, base.pan),
    jurisdiction: str(saved.jurisdiction, base.jurisdiction),
    bank: {
      name: str(bank.name, base.bank.name),
      branch: str(bank.branch, base.bank.branch),
      accountNo: str(bank.accountNo, base.bank.accountNo),
      ifsc: str(bank.ifsc, base.bank.ifsc),
    },
    origin: str(saved.origin, base.origin),
    bookingOffices: strings(saved.bookingOffices, base.bookingOffices),
  }
}

/**
 * The letterhead this browser has saved for a firm, or `null` if the office has
 * never edited it. Call from the client only — there is no storage on the
 * server, and the prerendered HTML is deliberately the printed letterhead.
 */
export function readDetails(slug: CompanySlug): CompanyDetails | null {
  try {
    const raw = window.localStorage.getItem(storageKey(slug))
    return raw ? parseDetails(JSON.parse(raw), COMPANIES[slug]) : null
  } catch {
    // Private mode, a disabled store, or something that is not JSON. The
    // printed letterhead is always a safe answer, so nothing here should stop
    // a screen from rendering.
    return null
  }
}

export function writeDetails(slug: CompanySlug, details: CompanyDetails) {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(details))
  } catch {
    // Out of quota or blocked. The edit still stands for this session; it just
    // will not be here next time.
  }
}

/** Drops the office's edits, putting the firm back to its printed letterhead. */
export function clearDetails(slug: CompanySlug) {
  try {
    window.localStorage.removeItem(storageKey(slug))
  } catch {
    // Nothing to do — the caller has already dropped it from state.
  }
}

/**
 * Whether a `storage` event from another tab touched a letterhead. A `null` key
 * means that tab cleared the whole store, which takes the letterheads with it.
 */
export function affectsDetails(key: string | null): boolean {
  return key === null || key.startsWith(STORAGE_PREFIX)
}
