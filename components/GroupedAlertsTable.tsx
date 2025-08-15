"use client"

import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, TrendingDown, Trash2, ChevronUp, ChevronDown, ChevronRight, Clock, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useMemo, useEffect } from "react"
import { getExpiringAlerts, getTimeUntilExpiry, groupAlertsByTicker } from "@/utils/alertFiltering"
import { normalizeTimeframe } from "@/utils/timeframeUtils"
import { useTickerIndicators } from "@/hooks/useTickerIndicators"

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

interface GroupedAlertsTableProps {
  alerts: Alert[]
  loading?: boolean
  onClearAlerts?: () => void
  showWeights?: boolean
  showVisualColors?: boolean
  alertTimeframes?: {
    globalDefault: number
    overrides: Record<string, number>
  }
}

interface AlertGroup {
  key: string
  ticker: string
  alerts: Alert[]
  isExpanded: boolean
}

type SortField = 'time' | 'ticker' | 'price' | 'timeframe' | 'indicator' | 'trigger' | 'weight'
type SortDirection = 'asc' | 'desc'

export function GroupedAlertsTable({ 
  alerts, 
  loading, 
  onClearAlerts, 
  showWeights = true,
  showVisualColors = false,
  alertTimeframes
}: GroupedAlertsTableProps) {
  const [isClearing, setIsClearing] = useState(false)
  const [sortField, setSortField] = useState<SortField>('time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expiringAlerts, setExpiringAlerts] = useState<Set<string>>(new Set())
  const [groupOrder, setGroupOrder] = useState<string[]>([])
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null)
  
  // Hook to get real-time indicator values
  const { getRSIDisplay, getADXDisplay, getVWAPDisplay, getHTFDisplay, getVolumeDisplay } = useTickerIndicators()
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const viewMode = 'card' // Force card view only
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [selectedTimeframePerCard, setSelectedTimeframePerCard] = useState<Record<string, string>>({})

  // Update expiring alerts every second
  useEffect(() => {
    if (!alertTimeframes) return

    const updateExpiringAlerts = () => {
      const expiring = getExpiringAlerts(alerts, alertTimeframes)
      setExpiringAlerts(new Set(expiring.map(alert => alert.id)))
    }

    updateExpiringAlerts()
    const interval = setInterval(updateExpiringAlerts, 1000)

    return () => clearInterval(interval)
  }, [alerts, alertTimeframes])

  // Filter out expired alerts based on timeframe windows
  const validAlerts = useMemo(() => {
    if (!alertTimeframes || !alerts.length) return alerts

    const now = new Date()
    
    // IMMEDIATE DEBUG - Always show this
    console.log('🚨 ALERT FILTERING STARTED', {
      totalAlerts: alerts.length,
      btcCount: alerts.filter(a => a.ticker === 'BTCUSDT.P').length,
      currentTime: now.toISOString()
    })
    
    // Log BTCUSDT.P alerts being processed
    const btcAlerts = alerts.filter(alert => alert.ticker === 'BTCUSDT.P')
    if (btcAlerts.length > 0) {
      console.log('🎯 *** BTCUSDT.P ALERTS FROM BACKEND ***')
      console.log('🎯 Total BTCUSDT.P alerts received from backend:', btcAlerts.length)
      btcAlerts.forEach((alert, i) => {
        console.log(`🎯 Alert [${i+1}]:`, alert.time, alert.indicator, alert.trigger)
      })
    } else {
      console.log('🎯 *** NO BTCUSDT.P ALERTS FROM BACKEND ***')
    }
    
    return alerts.filter(alert => {
      let alertTime: Date
      
      if (alert.timestamp) {
        // Use timestamp if available
        alertTime = new Date(alert.timestamp)
      } else if (alert.time) {
        // Parse time string like "10:00:05" - assume it's today
        const today = new Date()
        const [hours, minutes, seconds] = alert.time.split(':').map(Number)
        alertTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds)
      } else {
        // No valid time, keep the alert
        return true
      }
      
      // Check if alertTime is valid
      if (isNaN(alertTime.getTime())) {
        console.warn('Invalid alert time:', alert.time || alert.timestamp)
        return true // Keep alerts with invalid times
      }
      
      // Enhanced flexible timeframe normalization to handle all format variations
      const originalTimeframe = alert.timeframe
      const cleanedTimeframe = originalTimeframe.toLowerCase().replace(/\s+/g, '') // Remove all spaces
      
      // Generate comprehensive list of possible keys to check
      const possibleKeys = [
        originalTimeframe, // Original format (e.g., "5M", "5 M")
        cleanedTimeframe, // Space-cleaned (e.g., "5m")
        cleanedTimeframe.replace(/m$/, ''), // Remove trailing 'm' (e.g., "5")
        cleanedTimeframe.replace(/m$/, '') + 'm', // Ensure 'm' suffix (e.g., "5m")
        cleanedTimeframe.replace(/m$/, '') + 'M', // Uppercase M (e.g., "5M")
        cleanedTimeframe.replace(/m$/i, '') + 'min', // Add 'min' suffix (e.g., "5min")
        cleanedTimeframe.replace(/m$/i, '') + ' M', // Add space + M (e.g., "5 M")
        cleanedTimeframe.replace(/m$/i, '') + ' m', // Add space + m (e.g., "5 m")
      ]
      
      // Remove duplicates while preserving order
      const uniqueKeys = [...new Set(possibleKeys)]
      
      let timeframeWindow = alertTimeframes.globalDefault
      let matchedKey = null
      
      for (const key of uniqueKeys) {
        if (alertTimeframes.overrides[key] !== undefined) {
          timeframeWindow = alertTimeframes.overrides[key]
          matchedKey = key
          break
        }
      }
      const windowMs = timeframeWindow * 60 * 1000 // Convert minutes to milliseconds
      const timeDiff = now.getTime() - alertTime.getTime()
      
      const isValid = timeDiff <= windowMs
      
      // Only log debug info for BTCUSDT.P to reduce console noise
      if (alert.ticker === 'BTCUSDT.P') {
        const status = isValid ? '✅ KEPT' : '❌ FILTERED OUT'
        console.log(`🎯 ${status}: ${alert.time} ${alert.indicator} - ${alert.trigger}`, {
          ticker: alert.ticker,
          originalTimeframe: originalTimeframe,
          cleanedTimeframe: cleanedTimeframe,
          possibleKeys: uniqueKeys,
          matchedKey: matchedKey,
          timeframeWindow: timeframeWindow,
          usingGlobalDefault: matchedKey === null,
          time: alert.time,
          alertTime: alertTime.toISOString(),
          now: now.toISOString(),
          timeDiffMinutes: Math.round(timeDiff / 60000),
          windowMinutes: timeframeWindow,
          windowMs: windowMs,
          isValid: isValid,
          overrides: alertTimeframes.overrides
        })
      }
      
      return isValid
    })
  }, [alerts, alertTimeframes])

  // Load group order and view mode from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('alerts-group-order')
    if (savedOrder) {
      try {
        setGroupOrder(JSON.parse(savedOrder))
      } catch (error) {
        console.error('Failed to parse saved group order:', error)
      }
    }
    
  }, [])

  // Save group order to localStorage
  const saveGroupOrder = (newOrder: string[]) => {
    setGroupOrder(newOrder)
    localStorage.setItem('alerts-group-order', JSON.stringify(newOrder))
  }

  // Toggle view mode and save to localStorage

  // Toggle card expansion
  const toggleCardExpansion = (cardKey: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(cardKey)) {
      newExpanded.delete(cardKey)
    } else {
      newExpanded.add(cardKey)
    }
    setExpandedCards(newExpanded)
  }

  // Handle timeframe selection within a card
  const handleCardTimeframeSelect = (cardKey: string, timeframe: string) => {
    setSelectedTimeframePerCard(prev => ({
      ...prev,
      [cardKey]: timeframe
    }))
  }

  // Get the selected timeframe for a card (default to 5M or lowest available)
  const getSelectedTimeframe = (cardKey: string, availableTimeframes: string[]) => {
    const selected = selectedTimeframePerCard[cardKey]
    if (selected && availableTimeframes.includes(selected)) {
      return selected
    }
    
    // Default priority: 5M, 1M, 15M, 1H, 4H, 1D
    const timeframePriority = ['5m', '1m', '15m', '1h', '4h', '1d']
    const normalizedAvailable = availableTimeframes.map(tf => normalizeTimeframe(tf).toLowerCase())
    
    for (const priority of timeframePriority) {
      const index = normalizedAvailable.indexOf(priority)
      if (index !== -1) {
        return availableTimeframes[index]
      }
    }
    
    // Fallback to first available
    return availableTimeframes[0] || '5m'
  }

  // Group alerts by ticker only using the utility function
  const groupedAlerts = useMemo(() => {
    const groups = groupAlertsByTicker(validAlerts)
    
    // Apply custom ordering if available
    const orderedGroups = groupOrder.length > 0 
      ? [...groups].sort((a, b) => {
          const aIndex = groupOrder.indexOf(a.key)
          const bIndex = groupOrder.indexOf(b.key)
          
          // If both are in the order array, sort by their position
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex
          }
          
          // If only one is in the order array, it comes first
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          
          // If neither is in the order array, sort alphabetically
          return a.ticker.localeCompare(b.ticker)
        })
      : groups
    
    // Apply expansion state to the groups
    return orderedGroups.map(group => ({
      ...group,
      isExpanded: expandedGroups.has(group.key)
    }))
  }, [validAlerts, expandedGroups, groupOrder])

  // Map display names back to webhook names
  const getWebhookIndicatorName = (indicatorName: string) => {
    const reverseMap: Record<string, string> = {
      'Market Core Pro™': 'SMC',
      'Extreme Zones': 'Extreme',
      'Nautilus™': 'Oscillator',
      'Market Waves Pro™': 'Wave'
    }
    return reverseMap[indicatorName] || indicatorName
  }

  // Analyze alert sentiment for card background colors
  const getGroupSentiment = (alerts: Alert[]) => {
    const totalWeight = alerts.reduce((sum, alert) => sum + alert.weight, 0)
    const avgWeight = totalWeight / alerts.length
    
    if (avgWeight > 0.5) return 'bullish'
    if (avgWeight < -0.5) return 'bearish'
    return 'neutral'
  }

  // Get actual RSI status with value from the latest RSI alert in the group
  const getRSIWithValue = (groupAlerts: Alert[]) => {
    // Find the most recent RSI alert (they're already sorted by time desc)
    const rsiAlert = groupAlerts.find(alert => 
      alert.trigger.toLowerCase().includes('rsi:') || 
      alert.indicator === 'Extreme Zones' && alert.trigger.includes('RSI:') ||
      alert.trigger.includes('RSI structure change:') ||
      alert.trigger.startsWith('RSI:')
    )
    
    if (rsiAlert) {
      // Extract RSI value and status from the new structure: "RSI: 63.25 (Bullish)"
      const trigger = rsiAlert.trigger
      
      // Handle new format: "RSI structure change: RSI: 63.25 (Bullish)" or "RSI: 63.25 (Bullish)"
      let valueMatch = trigger.match(/RSI:\s*([\d.]+)\s*\(([^)]+)\)/i)
      if (valueMatch) {
        const value = parseFloat(valueMatch[1]).toFixed(0)
        const status = valueMatch[2].trim()
        // Map the status to our display format
        let mappedStatus = status
        switch (status.toLowerCase()) {
          case 'bullish': mappedStatus = 'Bullish'; break
          case 'bearish': mappedStatus = 'Bearish'; break
          case 'neutral': mappedStatus = 'Neutral'; break
          case 'oversold': mappedStatus = 'Oversold'; break
          case 'overbought': mappedStatus = 'Overbought'; break
          case 'extremely oversold': mappedStatus = 'Extreme Oversold'; break
          case 'extremely overbought': mappedStatus = 'Extreme Overbought'; break
        }
        return { value, status: mappedStatus }
      }
      
      // Fallback to old logic for backward compatibility
      const triggerLower = trigger.toLowerCase()
      let status = 'Neutral'
      if (triggerLower.includes('oversold')) status = 'Oversold'
      if (triggerLower.includes('overbought')) status = 'Overbought' 
      if (triggerLower.includes('bullish')) status = 'Bullish'
      if (triggerLower.includes('bearish')) status = 'Bearish'
      if (triggerLower.includes('neutral')) status = 'Neutral'
      if (triggerLower.includes('extremely oversold')) status = 'Extreme Oversold'
      if (triggerLower.includes('extremely overbought')) status = 'Extreme Overbought'
      
      return { value: '0', status }
    }
    
    // Fallback to neutral if no RSI alert found
    return { value: '0', status: 'Neutral' }
  }

  // Legacy function for backward compatibility (if still used elsewhere)
  const getRSIStatus = (groupAlerts: Alert[]) => {
    const rsiData = getRSIWithValue(groupAlerts)
    return rsiData.status
  }

  // Get RSI tag color based on status
  const getRSITagColor = (status: string) => {
    switch (status) {
      case 'Over Sold':
      case 'Extreme Over Sold':
      case 'Bullish':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'Neutral':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'Bearish':
      case 'Over Bought':
      case 'Extreme Over Bought':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  // Get volume tag color based on level and change
  const getVolumeTagColor = (level: string, change: number) => {
    // If we have level indicators
    if (level === 'HIGH' && change > 0) {
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    if (level === 'HIGH' && change < 0) {
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    if (level === 'LOW') {
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
    if (level === 'NORMAL') {
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }
    
    // Fallback: Color based only on change when no level indicator
    if (change > 0) {
      return 'bg-green-500/20 text-green-400 border-green-500/30' // Positive change = green
    } else if (change < 0) {
      return 'bg-red-500/20 text-red-400 border-red-500/30' // Negative change = red
    }
    
    // Default for zero change or no data
    return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' // Cyan for volume data
  }

  // Get synergy status from the latest HTF synergy alert in the group
  const getSynergyStatus = (groupAlerts: Alert[]) => {
    // Find the most recent synergy alert (they're already sorted by time desc)
    const synergyAlert = groupAlerts.find(alert => 
      (alert.indicator === 'Extreme Zones' && alert.trigger.includes('Synergy')) ||
      alert.trigger.toLowerCase().includes('synergy')
    )
    
    if (synergyAlert) {
      const trigger = synergyAlert.trigger.toLowerCase()
      if (trigger.includes('synergy up') || trigger.includes('htf: synergy up')) return 'up'
      if (trigger.includes('synergy down') || trigger.includes('htf: synergy down')) return 'down'
      if (trigger.includes('no synergy') || trigger.includes('htf: no synergy')) return 'none'
    }
    
    // Fallback: look for any synergy mentions in HTF field
    const htfSynergyAlert = groupAlerts.find(alert => 
      alert.htf && alert.htf.toLowerCase().includes('synergy')
    )
    
    if (htfSynergyAlert) {
      const htf = htfSynergyAlert.htf?.toLowerCase() || ''
      if (htf.includes('synergy up')) return 'up'
      if (htf.includes('synergy down')) return 'down'
      if (htf.includes('no synergy')) return 'none'
    }
    
    // Default to none if no synergy data found
    return 'none'
  }

  // Get synergy tag color and text based on status
  const getSynergyTag = (status: string) => {
    switch (status) {
      case 'up':
        return { 
          text: 'S↑', 
          className: 'bg-green-500/20 text-green-400 border-green-500/30' 
        }
      case 'down':
        return { 
          text: 'S↓', 
          className: 'bg-red-500/20 text-red-400 border-red-500/30' 
        }
      case 'none':
      default:
        return { 
          text: 'S–', 
          className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' 
        }
    }
  }


  // Get latest ADX value and status from alerts for tag display
  const getADXWithValue = (groupAlerts: Alert[]) => {
    const adxAlert = groupAlerts.find(alert => 
      alert.trigger.includes('ADX:')
    )
    
    if (adxAlert) {
      // Extract ADX value and status from multiple possible formats:
      // Format 1: "ADX: 21.3 | Strong Bullish" 
      // Format 2: "ADX: 19.3 (Weak Bullish)"
      let match = adxAlert.trigger.match(/ADX:\s*([\d.]+)\s*\|\s*(.+)/i)
      if (match) {
        const value = parseFloat(match[1]).toFixed(1)
        const status = match[2].trim()
        return { value, status }
      }
      
      // Try parentheses format
      match = adxAlert.trigger.match(/ADX:\s*([\d.]+)\s*\(([^)]+)\)/i)
      if (match) {
        const value = parseFloat(match[1]).toFixed(1)
        const status = match[2].trim()
        return { value, status }
      }
    }
    
    // Return default values instead of null to keep tag visible
    return { value: '0.0', status: 'Neutral' }
  }

  // Get latest VWAP value from alerts for tag display
  const getVWAPWithValue = (groupAlerts: Alert[]) => {
    const vwapAlert = groupAlerts.find(alert => 
      alert.trigger.includes('VWAP:')
    )
    
    if (vwapAlert) {
      // Extract VWAP value from format: "VWAP: -2.09%"
      const match = vwapAlert.trigger.match(/VWAP:\s*([-+]?[\d.]+%)/i)
      if (match) {
        return { value: match[1] }
      }
    }
    
    // Return default value instead of null to keep tag visible
    return { value: '0.00%' }
  }

  // Legacy functions for backward compatibility (if still used elsewhere)
  const getLatestADX = (groupAlerts: Alert[]) => {
    const adxData = getADXWithValue(groupAlerts)
    return adxData ? `${adxData.value} (${adxData.status})` : null
  }

  const getLatestVWAP = (groupAlerts: Alert[]) => {
    const vwapData = getVWAPWithValue(groupAlerts)
    return vwapData ? vwapData.value : null
  }

  // Get dot color for individual alert based on trigger text semantics
  const getAlertDotColor = (alert: Alert) => {
    const trigger = alert.trigger.toLowerCase().trim()
    
    // Debug: log the trigger to understand what we're working with (only for problematic cases)
    if (trigger.includes('bearish') && trigger.includes('breakout')) {
      console.log('🔍 BEARISH OB BREAKOUT DEBUG:', `"${trigger}"`, 'Weight:', alert.weight)
    }
    
    // Neutral indicators (Yellow) - Check first to handle "RSI: Neutral" etc.
    if (trigger.includes('neutral')) {
      console.log('🟡 -> Neutral (yellow)')
      return 'bg-yellow-400'
    }
    
    // Bullish indicators (Green) - More comprehensive patterns
    const bullishPatterns = [
      // HTF patterns
      'synergy up', 'htf: synergy up',
      // VWAP patterns  
      'vwap touch from below', 'touch from below',
      // General bullish
      'bullish', 'buy', 'long', 'up', 
      // Technical patterns
      'support', 'bounce', 'bullish breakout', 'oversold', 'discount', 'bottom',
      // Order blocks and structure
      'bullish ob touch', 'ob touch', 'order block touch',
      'bullish ob breakout',
      // Extreme zones reversed (bullish reversal)
      'premium zone reversed', 'extreme premium zone reversed',
      // Other patterns
      'golden', 'upward', 'uptrend'
    ]
    
    // Bearish indicators (Red) - More comprehensive patterns
    const bearishPatterns = [
      // HTF patterns
      'synergy down', 'htf: synergy down',
      // VWAP patterns
      'vwap touch from above', 'touch from above', 
      // General bearish
      'bearish', 'sell', 'short', 'down',
      // Technical patterns  
      'resistance', 'rejection', 'bearish breakdown', 'breakdown', 'overbought', 'premium', 'top',
      // Volume patterns
      'bearish volume cross', 'volume cross',
      // Order Block patterns
      'bearish ob breakout', 'ob breakout',
      // Sell signals
      'sell+', 'sell-',
      // Other patterns
      'downward', 'downtrend'
    ]
    
    // Check for specific bearish patterns FIRST (before general patterns)
    if (trigger.includes('bearish')) {
      for (const pattern of bearishPatterns) {
        if (trigger.includes(pattern)) {
          console.log('🔴 -> Bearish (red) - matched:', `"${pattern}"`)
          return 'bg-red-400'
        }
      }
    }
    
    // Then check for bullish signals  
    for (const pattern of bullishPatterns) {
      if (trigger.includes(pattern)) {
        console.log('🟢 -> Bullish (green) - matched:', `"${pattern}"`)
        return 'bg-green-400'
      }
    }
    
    // Finally check for general bearish patterns
    for (const pattern of bearishPatterns) {
      if (trigger.includes(pattern)) {
        console.log('🔴 -> Bearish (red) - matched:', `"${pattern}"`)
        return 'bg-red-400'
      }
    }
    
    // Fallback: use weight if no semantic match
    console.log('⚖️ -> Fallback to weight:', alert.weight)
    if (alert.weight > 0) {
      console.log('🟢 -> Weight-based green')
      return 'bg-green-400'
    }
    if (alert.weight < 0) {
      console.log('🔴 -> Weight-based red')
      return 'bg-red-400'
    }
    console.log('🟡 -> Weight-based yellow (neutral)')
    return 'bg-yellow-400'
  }

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const expandAllGroups = () => {
    setExpandedGroups(new Set(groupedAlerts.map(group => group.key)))
  }

  const collapseAllGroups = () => {
    setExpandedGroups(new Set())
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, groupKey: string) => {
    setDraggedGroup(groupKey)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', groupKey)
  }

  const handleDragOver = (e: React.DragEvent, groupKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverGroup(groupKey)
  }

  const handleDragLeave = () => {
    setDragOverGroup(null)
  }

  const handleDrop = (e: React.DragEvent, targetGroupKey: string) => {
    e.preventDefault()
    const sourceGroupKey = draggedGroup
    
    if (!sourceGroupKey || sourceGroupKey === targetGroupKey) {
      setDraggedGroup(null)
      setDragOverGroup(null)
      return
    }
    
    // Get current group keys in display order
    const currentKeys = groupedAlerts.map(group => group.key)
    
    // Find indices
    const sourceIndex = currentKeys.indexOf(sourceGroupKey)
    const targetIndex = currentKeys.indexOf(targetGroupKey)
    
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedGroup(null)
      setDragOverGroup(null)
      return
    }
    
    // Create new order array
    const newOrder = [...currentKeys]
    const [movedItem] = newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, movedItem)
    
    // Save the new order
    saveGroupOrder(newOrder)
    
    setDraggedGroup(null)
    setDragOverGroup(null)
  }

  const handleSort = (field: SortField, groupKey: string) => {
    // For now, we'll keep sorting per-group simple
    // In a more advanced implementation, you could sort within each group
  }

  const handleClearAlerts = async () => {
    if (!onClearAlerts) return
    
    const confirmed = window.confirm('Are you sure you want to clear all alerts? This action cannot be undone.')
    if (!confirmed) return

    setIsClearing(true)
    try {
      await onClearAlerts()
    } catch (error) {
      console.error('Failed to clear alerts:', error)
    } finally {
      setIsClearing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-background-surface rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold" style={{ color: "#E0E6ED" }}>
            Recent Alerts
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-full mb-2" />
              <div className="h-3 bg-gray-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="bg-background-surface rounded-2xl shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: "#E0E6ED" }}>
            Recent Alerts
          </h3>
          <div className="flex items-center gap-2">
            {onClearAlerts && validAlerts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAlerts}
                disabled={isClearing}
                className="bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isClearing ? 'Clearing...' : 'Clear All'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-h-[1320px] overflow-y-auto">
        {groupedAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <p style={{ color: "#A3A9B8" }} className="text-sm">
              No active alerts within the configured timeframe windows.
            </p>
            <p style={{ color: "#6B7280" }} className="text-xs mt-1">
              Adjust timeframe window settings to see older alerts.
            </p>
          </div>
        ) : (
          /* Card View */
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4">
              {groupedAlerts.map((group, groupIndex) => {
                const timeframes = [...new Set(group.alerts.map(alert => normalizeTimeframe(alert.timeframe)))]
                const selectedTimeframe = getSelectedTimeframe(group.key, timeframes)
                
                // Filter alerts by selected timeframe
                const filteredAlerts = group.alerts.filter(alert => 
                  normalizeTimeframe(alert.timeframe) === selectedTimeframe
                )
                
                const sentiment = showWeights ? getGroupSentiment(filteredAlerts) : 'neutral'
                const isCardExpanded = expandedCards.has(group.key)
                const displayAlerts = isCardExpanded ? filteredAlerts : filteredAlerts.slice(0, 4)
                const hasMore = filteredAlerts.length > 4
                
                return (
                  <motion.div
                    key={group.key}
                    className={`rounded-xl p-4 border transition-all duration-200 ${
                      sentiment === 'bullish' 
                        ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15' 
                        : sentiment === 'bearish'
                        ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'
                        : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: groupIndex * 0.1 }}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg" style={{ color: "#E0E6ED" }}>
                          {group.ticker}
                        </span>
                        <span 
                          className={`text-xs px-2 py-1 rounded-full ${
                            sentiment === 'bullish' 
                              ? 'bg-green-500/20 text-green-400' 
                              : sentiment === 'bearish'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {filteredAlerts.length}
                        </span>
                      </div>
                      
                      {/* Timeframe indicators and RSI status */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {timeframes.map((tf, i) => (
                          <button
                            key={i}
                            onClick={() => handleCardTimeframeSelect(group.key, tf)}
                            className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                              tf === selectedTimeframe
                                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                            }`}
                            title={`Show ${tf} alerts`}
                          >
                            {tf}
                          </button>
                        ))}
                        {/* RSI Status Tag with Real-time Value */}
                        {(() => {
                          const rsiData = getRSIDisplay(group.ticker)
                          const displayText = rsiData.value === '0' 
                            ? `RSI ${rsiData.status}` 
                            : `RSI ${rsiData.value} ${rsiData.status}`
                          return (
                            <span 
                              className={`text-xs px-1.5 py-0.5 rounded border ${getRSITagColor(rsiData.status)}`}
                            >
                              {displayText}
                            </span>
                          )
                        })()}
                        {/* ADX Status Tag with Real-time Value */}
                        {(() => {
                          const adxData = getADXDisplay(group.ticker)
                          return (
                            <span 
                              className="text-xs px-1.5 py-0.5 rounded border bg-blue-500/20 text-blue-400 border-blue-500/30"
                            >
                              ADX {adxData.value} {adxData.status}
                            </span>
                          )
                        })()}
                        {/* VWAP Status Tag with Real-time Value */}
                        {(() => {
                          const vwapData = getVWAPDisplay(group.ticker)
                          return (
                            <span 
                              className="text-xs px-1.5 py-0.5 rounded border bg-purple-500/20 text-purple-400 border-purple-500/30"
                            >
                              VWAP {vwapData.value}
                            </span>
                          )
                        })()}
                        {/* Volume Status Tag with Real-time Value */}
                        {(() => {
                          const volumeData = getVolumeDisplay(group.ticker)
                          if (volumeData.amount === '0') return null // Don't show if no volume data
                          
                          const changeText = volumeData.change > 0 ? `+${volumeData.change}%` : `${volumeData.change}%`
                          // Format: "Vol 25.32K -38%" or "Vol 12.49K +149% HIGH" (if level exists)
                          const displayText = volumeData.level && volumeData.level !== 'NORMAL' 
                            ? `Vol ${volumeData.amount} ${changeText} ${volumeData.level}`
                            : `Vol ${volumeData.amount} ${changeText}`
                          
                          return (
                            <span 
                              className={`text-xs px-1.5 py-0.5 rounded border ${getVolumeTagColor(volumeData.level, volumeData.change)}`}
                            >
                              {displayText}
                            </span>
                          )
                        })()}
                        {/* Synergy Status Tag - Only show if synergy exists */}
                        {(() => {
                          const synergyStatus = getSynergyStatus(filteredAlerts)
                          // Only render tag if there's actual synergy (up or down), hide for 'none'
                          if (synergyStatus === 'none') return null
                          
                          const synergyTag = getSynergyTag(synergyStatus)
                          return (
                            <span 
                              className={`text-xs px-1.5 py-0.5 rounded border ${synergyTag.className}`}
                            >
                              {synergyTag.text}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                    
                    {/* Latest Alerts */}
                    <div className="space-y-2">
                      {displayAlerts.map((alert, alertIndex) => {
                        const isExpiring = expiringAlerts.has(alert.id)
                        return (
                          <div 
                            key={alert.id}
                            className={`flex items-center justify-between py-1 px-2 rounded text-xs transition-opacity ${
                              isExpiring ? 'opacity-60' : ''
                            } ${
                              showWeights 
                                ? (alert.weight > 0 ? 'bg-green-500/10' : alert.weight < 0 ? 'bg-red-500/10' : 'bg-gray-500/10')
                                : 'bg-gray-500/10'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Visual Color Dot */}
                              {showVisualColors && (
                                <div className={`w-2 h-2 rounded-full shrink-0 ${getAlertDotColor(alert)}`} />
                              )}
                              <span className="font-mono text-gray-400 shrink-0">
                                {alert.time.split(' ')[0]} {/* Show only time part */}
                              </span>
                              <span className="text-gray-300 truncate">
                                {getWebhookIndicatorName(alert.indicator)}
                              </span>
                              <span className="text-gray-400 truncate">
                                {alert.trigger}
                              </span>
                            </div>
                            
                            {/* Price on the right side */}
                            {alert.price && (
                              <div className="text-blue-400 font-mono text-sm shrink-0 mr-2">
                                ${alert.price.toLocaleString()}
                              </div>
                            )}
                            
                            {showWeights && (
                              <div className="flex items-center gap-1 shrink-0">
                                {alert.weight > 0 ? (
                                  <TrendingUp className="w-3 h-3 text-green-400" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 text-red-400" />
                                )}
                                <span className={`font-bold ${alert.weight > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {alert.weight > 0 ? '+' : ''}{alert.weight.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {hasMore && !isCardExpanded && (
                        <div className="text-center pt-1">
                          <button 
                            onClick={() => toggleCardExpansion(group.key)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                          >
                            +{filteredAlerts.length - 4} more alerts
                          </button>
                        </div>
                      )}
                      
                      {isCardExpanded && hasMore && (
                        <div className="text-center pt-1">
                          <button 
                            onClick={() => toggleCardExpansion(group.key)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                          >
                            Show less
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Card Footer */}
                    <div className="mt-3 pt-2 border-t border-gray-700/30">
                      <div className="flex items-center justify-between">
                        {/* Left side: Latest time and indicators */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs text-gray-400 shrink-0">
                            Latest: {group.alerts[0]?.time}
                          </span>
                        </div>
                        
                        {/* Right side: Total weight */}
                        {showWeights && (
                          <span className={`text-xs font-bold shrink-0 ${
                            group.alerts.reduce((sum, alert) => sum + alert.weight, 0) > 0 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            Total: {group.alerts.reduce((sum, alert) => sum + alert.weight, 0).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Fade-out indicator for removed alerts */}
      {alerts.length !== validAlerts.length && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20">
          <p className="text-xs text-amber-400 text-center">
            {alerts.length - validAlerts.length} alerts removed due to timeframe window expiry
          </p>
        </div>
      )}
    </motion.div>
  )
}