/** Firm details, taken from the printed LR book. */
export const COMPANY = {
  name: "Sewak Cargo Movers",
  tagline: "Transport Contractors & Fleet Owner",
  address:
    "40, Sarthi Complex, First Floor, Nr. Bileshwar Complex, Opp. G.V.M.M., Odhav, Ahmedabad-382415",
  /** The two books were printed with different addresses. Both are in use. */
  emails: {
    /** On the L.R. book */
    lr: "sewakcargomovers@gmail.com",
    /** On the bill book — the older union roadways address */
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
} as const

export const BOOKING_OFFICES = [
  "Odhav, Ahmedabad",
  "Naroda, Ahmedabad",
  "Rakhial, Ahmedabad",
] as const

export const STATIONS = [
  "Ahmedabad",
  "Bengaluru",
  "Bhiwandi",
  "Delhi",
  "Hyderabad",
  "Indore",
  "Jaipur",
  "Kolkata",
  "Mumbai",
  "Nagpur",
  "Pune",
  "Rajkot",
  "Surat",
  "Vadodara",
] as const
