import type { MetadataRoute } from "next"

import { COMPANY_LIST } from "@/lib/companies"

/**
 * What the browser installs the office's copy of the app from.
 *
 * The two firms share one installed app rather than getting one each: it is one
 * office, one desk and one set of books kept side by side, and the switcher is
 * how you move between them. They get a shortcut apiece instead, so a long
 * press on the icon opens straight into either book.
 *
 * `start_url` is `/`, which redirects to whichever firm was last open — the
 * same landing the browser tab gives you.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sewak Transport — Operations",
    short_name: "Sewak",
    description:
      "Bilty register, freight bills, loading slips and consignment analytics for the Sewak transport firms.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "en-IN",
    dir: "ltr",
    categories: ["business", "productivity"],
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Android masks icons to whatever shape the launcher uses, and crops
      // anything outside the middle. These two keep the lorry well inside it.
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: COMPANY_LIST.map((company) => ({
      name: `${company.name} — Bilty Register`,
      short_name: company.monogram,
      description: `Open the lorry receipt book for ${company.name}`,
      url: `/${company.slug}/bilty`,
    })),
  }
}
