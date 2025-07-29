"use client"

import { useState, useEffect } from "react"
import { useConfig } from "./use-config"

export interface Alert {
  id: string
  time: string
  timestamp: string // Full ISO timestamp for calculations
  ticker: string
  timeframe: string
  indicator: string
  trigger: string
  weight: number
}

export interface Score {
  score: number
  status: "BUY" | "SELL" | "NEUTRAL"
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

export function useTradingData(timeWindowMinutes: number = 60) {
  const { config } = useConfig()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [score, setScore] = useState<Score>({ score: 0, status: "NEUTRAL" })
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!config) return

    const fetchData = async () => {
      try {
        // Fetch real alerts from backend API
        const alertsResponse = await fetch(`${config.apiBase}/alerts`)
        const alertsData = await alertsResponse.json()
        
        // Fetch available alerts to get weights
        const availableAlertsResponse = await fetch(`${config.apiBase}/available-alerts`)
        const availableAlertsData = await availableAlertsResponse.json()
        
        // Create a lookup map for weights
        const weightMap = new Map<string, number>()
        availableAlertsData.forEach((availableAlert: any) => {
          const key = `${availableAlert.indicator}|${availableAlert.trigger}`
          weightMap.set(key, availableAlert.weight)
        })

        // Transform backend data to frontend format with real weights
        const transformedAlerts: Alert[] = alertsData.map((alert: any) => {
          const key = `${alert.indicator}|${alert.trigger}`
          const weight = weightMap.get(key) || 0
          
          return {
            id: alert.id,
            time: new Date(alert.timestamp).toLocaleTimeString(),
            timestamp: alert.timestamp, // Keep full timestamp for calculations
            ticker: alert.ticker,
            timeframe: alert.timeframe || '15m', // Default to 15m if not set
            indicator: alert.indicator,
            trigger: alert.trigger,
            weight: weight
          }
        })

        // Fetch score data from backend with time window parameter
        const scoreResponse = await fetch(`${config.apiBase}/score?timeWindow=${timeWindowMinutes}`)
        const scoreData = await scoreResponse.json()
        
        let currentScore: Score = { score: 0, status: "NEUTRAL" }
        if (scoreData.scores && scoreData.scores.length > 0) {
          const latestScore = scoreData.scores[0].score
          currentScore = {
            score: latestScore,
            status: latestScore > 3 ? "SELL" : latestScore < -3 ? "BUY" : "NEUTRAL"
          }
        }

        // Fetch strategies from backend
        const strategiesResponse = await fetch(`${config.apiBase}/strategies`)
        const strategiesData = await strategiesResponse.json()
        
        const transformedStrategies: Strategy[] = strategiesData.map((strategy: any) => ({
          id: strategy.id,
          name: strategy.name,
          rule: `Timeframe: ${strategy.timeframe}m | Threshold: ${strategy.threshold}`,
          metrics: { netPL: 0, winRate: 0, drawdown: 0 } // Real metrics would come from actions table
        }))

        setAlerts(transformedAlerts)
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
  }, [config, timeWindowMinutes])

  return { alerts, score, strategies, loading }
}
