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
        console.log(`📡 Fetching available alerts from: ${config.apiBase}/available-alerts`)
        const response = await fetch(`${config.apiBase}/available-alerts`)
        const data = await response.json()

        console.log(`📋 Raw API data (first 3):`, data.slice(0, 3))

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

          console.log(`🔄 Processing alert:`, { 
            indicator: alert.indicator, 
            trigger: alert.trigger, 
            weight: alert.weight,
            generatedId: alertObj.id 
          })

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

        console.log(`📊 Transformed data:`, {
          nautilus: transformed.nautilus.length,
          market_core: transformed.market_core.length,
          market_waves: transformed.market_waves.length,
          extreme_zones: transformed.extreme_zones.length
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

    console.log(`🔄 updateWeight called:`, { alertId, weight })

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

      console.log(`🔍 Found alert:`, { foundAlert, indicatorName })

      if (!foundAlert) {
        console.error(`❌ Alert not found in local state:`, alertId)
        return
      }

      // Find the database ID by matching indicator + trigger
      console.log(`📡 Fetching available alerts from API...`)
      const availableAlertsResponse = await fetch(`${config.apiBase}/available-alerts`)
      const availableAlerts = await availableAlertsResponse.json()
      console.log(`📋 Available alerts from API:`, availableAlerts.slice(0, 3))
      
      const dbAlert = availableAlerts.find((a: any) => 
        a.indicator === indicatorName && a.trigger === foundAlert.name
      )

      console.log(`🎯 Database alert match:`, dbAlert)

      if (dbAlert) {
        console.log(`📤 Updating database with weight: ${weight}`)
        // Update in database
        const updateResponse = await fetch(`${config.apiBase}/available-alerts/${dbAlert.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ weight })
        })

        console.log(`📥 Update response:`, { 
          status: updateResponse.status, 
          ok: updateResponse.ok 
        })

        if (!updateResponse.ok) {
          throw new Error(`Failed to update: ${updateResponse.status}`)
        }

        // Update local state - find which indicator category this alert belongs to
        setAlertConfig(prev => {
          const updatedConfig = { ...prev }
          
          // Find which indicator category contains this alert
          Object.entries(updatedConfig).forEach(([indicator, alerts]) => {
            const alertIndex = alerts.findIndex(alert => alert.id === alertId)
            if (alertIndex !== -1) {
              console.log(`💾 Updating local state for ${indicator}:${alertId} to weight ${weight}`)
              updatedConfig[indicator as keyof AlertConfig] = alerts.map(alert => 
                alert.id === alertId ? { ...alert, weight } : alert
              )
            }
          })
          
          return updatedConfig
        })

        console.log(`✅ Weight update completed`)
      } else {
        console.error(`❌ Database alert not found:`, { indicatorName, triggerName: foundAlert.name })
      }
    } catch (err) {
      console.error('Failed to update alert weight:', err)
    }
  }

  return { alertConfig, loading, error, updateWeight }
}