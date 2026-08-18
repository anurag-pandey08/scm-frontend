const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

const inrPlain = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })

/** ₹1,24,500 — Indian digit grouping. */
export function formatINR(amount: number): string {
  return inr.format(amount)
}

export function formatNumber(value: number): string {
  return inrPlain.format(value)
}

/** ₹8.42L / ₹1.2Cr — for axis ticks and stat tiles where width is tight. */
export function formatINRCompact(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1e7) return `₹${(amount / 1e7).toFixed(2)}Cr`
  if (abs >= 1e5) return `₹${(amount / 1e5).toFixed(2)}L`
  if (abs >= 1e3) return `₹${Math.round(amount / 1e3)}K`
  return `₹${Math.round(amount)}`
}

/** 04 Aug 2026 */
export function formatDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** 17-02-2026 — the books write dates out in full figures, not "17 Feb". */
export function formatDateNumeric(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return y && m && d ? `${d}-${m}-${y}` : iso
}

/** 1,250 kg */
export function formatWeight(kg: number): string {
  return `${inrPlain.format(kg)} kg`
}

export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
}

/** 25 TON / 8.5 TON — the weight column of the freight bill. */
export function formatTonnes(tonnes: number): string {
  return `${Number(tonnes.toFixed(3))} TON`
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
]

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
]

function underHundred(n: number): string {
  if (n < 20) return ONES[n]
  const tens = TENS[Math.floor(n / 10)]
  const ones = ONES[n % 10]
  return ones ? `${tens} ${ones}` : tens
}

function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const parts: string[] = []
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`)
  if (rest) parts.push(underHundred(rest))
  return parts.join(" ")
}

/** Crore, Lac, Thousand — Indian place values, largest first. */
const PLACES: [number, string][] = [
  [1e7, "Crore"],
  [1e5, "Lac"],
  [1e3, "Thousand"],
]

/**
 * "One Lac Thirty Thousand Only" — the line the bill book writes out under the
 * total, so the figure cannot be altered after the bill leaves the office.
 */
export function amountInWords(amount: number): string {
  const value = Math.abs(amount)
  const rupees = Math.floor(value)
  const paise = Math.round((value - rupees) * 100)
  if (rupees === 0 && paise === 0) return "Zero Only"

  const words: string[] = []
  let left = rupees
  for (const [place, name] of PLACES) {
    const count = Math.floor(left / place)
    if (count > 0) {
      words.push(`${underThousand(count)} ${name}`)
      left -= count * place
    }
  }
  if (left > 0) words.push(underThousand(left))
  if (paise > 0) words.push(`and ${underHundred(paise)} Paise`)

  return `${amount < 0 ? "Minus " : ""}${words.join(" ")} Only`
}
