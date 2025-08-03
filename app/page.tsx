"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Settings, Activity, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useConfig } from "@/hooks/useConfig"
import { useTradingData } from "@/hooks/use-trading-data"
import { useAvailableAlerts } from "@/hooks/use-available-alerts"
import { useStrategies } from "@/hooks/use-strategies"
import { useTotalAlerts } from "@/hooks/use-total-alerts"
import { useClearAlerts } from "@/hooks/use-clear-alerts"
import { CompactLiveScoring } from "@/components/CompactLiveScoring"
import { EnhancedAlertsTable } from "@/components/EnhancedAlertsTable"
import { StrategyManagerPanel } from "@/components/StrategyManagerPanel"
import AvailableAlertsPanel from "@/components/AvailableAlertsPanel"
import MobileAlertsAccordion from "@/components/MobileAlertsAccordion"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { generateScoringData, extractLastActionFromScore } from "@/utils/scoring"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Add this function to calculate total alerts from available alerts data
const calculateTotalAlerts = () => {
  const indicatorAlerts = {
    nautilus: 16, // Normal/Hidden/Multiple Divergences (6) + DipX/Signals (4) + Volume/Peak (4) + Oscillator (2)
    market_core: 26, // OB (4) + BoS/ChoCH (4) + FVG (4) + Liquidity (4) + Fibonacci (2) + MTF (10) + SFP (2) + Patterns (6) + Session (2)
    market_waves: 25, // Buy/Sell signals (12) + Trend signals (8) + Confluence (4) + Candle (1)
    extreme_zones: 3, // Premium, Discount, Equilibrium
  }

  return Object.values(indicatorAlerts).reduce((total, count) => total + count, 0)
}

