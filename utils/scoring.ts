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
    'nautilus': 'Nautilus™',
    'market_core': 'Market Core Pro™',
    'market_waves': 'Market Waves Pro™'
  }
  
  return indicatorMap[simplifiedIndicator] || simplifiedIndicator
}

/**
 * Normalize ticker names for matching (handles both BTC and BTCUSD formats)
 */
function normalizeTicker(ticker: string): string {
  // Remove USD suffix and convert to uppercase
  return ticker.replace(/USD$/, '').toUpperCase()
}

/**
 * Generate scoring data from alerts and strategies - Only show triggered actions
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
    const alertTime = new Date(alert.timestamp)
    return alertTime >= timeWindowAgo
  })

  // Group recent alerts by normalized ticker
  const alertsByTicker = new Map<string, Alert[]>()
  recentAlerts.forEach(alert => {
    const normalizedTicker = normalizeTicker(alert.ticker)
    if (!alertsByTicker.has(normalizedTicker)) {
      alertsByTicker.set(normalizedTicker, [])
    }
    alertsByTicker.get(normalizedTicker)!.push(alert)
  })
  
  console.log(`📋 Scanning ${recentAlerts.length} recent alerts across ${alertsByTicker.size} tickers`)

  const triggeredActions: TickerScore[] = []
  let lastAction: LastAction | undefined

  // Check each strategy against each ticker to find triggered actions
  for (const strategy of activeStrategies) {
    const hasRuleGroups = strategy.rule_groups && strategy.rule_groups.length > 0
    
    if (!hasRuleGroups && (!strategy.rules || strategy.rules.length === 0)) continue

    console.log(`🔍 Checking strategy: ${strategy.name}`)

    // Check each ticker for this strategy
    for (const [ticker, tickerAlerts] of alertsByTicker) {
      let strategyCompleted = false
      let foundAlerts: Alert[] = []

      if (hasRuleGroups) {
        // Handle rule groups with AND/OR operators
        let anyGroupMatched = false
        const allFoundInGroups: Alert[] = []

        for (const group of strategy.rule_groups) {
          const groupAlerts = group.alerts.map((alert: any) => ({
            indicator: alert.indicator,
            trigger: alert.name
          }))

          if (group.operator === 'OR') {
            // OR group: at least one alert must be found
            let foundInGroup = false
            
            for (const required of groupAlerts) {
              const fullIndicatorName = mapIndicatorName(required.indicator)
              const found = tickerAlerts.find(alert => 
                alert.indicator === fullIndicatorName && 
                alert.trigger === required.trigger
              )
              
              if (found) {
                foundInGroup = true
                allFoundInGroups.push(found)
                break // Only need one for OR
              }
            }

            if (foundInGroup) {
              anyGroupMatched = true // This group satisfied the strategy
            }

          } else {
            // AND group: all alerts must be found
            let allFoundInGroup = true
            const groupFoundAlerts: Alert[] = []

            for (const required of groupAlerts) {
              const fullIndicatorName = mapIndicatorName(required.indicator)
              const found = tickerAlerts.find(alert => 
                alert.indicator === fullIndicatorName && 
                alert.trigger === required.trigger
              )
              
              if (found) {
                groupFoundAlerts.push(found)
              } else {
                allFoundInGroup = false
                break
              }
            }

            if (allFoundInGroup) {
              allFoundInGroups.push(...groupFoundAlerts)
              anyGroupMatched = true // This group satisfied the strategy
            }
          }
        }

        strategyCompleted = anyGroupMatched
        foundAlerts = allFoundInGroups

      } else {
        // Fallback to simple rules (all AND)
        const requiredAlerts = strategy.rules.map((rule: any) => ({
          indicator: rule.indicator,
          trigger: rule.trigger
        }))

        let allFound = true
        for (const required of requiredAlerts) {
          const fullIndicatorName = mapIndicatorName(required.indicator)
          const found = tickerAlerts.find(alert => 
            alert.indicator === fullIndicatorName && 
            alert.trigger === required.trigger
          )
          
          if (found) {
            foundAlerts.push(found)
          } else {
            allFound = false
            break
          }
        }

        strategyCompleted = allFound
      }

      // Only add if strategy is completed (triggered)
      if (strategyCompleted && foundAlerts.length > 0) {
        // Determine action
        let action: "Buy" | "Sell"
        const strategyName = strategy.name.toLowerCase()
        
        if (strategyName.includes('buy') || strategyName.includes('discount') || strategy.threshold > 0) {
          action = "Buy"
        } else if (strategyName.includes('sell') || strategyName.includes('premium') || strategy.threshold < 0) {
          action = "Sell"
        } else {
          const score = foundAlerts.reduce((sum, alert) => sum + alert.weight, 0)
          action = score >= 0 ? "Buy" : "Sell"
        }

        const triggeredAction = `${action} triggered`
        
        console.log(`🎯 TRIGGERED: ${strategy.name} for ${ticker} → ${triggeredAction}`)
        
        // Add to triggered actions
        triggeredActions.push({
          strategy: strategy.name,
          ticker: ticker,
          timeframe: `${strategy.timeframe}m`,
          timestamp: new Date().toLocaleTimeString(),
          alertsFound: foundAlerts.map(a => a.trigger),
          missingAlerts: [triggeredAction],
          score: foundAlerts.reduce((sum, alert) => sum + alert.weight, 0)
        })

        // Set as last action if we don't have one yet
        if (!lastAction) {
          lastAction = {
            action,
            ticker: ticker,
            strategy: strategy.name
          }
        }
      }
    }
  }

  // Sort by most recent (latest timestamp first)
  triggeredActions.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  console.log(`🎯 Found ${triggeredActions.length} triggered actions`)

  return {
    tickerData: triggeredActions,
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