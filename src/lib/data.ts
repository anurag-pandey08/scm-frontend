import type { Company, CompanySlug } from "./companies"
import { COMPANIES } from "./companies"
import type { Bilty, BiltyStatus, PaymentType, Party, RiskType } from "./types"

/**
 * Static seed data standing in for the L.R. books — one book per firm, kept
 * wholly apart. Replace with API calls when the backend lands; everything
 * downstream already asks for a firm's data by slug rather than importing a
 * single register, so only this file has to change.
 *
 * Both books are anchored to the same date so the two dashboards cover the
 * same thirty days and can be read against each other.
 */

/** The day the datasets are anchored to; every "last 30 days" figure counts back from here. */
export const TODAY = "2026-08-04"

type Row<S extends string, C extends string> = {
  lr: number
  date: string
  lorry: string
  to: string
  from: S
  cnee: C
  pkgs: number
  contents: string
  actual: number
  charged: number
  value: number
  rate: number
  freight: number
  aoc?: number
  hamali: number
  other?: number
  advance?: number
  pay: PaymentType
  status: BiltyStatus
  risk?: RiskType
  remarks?: string
}

interface Book {
  /** L.R. numbers run above this; the next one off the book is always higher. */
  lrFloor: number
  /** Party invoice numbers are seeded a fixed distance from the L.R. number. */
  invoiceBase: number
  monthlyFreight: { month: string; freight: number }[]
  fleet: { owned: number; attached: number }
  consignors: Record<string, Party>
  consignees: Record<string, Party>
  rows: Row<string, string>[]
}

/**
 * Ties a book's rows to its own party lists, so a row can only name a party the
 * firm actually deals with — one firm's consignors are not the other's. The
 * key types are checked here and dropped from the result, so the two books
 * stay one interchangeable shape downstream.
 */
function book<S extends string, C extends string>(
  spec: Pick<Book, "lrFloor" | "invoiceBase" | "monthlyFreight" | "fleet">,
  consignors: Record<S, Party>,
  consignees: Record<C, Party>,
  rows: Row<S, C>[]
): Book {
  return { ...spec, consignors, consignees, rows }
}

// ---------------------------------------------------------------------------
// Sewak Cargo Movers — L.R. 3010 to 3038
// ---------------------------------------------------------------------------

const SCM_CONSIGNORS = {
  shreeji: {
    name: "Shreeji Polymers Pvt. Ltd.",
    address: "Plot 44, Odhav GIDC, Ahmedabad-382415",
    gstNo: "24AACCS4471K1ZP",
  },
  maruti: {
    name: "Maruti Engineering Works",
    address: "B-12, Vatva GIDC Phase-II, Ahmedabad-382445",
    gstNo: "24AAFFM2298L1ZQ",
  },
  aarav: {
    name: "Aarav Steel Traders",
    address: "Shed 7, Kathwada Road, Ahmedabad-382430",
    gstNo: "24AAGCA8812M1ZB",
  },
  gujceramic: {
    name: "Gujarat Ceramic House",
    address: "Survey 210, Changodar, Ahmedabad-382213",
    gstNo: "24AABCG5540N1ZR",
  },
  krishna: {
    name: "Krishna Textile Mills",
    address: "Narol Char Rasta, Ahmedabad-382405",
    gstNo: "24AACCK9013P1ZE",
  },
  odhavauto: {
    name: "Odhav Auto Components",
    address: "F-9, Odhav Ring Road, Ahmedabad-382415",
    gstNo: "24AADCO3367Q1ZL",
  },
  balaji: {
    name: "Balaji Chemicals",
    address: "Plot 118, Naroda GIDC, Ahmedabad-382330",
    gstNo: "24AAECB7726R1ZM",
  },
  sardar: {
    name: "Sardar Packaging Industries",
    address: "C-31, Aslali, Ahmedabad-382427",
    gstNo: "24AAHFS1194S1ZT",
  },
  navkar: {
    name: "Navkar Plastics",
    address: "Shed 22, Odhav GIDC, Ahmedabad-382415",
    gstNo: "24AAJFN6650T1ZC",
  },
  shakti: {
    name: "Shakti Pumps & Spares",
    address: "Nr. Bileshwar Complex, Odhav, Ahmedabad-382415",
    gstNo: "24AAKCS2287U1ZD",
  },
} satisfies Record<string, Party>

