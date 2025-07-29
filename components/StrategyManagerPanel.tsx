"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Brain, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Strategy } from "@/hooks/use-strategies"
import ManualStrategyModal from "./ManualStrategyModal"

interface StrategyManagerPanelProps {
  strategies: Strategy[]
  loading?: boolean
  alertConfig?: any
  showWeights?: boolean
  onToggleStrategy: (id: string, enabled: boolean) => void
  onUpdateThreshold: (id: string, threshold: number) => void
  onDeleteStrategy: (id: string) => void
  onBacktestStrategy: (id: string) => void
  onCreateManualStrategy?: (strategy: any) => void
  onUpdateStrategy?: (id: string, strategy: any) => void
}

export function StrategyManagerPanel({
  strategies,
  loading,
  alertConfig,
  showWeights = true,
  onToggleStrategy,
  onUpdateThreshold,
  onDeleteStrategy,
  onBacktestStrategy,
  onCreateManualStrategy,
  onUpdateStrategy,
}: StrategyManagerPanelProps) {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)

  if (loading) {
    return (
      <div className="bg-background-surface rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: "#E0E6ED" }}>
          Strategy Manager
        </h3>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy)
    setIsManualModalOpen(true)
  }

  const handleSaveStrategy = (strategyData: any) => {
    console.log('🎯 StrategyManagerPanel handleSaveStrategy called:', strategyData)
    console.log('🔍 editingStrategy:', editingStrategy)
    console.log('🔍 onCreateManualStrategy exists:', !!onCreateManualStrategy)
    
    if (editingStrategy) {
      // Update existing strategy - pass the complete strategyData
      console.log('📝 Updating existing strategy')
      onUpdateStrategy?.(editingStrategy.id, strategyData)
    } else {
      // Create new strategy
      console.log('🆕 Creating new strategy')
      onCreateManualStrategy?.(strategyData)
    }
    setEditingStrategy(null)
    setIsManualModalOpen(false)
  }

  const handleCloseModal = () => {
    setEditingStrategy(null)
    setIsManualModalOpen(false)
  }

  const generateRulePreview = (strategy: Strategy) => {
    // First check if we have ruleGroups (new structure)
    if (strategy.ruleGroups && strategy.ruleGroups.length > 0) {
      const nonEmptyGroups = strategy.ruleGroups.filter((group: any) => group.alerts && group.alerts.length > 0)

      if (nonEmptyGroups.length === 0) {
        return "No alerts configured"
      }

      const groupSummaries = nonEmptyGroups.map((group: any, index: number) => {
        const alertNames = group.alerts.map((alert: any) => {
          // Map strategy indicator names to API indicator names for proper matching
          const mapIndicatorName = (strategyIndicator: string): string => {
            switch (strategyIndicator.toLowerCase()) {
              case 'nautilus':
              case 'nautilus™':
                return 'Nautilus™'
              case 'market_core':
              case 'market core pro™':
                return 'Market Core Pro™'
              case 'market_waves':
              case 'market waves pro™':
                return 'Market Waves Pro™'
              case 'extreme_zones':
              case 'extreme zones':
                return 'Extreme Zones'
              default:
                return strategyIndicator
            }
          }

          // Map strategy indicator to the correct alertConfig key
          const getAlertConfigKey = (strategyIndicator: string): string => {
            switch (strategyIndicator.toLowerCase()) {
              case 'nautilus':
              case 'nautilus™':
                return 'nautilus'
              case 'market_core':
              case 'market core pro™':
                return 'market_core'
              case 'market_waves':
              case 'market waves pro™':
                return 'market_waves'
              case 'extreme_zones':
              case 'extreme zones':
                return 'extreme_zones'
              default:
                return strategyIndicator.toLowerCase()
            }
          }

          // Get current weight from alertConfig using the correct structure
          let currentWeight = 0
          if (alertConfig) {
            const configKey = getAlertConfigKey(alert.indicator)
            const indicatorAlerts = alertConfig[configKey] || []
            const matchingAlert = indicatorAlerts.find((a: any) => 
              a.name?.toLowerCase() === alert.name?.toLowerCase()
            )
            currentWeight = matchingAlert ? matchingAlert.weight : (alert.weight || 0)
          } else {
            currentWeight = alert.weight || 0
          }

          return showWeights ? `${alert.name} (${currentWeight > 0 ? "+" : ""}${currentWeight})` : alert.name
        })

        let groupText: string
        if (group.alerts.length === 1) {
          // Single alert - no need for parentheses
          groupText = alertNames[0]
        } else {
          // Multiple alerts - wrap in parentheses with the group's operator
          groupText = `(${alertNames.join(` ${group.operator} `)})`
        }

        // For the first group, no operator prefix
        if (index === 0) {
          return groupText
        } else {
          // For subsequent groups, use the group's operator to connect to previous groups
          return `${group.operator} ${groupText}`
        }
      })

      const fullRule = groupSummaries.join(" ")
      const action = strategy.threshold > 0 ? "BUY" : strategy.threshold < 0 ? "SELL" : "NEUTRAL"
      const timeframeDisplay = strategy.timeframe ? ` (${strategy.timeframe})` : ""

      return `IF [${fullRule}] → ${action}${timeframeDisplay}`
    }

    // Fallback to alertDetails (legacy structure)
    if (strategy.alertDetails && strategy.alertDetails.length > 0) {
      const indicatorGroups = strategy.alertDetails.reduce((acc: any, alert: any) => {
        // Map strategy indicator names to API indicator names for proper matching
        const mapIndicatorName = (strategyIndicator: string): string => {
          switch (strategyIndicator.toLowerCase()) {
            case 'nautilus':
            case 'nautilus™':
              return 'Nautilus™'
            case 'market_core':
            case 'market core pro™':
              return 'Market Core Pro™'
            case 'market_waves':
            case 'market waves pro™':
              return 'Market Waves Pro™'
            case 'extreme_zones':
            case 'extreme zones':
              return 'Extreme Zones'
            default:
              return strategyIndicator
          }
        }

        // Map strategy indicator to the correct alertConfig key
        const getAlertConfigKey = (strategyIndicator: string): string => {
          switch (strategyIndicator.toLowerCase()) {
            case 'nautilus':
            case 'nautilus™':
              return 'nautilus'
            case 'market_core':
            case 'market core pro™':
              return 'market_core'
            case 'market_waves':
            case 'market waves pro™':
              return 'market_waves'
            case 'extreme_zones':
            case 'extreme zones':
              return 'extreme_zones'
            default:
              return strategyIndicator.toLowerCase()
          }
        }

        // Get current weight from alertConfig using the correct structure
        let currentWeight = 0
        if (alertConfig) {
          const configKey = getAlertConfigKey(alert.indicator)
          const indicatorAlerts = alertConfig[configKey] || []
          const matchingAlert = indicatorAlerts.find((a: any) => 
            a.name?.toLowerCase() === alert.name?.toLowerCase()
          )
          currentWeight = matchingAlert ? matchingAlert.weight : (alert.weight || 0)
        } else {
          currentWeight = alert.weight || 0
        }

        const indicatorName =
          alert.indicator === "nautilus"
            ? "Nautilus"
            : alert.indicator === "market_core"
              ? "Core"
              : alert.indicator === "market_waves"
                ? "Waves"
                : alert.indicator === "extreme_zones"
                  ? "Zones"
                  : alert.indicator

        if (!acc[indicatorName]) acc[indicatorName] = []
        acc[indicatorName].push({ ...alert, weight: currentWeight })
        return acc
      }, {})

      const ruleParts = Object.entries(indicatorGroups).map(([indicator, alerts]: [string, any]) => {
        const alertList = alerts
          .slice(0, 1)
          .map((a: any) => showWeights ? `${a.name} (${a.weight > 0 ? "+" : ""}${a.weight})` : a.name)
          .join(" + ")
        const extra = alerts.length > 1 ? ` +${alerts.length - 1}` : ""
        return `${indicator}:${alertList}${extra}`
      })

      const summary = ruleParts.join(" + ")
      const action = strategy.threshold > 0 ? "BUY" : strategy.threshold < 0 ? "SELL" : "NEUTRAL"
      const timeframeDisplay = strategy.timeframe ? ` (${strategy.timeframe})` : ""
      return `IF [${summary}] → ${action}${timeframeDisplay}`
    }

    // Final fallback to components (oldest structure)
    const componentNames = Object.keys(strategy.components).slice(0, 2)
    const moreCount = Math.max(0, Object.keys(strategy.components).length - 2)

    if (componentNames.length === 0) {
      return "No alerts configured"
    }

    const alertsText = componentNames.map((name) => name.replace(/_/g, " ")).join(" + ")
    const moreText = moreCount > 0 ? ` +${moreCount} more` : ""
    const action = strategy.threshold > 0 ? "BUY" : strategy.threshold < 0 ? "SELL" : "NEUTRAL"
    const timeframeDisplay = strategy.timeframe ? ` (${strategy.timeframe})` : ""

    return `IF [${alertsText}${moreText}] → ${action}${timeframeDisplay}`
  }

  const getActionBadge = (strategy: Strategy) => {
    if (strategy.threshold > 0) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-400/20 text-green-400 rounded-full text-xs font-medium border border-green-400/30">
          <TrendingUp className="w-3 h-3" />
          BUY
        </div>
      )
    } else if (strategy.threshold < 0) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-400/20 text-red-400 rounded-full text-xs font-medium border border-red-400/30">
          <TrendingDown className="w-3 h-3" />
          SELL
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-orange-400/20 text-orange-400 rounded-full text-xs font-medium border border-orange-400/30">
          NEUTRAL
        </div>
      )
    }
  }

  const getWeightColor = (weight: number) => {
    if (weight > 0) return "bg-green-400/20 text-green-400 border-green-400/30"
    if (weight < 0) return "bg-red-400/20 text-red-400 border-red-400/30"
    return "bg-orange-400/20 text-orange-400 border-orange-400/30"
  }

  return (
    <motion.div
      className="bg-background-surface rounded-2xl shadow-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-accent-neutral" />
          <h3 className="text-lg font-semibold" style={{ color: "#E0E6ED" }}>
            Strategy Manager
          </h3>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-accent-neutral hover:bg-accent-neutral/80 text-black"
            title="Run AI based on your selected alerts"
          >
            <Brain className="w-4 h-4 mr-2" />
            Generate with AI
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-transparent border-accent-neutral text-accent-neutral hover:bg-accent-neutral/10"
            onClick={() => setIsManualModalOpen(true)}
          >
            + Add New Strategy
          </Button>
        </div>
      </div>

      {/* Add description */}
      <p className="text-sm mb-6" style={{ color: "#A3A9B8" }}>
        Generate AI Strategies from the alerts you've enabled in the right-hand panel.
      </p>

      <div className={`space-y-3 ${strategies.length > 3 ? "max-h-80 overflow-y-auto pr-2" : ""}`}>
        {strategies.map((strategy, index) => (
          <motion.div
            key={strategy.id}
            className="bg-background border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ scale: 1.01 }}
          >
            {/* Header Row: Name + Badge + Actions */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <h4 className="font-semibold truncate" style={{ color: "#E0E6ED" }}>
                  {strategy.name}
                  {strategy.timeframe && (
                    <span className="ml-2 text-sm font-normal" style={{ color: "#A3A9B8" }}>
                      ({strategy.timeframe})
                    </span>
                  )}
                </h4>
                <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full flex-shrink-0">Manual</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {getActionBadge(strategy)}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditStrategy(strategy)}
                  className="h-8 w-8 p-0 hover:bg-gray-800"
                  title="Edit strategy"
                >
                  <Edit className="w-4 h-4" style={{ color: "#A3A9B8" }} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteStrategy(strategy.id)}
                  className="h-8 w-8 p-0 hover:bg-gray-800"
                  title="Delete strategy"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>

            {/* Rule Preview Row */}
            <div className="mb-3">
              <code className="text-xs font-mono block whitespace-pre-wrap break-words" style={{ color: "#A3A9B8" }}>
                {generateRulePreview(strategy)}
              </code>
            </div>

            {/* Component Alerts Chips Row */}
            <div className="flex flex-wrap gap-1.5">
              {strategy.alertDetails && strategy.alertDetails.length > 0
                ? strategy.alertDetails.map((alert: any) => {
                    // Map strategy indicator names to API indicator names for proper matching
                    const mapIndicatorName = (strategyIndicator: string): string => {
                      switch (strategyIndicator.toLowerCase()) {
                        case 'nautilus':
                        case 'nautilus™':
                          return 'Nautilus™'
                        case 'market_core':
                        case 'market core pro™':
                          return 'Market Core Pro™'
                        case 'market_waves':
                        case 'market waves pro™':
                          return 'Market Waves Pro™'
                        case 'extreme_zones':
                        case 'extreme zones':
                          return 'Extreme Zones'
                        default:
                          return strategyIndicator
                      }
                    }

                    // Debug: Log the alertConfig structure
                    console.log(`🔍 DEBUG alertConfig:`, alertConfig)
                    console.log(`🔍 Looking for: indicator="${alert.indicator}" trigger="${alert.name}"`)
                    
                    // Map strategy indicator to the correct alertConfig key
                    const getAlertConfigKey = (strategyIndicator: string): string => {
                      switch (strategyIndicator.toLowerCase()) {
                        case 'nautilus':
                        case 'nautilus™':
                          return 'nautilus'
                        case 'market_core':
                        case 'market core pro™':
                          return 'market_core'
                        case 'market_waves':
                        case 'market waves pro™':
                          return 'market_waves'
                        case 'extreme_zones':
                        case 'extreme zones':
                          return 'extreme_zones'
                        default:
                          return strategyIndicator.toLowerCase()
                      }
                    }

                    // Find weight from alertConfig using the correct structure
                    let currentWeight = 0
                    if (alertConfig) {
                      const configKey = getAlertConfigKey(alert.indicator)
                      console.log(`🔍 Config key: ${configKey}`)
                      console.log(`🔍 Available in alertConfig:`, Object.keys(alertConfig))
                      
                      const indicatorAlerts = alertConfig[configKey] || []
                      console.log(`🔍 Alerts for ${configKey}:`, indicatorAlerts)
                      
                      const matchingAlert = indicatorAlerts.find((a: any) => 
                        a.name?.toLowerCase() === alert.name?.toLowerCase()
                      )
                      
                      if (matchingAlert) {
                        currentWeight = matchingAlert.weight
                        console.log(`✅ Found weight: ${currentWeight} for ${alert.name}`)
                      } else {
                        console.log(`❌ No weight found for ${alert.name} in ${configKey}`)
                        currentWeight = alert.weight || 0
                      }
                    } else {
                      console.log(`❌ No alertConfig available`)
                      currentWeight = alert.weight || 0
                    }

                    return (
                      <span
                        key={alert.id}
                        className={`text-xs px-2 py-1 rounded-full font-medium border ${getWeightColor(currentWeight)}`}
                      >
                        {showWeights ? `${alert.name} (${currentWeight > 0 ? "+" : ""}${currentWeight})` : alert.name}
                      </span>
                    )
                  })
                : // Fallback to components
                  Object.entries(strategy.components).map(([component, weight]) => (
                    <span
                      key={component}
                      className={`text-xs px-2 py-1 rounded-full font-medium border ${getWeightColor(weight)}`}
                    >
                      {showWeights ? `${component.replace(/_/g, " ")} (${weight > 0 ? "+" : ""}${weight})` : component.replace(/_/g, " ")}
                    </span>
                  ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Manual Strategy Modal - Reused for both Create and Edit */}
      <ManualStrategyModal
        isOpen={isManualModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveStrategy}
        editingStrategy={editingStrategy}
        showWeights={showWeights}
      />
    </motion.div>
  )
}
