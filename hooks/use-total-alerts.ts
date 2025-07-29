"use client"

import { useState, useEffect } from "react"
import { useConfig } from "./use-config"

export function useTotalAlerts() {
  const { config } = useConfig()
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!config) return

    const fetchTotalCount = async () => {
      try {
        const response = await fetch(`${config.apiBase}/alerts/count`)
        const data = await response.json()
        setTotalCount(data.count || 0)
        setLoading(false)
      } catch (error) {
        console.error("Failed to fetch total alerts count:", error)
        setTotalCount(0)
        setLoading(false)
      }
    }

    fetchTotalCount()
    const interval = setInterval(fetchTotalCount, config.pollIntervalMs)

    return () => clearInterval(interval)
  }, [config])

  return { totalCount, loading }
}