const SCM_CONSIGNEES = {
  deep: {
    name: "Deep Enterprise",
    address: "Gala 14, Sakinaka, Mumbai-400072",
    gstNo: "27AAECD3312V1ZK",
  },
  sagar: {
    name: "Sagar Trading Co.",
    address: "Shop 8, Masjid Bunder, Mumbai-400009",
    gstNo: "27AAGFS8890W1ZJ",
  },
  balajidist: {
    name: "Balaji Distributors",
    address: "Plot 21, Narela Ind. Area, Delhi-110040",
    gstNo: "07AABCB1122X1ZF",
  },
  kapoor: {
    name: "Kapoor Auto Agencies",
    address: "Kashmere Gate, Delhi-110006",
    gstNo: "07AAFCK5567Y1ZN",
  },
  laxmi: {
    name: "Laxmi Textiles",
    address: "Ring Road, Surat-395002",
    gstNo: "24AAECL4478Z1ZG",
  },
  patelhw: {
    name: "Patel Hardware Stores",
    address: "Gondal Road, Rajkot-360004",
    gstNo: "24AAFPP6690A1ZH",
  },
  sanghvi: {
    name: "Sanghvi Traders",
    address: "Sanwer Road, Indore-452015",
    gstNo: "23AAHCS2231B1ZM",
  },
  rajpipe: {
    name: "Rajasthan Pipe House",
    address: "Sitapura, Jaipur-302022",
    gstNo: "08AAJCR7745C1ZQ",
  },
  shivneri: {
    name: "Shivneri Engineering",
    address: "Bhosari MIDC, Pune-411026",
    gstNo: "27AAKCS9903D1ZR",
  },
  vidarbha: {
    name: "Vidarbha Agencies",
    address: "Hingna Road, Nagpur-440016",
    gstNo: "27AALCV1128E1ZS",
  },
  sailog: {
    name: "Sai Logistics Hub",
    address: "Kalyan Road, Bhiwandi-421302",
    gstNo: "27AAMCS3374F1ZT",
  },
  deccan: {
    name: "Deccan Chemicals",
    address: "Balanagar, Hyderabad-500037",
    gstNo: "36AANCD5519G1ZU",
  },
  venkatesh: {
    name: "Sri Venkatesh Traders",
    address: "Peenya, Bengaluru-560058",
    gstNo: "29AAOCS7761H1ZV",
  },
  narmada: {
    name: "Narmada Polymers",
    address: "Makarpura GIDC, Vadodara-390010",
    gstNo: "24AAPCN9906J1ZW",
  },
  eastern: {
    name: "Eastern Supply Co.",
    address: "Howrah, Kolkata-711101",
    gstNo: "19AAQCE2251K1ZX",
  },
} satisfies Record<string, Party>

/**
 * Kept off Prettier: each row is one consignment, written on one line so the
 * seed reads as the register it stands in for. Reflowing it turns a 20-line
 * table into 900 lines of unreadable object literal.
 */
