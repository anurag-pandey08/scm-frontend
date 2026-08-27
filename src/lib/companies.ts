/**
 * The firms the office keeps books for.
 *
 * Each firm has its own L.R. book, its own bill book and its own letterhead.
 * Nothing crosses between them — a bilty booked under one never appears in the
 * other's register, and the totals on one dashboard never count the other's
 * freight. Only the station list and the screens themselves are shared.
 *
 * The active firm is the first segment of the URL, so every page — server
 * rendered or not — knows which book it is writing in without asking the client.
 */

export const COMPANY_SLUGS = [
  "sewak-cargo-movers",
  "sewak-union-roadways",
] as const

export type CompanySlug = (typeof COMPANY_SLUGS)[number]

/** Where a visitor with no cookie, or a stale one, lands. */
export const DEFAULT_COMPANY: CompanySlug = "sewak-cargo-movers"

/** Remembers which book the clerk last had open, so `/` reopens it. */
export const COMPANY_COOKIE = "scm.company"

export interface Bank {
  name: string
  branch: string
  accountNo: string
  ifsc: string
}

export interface Company {
  slug: CompanySlug
  /** As printed across the top of the letterhead. */
  name: string
  /** The roundel on the L.R. masthead and the tile in the sidebar. */
  monogram: string
  /** Under the name in the app chrome. */
  tagline: string
  /** Under the name on the printed L.R. — the two books word it differently. */
  lrTagline: string
  /** …and on the printed bill. */
  billTagline: string
  address: string
  /** Booking office, short enough for the sidebar footer. */
  officeLine: string
  /** The two books were printed with different addresses. Both are in use. */
  emails: {
    /** On the L.R. book */
    lr: string
    /** On the bill book */
    bill: string
  }
  phones: string[]
  pan: string
  jurisdiction: string
  bank: Bank
  /** The station every L.R. is booked "From". */
  origin: string
  bookingOffices: string[]
  /**
   * The tile colour. Each firm gets its own so which book you are writing in is
   * obvious before you have read the name — the two letterheads are otherwise
   * near identical, and a bilty printed on the wrong one is a real mistake.
   */
  accentClass: string
  /**
   * False while the letterhead details are still placeholders. The app says so
   * in the sidebar; the printed documents carry the placeholder text itself,
   * so nothing fake can be mistaken for a real PAN or account number.
   */
  detailsConfirmed: boolean
}

export const COMPANIES: Record<CompanySlug, Company> = {
  "sewak-cargo-movers": {
    slug: "sewak-cargo-movers",
    name: "Sewak Cargo Movers",
    monogram: "SCM",
    tagline: "Transport Contractors & Fleet Owner",
    lrTagline: "Transport Contractors & Fleet Owner",
    billTagline: "Transport Contractors and Fleetowner",
    address:
      "40, Sarthi Complex, First Floor, Nr. Bileshwar Complex, Opp. G.V.M.M., Odhav, Ahmedabad-382415",
    officeLine: "Odhav, Ahmedabad-382415",
    emails: {
      lr: "sewakcargomovers@gmail.com",
      // The bill book carries the older union roadways address. Worth checking
      // with the client whether the bill book belongs to this firm at all now
      // that the two are kept apart.
      bill: "sewakunionroadways@gmail.com",
    },
    phones: ["9376150604", "9376050604", "8460050604"],
    pan: "AQAPP2502L",
    jurisdiction: "Subject to Ahmedabad Jurisdiction",
    bank: {
      name: "IDFC First Bank",
      branch: "Naroda, Ahmedabad-382330",
      accountNo: "10190035994",
      ifsc: "IDFB0040314",
    },
    origin: "Ahmedabad",
    bookingOffices: [
      "Odhav, Ahmedabad",
      "Naroda, Ahmedabad",
      "Rakhial, Ahmedabad",
    ],
    accentClass: "bg-chart-1",
    detailsConfirmed: true,
  },

  // Letterhead taken off this firm's own L.R. book: the same Odhav premises as
  // Sewak Cargo Movers, but its own PAN, its own two numbers and its own bank.
  "sewak-union-roadways": {
    slug: "sewak-union-roadways",
    name: "Sewak Union Roadways",
    monogram: "SUR",
    tagline: "Transport Contractors & Fleet Owner",
    lrTagline: "Transport Contractors & Fleet Owner",
    billTagline: "Transport Contractors and Fleetowner",
    address:
      "40, Sarthi Complex, First Floor, Nr. Bileshwar Complex, Opp. G.V.M.M., Odhav, Ahmedabad-382415",
    officeLine: "Odhav, Ahmedabad-382415",
    emails: {
      lr: "sewakunionroadways@gmail.com",
      bill: "sewakunionroadways@gmail.com",
    },
    // Two numbers on this book, not the three Sewak Cargo Movers prints.
    phones: ["9376150604", "9376050604"],
    pan: "BDSPP5578G",
    jurisdiction: "Subject to Ahmedabad Jurisdiction",
    bank: {
      name: "ICICI Bank",
      branch: "Vastral Metro Branch, Ahmedabad",
      accountNo: "720505000304",
      ifsc: "ICIC0007205",
    },
    origin: "Ahmedabad",
    // The L.R. leaves "Booking Office" blank for the clerk to write in, so the
    // book names no branches — these stay the same premises as the other firm.
    bookingOffices: [
      "Odhav, Ahmedabad",
      "Naroda, Ahmedabad",
      "Rakhial, Ahmedabad",
    ],
    accentClass: "bg-chart-2",
    detailsConfirmed: true,
  },
}

/** Sidebar order, and the order the switcher lists them in. */
export const COMPANY_LIST: Company[] = COMPANY_SLUGS.map(
  (slug) => COMPANIES[slug]
)

export function isCompanySlug(value: string): value is CompanySlug {
  return (COMPANY_SLUGS as readonly string[]).includes(value)
}

/** The firm for a URL segment, or `null` if the segment names no firm we keep. */
export function findCompany(slug: string): Company | null {
  return isCompanySlug(slug) ? COMPANIES[slug] : null
}

/**
 * Stations the booking office writes L.R.s to. Shared — these are places, not
 * firm details, and both firms book to the same map of India.
 */
export const STATIONS = [
  "Ahmedabad",
  "Bengaluru",
  "Bhiwandi",
  "Bhopal",
  "Chandigarh",
  "Delhi",
  "Hyderabad",
  "Indore",
  "Jaipur",
  "Jodhpur",
  "Kolkata",
  "Ludhiana",
  "Mumbai",
  "Nagpur",
  "Pune",
  "Rajkot",
  "Surat",
  "Udaipur",
  "Vadodara",
] as const
