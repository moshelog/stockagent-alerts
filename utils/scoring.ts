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
    // Use rule_groups if available, otherwise fall back to rules
    const hasRuleGroups = strategy.rule_groups && strategy.rule_groups.length > 0
    
    if (!hasRuleGroups && (!strategy.rules || strategy.rules.length === 0)) continue

    console.log(`🔍 Processing strategy: ${strategy.name}`)
    if (hasRuleGroups) {
      console.log(`📊 Rule groups:`, strategy.rule_groups)
    } else {
      console.log(`📊 Rules:`, strategy.rules)
    }

    // Find completed strategies first, then best partial matches
    let bestTicker = 'N/A'
    let maxMatches = 0
    let bestFoundAlerts: string[] = []
    let bestMissingAlerts: string[] = []
    let bestScore = 0
    let foundCompleteStrategy = false

    for (const [ticker, tickerAlerts] of alertsByTicker) {
      let strategyCompleted = false
      let foundAlerts: Alert[] = []
      let missingAlerts: string[] = []

      if (hasRuleGroups) {
        // NEW LOGIC: Handle rule groups with AND/OR operators
        let allGroupsMatched = true
        const allFoundInGroups: Alert[] = []
        const allMissingInGroups: string[] = []

        for (const group of strategy.rule_groups) {
          const groupAlerts = group.alerts.map((alert: any) => ({
            indicator: alert.indicator,
            trigger: alert.name
          }))

          if (group.operator === 'OR') {
            // OR group: at least one alert must be found
            let foundInGroup = false
            let groupFoundAlerts: Alert[] = []
            
            for (const required of groupAlerts) {
              const fullIndicatorName = mapIndicatorName(required.indicator)
              const found = tickerAlerts.find(alert => 
                alert.indicator === fullIndicatorName && 
                alert.trigger === required.trigger
              )
              
              if (found) {
                foundInGroup = true
                groupFoundAlerts.push(found)
                break // Only need one for OR
              }
            }

            if (foundInGroup) {
              allFoundInGroups.push(...groupFoundAlerts)
            } else {
              allGroupsMatched = false
              // For OR groups, show all options as missing if none found
              allMissingInGroups.push(...groupAlerts.map(g => g.trigger))
            }

          } else {
            // AND group: all alerts must be found
            let allFoundInGroup = true
            const groupFoundAlerts: Alert[] = []
            const groupMissingAlerts: string[] = []

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
                groupMissingAlerts.push(required.trigger)
              }
            }

            if (allFoundInGroup) {
              allFoundInGroups.push(...groupFoundAlerts)
            } else {
              allGroupsMatched = false
              allMissingInGroups.push(...groupMissingAlerts)
            }
          }
        }

        strategyCompleted = allGroupsMatched
        foundAlerts = allFoundInGroups
        missingAlerts = allMissingInGroups

        console.log(`🎯 ${strategy.name} for ${ticker}: completed=${strategyCompleted}, found=${foundAlerts.length}, missing=${missingAlerts.length}`)
        if (foundAlerts.length > 0) {
          console.log(`✅ Found alerts: ${foundAlerts.map(a => a.trigger).join(', ')}`)
        }
        if (missingAlerts.length > 0) {
          console.log(`❌ Missing alerts: ${missingAlerts.join(', ')}`)
        }

      } else {
        // OLD LOGIC: Fallback to simple rules (all AND)
        const requiredAlerts = strategy.rules.map((rule: any) => ({
          indicator: rule.indicator,
          trigger: rule.trigger
        }))

        for (const required of requiredAlerts) {
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

        strategyCompleted = missingAlerts.length === 0

        console.log(`🎯 ${strategy.name} for ${ticker}: completed=${strategyCompleted}, found=${foundAlerts.length}, missing=${missingAlerts.length}`)
        if (foundAlerts.length > 0) {
          console.log(`✅ Found alerts: ${foundAlerts.map(a => a.trigger).join(', ')}`)
        }
        if (missingAlerts.length > 0) {
          console.log(`❌ Missing alerts: ${missingAlerts.join(', ')}`)
        }
      }

      // Priority: Complete strategies first, then most matches
      const shouldUseThisTicker = !foundCompleteStrategy && (
        strategyCompleted || // This ticker completes the strategy
        foundAlerts.length > maxMatches // This ticker has more matches
      )

      if (shouldUseThisTicker) {
        maxMatches = foundAlerts.length
        bestTicker = ticker
        bestFoundAlerts = foundAlerts.map(a => a.trigger)
        bestMissingAlerts = missingAlerts
        bestScore = foundAlerts.reduce((sum, alert) => sum + alert.weight, 0)
        
        if (strategyCompleted) {
          foundCompleteStrategy = true
        }

        // Check if this strategy is complete and should generate an action
        if (strategyCompleted && foundAlerts.length > 0 && !lastAction) {
          // Strategy is complete - determine action
          let action: "Buy" | "Sell"
          
          const strategyName = strategy.name.toLowerCase()
          if (strategyName.includes('buy') || strategyName.includes('discount') || strategy.threshold > 0) {
            action = "Buy"
          } else if (strategyName.includes('sell') || strategyName.includes('premium') || strategy.threshold < 0) {
            action = "Sell"
          } else {
            action = bestScore >= 0 ? "Buy" : "Sell"
          }

          lastAction = {
            action,
            ticker: bestTicker,
            strategy: strategy.name
          }
        }
      }
    }

    // Only add this strategy to the results if it has at least one matching alert
    if (bestTicker !== 'N/A' && maxMatches > 0) {
      // Check if this strategy is completed (no missing alerts)
      let displayMissingAlerts = bestMissingAlerts
      
      if (bestMissingAlerts.length === 0 && bestFoundAlerts.length > 0) {
        // Strategy is complete - determine the action that was triggered
        const strategyName = strategy.name.toLowerCase()
        let triggeredAction: string
        
        if (strategyName.includes('buy') || strategyName.includes('discount') || strategy.threshold > 0) {
          triggeredAction = "Buy triggered"
        } else if (strategyName.includes('sell') || strategyName.includes('premium') || strategy.threshold < 0) {
          triggeredAction = "Sell triggered"
        } else {
          // Fallback: use score direction
          triggeredAction = bestScore >= 0 ? "Buy triggered" : "Sell triggered"
        }
        
        displayMissingAlerts = [triggeredAction]
      }
      
      strategyScores.push({
        strategy: strategy.name,
        ticker: bestTicker,
        timeframe: `${strategy.timeframe}m`,
        timestamp: new Date().toLocaleTimeString(), // Current time for when this was calculated
        alertsFound: bestFoundAlerts,
        missingAlerts: displayMissingAlerts,
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