// prettier-ignore
const SCM_BOOK = book(
  {
    lrFloor: 3000,
    invoiceBase: 1200,
    /**
     * Freight booked per month for the twelve complete months before the anchor
     * date. Static history — the current partial month is deliberately excluded
     * so the last bar is never a half-month stub.
     */
    monthlyFreight: [
      { month: "2025-08", freight: 412000 },
      { month: "2025-09", freight: 468000 },
      { month: "2025-10", freight: 596000 },
      { month: "2025-11", freight: 634000 },
      { month: "2025-12", freight: 521000 },
      { month: "2026-01", freight: 449000 },
      { month: "2026-02", freight: 507000 },
      { month: "2026-03", freight: 688000 },
      { month: "2026-04", freight: 542000 },
      { month: "2026-05", freight: 575000 },
      { month: "2026-06", freight: 619000 },
      { month: "2026-07", freight: 726000 },
    ],
    fleet: { owned: 8, attached: 14 },
  },
  SCM_CONSIGNORS,
  SCM_CONSIGNEES,
  [
    { lr: 3010, date: "2026-07-06", lorry: "GJ-01-BT-4471", to: "Mumbai", from: "shreeji", cnee: "deep", pkgs: 60, contents: "Plastic granules (HDPE) — bags", actual: 3000, charged: 3000, value: 285000, rate: 420, freight: 12600, hamali: 300, pay: "Paid", status: "Delivered" },
    { lr: 3011, date: "2026-07-07", lorry: "GJ-18-Z-3345", to: "Delhi", from: "aarav", cnee: "balajidist", pkgs: 42, contents: "M.S. angles & flats", actual: 8400, charged: 8500, value: 640000, rate: 310, freight: 26350, hamali: 700, aoc: 150, advance: 10000, pay: "To Pay", status: "Delivered" },
    { lr: 3012, date: "2026-07-08", lorry: "GJ-27-AX-9012", to: "Surat", from: "krishna", cnee: "laxmi", pkgs: 24, contents: "Cotton bales", actual: 4800, charged: 4800, value: 396000, rate: 145, freight: 6960, hamali: 250, pay: "Paid", status: "Delivered" },
    { lr: 3013, date: "2026-07-09", lorry: "GJ-01-CT-7788", to: "Rajkot", from: "shakti", cnee: "patelhw", pkgs: 18, contents: "Submersible pumps & spares", actual: 1620, charged: 1800, value: 215000, rate: 300, freight: 5400, hamali: 200, other: 150, pay: "Paid", status: "Delivered" },
    { lr: 3014, date: "2026-07-10", lorry: "MH-04-GH-2210", to: "Pune", from: "maruti", cnee: "shivneri", pkgs: 30, contents: "Machined castings", actual: 5100, charged: 5100, value: 720000, rate: 340, freight: 17340, hamali: 450, aoc: 100, pay: "To Pay", status: "Delivered" },
    { lr: 3015, date: "2026-07-11", lorry: "GJ-06-AB-5521", to: "Indore", from: "navkar", cnee: "sanghvi", pkgs: 85, contents: "PVC moulded fittings", actual: 2550, charged: 2600, value: 190000, rate: 285, freight: 7410, hamali: 350, pay: "TBB", status: "Delivered" },
    { lr: 3016, date: "2026-07-12", lorry: "GJ-18-Z-3345", to: "Jaipur", from: "navkar", cnee: "rajpipe", pkgs: 120, contents: "PVC pipes — 6 mtr", actual: 3600, charged: 4000, value: 310000, rate: 330, freight: 13200, hamali: 500, other: 200, pay: "To Pay", status: "Delivered" },
    { lr: 3017, date: "2026-07-13", lorry: "GJ-01-BT-4471", to: "Mumbai", from: "balaji", cnee: "sagar", pkgs: 40, contents: "Industrial chemicals (non-hazardous)", actual: 4000, charged: 4000, value: 520000, rate: 430, freight: 17200, hamali: 400, aoc: 200, advance: 5000, pay: "Paid", status: "Delivered", risk: "Carrier's Risk" },
    { lr: 3018, date: "2026-07-14", lorry: "GJ-12-AK-6634", to: "Vadodara", from: "shreeji", cnee: "narmada", pkgs: 35, contents: "Polymer masterbatch", actual: 1750, charged: 1750, value: 240000, rate: 160, freight: 2800, hamali: 150, pay: "Paid", status: "Delivered" },
    { lr: 3019, date: "2026-07-15", lorry: "GJ-27-AX-9012", to: "Bhiwandi", from: "sardar", cnee: "sailog", pkgs: 210, contents: "Corrugated boxes — flat packed", actual: 2100, charged: 3200, value: 165000, rate: 400, freight: 12800, hamali: 600, pay: "TBB", status: "Delivered" },
    { lr: 3020, date: "2026-07-16", lorry: "GJ-01-DT-1190", to: "Nagpur", from: "gujceramic", cnee: "vidarbha", pkgs: 64, contents: "Ceramic wall tiles", actual: 12800, charged: 12800, value: 480000, rate: 245, freight: 31360, hamali: 900, aoc: 250, advance: 12000, pay: "To Pay", status: "Delivered" },
    { lr: 3021, date: "2026-07-17", lorry: "GJ-18-Z-3345", to: "Delhi", from: "odhavauto", cnee: "kapoor", pkgs: 55, contents: "Auto spare parts — assorted", actual: 3300, charged: 3500, value: 890000, rate: 360, freight: 12600, hamali: 400, other: 250, pay: "Paid", status: "Delivered" },
    { lr: 3022, date: "2026-07-18", lorry: "KA-01-MN-4407", to: "Bengaluru", from: "maruti", cnee: "venkatesh", pkgs: 26, contents: "Textile machinery parts", actual: 6500, charged: 6500, value: 1150000, rate: 640, freight: 41600, hamali: 800, aoc: 300, advance: 15000, pay: "To Pay", status: "Delivered" },
    { lr: 3023, date: "2026-07-19", lorry: "GJ-01-CT-7788", to: "Surat", from: "sardar", cnee: "laxmi", pkgs: 150, contents: "Duplex board cartons", actual: 1500, charged: 2200, value: 98000, rate: 150, freight: 3300, hamali: 300, pay: "Paid", status: "Delivered" },
    { lr: 3024, date: "2026-07-20", lorry: "GJ-06-AB-5521", to: "Hyderabad", from: "balaji", cnee: "deccan", pkgs: 48, contents: "Solvent drums — sealed", actual: 9600, charged: 9600, value: 760000, rate: 390, freight: 37440, hamali: 850, aoc: 200, pay: "To Pay", status: "Delivered", risk: "Carrier's Risk" },
    { lr: 3025, date: "2026-07-21", lorry: "GJ-12-AK-6634", to: "Rajkot", from: "aarav", cnee: "patelhw", pkgs: 30, contents: "G.I. pipes", actual: 6000, charged: 6000, value: 355000, rate: 130, freight: 7800, hamali: 350, pay: "Paid", status: "Delivered" },
    { lr: 3026, date: "2026-07-22", lorry: "WB-23-C-8845", to: "Kolkata", from: "gujceramic", cnee: "eastern", pkgs: 90, contents: "Vitrified floor tiles", actual: 18000, charged: 18000, value: 1080000, rate: 305, freight: 54900, hamali: 1200, aoc: 400, advance: 20000, pay: "To Pay", status: "Delivered" },
    { lr: 3027, date: "2026-07-23", lorry: "GJ-01-BT-4471", to: "Mumbai", from: "navkar", cnee: "deep", pkgs: 70, contents: "Plastic crates — nested", actual: 2100, charged: 3400, value: 175000, rate: 415, freight: 14110, hamali: 450, pay: "TBB", status: "Delivered" },
    { lr: 3028, date: "2026-07-25", lorry: "GJ-27-AX-9012", to: "Indore", from: "odhavauto", cnee: "sanghvi", pkgs: 38, contents: "Clutch plates & brake linings", actual: 2280, charged: 2400, value: 465000, rate: 290, freight: 6960, hamali: 300, other: 150, pay: "Paid", status: "Delivered" },
    { lr: 3029, date: "2026-07-27", lorry: "GJ-18-Z-3345", to: "Delhi", from: "krishna", cnee: "balajidist", pkgs: 46, contents: "Denim fabric rolls", actual: 9200, charged: 9200, value: 1340000, rate: 315, freight: 28980, hamali: 750, aoc: 200, advance: 10000, pay: "To Pay", status: "In Transit" },
    { lr: 3030, date: "2026-07-29", lorry: "MH-04-GH-2210", to: "Pune", from: "shakti", cnee: "shivneri", pkgs: 22, contents: "Monoblock pumps", actual: 2640, charged: 2800, value: 336000, rate: 345, freight: 9660, hamali: 350, pay: "Paid", status: "In Transit" },
    { lr: 3031, date: "2026-07-30", lorry: "GJ-01-DT-1190", to: "Nagpur", from: "shreeji", cnee: "vidarbha", pkgs: 80, contents: "Polypropylene woven sacks", actual: 4000, charged: 4200, value: 210000, rate: 250, freight: 10500, hamali: 450, pay: "TBB", status: "In Transit" },
    { lr: 3032, date: "2026-07-31", lorry: "GJ-06-AB-5521", to: "Bhiwandi", from: "sardar", cnee: "sailog", pkgs: 175, contents: "Printed cartons", actual: 1750, charged: 2900, value: 132000, rate: 405, freight: 11745, hamali: 550, pay: "To Pay", status: "In Transit" },
    { lr: 3033, date: "2026-08-01", lorry: "GJ-01-CT-7788", to: "Surat", from: "gujceramic", cnee: "laxmi", pkgs: 52, contents: "Ceramic sanitaryware", actual: 5200, charged: 5200, value: 410000, rate: 150, freight: 7800, hamali: 400, other: 200, pay: "Paid", status: "In Transit" },
    { lr: 3034, date: "2026-08-02", lorry: "KA-01-MN-4407", to: "Bengaluru", from: "odhavauto", cnee: "venkatesh", pkgs: 34, contents: "Auto electricals", actual: 4080, charged: 4200, value: 980000, rate: 655, freight: 27510, hamali: 700, aoc: 300, advance: 8000, pay: "To Pay", status: "In Transit" },
    { lr: 3035, date: "2026-08-03", lorry: "GJ-12-AK-6634", to: "Vadodara", from: "balaji", cnee: "narmada", pkgs: 28, contents: "Additive compounds — drums", actual: 2800, charged: 2800, value: 318000, rate: 165, freight: 4620, hamali: 200, pay: "Paid", status: "Booked" },
    { lr: 3036, date: "2026-08-03", lorry: "GJ-01-BT-4471", to: "Mumbai", from: "maruti", cnee: "sagar", pkgs: 44, contents: "Fabricated brackets", actual: 5280, charged: 5280, value: 615000, rate: 425, freight: 22440, hamali: 550, aoc: 150, pay: "To Pay", status: "Booked" },
    { lr: 3037, date: "2026-08-04", lorry: "GJ-18-Z-3345", to: "Jaipur", from: "aarav", cnee: "rajpipe", pkgs: 36, contents: "M.S. square tubes", actual: 7200, charged: 7200, value: 505000, rate: 335, freight: 24120, hamali: 650, other: 200, advance: 6000, pay: "To Pay", status: "Booked", remarks: "Deliver against original LR only." },
    /** A cancelled L.R., kept in the book so the numbering stays unbroken. */
    { lr: 3038, date: "2026-08-04", lorry: "—", to: "Kolkata", from: "krishna", cnee: "eastern", pkgs: 0, contents: "Cotton yarn cones — booking cancelled by party", actual: 0, charged: 0, value: 0, rate: 0, freight: 0, hamali: 0, pay: "TBB", status: "Cancelled", remarks: "Party cancelled before loading. Advance refunded in full." },
  ]
)

