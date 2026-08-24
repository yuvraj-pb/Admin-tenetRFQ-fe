import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { QueryProvider } from "@/lib/query/provider"
import { Toaster } from "sonner"

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  display: "swap",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "TenetRFQ Control Plane",
  description: "Enterprise tenant operations — organizations, plans, subscriptions, and billing.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  )
}