export default function Dashboard() {
  const router = useRouter()
  
  // Time window state for scoring system
  const [timeWindowMinutes, setTimeWindowMinutes] = useState(60)
  
  const { user, isLoading: authLoading, logout } = useAuth()
  const { config, loading: configLoading, error: configError, updateConfig } = useConfig()
  const { alertConfig, loading: alertsLoading, updateWeight } = useAvailableAlerts()
  const { alerts, score, strategies: apiStrategies, loading: tradingDataLoading } = useTradingData(timeWindowMinutes, alertConfig)
  const { totalCount: totalAlertsCount, loading: totalAlertsLoading } = useTotalAlerts()
  const { clearAlerts } = useClearAlerts()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])
  
  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-buy mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  const handleClearAlerts = async () => {
    try {
      await clearAlerts()
      // Force refresh of trading data to update the alerts list
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to clear alerts:', error)
      alert('Failed to clear alerts. Please try again.')
    }
  }
  const { 
    strategies: dbStrategies, 
    loading: strategiesLoading, 
    error: strategiesError,
    createStrategy,
    updateStrategy: updateDbStrategy,
    deleteStrategy,
    toggleStrategy,
    updateThreshold
  } = useStrategies()

  // ✅ DEBUGGING VERSION DEPLOYED - Railway Deploy v5 - FINAL WEIGHT FIX
  console.log('🔍 Strategy Manager Debug - FINAL WEIGHT FIX v5:')
  console.log('  📊 dbStrategies:', dbStrategies)
  console.log('  ⏳ strategiesLoading:', strategiesLoading)  
  console.log('  ❌ strategiesError:', strategiesError)
  console.log('  ⚙️ config:', config)
  console.log('  📈 apiStrategies:', apiStrategies)
  console.log('🚨 DEBUGGING: If you see this message, debugging version is LIVE!')

  const [enabledAlerts, setEnabledAlerts] = useState([
    { id: "nautilus_divergence", name: "Divergence", indicator: "Nautilus™", weight: -2.5 },
    { id: "nautilus_buy_sell_signals", name: "Buy & Sell Signals", indicator: "Nautilus™", weight: 2.0 },
    { id: "order_block_touching", name: "Order Block: Touching Alerts", indicator: "Market Core Pro™", weight: 1.2 },
    { id: "trend_buy", name: "Trend Signals: ▲ Buy", indicator: "Market Waves Pro™", weight: 2.5 },
  ])

  // DEPRECATED: Now using real API data from useAvailableAlerts hook
  // Legacy alertConfig has been replaced with useAvailableAlerts hook

  // DEPRECATED: Legacy handlers - now using database-driven strategy management
  // These functions are replaced by the useStrategies hook functions:
  // toggleStrategy, updateThreshold, deleteStrategy

  // DEPRECATED: Legacy handlers removed - using database-driven approach

  // DEPRECATED: Legacy strategy creation - now using database via createStrategy hook

  if (authLoading || configLoading || tradingDataLoading || alertsLoading || strategiesLoading || totalAlertsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4" />
          <p style={{ color: "#E0E6ED" }}>Loading StockAgent...</p>
        </div>
      </div>
    )
  }

  if (configError || !config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading configuration: {configError}</p>
          <Button variant="outline">Try Again</Button>
        </div>
      </div>
    )
  }

  const totalAvailableAlerts = calculateTotalAlerts()

  // Generate fully synchronized data based on actual strategies (DEPRECATED - using real API data now)
  const generateSynchronizedData = () => {
    if (!config) return { mockAlerts: [], mockTickerData: [], mockLastAction: null }

    const activeStrategies = config.strategies.filter((s) => s.enabled)

    // Generate Recent Alerts first
    const mockAlerts = []
    const baseTime = new Date()

    // Create alerts for various tickers with different indicators
    const alertsToGenerate = [
      {
        ticker: "BTC",
        alertName: "Normal Bullish Divergence",
        alertId: "normal_bullish_divergence",
        weight: 2.3,
        indicator: "Nautilus™",
        timeOffset: 0,
      },
      {
        ticker: "BTC",
        alertName: "Discount Zone",
        alertId: "discount_zone",
        weight: 1.9,
        indicator: "Extreme Zones",
        timeOffset: 120,
      },
      {
        ticker: "ETH",
        alertName: "Bullish FlowTrend",
        alertId: "bullish_flowtrend",
        weight: 2.2,
        indicator: "Market Waves Pro™",
        timeOffset: 240,
      },
      {
        ticker: "XRP",
        alertName: "Discount Zone",
        alertId: "discount_zone",
        weight: 1.9,
        indicator: "Extreme Zones",
        timeOffset: 360,
      },
      {
        ticker: "SOL",
        alertName: "Bullish BoS",
        alertId: "bullish_bos",
        weight: 2.1,
        indicator: "Market Core Pro™",
        timeOffset: 480,
      },
      {
        ticker: "ADA",
        alertName: "Premium Zone",
        alertId: "premium_zone",
        weight: -1.8,
        indicator: "Extreme Zones",
        timeOffset: 600,
      },
      {
        ticker: "ADA",
        alertName: "Normal Bearish Divergence",
        alertId: "normal_bearish_divergence",
        weight: -2.5,
        indicator: "Nautilus™",
        timeOffset: 720,
      },
      {
        ticker: "DOGE",
        alertName: "Normal Bearish Divergence",
        alertId: "normal_bearish_divergence",
        weight: -2.5,
        indicator: "Nautilus™",
        timeOffset: 840,
      },
      {
        ticker: "MATIC",
        alertName: "Buy Signal",
        alertId: "buy_signal",
        weight: 2.4,
        indicator: "Nautilus™",
        timeOffset: 960,
      },
      {
        ticker: "LINK",
        alertName: "Bullish FVG Break",
        alertId: "bullish_fvg_break",
        weight: 2.0,
        indicator: "Market Core Pro™",
        timeOffset: 1080,
      },
      {
        ticker: "UNI",
        alertName: "Sell Signal",
        alertId: "sell_signal",
        weight: -2.2,
        indicator: "Nautilus™",
        timeOffset: 1200,
      },
      {
        ticker: "AVAX",
        alertName: "Premium Zone",
        alertId: "premium_zone",
        weight: -1.8,
        indicator: "Extreme Zones",
        timeOffset: 1320,
      },
      {
        ticker: "DOT",
        alertName: "Hidden Bullish Divergence",
        alertId: "hidden_bullish_divergence",
        weight: 2.6,
        indicator: "Nautilus™",
        timeOffset: 1440,
      },
      {
        ticker: "ATOM",
        alertName: "Bearish BoS",
        alertId: "bearish_bos",
        weight: -1.9,
        indicator: "Market Core Pro™",
        timeOffset: 1560,
      },
      {
        ticker: "FTM",
        alertName: "Buy+",
        alertId: "buy_plus",
        weight: 3.0,
        indicator: "Market Waves Pro™",
        timeOffset: 1680,
      },
      {
        ticker: "NEAR",
        alertName: "Touching Bullish OB",
        alertId: "touching_bullish_ob",
        weight: 1.6,
        indicator: "Market Core Pro™",
        timeOffset: 1800,
      },
      {
        ticker: "ALGO",
        alertName: "Bearish FlowTrend",
        alertId: "bearish_flowtrend",
        weight: -2.0,
        indicator: "Market Waves Pro™",
        timeOffset: 1920,
      },
      {
        ticker: "VET",
        alertName: "Multiple Bearish Divergence",
        alertId: "multiple_bearish_divergence",
        weight: -3.0,
        indicator: "Nautilus™",
        timeOffset: 2040,
      },
      {
        ticker: "ICP",
        alertName: "Bullish ChoCH",
        alertId: "bullish_choch",
        weight: 1.8,
        indicator: "Market Core Pro™",
        timeOffset: 2160,
      },
      {
        ticker: "FLOW",
        alertName: "Sell+",
        alertId: "sell_plus",
        weight: -2.8,
        indicator: "Market Waves Pro™",
        timeOffset: 2280,
      },
      {
        ticker: "SAND",
        alertName: "Oscillator Overbought",
        alertId: "oscillator_overbought",
        weight: -1.9,
        indicator: "Nautilus™",
        timeOffset: 2400,
      },
      {
        ticker: "MANA",
        alertName: "Bearish FVG Created",
        alertId: "bearish_fvg_created",
        weight: -1.3,
        indicator: "Market Core Pro™",
        timeOffset: 2520,
      },
      {
        ticker: "CRV",
        alertName: "Any Sell",
        alertId: "any_sell",
        weight: -2.0,
        indicator: "Market Waves Pro™",
        timeOffset: 2640,
      },
      {
        ticker: "COMP",
        alertName: "Bullish Peak",
        alertId: "bullish_peak",
        weight: 2.0,
        indicator: "Nautilus™",
        timeOffset: 2760,
      },
      {
        ticker: "AAVE",
        alertName: "Touching Bearish OB",
        alertId: "touching_bearish_ob",
        weight: -1.5,
        indicator: "Market Core Pro™",
        timeOffset: 2880,
      },
      {
        ticker: "SUSHI",
        alertName: "Any Buy",
        alertId: "any_buy",
        weight: 2.2,
        indicator: "Market Waves Pro™",
        timeOffset: 3000,
      },
      {
        ticker: "YFI",
        alertName: "Bearish Peak",
        alertId: "bearish_peak",
        weight: -2.1,
        indicator: "Nautilus™",
        timeOffset: 3120,
      },
      {
        ticker: "1INCH",
        alertName: "Bullish FVG Created",
        alertId: "bullish_fvg_created",
        weight: 1.4,
        indicator: "Market Core Pro™",
        timeOffset: 3240,
      },
      {
        ticker: "ENJ",
        alertName: "Equilibrium Zone",
        alertId: "equilibrium_zone",
        weight: 0.0,
        indicator: "Extreme Zones",
        timeOffset: 3360,
      },
      {
        ticker: "BAT",
        alertName: "Oscillator Oversold",
        alertId: "oscillator_oversold",
        weight: 1.8,
        indicator: "Nautilus™",
        timeOffset: 3480,
      },
    ]

    // Generate the alerts
    alertsToGenerate.forEach(({ ticker, alertName, alertId, weight, indicator, timeOffset }) => {
      const alertTime = new Date(baseTime.getTime() - timeOffset * 1000)

      mockAlerts.push({
        id: alertId,
        time: alertTime.toLocaleTimeString("en-US", { hour12: false }),
        ticker,
        indicator,
        trigger: alertName,
        weight,
      })
    })

    // Now generate ticker data based ONLY on tickers that appear in recent alerts
    const tickersWithAlerts = [...new Set(mockAlerts.map((alert) => alert.ticker))]

    // Group alerts by ticker to calculate scores and missing alerts
    const tickerAlertMap: Record<string, Array<{ name: string; weight: number; alertId: string }>> = {}

    tickersWithAlerts.forEach((ticker) => {
      tickerAlertMap[ticker] = mockAlerts
        .filter((alert) => alert.ticker === ticker)
        .map((alert) => ({
          name: alert.trigger,
          weight: alert.weight,
          alertId: alert.id,
        }))
    })

    // Generate Scoring System data with proper missing alerts calculation
    const mockTickerData = []

    for (const ticker of tickersWithAlerts) {
      const tickerAlerts = tickerAlertMap[ticker] || []
      const tickerAlertIds = tickerAlerts.map((a) => a.alertId)

      // Check if this ticker has any alerts that match active strategies
      let hasRelevantAlerts = false
      const allMissingAlerts: string[] = []
      const matchingStrategies: any[] = []

      for (const strategy of activeStrategies) {
        if (strategy.alertDetails && strategy.alertDetails.length > 0) {
          const requiredAlertIds = strategy.alertDetails.map((a) => a.id)
          const hasAnyFromStrategy = requiredAlertIds.some((id) => tickerAlertIds.includes(id))

          if (hasAnyFromStrategy) {
            hasRelevantAlerts = true
            matchingStrategies.push(strategy)

            // Find missing alerts from this strategy
            const missingFromStrategy = strategy.alertDetails
              .filter((alert) => !tickerAlertIds.includes(alert.id))
              .map((alert) => alert.name)

            allMissingAlerts.push(...missingFromStrategy)
          }
        }
      }

      // Only include tickers that have relevant alerts for active strategies
      if (hasRelevantAlerts) {
        const alertsFound = tickerAlerts.map((a) => a.name)

        // Calculate missing alerts properly
        let uniqueMissingAlerts: string[]

        if (allMissingAlerts.length === 0) {
          // No missing alerts - this ticker completes at least one strategy
          uniqueMissingAlerts = []
        } else {
          // Remove duplicates and limit to 3 for display
          uniqueMissingAlerts = [...new Set(allMissingAlerts)].slice(0, 3)
        }

        // Calculate score from actual alerts
        const score = tickerAlerts.reduce((sum, alert) => sum + alert.weight, 0)

        mockTickerData.push({
          ticker,
          timeframe: "15m",
          alertsFound,
          missingAlerts: uniqueMissingAlerts,
          score: Number(score.toFixed(1)),
        })
      }
    }

    // Generate Last Action based on ACTUAL strategy completion and threshold logic
    let mockLastAction = null

    // Check each ticker to see if it completes any active strategy
    for (const tickerData of mockTickerData) {
      const ticker = tickerData.ticker
      const tickerAlerts = tickerAlertMap[ticker] || []
      const tickerAlertIds = tickerAlerts.map((a) => a.alertId)

      // Check if this ticker completes any strategy (no missing alerts)
      if (tickerData.missingAlerts.length === 0) {
        // Find which strategy this ticker completes
        for (const strategy of activeStrategies) {
          if (strategy.alertDetails && strategy.alertDetails.length > 0) {
            const requiredAlertIds = strategy.alertDetails.map((a) => a.id)
            const hasAllAlerts = requiredAlertIds.every((id) => tickerAlertIds.includes(id))

            if (hasAllAlerts) {
              // This ticker completes this strategy
              // Calculate the total score for this ticker
              const totalScore = tickerAlerts.reduce((sum, alert) => sum + alert.weight, 0)

              // Check if the score crosses the strategy threshold
              const crossesThreshold =
                (strategy.threshold > 0 && totalScore >= strategy.threshold) ||
                (strategy.threshold < 0 && totalScore <= strategy.threshold)

              if (crossesThreshold) {
                // Determine action based on threshold direction (corrected logic)
                const action = strategy.threshold > 0 ? "Buy" : "Sell"

                mockLastAction = {
                  action: action as "Buy" | "Sell",
                  ticker: ticker,
                  strategy: strategy.name,
                }

                // Use the most recent (first) completed strategy
                break
              }
            }
          }
        }
      }

      // If we found a completed strategy, break out of ticker loop
      if (mockLastAction) break
    }

    return { mockAlerts, mockTickerData, mockLastAction }
  }

  // Generate real-time scoring data from alerts and strategies
  const { tickerData, lastAction: scoringLastAction } = generateScoringData(alerts, dbStrategies, timeWindowMinutes)
  
  // Try to get last action from backend score data, fallback to scoring calculation
  const lastAction = extractLastActionFromScore(score) || scoringLastAction
  
  console.log('🎯 Scoring Debug:', {
    alertsCount: alerts.length,
    strategiesCount: dbStrategies.length,
    activeStrategies: dbStrategies.filter(s => s.enabled).length,
    tickerDataCount: tickerData.length,
    lastAction,
    backendScore: score,
    sampleTickers: tickerData.slice(0, 3)
  })

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        className="border-b border-gray-800 bg-background-surface"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-400" />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#E0E6ED" }}>
                  StockAgent
                </h1>
                <p className="text-sm text-gray-400 italic">Turn Every Alert into Automated Success</p>
              </div>
              <span className="text-sm px-2 py-1 bg-green-400/20 text-green-400 rounded-full">Live</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm" style={{ color: "#A3A9B8" }}>
                {dbStrategies.filter((s) => s.enabled).length} strategies active
              </div>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="bg-transparent">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-transparent"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Accordion for Available Alerts */}
        <MobileAlertsAccordion alertConfig={alertConfig} onUpdateWeight={updateWeight} showWeights={config.ui.showWeights} />

        {/* Desktop Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-6 min-h-[800px]">
          {/* Left Column */}
          <div className="flex flex-col h-full space-y-4">
            {/* Top Left - Recent Alerts (Flexible height) */}
            {config.ui.showAlertsTable && (
              <div className="flex-1 min-h-[400px]">
                <EnhancedAlertsTable alerts={alerts} onClearAlerts={handleClearAlerts} showWeights={config.ui.showWeights} />
              </div>
            )}

            {/* Bottom Left - Strategy Manager (Fixed height) */}
            {config.ui.showStrategyPanel && (
              <div className="flex-shrink-0">
              <StrategyManagerPanel
                strategies={dbStrategies}
                alertConfig={alertConfig}
                showWeights={config.ui.showWeights}
                onToggleStrategy={toggleStrategy}
                onUpdateThreshold={updateThreshold}
                onDeleteStrategy={deleteStrategy}
                onBacktestStrategy={() => {}}
                onCreateManualStrategy={async (strategyData: any) => {
                  console.log('🚀 Strategy creation started:', strategyData)
                  
                  try {
                    // Transform frontend format to API format
                    const apiFormat = {
                      name: strategyData.name,
                      timeframe: parseInt(strategyData.timeframe?.replace('m', '')) || 15,
                      threshold: strategyData.threshold || 0,
                      rules: strategyData.ruleGroups ? 
                        strategyData.ruleGroups.flatMap((group: any) => 
                          group.alerts.map((alert: any) => ({
                            indicator: alert.indicator,
                            trigger: alert.name
                          }))
                        ) : [],
                      ruleGroups: strategyData.ruleGroups // Preserve UI group structure
                    }
                    
                    console.log('📡 API Format:', apiFormat)
                    console.log('🎯 Rule Groups being sent:', strategyData.ruleGroups)
                    
                    console.log('✅ Validation passed, calling createStrategy...')
                    const result = await createStrategy(apiFormat)
                    console.log('📥 createStrategy result:', result)
                    
                    if (result) {
                      console.log('✅ Strategy created successfully:', result.name)
                      // Success - no popup needed, strategy appears in list automatically
                    } else {
                      console.error('❌ Strategy creation failed - no result returned')
                      alert('Failed to create strategy. Please try again.')
                    }
                  } catch (error) {
                    console.error('💥 Strategy creation error:', error)
                    alert('Error creating strategy: ' + (error instanceof Error ? error.message : 'Unknown error'))
                  }
                }}
                onUpdateStrategy={(id: string, updates: any) => {
                  console.log('🔄 Strategy update started:', updates)
                  
                  // Transform frontend format to API format (same as create strategy)
                  const apiFormat = {
                    name: updates.name,
                    timeframe: parseInt(updates.timeframe?.replace('m', '')) || 15,
                    threshold: updates.threshold || 0,
                    rules: updates.ruleGroups ? 
                      updates.ruleGroups.flatMap((group: any) => 
                        group.alerts.map((alert: any) => ({
                          indicator: alert.indicator,
                          trigger: alert.name
                        }))
                      ) : [],
                    ruleGroups: updates.ruleGroups // Preserve UI group structure
                  }
                  
                  console.log('📡 Update API Format:', apiFormat)
                  console.log('🎯 Rule Groups being updated:', updates.ruleGroups)
                  updateDbStrategy(id, apiFormat)
                }}
                enabledAlerts={enabledAlerts}
              />
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="flex flex-col h-full space-y-4">
            {/* Top Right - Scoring System */}
            {config.ui.showScoreMeter && (
              <div className="flex-shrink-0">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-white">Scoring System</h2>
                </div>
                <CompactLiveScoring
                  lastAction={lastAction}
                  tickerData={tickerData}
                  totalAlerts={totalAlertsCount}
                  activeStrategies={dbStrategies.filter((s) => s.enabled).length}
                  timeWindowMinutes={timeWindowMinutes}
                  onTimeWindowChange={setTimeWindowMinutes}
                  showWeights={config.ui.showWeights}
                />
              </div>
            )}

            {/* Bottom Right - Available Alerts Panel (Expanded) */}
            <div className="hidden lg:block flex-1 min-h-0">
              <AvailableAlertsPanel alertConfig={alertConfig} onUpdateWeight={updateWeight} showWeights={config.ui.showWeights} />
            </div>
          </div>
        </div>
      </main>
      </div>
    </ErrorBoundary>
  )
}
