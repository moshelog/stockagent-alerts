"use client"

import { useState, useEffect } from "react"

export interface AlertType {
  indicator: string
  trigger: string
  description: string
}

export interface Strategy {
  id: string
  name: string
  summary: string
  rule: string
  enabled: boolean
  threshold: number
  timeframe?: string // Add this optional field
  components: Record<string, number>
  performance: {
    netPL: number
    winRate: number
    maxDrawdown: number
  }
  alertDetails?: Array<{
    id: string
    name: string
    weight: number
    indicator: string
  }>
}

export interface Config {
  apiBase: string
  pollIntervalMs: number
  webhookUrl: string
  weights: Record<string, number>
  alertTypes: Record<string, AlertType>
  thresholds: {
    buy: number
    sell: number
  }
  ai: {
    model: string
    maxTokens: number
    enabled: boolean
  }
  strategies: Strategy[]
  ui: {
    showAlertsTable: boolean
    showScoreMeter: boolean
    showStrategyPanel: boolean
    showWeights: boolean
  }
  scoring: {
    timeWindowMinutes: number
  }
}

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load base config from static file first
      const configResponse = await fetch("/config.json")
      if (!configResponse.ok) {
        throw new Error("Failed to load base configuration")
      }
      
      const baseConfig = await configResponse.json()
      
      // Now try to load user settings from database using the backend URL
      try {
        const settingsResponse = await fetch(`${baseConfig.apiBase.replace('/api', '')}/api/settings`)
        if (settingsResponse.ok) {
          const userSettings = await settingsResponse.json()
          // Merge base config with user settings
          setConfig({ ...baseConfig, ...userSettings })
        } else {
          // Fallback to base config only
          setConfig(baseConfig)
        }
      } catch (settingsError) {
        // If settings API fails, just use base config
        console.warn("Could not load user settings, using defaults:", settingsError)
        setConfig(baseConfig)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (updates: Partial<Config>) => {
    if (!config) return

    const newConfig = { ...config, ...updates }
    setConfig(newConfig)

    // Auto-save to database
    try {
      setSaving(true)
      const response = await fetch(`${newConfig.apiBase.replace('/api', '')}/api/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ui: newConfig.ui,
          scoring: newConfig.scoring
        })
      })

      if (!response.ok) {
        console.error("Failed to save settings:", await response.text())
      }
    } catch (err) {
      console.error("Error saving settings:", err)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  return { config, loading, error, saving, reload: loadConfig, updateConfig }
}
