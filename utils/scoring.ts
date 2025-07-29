import { Alert } from '@/hooks/use-trading-data'
import { Strategy } from '@/hooks/use-strategies'

export interface TickerScore {
  strategy: string
  ticker: string
  timeframe: string
  timestamp: string
  alertsFound: string[]
  missingAlerts: string[]
  score: number
}

export interface LastAction {
  action: "Buy" | "Sell"
  ticker: string
  strategy: string
}

/**
 * Map simplified indicator names to full names (matches backend)
 */
function mapIndicatorName(simplifiedIndicator: string): string {
  const indicatorMap: { [key: string]: string } = {
    'extreme_zones': 'Extreme Zones',
    'nautilus': 'Oscillator',
    'market_core': 'SMC',
    'market_waves': 'Waves'
  }
  
  return indicatorMap[simplifiedIndicator] || simplifiedIndicator
}

/**
 * Generate scoring data from alerts and strategies
 */
export function generateScoringData(
  alerts: Alert[],
  strategies: Strategy[],
  timeWindowMinutes: number = 60
): {
  tickerData: TickerScore[]
  lastAction: LastAction | undefined
} {
  // Get only enabled strategies
  const activeStrategies = strategies.filter(s => s.enabled)
  
  if (activeStrategies.length === 0) {
    return {
      tickerData: [],
      lastAction: undefined
    }
  }

  // Filter alerts to only include those from the specified time window
  const timeWindowAgo = new Date(Date.now() - timeWindowMinutes * 60 * 1000)
  const recentAlerts = alerts.filter(alert => {
    // Use the full timestamp for accurate comparison
    const alertTime = new Date(alert.timestamp)
    return alertTime >= timeWindowAgo
  })

  // Group recent alerts by ticker
  const alertsByTicker = new Map<string, Alert[]>()
  recentAlerts.forEach(alert => {
    if (!alertsByTicker.has(alert.ticker)) {
      alertsByTicker.set(alert.ticker, [])
    }
    alertsByTicker.get(alert.ticker)!.push(alert)
  })

  const strategyScores: TickerScore[] = []
  let lastAction: LastAction | undefined

  // Process each active strategy (one row per strategy)
  for (const strategy of activeStrategies) {
    if (!strategy.rules || strategy.rules.length === 0) continue

    const requiredAlerts = strategy.rules.map(rule => ({
      indicator: rule.indicator,
      trigger: rule.trigger
    }))

    // Find the ticker with the most matching alerts for this strategy
    let bestTicker = 'N/A'
    let maxMatches = 0
    let bestFoundAlerts: string[] = []
    let bestMissingAlerts: string[] = []
    let bestScore = 0

    for (const [ticker, tickerAlerts] of alertsByTicker) {
      const foundAlerts: Alert[] = []
      const missingAlerts: string[] = []

      for (const required of requiredAlerts) {
        // Map the simplified indicator name to the full name used in alerts
        const fullIndicatorName = mapIndicatorName(required.indicator)
        
        const found = tickerAlerts.find(alert => 
          alert.indicator === fullIndicatorName && 
          alert.trigger === required.trigger
        )
        
        if (found) {
          foundAlerts.push(found)
        } else {
          missingAlerts.push(required.trigger)
        }
      }

      // If this ticker has more matches for this strategy, use it
      if (foundAlerts.length > maxMatches) {
        maxMatches = foundAlerts.length
        bestTicker = ticker
        bestFoundAlerts = foundAlerts.map(a => a.trigger)
        bestMissingAlerts = missingAlerts
        bestScore = foundAlerts.reduce((sum, alert) => sum + alert.weight, 0)

        // Check if this strategy is complete and should generate an action
        if (missingAlerts.length === 0 && foundAlerts.length > 0 && !lastAction) {
          // Check if this triggers an action based on threshold
          const crossesThreshold = 
            (strategy.threshold > 0 && bestScore >= strategy.threshold) ||
            (strategy.threshold < 0 && bestScore <= strategy.threshold) ||
            (strategy.threshold === 0 && Math.abs(bestScore) >= 2) // Default threshold for neutral

          if (crossesThreshold) {
            // Determine action based on score and threshold
            let action: "Buy" | "Sell"
            if (strategy.threshold > 0) {
              action = "Sell" // Positive threshold = sell signal
            } else if (strategy.threshold < 0) {
              action = "Buy" // Negative threshold = buy signal  
            } else {
              action = bestScore > 0 ? "Buy" : "Sell" // Score-based for neutral threshold
            }

            lastAction = {
              action,
              ticker: bestTicker,
              strategy: strategy.name
            }
          }
        }
      }
    }

    // Only add this strategy to the results if it has at least one matching alert
    if (bestTicker !== 'N/A' && maxMatches > 0) {
      strategyScores.push({
        strategy: strategy.name,
        ticker: bestTicker,
        timeframe: `${strategy.timeframe}m`,
        timestamp: new Date().toLocaleTimeString(), // Current time for when this was calculated
        alertsFound: bestFoundAlerts,
        missingAlerts: bestMissingAlerts,
        score: bestScore
      })
    }
  }

  // Sort by number of found alerts (most complete strategies first)
  strategyScores.sort((a, b) => b.alertsFound.length - a.alertsFound.length)

  return {
    tickerData: strategyScores,
    lastAction
  }
}

/**
 * Get the most recent action from the backend score endpoint
 */
export function extractLastActionFromScore(scoreData: any): LastAction | undefined {
  console.log('🔍 extractLastActionFromScore called with:', scoreData)
  
  if (scoreData?.lastAction) {
    const extractedAction = {
      action: scoreData.lastAction.action,
      ticker: scoreData.lastAction.ticker,
      strategy: scoreData.lastAction.strategy_name || 'Unknown Strategy'
    }
    console.log('✅ Extracted action:', extractedAction)
    return extractedAction
  }
  
  console.log('❌ No lastAction found in scoreData')
  return undefined
}