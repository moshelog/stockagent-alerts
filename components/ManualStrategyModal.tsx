"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, ChevronDown, Edit, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { Strategy } from "@/hooks/use-strategies"
import { useConfig } from "@/hooks/useConfig"
import { useAvailableAlerts } from "@/hooks/use-available-alerts"

interface Alert {
  id: string
  name: string
  weight: number
}

interface IndicatorAlerts {
  [key: string]: Alert[]
}

interface Indicator {
  id: string
  name: string
  display_name: string
  description?: string
  category: string
  enabled: boolean
}

interface AvailableAlert {
  id: string
  indicator: string
  trigger: string
  weight: number
  enabled: boolean
  tooltip?: string
}

interface RuleGroup {
  id: string
  operator: "AND" | "OR"
  alerts: Array<{ id: string; indicator: string; name: string; weight: number }>
}

// Fallback alert data with corrected positive/negative values (used when API is unavailable)
const fallbackIndicatorAlerts: IndicatorAlerts = {
  nautilus: [
    // Divergence Alerts - Bullish = positive (green), Bearish = negative (red)
    { id: "normal_bearish_divergence", name: "Normal Bearish Divergence", weight: -2.5 },
    { id: "normal_bullish_divergence", name: "Normal Bullish Divergence", weight: 2.3 },
    { id: "hidden_bearish_divergence", name: "Hidden Bearish Divergence", weight: -2.8 },
    { id: "hidden_bullish_divergence", name: "Hidden Bullish Divergence", weight: 2.6 },
    { id: "multiple_bullish_divergence", name: "Multiple Bullish Divergence", weight: 3.2 },
    { id: "multiple_bearish_divergence", name: "Multiple Bearish Divergence", weight: -3.0 },

    // Dip & Signals Alerts - Buy signals = positive, Sell signals = negative
    { id: "bullish_dipx", name: "Bullish DipX", weight: 2.1 },
    { id: "bearish_dipx", name: "Bearish DipX", weight: -2.0 },
    { id: "buy_signal", name: "Buy Signal", weight: 2.4 },
    { id: "sell_signal", name: "Sell Signal", weight: -2.2 },
    { id: "oscillator_oversold", name: "Oscillator Oversold", weight: 1.8 }, // Oversold = bullish = positive
    { id: "oscillator_overbought", name: "Oscillator Overbought", weight: -1.9 }, // Overbought = bearish = negative

    // Volume Alerts - Bullish = positive, Bearish = negative
    { id: "bullish_volume_cross", name: "Bullish Volume Cross", weight: 1.5 },
    { id: "bearish_volume_cross", name: "Bearish Volume Cross", weight: -1.4 },

    // Peak Alerts - Bullish = positive, Bearish = negative
    { id: "bullish_peak", name: "Bullish Peak", weight: 2.0 },
    { id: "bearish_peak", name: "Bearish Peak", weight: -2.1 },
  ],
  market_core: [
    // Orderblocks Alerts - Bullish = positive, Bearish = negative
    { id: "bullish_ob_break", name: "Bullish OB Break", weight: 2.2 },
    { id: "bearish_ob_break", name: "Bearish OB Break", weight: -2.0 },
    { id: "touching_bearish_ob", name: "Touching Bearish OB", weight: -1.5 }, // Bearish = negative
    { id: "touching_bullish_ob", name: "Touching Bullish OB", weight: 1.6 }, // Bullish = positive

    // Market Structure Alerts - Bullish = positive, Bearish = negative
    { id: "bullish_bos", name: "Bullish BoS", weight: 2.1 },
    { id: "bearish_bos", name: "Bearish BoS", weight: -1.9 },
    { id: "bullish_choch", name: "Bullish ChoCH", weight: 1.8 },
    { id: "bearish_choch", name: "Bearish ChoCH", weight: -1.7 },

    // Fair Value Gap Alerts - Bullish = positive, Bearish = negative
    { id: "bullish_fvg_created", name: "Bullish FVG Created", weight: 1.4 },
    { id: "bearish_fvg_created", name: "Bearish FVG Created", weight: -1.3 },
    { id: "bullish_fvg_break", name: "Bullish FVG Break", weight: 2.0 },
    { id: "bearish_fvg_break", name: "Bearish Fvg Break", weight: -1.8 },

    // Liquidity Grab Alerts - Bullish = positive, Bearish = negative
    { id: "bullish_liquidity_created", name: "Bullish Liquidity Created", weight: 1.2 },
    { id: "bearish_liquidity_created", name: "Bearish Liquidity Created", weight: -1.1 },
    { id: "bullish_liquidity_crossed", name: "Bullish Liquidity Crossed", weight: 1.9 },
    { id: "bearish_liquidity_crossed", name: "Bearish Liquidity Crossed", weight: -1.8 },

    // Fibonacci Ranges Alerts - Bullish = positive, Bearish = negative
    { id: "bullish_fibonacci_created", name: "Bullish Fibonacci Created", weight: 1.3 },
    { id: "bearish_fibonacci_created", name: "Bearish Fibonacci Created", weight: -1.2 },

    // High/Low MTF Alerts - Bullish = positive, Bearish = negative
    { id: "daily_bullish_cross", name: "Daily Bullish Cross", weight: 2.5 },
    { id: "daily_bearish_cross", name: "Daily Bearish Cross", weight: -2.4 },
    { id: "weekly_bullish_cross", name: "Weekly Bullish Cross", weight: 2.8 },
    { id: "weekly_bearish_cross", name: "Weekly Bearish Cross", weight: -2.7 },
    { id: "monthly_bullish_cross", name: "Monthly Bullish Cross", weight: 3.0 },
    { id: "monthly_bearish_cross", name: "Monthly Bearish Cross", weight: -2.9 },
    { id: "quarterly_bullish_cross", name: "Quarterly Bullish Cross", weight: 3.2 },
    { id: "quarterly_bearish_cross", name: "Quarterly Bearish Cross", weight: -3.1 },
    { id: "yearly_bullish_cross", name: "Yearly Bullish Cross", weight: 3.5 },
    { id: "yearly_bearish_cross", name: "Yearly Bearish Cross", weight: -3.4 },

    // SFP Alerts - Bullish = positive, Bearish = negative
    { id: "bullish_sfp_formed", name: "Bullish SFP Formed", weight: 1.7 },
    { id: "bearish_sfp_formed", name: "Bearish SFP Formed", weight: -1.6 },

    // Patterns Alerts - Breakout = positive, Breakdown = negative
    { id: "bullish_channel_breakout", name: "Bullish Channel Breakout", weight: 2.3 },
    { id: "bullish_channel_breakdown", name: "Bullish Channel Breakdown", weight: -2.1 },
    { id: "bearish_channel_breakout", name: "Bearish Channel Breakout", weight: -2.2 },
    { id: "bearish_channel_breakdown", name: "Bearish Channel Breakdown", weight: -2.0 },
    { id: "wedge_breakout", name: "Wedge Breakout", weight: 1.8 }, // Breakout = bullish = positive
    { id: "wedge_breakdown", name: "Wedge Breakdown", weight: -1.7 }, // Breakdown = bearish = negative

    // Session Alerts - Breakout = positive, Breakdown = negative
    { id: "session_breakout", name: "Session Breakout", weight: 1.5 },
    { id: "session_breakdown", name: "Session Breakdown", weight: -1.4 },
  ],
  market_waves: [
    // Alerts Settings - Buy = positive, Sell = negative
    { id: "buy", name: "Buy", weight: 2.5 },
    { id: "buy_plus", name: "Buy+", weight: 3.0 },
    { id: "any_buy", name: "Any Buy", weight: 2.2 },
    { id: "fixed_tp1_buy", name: "Fixed TP1 (Buy)", weight: 1.8 },
    { id: "fixed_tp2_buy", name: "Fixed TP2 (Buy)", weight: 1.9 },
    { id: "sell", name: "Sell", weight: -2.3 },
    { id: "sell_plus", name: "Sell+", weight: -2.8 },
    { id: "any_sell", name: "Any Sell", weight: -2.0 },
    { id: "fixed_tp1_sell", name: "Fixed TP1 (Sell)", weight: -1.6 },
    { id: "fixed_tp2_sell", name: "Fixed TP2 (Sell)", weight: -1.7 },
    { id: "long_dynamic_tp", name: "Long Dynamic TP (Max TPs)", weight: 1.5 }, // Long = bullish = positive
    { id: "short_dynamic_tp", name: "Short Dynamic TP (Max TPs)", weight: -1.4 }, // Short = bearish = negative

    // Trend & Signal Alerts - Bullish = positive, Bearish = negative
    { id: "bullish_candle", name: "Bullish Candle", weight: 1.8 },
    { id: "bearish_candle", name: "Bearish Candle", weight: -1.7 },
    { id: "bullish_voltix_signal", name: "Bullish Voltix Signal", weight: 2.1 },
    { id: "bearish_voltix_signal", name: "Bearish Voltix Signal", weight: -1.9 },
    { id: "bullish_actionwave", name: "Bullish ActionWave", weight: 2.0 },
    { id: "bearish_actionwave", name: "Bearish ActionWave", weight: -1.8 },
    { id: "bullish_flowtrend", name: "Bullish FlowTrend", weight: 2.2 },
    { id: "bearish_flowtrend", name: "Bearish FlowTrend", weight: -2.0 },
    { id: "bullish_magnet", name: "Bullish Magnet", weight: 2.4 },
    { id: "bearish_magnet", name: "Bearish Magnet", weight: -2.2 },
    { id: "bullish_smartbands_retest", name: "Bullish SmartBands Retest", weight: 1.6 },
    { id: "bearish_smartbands_retest", name: "Bearish SmartBands Retest", weight: -1.5 },
    { id: "bullish_flowtrend_retest", name: "Bullish FlowTrend Retest", weight: 1.9 },
    { id: "bearish_flowtrend_retest", name: "Bearish FlowTrend Retest", weight: -1.8 },

    // Confluence Alerts - Bullish = positive, Bearish = negative
    { id: "bullish_flowtrend_buy", name: "Bullish FlowTrend + Buy", weight: 2.8 },
    { id: "bearish_flowtrend_sell", name: "Bearish FlowTrend + Sell", weight: -2.6 },
    { id: "bullish_flowtrend_buy_plus", name: "Bullish FlowTrend + Buy+", weight: 3.2 },
    { id: "bearish_flowtrend_sell_plus", name: "Bearish FlowTrend + Sell+", weight: -3.0 },
  ],
  extreme_zones: [
    // Extreme Zones Alerts - Premium (sell zone) = negative, Discount (buy zone) = positive
    { id: "premium_zone", name: "Premium Zone", weight: -1.8 }, // Premium = sell zone = negative
    { id: "discount_zone", name: "Discount Zone", weight: 1.9 }, // Discount = buy zone = positive
    { id: "equilibrium_zone", name: "Equilibrium Zone", weight: 0.0 }, // Neutral = 0
  ],
}

