"use client"

import { useState, useEffect } from "react"

export interface Config {
  apiBase: string
  pollIntervalMs: number
  weights: {
    rsi: number
    macd: number
    bollinger: number
    volume: number
    sentiment: number
  }
  thresholds: {
    buy: number
    sell: number
  }
  ui: {
    showAlertsTable: boolean
    showScoreMeter: boolean
    showStrategyPanel: boolean
  }
}

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/config.json")
      if (!response.ok) {
        throw new Error("Failed to load configuration")
      }
      const data = await response.json()
      setConfig(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  return { config, loading, error, reloadConfig: loadConfig }
}