// ---------------------------------------------------------------------------
// Sewak Union Roadways — L.R. 7401 to 7420
//
// A smaller book than Cargo Movers', and pointed north rather than south: the
// firm runs Rajasthan, M.P. and Punjab, with Gujarat local work filling in.
// ---------------------------------------------------------------------------

const SUR_CONSIGNORS = {
  vishwa: {
    name: "Vishwakarma Forgings",
    address: "Plot 61, Vatva GIDC Phase-IV, Ahmedabad-382445",
    gstNo: "24AAACV3318K1ZN",
  },
  ratna: {
    name: "Ratna Agro Products",
    address: "Survey 88, Bavla Road, Ahmedabad-382220",
    gstNo: "24AABFR7741L1ZP",
  },
  jayhw: {
    name: "Jay Hardware & Tools",
    address: "Shed 12, Rakhial, Ahmedabad-380023",
    gstNo: "24AACFJ5528M1ZQ",
  },
  unicorn: {
    name: "Unicorn Paints & Coatings",
    address: "C-4, Naroda GIDC, Ahmedabad-382330",
    gstNo: "24AADCU9903N1ZR",
  },
  girnar: {
    name: "Girnar Marble & Granite",
    address: "Sarkhej-Bavla Highway, Ahmedabad-382210",
    gstNo: "24AAEFG2274P1ZS",
  },
  shubham: {
    name: "Shubham Cables Pvt. Ltd.",
    address: "Plot 39, Odhav GIDC, Ahmedabad-382415",
    gstNo: "24AAFCS6650Q1ZT",
  },
  ambica: {
    name: "Ambica Paper Mills",
    address: "Kathwada GIDC, Ahmedabad-382430",
    gstNo: "24AAGFA1196R1ZU",
  },
  tirupati: {
    name: "Tirupati Fasteners",
    address: "B-7, Aslali, Ahmedabad-382427",
    gstNo: "24AAHCT4487S1ZV",
  },
} satisfies Record<string, Party>

