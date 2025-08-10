"use client"

import { useState, useEffect } from "react"
import { authenticatedFetch } from "@/utils/api"

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
    showVisualColors: boolean
  }
  scoring: {
    timeWindowMinutes: number
  }
  alertTimeframes: {
    globalDefault: number // minutes
    overrides: Record<string, number> // timeframe -> minutes
  }
}

// Helper function to construct API URLs consistently
function constructApiUrl(apiBase: string, endpoint: string): string {
  let baseUrl = apiBase
  // Remove /api suffix if present
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4)
  }
  // Ensure it's a full URL
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  return `${baseUrl}${endpoint}`
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
        const settingsUrl = constructApiUrl(baseConfig.apiBase, '/api/settings')
        console.log('📥 Loading settings from URL:', settingsUrl)
        const settingsResponse = await authenticatedFetch(settingsUrl)
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
      
      const settingsUrl = constructApiUrl(newConfig.apiBase, '/api/settings')
      console.log('🔄 Saving settings to URL:', settingsUrl)
      console.log('🔄 Settings data:', { ui: newConfig.ui, scoring: newConfig.scoring })
      
      const response = await authenticatedFetch(settingsUrl, {
        method: "POST",
        body: JSON.stringify({
          ui: newConfig.ui,
          scoring: newConfig.scoring || { timeWindowMinutes: 60 },
          alertTimeframes: newConfig.alertTimeframes || {
            globalDefault: 30,
            overrides: {}
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Failed to save settings:", response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      } else {
        const result = await response.json()
        console.log('✅ Settings saved successfully:', result)
      }
    } catch (err) {
      console.error("❌ Error saving settings:", err)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  return { config, loading, error, saving, reload: loadConfig, updateConfig }
}
