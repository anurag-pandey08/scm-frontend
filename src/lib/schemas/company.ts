import { z } from "zod"

import { COMPANY_SLUGS, type Company } from "@/lib/companies"

/**
 * The letterhead, as a schema.
 *
 * One definition doing two jobs on purpose. It is the resolver behind the
 * settings form, so the office is told about a malformed PAN as it types; and
 * it is the parser for what the API sends back, so a field the backend renames
 * fails here — loudly, at the boundary — rather than rendering as `undefined`
 * in the middle of a printed bilty.
 *
 * It mirrors `letterheadSchema` in scm-backend, and the backend's copy is the
 * one that actually guards the database. The duplication is deliberate: two
 * repositories, and a form that validates in the browser cannot be relying on
 * the server to have run first. The rules must stay in step — when one moves,
 * move the other.
 */

/** Required on the page: printing a bilty without one is a broken document. */
const required = (message: string, max = 200) =>
  z.string().trim().min(1, message).max(max)

const optional = (max = 200) => z.string().trim().max(max)

const phone = z
  .string()
  .trim()
  .min(1, "Required")
  .max(20)
  .regex(/^[+\d][\d\s-]*$/, "Does not look like a phone number")

/** AQAPP2502L — five letters, four figures, one letter. */
const pan = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{5}\d{4}[A-Z]$/,
    "A PAN is five letters, four figures, a letter"
  )
  .or(z.literal(""))

/** ICIC0007205 — four letters, a nought, then six of either. */
const ifsc = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{4}0[A-Z0-9]{6}$/,
    "An IFSC is four letters, a nought, then six more"
  )
  .or(z.literal(""))

const email = z
  .email("Does not look like an e-mail address")
  .trim()
  .toLowerCase()
  .max(254)

export const letterheadSchema = z.object({
  name: required("The name across the top of the letterhead", 120),
  monogram: required("Required", 5),
  tagline: required("Required", 120),
  lrTagline: required("Required", 120),
  billTagline: required("Required", 120),
  address: required("Printed under the name on every document", 400),
  officeLine: required("Required", 120),

  emails: z.object({ lr: email, bill: email }),

  phones: z
    .array(phone)
    .min(1, "At least one — the L.R. prints them across the top")
    .max(5, "At most five fit on the letterhead"),

  pan,
  jurisdiction: optional(120),

  bank: z.object({
    name: optional(120),
    branch: optional(160),
    accountNo: optional(34).regex(/^[A-Za-z0-9]*$/, "Figures and letters only"),
    ifsc,
  }),

  origin: required("Required", 80),

  bookingOffices: z
    .array(required("Required", 120))
    .min(1, "At least one — a bilty is booked at one of these")
    .max(20),
})

/** What the settings form holds and what a PATCH sends. */
export type LetterheadInput = z.infer<typeof letterheadSchema>

/**
 * A firm as the API reports it: the letterhead, plus the two fields the office
 * cannot edit, plus whether it has edited the rest.
 */
export const companySchema = letterheadSchema.extend({
  slug: z.enum(COMPANY_SLUGS),
  accentClass: z.string(),
  detailsConfirmed: z.boolean(),
  /** Running on details the office typed rather than the printed ones. */
  isEdited: z.boolean(),
})

export type CompanyDto = z.infer<typeof companySchema>

/**
 * Holds the API's shape to the one the screens already render.
 *
 * `Company` is what every printed document, the sidebar and the switcher take.
 * If the API ever stops satisfying it, this line fails to compile — which is
 * the point, because the alternative is finding out on a printed bilty.
 */
const _dtoIsACompany: CompanyDto extends Company ? true : never = true
void _dtoIsACompany

/**
 * A firm on its printed letterhead, in the shape the API would have sent.
 *
 * The app is installable and expected to work on a bad line, so a screen must
 * still be able to name the firm it is rendering when the API cannot be
 * reached. This is that answer: the letterhead transcribed from the book,
 * which is right until the office edits it and never dangerously wrong.
 *
 * `isEdited` is false because this *is* the printed letterhead — there is
 * nothing here that the office typed.
 */
export function printedCompany(company: Company): CompanyDto {
  return { ...company, isEdited: false }
}

/**
 * The editable half of a firm — what the settings form loads and saves.
 *
 * Written out field by field rather than spread-and-delete, so a field added to
 * `Company` does not silently become editable: it has to be named here, and
 * naming it is the decision.
 */
export function letterheadOf(company: Company): LetterheadInput {
  return {
    name: company.name,
    monogram: company.monogram,
    tagline: company.tagline,
    lrTagline: company.lrTagline,
    billTagline: company.billTagline,
    address: company.address,
    officeLine: company.officeLine,
    emails: { lr: company.emails.lr, bill: company.emails.bill },
    phones: [...company.phones],
    pan: company.pan,
    jurisdiction: company.jurisdiction,
    bank: { ...company.bank },
    origin: company.origin,
    bookingOffices: [...company.bookingOffices],
  }
}
