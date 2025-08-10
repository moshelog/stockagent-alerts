interface Alert {
  id: string
  time: string
  ticker: string
  price?: number
  timeframe: string
  indicator: string
  trigger: string
  weight: number
  timestamp?: string
}

interface AlertTimeframeConfig {
  globalDefault: number // minutes
  overrides: Record<string, number> // timeframe -> minutes
}

/**
 * Filter alerts based on timeframe window settings
 * Removes alerts that are older than the configured window for their timeframe
 */
export function filterAlertsByTimeframe(
  alerts: Alert[],
  alertTimeframes?: AlertTimeframeConfig
): Alert[] {
  if (!alertTimeframes || !alerts.length) {
    return alerts
  }

  const now = new Date()
  
  return alerts.filter(alert => {
    // Get the timeframe window in minutes
    const timeframeWindow = alertTimeframes.overrides[alert.timeframe] || alertTimeframes.globalDefault
    const windowMs = timeframeWindow * 60 * 1000 // Convert to milliseconds
    
    // Parse the alert timestamp
    const alertTime = new Date(alert.timestamp || alert.time)
    
    // Check if alert is within the allowed window
    const timeDiff = now.getTime() - alertTime.getTime()
    
    return timeDiff <= windowMs
  })
}

/**
 * Get alerts that are about to expire (within 30 seconds of expiry)
 * These should be displayed with faded styling before being removed
 */
export function getExpiringAlerts(
  alerts: Alert[],
  alertTimeframes?: AlertTimeframeConfig
): Alert[] {
  if (!alertTimeframes || !alerts.length) {
    return []
  }

  const now = new Date()
  const fadeWindowMs = 30 * 1000 // 30 seconds before expiry
  
  return alerts.filter(alert => {
    const timeframeWindow = alertTimeframes.overrides[alert.timeframe] || alertTimeframes.globalDefault
    const windowMs = timeframeWindow * 60 * 1000
    const alertTime = new Date(alert.timestamp || alert.time)
    const timeDiff = now.getTime() - alertTime.getTime()
    
    // Alert is expiring if it's within 30 seconds of the window limit
    return timeDiff > (windowMs - fadeWindowMs) && timeDiff <= windowMs
  })
}

/**
 * Group alerts by ticker and timeframe
 */
export interface AlertGroup {
  key: string
  ticker: string
  timeframe: string
  alerts: Alert[]
}

export function groupAlertsByTickerAndTimeframe(alerts: Alert[]): AlertGroup[] {
  const groups: Record<string, AlertGroup> = {}
  
  alerts.forEach(alert => {
    const key = `${alert.ticker}-${alert.timeframe}`
    
    if (!groups[key]) {
      groups[key] = {
        key,
        ticker: alert.ticker,
        timeframe: alert.timeframe,
        alerts: []
      }
    }
    
    groups[key].alerts.push(alert)
  })

  // Sort alerts within each group by timestamp (newest first)
  Object.values(groups).forEach(group => {
    group.alerts.sort((a, b) => {
      const aTime = new Date(a.timestamp || a.time).getTime()
      const bTime = new Date(b.timestamp || b.time).getTime()
      return bTime - aTime
    })
  })

  // Sort groups alphabetically by ticker, then by timeframe
  return Object.values(groups).sort((a, b) => {
    if (a.ticker !== b.ticker) {
      return a.ticker.localeCompare(b.ticker)
    }
    
    // Sort timeframes in logical order
    const timeframeOrder = ['1m', '5m', '15m', '1h', '4h', '1d']
    const aIndex = timeframeOrder.indexOf(a.timeframe)
    const bIndex = timeframeOrder.indexOf(b.timeframe)
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    }
    
    return a.timeframe.localeCompare(b.timeframe)
  })
}

/**
 * Get human-readable time remaining for an alert before it expires
 */
export function getTimeUntilExpiry(
  alert: Alert,
  alertTimeframes?: AlertTimeframeConfig
): string {
  if (!alertTimeframes) {
    return 'Unknown'
  }

  const timeframeWindow = alertTimeframes.overrides[alert.timeframe] || alertTimeframes.globalDefault
  const windowMs = timeframeWindow * 60 * 1000
  const alertTime = new Date(alert.timestamp || alert.time)
  const now = new Date()
  const timeDiff = now.getTime() - alertTime.getTime()
  const remaining = windowMs - timeDiff

  if (remaining <= 0) {
    return 'Expired'
  }

  const remainingMinutes = Math.floor(remaining / (60 * 1000))
  const remainingSeconds = Math.floor((remaining % (60 * 1000)) / 1000)

  if (remainingMinutes > 0) {
    return `${remainingMinutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}