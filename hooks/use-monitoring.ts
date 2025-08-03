"use client"

import { useState, useEffect } from "react"
import { useConfig } from "./use-config"
import { authenticatedFetch } from "@/utils/api"

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  uptime: number
  database: {
    connected: boolean
    status: string
  }
  system: {
    memory: {
      rss: number
      heapTotal: number
      heapUsed: number
      unit: string
    }
    uptime: string
    nodeVersion: string
    environment: string
  }
  data: {
    alerts: number
    actions: number
    strategies: number
  }
  version: string
}

export function useMonitoring() {
  const { config } = useConfig()
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    if (!config) return

    try {
      const response = await authenticatedFetch(`${config.apiBase}/health`)
      const data = await response.json()
      
      setHealth(data)
      setError(null)
    } catch (err) {
      console.error('Health check failed:', err)
      setError(err instanceof Error ? err.message : 'Health check failed')
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }

  // Log performance metrics
  const logPerformanceMetric = async (metric: {
    name: string
    value: number
    unit: string
    timestamp?: string
  }) => {
    if (!config || process.env.NODE_ENV !== 'production') return

    try {
      await authenticatedFetch(`${config.apiBase}/client-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metric,
          timestamp: metric.timestamp || new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      })
    } catch (err) {
      console.warn('Failed to log performance metric:', err)
    }
  }

  // Log user action for analytics
  const logUserAction = async (action: {
    type: string
    target: string
    details?: any
  }) => {
    if (!config || process.env.NODE_ENV !== 'production') return

    try {
      await authenticatedFetch(`${config.apiBase}/user-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...action,
          timestamp: new Date().toISOString(),
          url: window.location.href
        })
      })
    } catch (err) {
      console.warn('Failed to log user action:', err)
    }
  }

  useEffect(() => {
    if (!config) return

    // Initial health check
    checkHealth()

    // Set up periodic health checks (every 5 minutes)
    const interval = setInterval(checkHealth, 5 * 60 * 1000)

    // Performance monitoring
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Log page load performance
      const loadComplete = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          logPerformanceMetric({
            name: 'page_load_time',
            value: navigation.loadEventEnd - navigation.fetchStart,
            unit: 'ms'
          })
        }
      }

      if (document.readyState === 'complete') {
        loadComplete()
      } else {
        window.addEventListener('load', loadComplete)
      }
    }

    return () => {
      clearInterval(interval)
    }
  }, [config])

  return {
    health,
    loading,
    error,
    checkHealth,
    logPerformanceMetric,
    logUserAction
  }
}