import type { Metadata } from "next"

import { BiltyRegister } from "@/components/bilty/bilty-register"

export const metadata: Metadata = {
  title: "Bilty Register — Sewak Cargo Movers",
}

export default function BiltyPage() {
  return <BiltyRegister />
}
