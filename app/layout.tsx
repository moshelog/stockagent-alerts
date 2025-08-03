import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import dynamic from "next/dynamic"

const ClientAuthProvider = dynamic(
  () => import("@/components/ClientAuthProvider"),
  { ssr: false }
)

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "StockAgent - Trade Smarter with AI-Powered Signals",
  description: "Modern dark-mode trading dashboard with AI-powered market signals and real-time analytics",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ClientAuthProvider>
          {children}
        </ClientAuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