const SUR_CONSIGNEES = {
  mehta: {
    name: "Mehta Trading Corporation",
    address: "Naraina Ind. Area, Delhi-110028",
    gstNo: "07AAJCM8815T1ZW",
  },
  rajagro: {
    name: "Rajasthan Agro Mart",
    address: "Kukas, Jaipur-302028",
    gstNo: "08AAKFR2231U1ZX",
  },
  marudhar: {
    name: "Marudhar Hardware",
    address: "Basni Phase-II, Jodhpur-342005",
    gstNo: "08AALCM7763V1ZY",
  },
  aravalli: {
    name: "Aravalli Stone House",
    address: "Madri Ind. Area, Udaipur-313003",
    gstNo: "08AAMFA3319W1ZA",
  },
  narmadatr: {
    name: "Narmada Traders",
    address: "Govindpura, Bhopal-462023",
    gstNo: "23AANCN9975X1ZB",
  },
  malwa: {
    name: "Malwa Cable Agencies",
    address: "Pologround, Indore-452015",
    gstNo: "23AAOFM5541Y1ZC",
  },
  satluj: {
    name: "Satluj Auto Stores",
    address: "Focal Point, Ludhiana-141010",
    gstNo: "03AAPCS1187Z1ZD",
  },
  shivalik: {
    name: "Shivalik Paper Mart",
    address: "Industrial Area Phase-I, Chandigarh-160002",
    gstNo: "04AAQFS6653A1ZE",
  },
  saurashtra: {
    name: "Saurashtra Agencies",
    address: "Bhaktinagar, Rajkot-360002",
    gstNo: "24AARCS2219B1ZF",
  },
  baroda: {
    name: "Baroda Paint House",
    address: "Makarpura GIDC, Vadodara-390010",
    gstNo: "24AASFB8885C1ZG",
  },
} satisfies Record<string, Party>

