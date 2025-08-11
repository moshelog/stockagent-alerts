"use client"

import { useState, useEffect } from "react"
import { useConfig } from "./use-config"
import { authenticatedFetch } from "@/utils/api"
import { filterAlertsByTimeframe } from "@/utils/alertFiltering"

export interface Alert {
  id: string
  time: string
  timestamp: string // Full ISO timestamp for calculations
  ticker: string
  timeframe: string
  indicator: string
  trigger: string
  weight: number
  htf?: string // Higher timeframe data
}

export interface Score {
  score: number
  status: "BUY" | "SELL" | "NEUTRAL"
  lastAction?: {
    action: string
    ticker: string
    strategy_name?: string
    timestamp?: string
  } | null
}

export interface Strategy {
  id: string
  name: string
  rule: string
  metrics: {
    netPL: number
    winRate: number
    drawdown: number
  }
}

export function useTradingData(timeWindowMinutes: number = 60, alertConfig?: any) {
  const { config } = useConfig()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [score, setScore] = useState<Score>({ score: 0, status: "NEUTRAL" })
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!config) return

    const fetchData = async () => {
      try {
        // Fetch real alerts from backend API with extended time window to support all timeframe overrides
        // Use 60-minute window to ensure we capture alerts for all configured timeframes
        const alertsResponse = await authenticatedFetch(`${config.apiBase}/alerts?timeWindow=60`)
        if (!alertsResponse.ok) {
          throw new Error(`Failed to fetch alerts: ${alertsResponse.status}`)
        }
        const alertsData = await alertsResponse.json()
        
        // Create a lookup map for weights
        const weightMap = new Map<string, number>()
        
        if (alertConfig && typeof alertConfig === 'object' && Object.keys(alertConfig).length > 0) {
          // Use current alertConfig if provided (real-time weights)
          try {
            Object.entries(alertConfig).forEach(([indicator, alerts]: [string, any]) => {
              if (Array.isArray(alerts) && alerts.length > 0) {
                const indicatorName = {
                  'nautilus': 'Nautilus™',
                  'market_core': 'Market Core Pro™', 
                  'market_waves': 'Market Waves Pro™',
                  'extreme_zones': 'Extreme Zones'
                }[indicator] || indicator
                
                alerts.forEach((alert: any) => {
                  if (alert && alert.name && typeof alert.weight === 'number') {
                    const key = `${indicatorName}|${alert.name}`
                    weightMap.set(key, alert.weight)
                  }
                })
              }
            })
          } catch (error) {
            console.warn('Error processing alertConfig, falling back to API:', error)
          }
        }
        
        // Always fallback to API if alertConfig is not available or failed to process
        if (weightMap.size === 0) {
          try {
            const availableAlertsResponse = await authenticatedFetch(`${config.apiBase}/available-alerts`)
            const availableAlertsData = await availableAlertsResponse.json()
            
            availableAlertsData.forEach((availableAlert: any) => {
              if (availableAlert && availableAlert.indicator && availableAlert.trigger) {
                const key = `${availableAlert.indicator}|${availableAlert.trigger}`
                weightMap.set(key, availableAlert.weight || 0)
              }
            })
          } catch (error) {
            console.error('Failed to fetch available alerts for weights:', error)
          }
        }

        // Transform backend data to frontend format with real weights
        const transformedAlerts: Alert[] = alertsData.map((alert: any) => {
          // Handle indicator name variations (both directions)
          const normalizeIndicator = (indicator: string) => {
            const mapping: { [key: string]: string } = {
              // From alerts table to available_alerts table format
              'SMC': 'Market Core Pro™',
              'Oscillator': 'Nautilus™',
              'Trend': 'Market Waves Pro™',
              'Zones': 'Extreme Zones',
              // Direct matches
              'Market Core Pro™': 'Market Core Pro™',
              'Nautilus™': 'Nautilus™',
              'Market Waves Pro™': 'Market Waves Pro™',
              'Extreme Zones': 'Extreme Zones'
            }
            return mapping[indicator] || indicator
          }
          
          const normalizedIndicator = normalizeIndicator(alert.indicator)
          
          // Handle trigger name variations
          const normalizeTrigger = (trigger: string) => {
            const mapping: { [key: string]: string } = {
              // Common variations
              'Bullish OB Touch': 'Touching Bullish OB',
              'Bearish OB Touch': 'Touching Bearish OB',
              'Bullish OB Breakout': 'Bullish OB Break',
              'Bearish OB Breakout': 'Bearish OB Break',
              'Bullish Liquidity Grab Crossed': 'Bullish Liquidity Crossed',
              'Bearish Liquidity Grab Crossed': 'Bearish Liquidity Crossed',
              'Bearish Liquidity Grab Created': 'Bearish Liquidity Created',
              'Bullish Liquidity Grab Created': 'Bullish Liquidity Created',
              // Direct matches (most common)
              'Bullish BoS': 'Bullish BoS',
              'Bearish BoS': 'Bearish BoS',
              'Bullish ChoCH': 'Bullish ChoCH',
              'Bearish ChoCH': 'Bearish ChoCH',
              'Bullish FVG Break': 'Bullish FVG Break',
              'Bearish FVG Break': 'Bearish FVG Break',
              'Bullish DipX': 'Bullish DipX',
              'Bearish DipX': 'Bearish DipX'
            }
            return mapping[trigger] || trigger
          }
          
          const normalizedTrigger = normalizeTrigger(alert.trigger)
          const key = `${normalizedIndicator}|${normalizedTrigger}`
          const weight = weightMap.get(key) || 0
          
          // Only log weight lookups for BTCUSDT.P to reduce console noise
          if (alert.ticker === 'BTCUSDT.P') {
            console.log(`🎯 BTCUSDT.P Weight lookup:`, {
              originalIndicator: alert.indicator,
              normalizedIndicator,
              originalTrigger: alert.trigger,
              normalizedTrigger,
              lookupKey: key,
              foundWeight: weight
            })
          }
          
          return {
            id: alert.id,
            time: new Date(alert.timestamp).toLocaleTimeString(),
            timestamp: alert.timestamp, // Keep full timestamp for calculations
            ticker: alert.ticker,
            price: alert.price, // Include price field from API
            timeframe: alert.timeframe || '15m', // Default to 15m if not set
            indicator: alert.indicator,
            trigger: alert.trigger,
            weight: weight,
            htf: alert.htf // Include HTF field from API
          }
        })

        // Fetch score data from backend with time window parameter
        const scoreResponse = await authenticatedFetch(`${config.apiBase}/score?timeWindow=${timeWindowMinutes}`)
        const scoreData = await scoreResponse.json()
        
        console.log('🔍 Raw scoreData from API:', scoreData)
        
        let currentScore: any = { score: 0, status: "NEUTRAL", lastAction: null }
        if (scoreData.scores && scoreData.scores.length > 0) {
          const latestScore = scoreData.scores[0].score
          currentScore = {
            score: latestScore,
            status: latestScore > 3 ? "SELL" : latestScore < -3 ? "BUY" : "NEUTRAL",
            lastAction: scoreData.lastAction || null // Include lastAction from backend
          }
        } else {
          // Even if no scores, include lastAction
          currentScore.lastAction = scoreData.lastAction || null
        }

        // Fetch strategies from backend
        const strategiesResponse = await authenticatedFetch(`${config.apiBase}/strategies`)
        const strategiesData = await strategiesResponse.json()
        
        const transformedStrategies: Strategy[] = strategiesData.map((strategy: any) => ({
          id: strategy.id,
          name: strategy.name,
          rule: `Timeframe: ${strategy.timeframe}m | Threshold: ${strategy.threshold}`,
          metrics: { netPL: 0, winRate: 0, drawdown: 0 } // Real metrics would come from actions table
        }))

        // Apply timeframe filtering before setting alerts
        const filteredAlerts = filterAlertsByTimeframe(transformedAlerts, config.alertTimeframes)
        
        setAlerts(filteredAlerts)
        setScore(currentScore)
        setStrategies(transformedStrategies)
        setLoading(false)
      } catch (error) {
        console.error("Failed to fetch trading data:", error)
        // Fallback to empty data on error
        setAlerts([])
        setScore({ score: 0, status: "NEUTRAL" })
        setStrategies([])
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, config.pollIntervalMs)

    return () => clearInterval(interval)
  }, [config, timeWindowMinutes, alertConfig])

  return { alerts, score, strategies, loading }
}
