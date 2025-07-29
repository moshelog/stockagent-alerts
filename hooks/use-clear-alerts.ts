"use client"

import { useState } from "react"
import { useConfig } from "./useConfig"

export function useClearAlerts() {
  const { config } = useConfig()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearAlerts = async () => {
    if (!config) {
      throw new Error("Configuration not loaded")
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${config.apiBase}/alerts`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to clear alerts')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    clearAlerts,
    loading,
    error,
  }
}