/**
 * Kept off Prettier: each row is one consignment, written on one line so the
 * seed reads as the register it stands in for. Reflowing it turns a 20-line
 * table into 900 lines of unreadable object literal.
 */
// prettier-ignore
const SUR_BOOK = book(
  {
    lrFloor: 7400,
    invoiceBase: 640,
    monthlyFreight: [
      { month: "2025-08", freight: 238000 },
      { month: "2025-09", freight: 271000 },
      { month: "2025-10", freight: 344000 },
      { month: "2025-11", freight: 362000 },
      { month: "2025-12", freight: 305000 },
      { month: "2026-01", freight: 268000 },
      { month: "2026-02", freight: 296000 },
      { month: "2026-03", freight: 401000 },
      { month: "2026-04", freight: 318000 },
      { month: "2026-05", freight: 337000 },
      { month: "2026-06", freight: 359000 },
      { month: "2026-07", freight: 428000 },
    ],
    fleet: { owned: 5, attached: 9 },
  },
  SUR_CONSIGNORS,
  SUR_CONSIGNEES,
  [
    { lr: 7401, date: "2026-07-06", lorry: "GJ-01-EX-2214", to: "Delhi", from: "vishwa", cnee: "mehta", pkgs: 38, contents: "Forged flanges & fittings", actual: 5700, charged: 5700, value: 685000, rate: 330, freight: 18810, hamali: 550, aoc: 150, advance: 6000, pay: "To Pay", status: "Delivered" },
    { lr: 7402, date: "2026-07-07", lorry: "GJ-04-AL-8830", to: "Jaipur", from: "ratna", cnee: "rajagro", pkgs: 200, contents: "Cattle feed — bags", actual: 10000, charged: 10000, value: 320000, rate: 240, freight: 24000, hamali: 900, pay: "Paid", status: "Delivered" },
    { lr: 7403, date: "2026-07-08", lorry: "GJ-27-BB-1176", to: "Rajkot", from: "jayhw", cnee: "saurashtra", pkgs: 26, contents: "Hand tools & fasteners", actual: 1560, charged: 1800, value: 175000, rate: 135, freight: 2430, hamali: 200, pay: "Paid", status: "Delivered" },
    { lr: 7404, date: "2026-07-10", lorry: "RJ-19-GA-4402", to: "Jodhpur", from: "jayhw", cnee: "marudhar", pkgs: 44, contents: "Builder hardware — assorted", actual: 3520, charged: 3600, value: 268000, rate: 300, freight: 10800, hamali: 400, other: 200, pay: "To Pay", status: "Delivered" },
    { lr: 7405, date: "2026-07-11", lorry: "GJ-01-EX-2214", to: "Udaipur", from: "girnar", cnee: "aravalli", pkgs: 32, contents: "Granite slabs — crated", actual: 16000, charged: 16000, value: 540000, rate: 210, freight: 33600, hamali: 1100, aoc: 300, advance: 12000, pay: "To Pay", status: "Delivered", risk: "Carrier's Risk" },
    { lr: 7406, date: "2026-07-12", lorry: "GJ-12-BM-5567", to: "Indore", from: "shubham", cnee: "malwa", pkgs: 55, contents: "PVC insulated cables — coils", actual: 4400, charged: 4400, value: 810000, rate: 280, freight: 12320, hamali: 450, pay: "Paid", status: "Delivered" },
    { lr: 7407, date: "2026-07-13", lorry: "MP-09-HK-3320", to: "Bhopal", from: "ambica", cnee: "narmadatr", pkgs: 96, contents: "Kraft paper reels", actual: 9600, charged: 9600, value: 385000, rate: 265, freight: 25440, hamali: 800, aoc: 200, pay: "TBB", status: "Delivered" },
    { lr: 7408, date: "2026-07-15", lorry: "GJ-04-AL-8830", to: "Vadodara", from: "unicorn", cnee: "baroda", pkgs: 60, contents: "Enamel paint — tins", actual: 1800, charged: 2000, value: 224000, rate: 155, freight: 3100, hamali: 250, pay: "Paid", status: "Delivered" },
    { lr: 7409, date: "2026-07-16", lorry: "PB-10-CT-9945", to: "Ludhiana", from: "tirupati", cnee: "satluj", pkgs: 48, contents: "High-tensile fasteners", actual: 4800, charged: 4800, value: 460000, rate: 385, freight: 18480, hamali: 600, advance: 5000, pay: "To Pay", status: "Delivered" },
    { lr: 7410, date: "2026-07-18", lorry: "CH-01-DL-2208", to: "Chandigarh", from: "ambica", cnee: "shivalik", pkgs: 120, contents: "Duplex board — reams", actual: 6000, charged: 6000, value: 295000, rate: 400, freight: 24000, hamali: 700, other: 250, pay: "TBB", status: "Delivered" },
    { lr: 7411, date: "2026-07-19", lorry: "GJ-27-BB-1176", to: "Delhi", from: "shubham", cnee: "mehta", pkgs: 40, contents: "Armoured cable drums", actual: 8000, charged: 8000, value: 1240000, rate: 340, freight: 27200, hamali: 850, aoc: 250, advance: 9000, pay: "To Pay", status: "Delivered" },
    { lr: 7412, date: "2026-07-21", lorry: "GJ-12-BM-5567", to: "Indore", from: "vishwa", cnee: "malwa", pkgs: 30, contents: "Machined forgings", actual: 4500, charged: 4500, value: 590000, rate: 295, freight: 13275, hamali: 400, pay: "Paid", status: "Delivered" },
    { lr: 7413, date: "2026-07-23", lorry: "RJ-19-GA-4402", to: "Udaipur", from: "girnar", cnee: "aravalli", pkgs: 24, contents: "Marble tiles — crated", actual: 12000, charged: 12000, value: 430000, rate: 225, freight: 27000, hamali: 900, aoc: 200, pay: "To Pay", status: "Delivered" },
    { lr: 7414, date: "2026-07-25", lorry: "GJ-01-EX-2214", to: "Jaipur", from: "ratna", cnee: "rajagro", pkgs: 180, contents: "Groundnut oil cake — bags", actual: 9000, charged: 9000, value: 288000, rate: 235, freight: 21150, hamali: 800, pay: "TBB", status: "Delivered" },
    { lr: 7415, date: "2026-07-28", lorry: "GJ-04-AL-8830", to: "Delhi", from: "jayhw", cnee: "mehta", pkgs: 52, contents: "Power tool spares", actual: 3120, charged: 3300, value: 512000, rate: 335, freight: 11055, hamali: 450, other: 200, pay: "Paid", status: "In Transit" },
    { lr: 7416, date: "2026-07-30", lorry: "MP-09-HK-3320", to: "Bhopal", from: "unicorn", cnee: "narmadatr", pkgs: 72, contents: "Industrial primer — drums", actual: 7200, charged: 7200, value: 396000, rate: 270, freight: 19440, hamali: 650, advance: 6000, pay: "To Pay", status: "In Transit", risk: "Carrier's Risk" },
    { lr: 7417, date: "2026-08-01", lorry: "PB-10-CT-9945", to: "Ludhiana", from: "shubham", cnee: "satluj", pkgs: 36, contents: "Control cables", actual: 3600, charged: 3600, value: 620000, rate: 390, freight: 14040, hamali: 500, aoc: 150, pay: "To Pay", status: "In Transit" },
    { lr: 7418, date: "2026-08-03", lorry: "GJ-27-BB-1176", to: "Rajkot", from: "tirupati", cnee: "saurashtra", pkgs: 64, contents: "Nuts, bolts & washers", actual: 6400, charged: 6400, value: 348000, rate: 140, freight: 8960, hamali: 400, pay: "Paid", status: "Booked" },
    { lr: 7419, date: "2026-08-04", lorry: "GJ-12-BM-5567", to: "Indore", from: "ambica", cnee: "malwa", pkgs: 88, contents: "Writing & printing paper", actual: 8800, charged: 8800, value: 372000, rate: 275, freight: 24200, hamali: 750, other: 200, advance: 7000, pay: "To Pay", status: "Booked", remarks: "Deliver against original L.R. only." },
    /** A cancelled L.R., kept in the book so the numbering stays unbroken. */
    { lr: 7420, date: "2026-08-04", lorry: "—", to: "Delhi", from: "vishwa", cnee: "mehta", pkgs: 0, contents: "Forged couplings — booking cancelled by party", actual: 0, charged: 0, value: 0, rate: 0, freight: 0, hamali: 0, pay: "TBB", status: "Cancelled", remarks: "Lorry not placed in time. Party released the load to another carrier." },
  ]
)