const fallbackIndicatorOptions = [
  { value: "nautilus", label: "Oscillator" },
  { value: "market_core", label: "SMC" },
  { value: "market_waves", label: "Waves" },
  { value: "extreme_zones", label: "Extreme Zones" },
]

interface ManualStrategyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (strategy: {
    name: string
    ruleGroups: RuleGroup[]
    threshold: number
    timeframe?: string
    interGroupOperator?: "AND" | "OR"
  }) => void
  editingStrategy?: Strategy | null
  showWeights?: boolean
}

export default function ManualStrategyModal({ isOpen, onClose, onSave, editingStrategy, showWeights = true }: ManualStrategyModalProps) {
  const { config } = useConfig()
  const { alertConfig, loading: alertsLoading } = useAvailableAlerts()
  const [strategyName, setStrategyName] = useState("")
  const [selectedIndicator, setSelectedIndicator] = useState("nautilus")
  const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([
    {
      id: "group-1",
      operator: "AND",
      alerts: [],
    },
  ])
  const [threshold, setThreshold] = useState(1)
  const [timeframe, setTimeframe] = useState("15m")
  const [interGroupOperator, setInterGroupOperator] = useState<"AND" | "OR">("OR")

  const timeframeOptions = [
    { value: "0", label: "Any timeframe" },
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "15m", label: "15 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hours" },
    { value: "1D", label: "1 Day" },
  ]

  // Indicator options - using same display names as Available Alerts panel
  const currentIndicatorOptions = [
    { value: "nautilus", label: "Oscillator" },
    { value: "market_core", label: "SMC" },
    { value: "market_waves", label: "Waves" },
    { value: "extreme_zones", label: "Extreme Zones" },
  ]

  // Use data from useAvailableAlerts hook (handles Extreme Zones naming correctly)
  const currentIndicatorAlerts = Object.keys(alertConfig).length > 0 ? alertConfig : fallbackIndicatorAlerts
  
  // Initialize form when modal opens or editing strategy changes
  useEffect(() => {
    if (isOpen) {
      if (editingStrategy) {
        // Editing existing strategy
        setStrategyName(editingStrategy.name)
        setThreshold(editingStrategy.threshold)
        // Convert database timeframe (number) to modal format (string with 'm')
        const timeframeValue = typeof editingStrategy.timeframe === 'number' 
          ? (editingStrategy.timeframe === 0 ? "0" : `${editingStrategy.timeframe}m`)
          : editingStrategy.timeframe || "15m"
        setTimeframe(timeframeValue)
        setInterGroupOperator("OR") // Default for existing strategies

        // Check if we have rule_groups (database field) or ruleGroups (frontend alias)
        if (editingStrategy.rule_groups && editingStrategy.rule_groups.length > 0) {
          // Use database rule_groups structure (preserves Group 2, OR logic, etc.)
          console.log('🔄 Using database rule_groups:', editingStrategy.rule_groups)
          setRuleGroups(editingStrategy.rule_groups)
        } else if (editingStrategy.ruleGroups && editingStrategy.ruleGroups.length > 0) {
          // Fallback to frontend ruleGroups field
          console.log('🔄 Using frontend ruleGroups:', editingStrategy.ruleGroups)
          setRuleGroups(editingStrategy.ruleGroups)
        } else if (editingStrategy.rules && editingStrategy.rules.length > 0) {
          // Convert database rules to ruleGroups format
          const alerts = editingStrategy.rules.map((rule) => {
            // Find the alert in our data to get its details
            let foundAlert: Alert | null = null
            let foundIndicator = ""

            // Map database indicator to modal indicator key
            const mapIndicatorKey = (dbIndicator: string): string => {
              switch (dbIndicator.toLowerCase()) {
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
                  return dbIndicator.toLowerCase().replace(/[^a-z0-9]/g, '_')
              }
            }

            const indicatorKey = mapIndicatorKey(rule.indicator)
            foundIndicator = indicatorKey

            // Find the alert in our current data (API or fallback)
            const alertsForIndicator = currentIndicatorAlerts[indicatorKey] || []
            foundAlert = alertsForIndicator.find((a) => 
              a.name.toLowerCase() === rule.trigger.toLowerCase()
            )

            return {
              id: foundAlert?.id || rule.trigger.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              indicator: foundIndicator,
              name: rule.trigger,
              weight: foundAlert?.weight || rule.weight || 0,
            }
          })

          console.log('🔄 Converting database rules to ruleGroups:', alerts)
          console.log('⚠️ No rule_groups found, creating default single AND group from rules')

          // Put all database rules in a single AND group (fallback for old strategies)
          setRuleGroups([
            {
              id: "group-1",
              operator: "AND",
              alerts: alerts,
            },
          ])
        } else if (editingStrategy.components && Object.keys(editingStrategy.components).length > 0) {
          // Convert legacy components to rule groups format (fallback)
          const alerts = Object.keys(editingStrategy.components).map((alertId) => {
            // Find the alert in our current data (API or fallback)
            let foundAlert: Alert | null = null
            let foundIndicator = ""

            for (const [indicator, alerts] of Object.entries(currentIndicatorAlerts)) {
              const alert = alerts.find((a) => a.id === alertId)
              if (alert) {
                foundAlert = alert
                foundIndicator = indicator
                break
              }
            }

            return {
              id: alertId,
              indicator: foundIndicator,
              name: foundAlert?.name || alertId.replace(/_/g, " "),
              weight: foundAlert?.weight || editingStrategy.components[alertId] || 0,
            }
          })

          // For legacy, put all alerts in a single AND group
          setRuleGroups([
            {
              id: "group-1",
              operator: "AND",
              alerts: alerts,
            },
          ])
        } else {
          // No rules found, start with empty group
          setRuleGroups([
            {
              id: "group-1",
              operator: "AND",
              alerts: [],
            },
          ])
        }
      } else {
        // Creating new strategy
        setStrategyName("")
        setSelectedIndicator("nautilus")
        setRuleGroups([
          {
            id: "group-1",
            operator: "AND",
            alerts: [],
          },
        ])
        setThreshold(1)
        setTimeframe("15m")
        setInterGroupOperator("OR")
      }
    }
  }, [isOpen, editingStrategy])

  const currentAlerts = currentIndicatorAlerts[selectedIndicator] || []

  // Generate deterministic ID for SSR compatibility
  const generateGroupId = () => {
    if (typeof window === 'undefined') {
      // Server-side: use a counter
      return `group-${Date.now()}-${ruleGroups.length}`
    } else {
      // Client-side: use random for uniqueness
      return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  }

  const addRuleGroup = () => {
    const newGroup: RuleGroup = {
      id: generateGroupId(),
      operator: "AND",
      alerts: [],
    }
    console.log("Adding new group:", newGroup.id)
    setRuleGroups([...ruleGroups, newGroup])
  }

  const removeRuleGroup = (groupId: string) => {
    if (ruleGroups.length > 1) {
      setRuleGroups(ruleGroups.filter((group) => group.id !== groupId))
    }
  }

  const updateGroupOperator = (groupId: string, operator: "AND" | "OR") => {
    setRuleGroups(ruleGroups.map((group) => (group.id === groupId ? { ...group, operator } : group)))
  }

  const handleAlertToggle = (groupId: string, alertId: string, checked: boolean) => {
    const alert = currentAlerts.find((a) => a.id === alertId)
    if (!alert) return

    console.log("handleAlertToggle called:", { groupId, alertId, checked, alert: alert.name })

    setRuleGroups((prevGroups) => {
      console.log(
        "Previous groups:",
        prevGroups.map((g) => ({ id: g.id, alertCount: g.alerts.length })),
      )

      const newGroups = prevGroups.map((group) => {
        if (group.id === groupId) {
          // Only modify the target group
          if (checked) {
            // Add the alert if not already present
            const exists = group.alerts.some((item) => item.id === alertId)
            if (exists) {
              console.log(`Alert ${alertId} already exists in group ${groupId}`)
              return group
            }

            console.log(`Adding alert ${alertId} to group ${groupId}`)
            return {
              ...group,
              alerts: [
                ...group.alerts,
                {
                  id: alertId,
                  indicator: selectedIndicator,
                  name: alert.name,
                  weight: alert.weight,
                },
              ],
            }
          } else {
            // Remove the alert from this group
            console.log(`Removing alert ${alertId} from group ${groupId}`)
            return {
              ...group,
              alerts: group.alerts.filter((item) => item.id !== alertId),
            }
          }
        }
        // Don't modify other groups - allow same alert in multiple groups
        return group
      })

      console.log(
        "New groups:",
        newGroups.map((g) => ({
          id: g.id,
          alertCount: g.alerts.length,
          alerts: g.alerts.map((a) => a.name),
        })),
      )

      return newGroups
    })
  }

  const removeAlertFromGroup = (groupId: string, alertId: string) => {
    setRuleGroups(
      ruleGroups.map((group) => {
        if (group.id !== groupId) return group
        return {
          ...group,
          alerts: group.alerts.filter((alert) => alert.id !== alertId),
        }
      }),
    )
  }

  const handleSave = () => {
    console.log('🔥 ManualStrategyModal handleSave called')
    console.log('  📝 strategyName:', strategyName.trim())
    console.log('  📋 ruleGroups:', ruleGroups)
    console.log('  ⏰ timeframe:', timeframe)
    console.log('  🎚️ threshold:', threshold)
    
    if (strategyName.trim() && ruleGroups.some((group) => group.alerts.length > 0) && timeframe) {
      const strategyData = {
        name: strategyName.trim(),
        ruleGroups,
        threshold,
        timeframe,
        interGroupOperator,
      }

      console.log('✅ Validation passed, calling onSave with:', strategyData)
      onSave(strategyData)
    } else {
      console.log('❌ Validation failed:')
      console.log('  Name valid:', !!strategyName.trim())
      console.log('  Has alerts:', ruleGroups.some((group) => group.alerts.length > 0))
      console.log('  Has timeframe:', !!timeframe)
    }
  }

  const generateRuleSummary = () => {
    const nonEmptyGroups = ruleGroups.filter((group) => group.alerts.length > 0)

    if (nonEmptyGroups.length === 0) return "No alerts selected"

    console.log(
      "Generating rule summary for groups:",
      nonEmptyGroups.map((g) => ({
        id: g.id,
        operator: g.operator,
        alerts: g.alerts.map((a) => a.name),
      })),
    )

    const groupSummaries = nonEmptyGroups.map((group, index) => {
      const alertNames = group.alerts.map((alert) => alert.name)

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
        // For subsequent groups, use the selected inter-group operator
        return `${interGroupOperator} ${groupText}`
      }
    })

    // Join all group summaries
    const fullRule = groupSummaries.join(" ")

    const action = threshold > 0 ? "BUY" : "SELL"
    console.log("Generated rule:", `IF [${fullRule}] → ${action}`)

    return `IF [${fullRule}] → ${action}`
  }

  const getWeightColor = (weight: number) => {
    if (weight > 0) return "text-green-400 border-green-400/30" // Positive = green
    if (weight < 0) return "text-red-400 border-red-400/30" // Negative = red
    return "text-accent-neutral border-gray-700"
  }

  const isAlertSelectedInGroup = (groupId: string, alertId: string) => {
    const group = ruleGroups.find((g) => g.id === groupId)
    return group ? group.alerts.some((alert) => alert.id === alertId) : false
  }

  const isAlertSelectedInAnyGroup = (alertId: string) => {
    return ruleGroups.some((group) => group.alerts.some((alert) => alert.id === alertId))
  }

  const getAllSelectedAlerts = () => {
    return ruleGroups.flatMap((group) => group.alerts)
  }

  const isFormValid =
    strategyName.trim().length > 0 && ruleGroups.some((group) => group.alerts.length > 0) && timeframe.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background-surface border-gray-700 max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2" style={{ color: "#E0E6ED" }}>
            {editingStrategy ? (
              <>
                <Edit className="w-5 h-5" />
                Edit Strategy
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                New Manual Strategy
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {alertsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4" />
            <p style={{ color: "#A3A9B8" }}>Loading alerts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[65vh] pr-2">
          {/* Left Column - Strategy Configuration */}
          <div className="space-y-6">
            {/* Strategy Name */}
            <div>
              <Label htmlFor="strategyName" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                Strategy Name
              </Label>
              <Input
                id="strategyName"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder="Enter strategy name..."
                className="mt-1 bg-background border-gray-700"
                style={{ color: "#E0E6ED" }}
              />
            </div>

            {/* Timeframe Dropdown */}
            <div>
              <Label htmlFor="timeframe-select" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                Timeframe
              </Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger
                  id="timeframe-select"
                  className="mt-1 bg-background border-gray-700 hover:border-gray-600 transition-colors focus:border-accent-buy"
                >
                  <SelectValue />
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-gray-700">
                  {timeframeOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-white hover:bg-gray-800 focus:bg-gray-800"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rule Groups */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                  Rule Groups ({getAllSelectedAlerts().length} alerts selected)
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addRuleGroup}
                  className="bg-transparent border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Group
                </Button>
              </div>

              <div className="space-y-4 max-h-80 overflow-y-auto bg-background rounded-lg p-4 border border-gray-800">
                {ruleGroups.map((group, groupIndex) => (
                  <motion.div
                    key={group.id}
                    className="bg-background-surface border border-gray-700 rounded-lg p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Group Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                          Group {groupIndex + 1}
                        </span>
                        <Select
                          value={group.operator}
                          onValueChange={(value: "AND" | "OR") => updateGroupOperator(group.id, value)}
                        >
                          <SelectTrigger className="w-20 h-8 bg-background border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background-surface border-gray-700">
                            <SelectItem value="AND" className="text-white hover:bg-gray-800">
                              AND
                            </SelectItem>
                            <SelectItem value="OR" className="text-white hover:bg-gray-800">
                              OR
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {ruleGroups.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRuleGroup(group.id)}
                          className="h-8 w-8 p-0 hover:bg-gray-800"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      )}
                    </div>

                    {/* Selected Alerts in Group */}
                    {group.alerts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {group.alerts.map((alert) => (
                          <Badge
                            key={alert.id}
                            variant="secondary"
                            className={`text-xs px-2 py-1 rounded-full font-medium border ${getWeightColor(alert.weight)} bg-transparent`}
                          >
                            {showWeights ? `${alert.name} (${alert.weight > 0 ? "+" : ""}${alert.weight})` : alert.name}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeAlertFromGroup(group.id, alert.id)}
                              className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Group Status */}
                    <div className="text-xs" style={{ color: "#A3A9B8" }}>
                      {group.alerts.length === 0
                        ? "No alerts selected"
                        : group.alerts.length === 1
                          ? `1 alert selected`
                          : `${group.alerts.length} alerts with ${group.operator} logic`}
                    </div>
                  </motion.div>
                ))}

                {ruleGroups.length > 1 && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <span className="text-xs" style={{ color: "#A3A9B8" }}>
                      Groups are connected with
                    </span>
                    <Select value={interGroupOperator} onValueChange={(value: "AND" | "OR") => setInterGroupOperator(value)}>
                      <SelectTrigger className="w-16 h-6 bg-background border-gray-700 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background-surface border-gray-700">
                        <SelectItem value="AND" className="text-white hover:bg-gray-800 text-xs">
                          AND
                        </SelectItem>
                        <SelectItem value="OR" className="text-white hover:bg-gray-800 text-xs">
                          OR
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs" style={{ color: "#A3A9B8" }}>
                      logic
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Threshold Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                  Threshold
                </Label>
                <span
                  className={`text-sm font-bold px-2 py-1 rounded ${
                    threshold > 0
                      ? "bg-accent-buy/20 text-accent-buy" // Positive = Buy = Green
                      : "bg-accent-sell/20 text-accent-sell" // Negative = Sell = Red
                  }`}
                >
                  {threshold}
                </span>
              </div>
              <Slider
                value={[threshold]}
                onValueChange={(value) => {
                  const newValue = value[0]
                  // Skip 0 - if slider tries to set 0, set to 1 or -1 based on direction
                  if (newValue === 0) {
                    setThreshold(threshold > 0 ? 1 : -1)
                  } else {
                    setThreshold(newValue)
                  }
                }}
                min={-10}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs mt-2" style={{ color: "#A3A9B8" }}>
                <span>-10 (Strong Sell)</span>
                <span>+10 (Strong Buy)</span>
              </div>
            </div>

            {/* Rule Preview */}
            <div>
              <Label className="text-sm font-medium mb-2 block" style={{ color: "#E0E6ED" }}>
                Rule Preview
              </Label>
              <div className="bg-background border border-gray-800 rounded-lg p-3">
                <code className="text-sm font-mono" style={{ color: "#A3A9B8" }}>
                  {generateRuleSummary()}
                </code>
              </div>
            </div>
          </div>

          {/* Right Column - Alert Selection */}
          <div className="space-y-6">
            {/* Indicator Dropdown */}
            <div>
              <Label
                htmlFor="indicator-select-modal"
                className="text-sm font-medium mb-2 block"
                style={{ color: "#E0E6ED" }}
              >
                Indicator
              </Label>
              <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
                <SelectTrigger
                  id="indicator-select-modal"
                  className="bg-background border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <SelectValue />
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </SelectTrigger>
                <SelectContent className="bg-background-surface border-gray-700">
                  {currentIndicatorOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-white hover:bg-gray-800 focus:bg-gray-800"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Alert Selection for Each Group */}
            <div>
              <Label className="text-sm font-medium mb-3 block" style={{ color: "#E0E6ED" }}>
                Add Alerts to Groups
              </Label>
              <div className="space-y-4 max-h-96 overflow-y-auto bg-background rounded-lg p-4 border border-gray-800">
                {ruleGroups.map((group, groupIndex) => (
                  <div key={group.id}>
                    <h4 className="text-sm font-medium mb-2" style={{ color: "#E0E6ED" }}>
                      Group {groupIndex + 1} ({group.operator})
                    </h4>
                    <div className="space-y-2 ml-4">
                      {currentAlerts.map((alert) => (
                        <div
                          key={`${group.id}-${alert.id}`}
                          className="bg-background-surface border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Checkbox
                              id={`${group.id}-${alert.id}`}
                              checked={isAlertSelectedInGroup(group.id, alert.id)}
                              onCheckedChange={(checked) => handleAlertToggle(group.id, alert.id, checked as boolean)}
                              disabled={false}
                            />
                            <div className="flex-1 min-w-0">
                              <label
                                htmlFor={`${group.id}-${alert.id}`}
                                className="text-sm font-medium cursor-pointer block truncate"
                                style={{ color: "#E0E6ED" }}
                                title={alert.name}
                              >
                                {alert.name}
                              </label>
                            </div>
                            {showWeights && (
                              <div
                                className={`w-16 h-8 text-xs bg-background border rounded text-center font-medium flex items-center justify-center ${getWeightColor(
                                  alert.weight,
                                )}`}
                              >
                                {alert.weight > 0 ? "+" : ""}
                                {alert.weight}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isFormValid}
            className="bg-accent-buy hover:bg-accent-buy/80 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingStrategy ? (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Update Strategy
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Strategy
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
