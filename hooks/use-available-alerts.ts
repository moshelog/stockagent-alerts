"use client"

import { useState, useEffect } from "react"
import { useConfig } from "./use-config"

interface Alert {
  id: string
  name: string
  weight: number
}

interface AlertConfig {
  nautilus: Alert[]
  market_core: Alert[]
  market_waves: Alert[]
  extreme_zones: Alert[]
}

export function useAvailableAlerts() {
  const { config } = useConfig()
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    nautilus: [],
    market_core: [],
    market_waves: [],
    extreme_zones: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!config) return

    const fetchAvailableAlerts = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${config.apiBase}/available-alerts`)
        const data = await response.json()

        // Transform API data to component format
        const transformed: AlertConfig = {
          nautilus: [],
          market_core: [],
          market_waves: [],
          extreme_zones: []
        }

        data.forEach((alert: any) => {
          const alertObj = {
            id: alert.trigger.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            name: alert.trigger,
            weight: alert.weight
          }

          // Map indicators to keys
          switch (alert.indicator) {
            case "Nautilus™":
              transformed.nautilus.push(alertObj)
              break
            case "Market Core Pro™":
              transformed.market_core.push(alertObj)
              break
            case "Market Waves Pro™":
              transformed.market_waves.push(alertObj)
              break
            case "Extreme Zones":
              transformed.extreme_zones.push(alertObj)
              break
          }
        })

        setAlertConfig(transformed)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch available alerts:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch available alerts')
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableAlerts()
  }, [config])

  const updateWeight = async (alertId: string, weight: number) => {
    if (!config) return

    try {
      // Find the alert in our local state to get the full trigger name
      let foundAlert: any = null
      let indicatorName = ""

      Object.entries(alertConfig).forEach(([indicator, alerts]) => {
        const alert = alerts.find(a => a.id === alertId)
        if (alert) {
          foundAlert = alert
          // Map back to API indicator names
          switch (indicator) {
            case "nautilus":
              indicatorName = "Nautilus™"
              break
            case "market_core":
              indicatorName = "Market Core Pro™"
              break
            case "market_waves":
              indicatorName = "Market Waves Pro™"
              break
            case "extreme_zones":
              indicatorName = "Extreme Zones"
              break
          }
        }
      })

      if (!foundAlert) return

      // Find the database ID by matching indicator + trigger
      const availableAlertsResponse = await fetch(`${config.apiBase}/available-alerts`)
      const availableAlerts = await availableAlertsResponse.json()
      const dbAlert = availableAlerts.find((a: any) => 
        a.indicator === indicatorName && a.trigger === foundAlert.name
      )

      if (dbAlert) {
        // Update in database
        await fetch(`${config.apiBase}/available-alerts/${dbAlert.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ weight })
        })

        // Update local state - find which indicator category this alert belongs to
        setAlertConfig(prev => {
          const updatedConfig = { ...prev }
          
          // Find which indicator category contains this alert
          Object.entries(updatedConfig).forEach(([indicator, alerts]) => {
            const alertIndex = alerts.findIndex(alert => alert.id === alertId)
            if (alertIndex !== -1) {
              updatedConfig[indicator as keyof AlertConfig] = alerts.map(alert => 
                alert.id === alertId ? { ...alert, weight } : alert
              )
            }
          })
          
          return updatedConfig
        })
      }
    } catch (err) {
      console.error('Failed to update alert weight:', err)
    }
  }

  return { alertConfig, loading, error, updateWeight }
}