import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

import { ServiceWorker } from "@/components/pwa/service-worker"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// The root layout sits above the firm, so it names none — each page under
// `[company]` titles itself after whichever book it has open.
export const metadata: Metadata = {
  title: "Sewak Transport — Operations",
  description:
    "Bilty register, freight bills and consignment analytics for the Sewak transport firms.",
  applicationName: "Sewak Transport",
  // Installed on an iPhone the app has no browser chrome to fall back on, so
  // it names itself and its own status bar.
  appleWebApp: {
    capable: true,
    title: "Sewak",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  // Nothing here is anyone else's business — it is one office's books.
  robots: { index: false, follow: false },
}

/**
 * Colours the browser and system chrome around the app. Two entries rather than
 * one: installed, the title bar is the only chrome there is, and a white bar
 * over a dark app looks like a fault.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  // Installed, the app should sit under the notch and the home indicator like
  // any other, rather than in a letterboxed strip.
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" />
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  )
}
