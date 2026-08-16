import type { Metadata } from "next"

import { InvoiceRegister } from "@/components/invoice/invoice-register"

export const metadata: Metadata = {
  title: "Invoices — Sewak Cargo Movers",
}

export default function InvoicesPage() {
  return <InvoiceRegister />
}
