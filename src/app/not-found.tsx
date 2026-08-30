import Link from "next/link"

import { Button } from "@/components/ui/button"
import { COMPANY_LIST } from "@/lib/companies"

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Nothing at this address
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The link may name a firm we keep no books for. Open one of these
          instead.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {COMPANY_LIST.map((company) => (
          <Button
            key={company.slug}
            variant="outline"
            // Renders an <a>, so the primitive must not assume a <button>.
            nativeButton={false}
            render={<Link href={`/${company.slug}/dashboard`} />}
          >
            {company.name}
          </Button>
        ))}
      </div>
    </main>
  )
}
