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
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Time window state for scoring system
  const [timeWindowMinutes, setTimeWindowMinutes] = useState(60)
  
  const { user, isLoading: authLoading, logout } = useAuth()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])
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
  
  // Show loading state while hydrating or checking authentication
  if (!isHydrated || authLoading) {
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

  // DEPRECATED: Legacy state and handlers removed - now using database-driven approach

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
