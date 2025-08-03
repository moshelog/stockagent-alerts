"use client"

import type React from "react"
import { Inter } from "next/font/google"
import Head from "next/head"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/AuthContext"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <Head>
        <title>StockAgent - Trade Smarter with AI-Powered Signals</title>
        <meta name="description" content="Modern dark-mode trading dashboard with AI-powered market signals and real-time analytics" />
        <meta name="generator" content="v0.dev" />
      </Head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
