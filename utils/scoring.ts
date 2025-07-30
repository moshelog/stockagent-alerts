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
 * SIMPLE: Generate scoring data - Only show triggered buy/sell actions
 */
export function generateScoringData(
  alerts: Alert[],
  strategies: Strategy[],
  timeWindowMinutes: number = 60
): {
  tickerData: TickerScore[]
  lastAction: LastAction | undefined
} {
  console.log(`🚀 SIMPLE scoring: ${alerts.length} alerts, ${strategies.length} strategies`)
  
  const activeStrategies = strategies.filter(s => s.enabled)
  if (activeStrategies.length === 0) {
    console.log(`❌ No active strategies`)
    return { tickerData: [], lastAction: undefined }
  }

  // Take last 50 alerts only
  const recentAlerts = alerts.slice(0, 50)
  console.log(`📋 Using ${recentAlerts.length} recent alerts`)

  const triggeredActions: TickerScore[] = []
  let lastAction: LastAction | undefined

  // Simple check: For each strategy, scan all recent alerts
  for (const strategy of activeStrategies) {
    console.log(`🔍 Checking strategy: ${strategy.name}`)
    
    // Get required alerts for this strategy
    let requiredAlerts: Array<{indicator: string, trigger: string}> = []
    
    // Handle complex rule groups properly
    if (strategy.rule_groups && strategy.rule_groups.length > 0) {
      console.log(`📋 Strategy "${strategy.name}" has ${strategy.rule_groups.length} rule groups`)
      
      // Group alerts by ticker first
      const alertsByTicker = new Map<string, Alert[]>()
      recentAlerts.forEach(alert => {
        const ticker = normalizeTicker(alert.ticker)
        if (!alertsByTicker.has(ticker)) {
          alertsByTicker.set(ticker, [])
        }
        alertsByTicker.get(ticker)!.push(alert)
      })

      // Check each ticker for this strategy
      for (const [ticker, tickerAlerts] of alertsByTicker) {
        let strategyTriggered = false
        let allFoundAlerts: Alert[] = []

        // Check each rule group - strategy completes if ANY group completes
        for (const group of strategy.rule_groups) {
          console.log(`🔍 Checking group with operator: ${group.operator}`)
          
          const groupAlerts = group.alerts.map((alert: any) => ({
            indicator: mapIndicatorName(alert.indicator),
            trigger: alert.name
          }))

          console.log(`📋 Group requires:`, groupAlerts.map(a => `${a.indicator}:${a.trigger}`))

          if (group.operator === 'OR') {
            // OR group: need ANY alert from this group
            let foundInGroup = false
            const groupFoundAlerts: Alert[] = []
            
            for (const required of groupAlerts) {
              const found = tickerAlerts.find(alert => 
                alert.indicator === required.indicator && 
                alert.trigger === required.trigger
              )
              
              if (found) {
                groupFoundAlerts.push(found)
                foundInGroup = true
                console.log(`✅ OR group satisfied with: ${found.indicator}:${found.trigger}`)
                break
              }
            }
            
            if (foundInGroup) {
              allFoundAlerts.push(...groupFoundAlerts)
              strategyTriggered = true
              console.log(`✅ OR group complete`)
              break // Strategy is complete
            } else {
              console.log(`❌ OR group failed - no alerts found`)
            }

          } else {
            // AND group: need ALL alerts from this group
            let allFoundInGroup = true
            const groupFoundAlerts: Alert[] = []
            
            console.log(`🔍 AND group needs ALL ${groupAlerts.length} alerts`)
            
            for (const required of groupAlerts) {
              const found = tickerAlerts.find(alert => 
                alert.indicator === required.indicator && 
                alert.trigger === required.trigger
              )
              
              if (found) {
                groupFoundAlerts.push(found)
                console.log(`✅ AND group found: ${found.indicator}:${found.trigger}`)
              } else {
                allFoundInGroup = false
                console.log(`❌ AND group missing: ${required.indicator}:${required.trigger}`)
              }
            }

            console.log(`🔍 AND group result: found ${groupFoundAlerts.length}/${groupAlerts.length} alerts`)
            
            if (allFoundInGroup && groupFoundAlerts.length === groupAlerts.length) {
              allFoundAlerts.push(...groupFoundAlerts)
              strategyTriggered = true
              console.log(`✅ AND group complete with all ${groupFoundAlerts.length} alerts`)
              break // Strategy is complete
            } else {
              console.log(`❌ AND group failed - need all ${groupAlerts.length} alerts, found ${groupFoundAlerts.length}`)
            }
          }
        }

        // If strategy is triggered for this ticker
        if (strategyTriggered && allFoundAlerts.length > 0) {
          // Determine action type
          const strategyName = strategy.name.toLowerCase()
          let action: "Buy" | "Sell" = "Buy"
          
          if (strategyName.includes('sell') || strategyName.includes('premium')) {
            action = "Sell"
          }

          console.log(`🎯 TRIGGERED: ${strategy.name} for ${ticker} → ${action}`)
          
          triggeredActions.push({
            strategy: strategy.name,
            ticker: ticker,
            timeframe: `${strategy.timeframe || 15}m`,
            timestamp: new Date().toLocaleTimeString(),
            alertsFound: allFoundAlerts.map(a => a.trigger),
            missingAlerts: [`${action} triggered`],
            score: allFoundAlerts.reduce((sum, alert) => sum + (alert.weight || 0), 0)
          })

          if (!lastAction) {
            lastAction = { action, ticker, strategy: strategy.name }
          }
        }
      }
      
      continue // Skip the old logic below

    } else if (strategy.rules) {
      requiredAlerts = strategy.rules.map((rule: any) => ({
        indicator: mapIndicatorName(rule.indicator),
        trigger: rule.trigger
      }))
    } else {
      continue
    }

    if (requiredAlerts.length === 0) continue

    console.log(`📋 Simple strategy needs:`, requiredAlerts.map(r => `${r.indicator}:${r.trigger}`))

    // Group alerts by ticker (for simple rules)
    const alertsByTicker = new Map<string, Alert[]>()
    recentAlerts.forEach(alert => {
      const ticker = normalizeTicker(alert.ticker)
      if (!alertsByTicker.has(ticker)) {
        alertsByTicker.set(ticker, [])
      }
      alertsByTicker.get(ticker)!.push(alert)
    })

    // Check each ticker (for simple rules)
    for (const [ticker, tickerAlerts] of alertsByTicker) {
      let foundAlerts: Alert[] = []
      let strategyTriggered = false

      // Simple AND logic: find all required alerts
      let allFound = true
      for (const required of requiredAlerts) {
        const found = tickerAlerts.find(alert => 
          alert.indicator === required.indicator && 
          alert.trigger === required.trigger
        )
        
        if (found) {
          foundAlerts.push(found)
        } else {
          allFound = false
          break
        }
      }
      strategyTriggered = allFound

      // If strategy is triggered
      if (strategyTriggered && foundAlerts.length > 0) {
        // Determine action type
        const strategyName = strategy.name.toLowerCase()
        let action: "Buy" | "Sell" = "Buy"
        
        if (strategyName.includes('sell') || strategyName.includes('premium')) {
          action = "Sell"
        }

        console.log(`🎯 TRIGGERED: ${strategy.name} for ${ticker} → ${action}`)
        
        triggeredActions.push({
          strategy: strategy.name,
          ticker: ticker,
          timeframe: `${strategy.timeframe || 15}m`,
          timestamp: new Date().toLocaleTimeString(),
          alertsFound: foundAlerts.map(a => a.trigger),
          missingAlerts: [`${action} triggered`],
          score: foundAlerts.reduce((sum, alert) => sum + (alert.weight || 0), 0)
        })

        if (!lastAction) {
          lastAction = { action, ticker, strategy: strategy.name }
        }
      }
    }
  }

  console.log(`✅ Found ${triggeredActions.length} triggered actions`)
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