// ---------------------------------------------------------------------------

const BOOKS: Record<CompanySlug, Book> = {
  "sewak-cargo-movers": SCM_BOOK,
  "sewak-union-roadways": SUR_BOOK,
}

function buildBilties(company: Company, source: Book): Bilty[] {
  return source.rows
    .map((r): Bilty => {
      const consignee = source.consignees[r.cnee]
      const lrNo = String(r.lr)
      return {
        id: `${company.slug}-bilty-${lrNo}`,
        lrNo,
        lrDate: r.date,
        lorryNo: r.lorry,
        from: company.origin,
        to: r.to,
        deliveryAt: consignee.address,
        bookingOffice: company.bookingOffices[0],
        consignor: source.consignors[r.from],
        consignee,
        packages: r.pkgs,
        contents: r.contents,
        actualWeight: r.actual,
        chargedWeight: r.charged,
        declaredValue: r.value,
        rate: r.rate,
        charges: {
          freight: r.freight,
          aoc: r.aoc ?? 0,
          hamali: r.hamali,
          stCharges: r.freight > 0 ? 200 : 0,
          otherCharges: r.other ?? 0,
          advance: r.advance ?? 0,
        },
        paymentType: r.pay,
        status: r.status,
        invoiceNo:
          r.pkgs > 0
            ? `INV/26-27/${source.invoiceBase + r.lr - source.lrFloor}`
            : "",
        eWayBillNo: r.pkgs > 0 ? `${481000000000 + r.lr * 7}` : "",
        risk: r.risk ?? "Owner's Risk",
        insurance: { company: "", policyNo: "", date: "", amount: 0 },
        remarks: r.remarks ?? "",
      }
    })
    .sort((a, b) => (a.lrDate < b.lrDate ? 1 : a.lrDate > b.lrDate ? -1 : 0))
}

// Built once at import, exactly as the single register used to be.
const REGISTERS: Record<CompanySlug, Bilty[]> = {
  "sewak-cargo-movers": buildBilties(COMPANIES["sewak-cargo-movers"], SCM_BOOK),
  "sewak-union-roadways": buildBilties(
    COMPANIES["sewak-union-roadways"],
    SUR_BOOK
  ),
}

/** One firm's L.R. book, newest first. */
export function getSeedBilties(company: CompanySlug): Bilty[] {
  return REGISTERS[company]
}

/** Next number off the firm's book. */
export function nextLrNo(company: CompanySlug, bilties: Bilty[]): string {
  const highest = bilties.reduce(
    (max, b) => Math.max(max, Number(b.lrNo) || 0),
    BOOKS[company].lrFloor
  )
  return String(highest + 1)
}

/** Freight booked per month, for the twelve complete months before the anchor date. */
export function getMonthlyFreight(
  company: CompanySlug
): { month: string; freight: number }[] {
  return BOOKS[company].monthlyFreight
}

/** Fleet on the road — used by the dashboard tiles. */
export function getFleet(company: CompanySlug): {
  owned: number
  attached: number
} {
  return BOOKS[company].fleet
}
