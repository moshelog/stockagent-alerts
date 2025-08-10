"use client"

import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, TrendingDown, Trash2, ChevronUp, ChevronDown, ChevronRight, Clock, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useMemo, useEffect } from "react"
import { getExpiringAlerts, getTimeUntilExpiry, groupAlertsByTicker } from "@/utils/alertFiltering"
import { normalizeTimeframe } from "@/utils/timeframeUtils"

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
  alertTimeframes
}: GroupedAlertsTableProps) {
  const [isClearing, setIsClearing] = useState(false)
  const [sortField, setSortField] = useState<SortField>('time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expiringAlerts, setExpiringAlerts] = useState<Set<string>>(new Set())
  const [groupOrder, setGroupOrder] = useState<string[]>([])
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)

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
    return alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp || alert.time)
      const timeframeWindow = alertTimeframes.overrides[alert.timeframe] || alertTimeframes.globalDefault
      const windowMs = timeframeWindow * 60 * 1000 // Convert minutes to milliseconds
      const timeDiff = now.getTime() - alertTime.getTime()
      
      return timeDiff <= windowMs
    })
  }, [alerts, alertTimeframes])

  // Load group order from localStorage on mount
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

  // Group alerts by ticker only using the new utility function
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
            Recent Alerts ({validAlerts.length})
          </h3>
          <div className="flex items-center gap-2">
            {groupedAlerts.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAllGroups}
                  className="bg-transparent border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAllGroups}
                  className="bg-transparent border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  Collapse All
                </Button>
              </>
            )}
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

      <div className="max-h-[600px] overflow-y-auto">
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
          <div className="space-y-1">
            {groupedAlerts.map((group, groupIndex) => (
              <div key={group.key}>
                {/* Group Header */}
                <motion.div
                  className={`bg-gray-800/30 hover:bg-gray-800/50 transition-colors border-b border-gray-700/50 ${
                    draggedGroup === group.key ? 'opacity-50' : ''
                  } ${
                    dragOverGroup === group.key ? 'bg-blue-500/20 border-blue-500/50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, group.key)}
                  onDragOver={(e) => handleDragOver(e, group.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, group.key)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: draggedGroup === group.key ? 0.5 : 1 }}
                  transition={{ duration: 0.3, delay: groupIndex * 0.1 }}
                >
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Drag Handle */}
                      <div 
                        className="cursor-grab active:cursor-grabbing hover:bg-gray-700/50 rounded p-1 transition-colors"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4" style={{ color: "#6B7280" }} />
                      </div>
                      
                      <motion.div
                        animate={{ rotate: expandedGroups.has(group.key) ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => toggleGroup(group.key)}
                        className="cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" style={{ color: "#A3A9B8" }} />
                      </motion.div>
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => toggleGroup(group.key)}
                      >
                        <span className="font-bold text-lg" style={{ color: "#E0E6ED" }}>
                          {group.ticker}
                        </span>
                        <span className="text-sm" style={{ color: "#A3A9B8" }}>
                          ({group.alerts.length})
                        </span>
                      </div>
                    </div>
                    
                    {/* Group summary info */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span style={{ color: "#A3A9B8" }}>Latest:</span>
                        <span className="font-mono" style={{ color: "#E0E6ED" }}>
                          {group.alerts[0]?.time}
                        </span>
                      </div>
                      {showWeights && (
                        <div className="flex items-center gap-2">
                          <span style={{ color: "#A3A9B8" }}>Total Weight:</span>
                          <span className={`font-bold ${
                            group.alerts.reduce((sum, alert) => sum + alert.weight, 0) > 0 
                              ? "text-green-400" 
                              : "text-red-400"
                          }`}>
                            {group.alerts.reduce((sum, alert) => sum + alert.weight, 0).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Group Content */}
                <AnimatePresence>
                  {expandedGroups.has(group.key) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="bg-gray-900/20">
                        <table className="w-full">
                          <thead className="bg-gray-800/30 border-b border-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: "#A3A9B8" }}>
                                Time
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: "#A3A9B8" }}>
                                Timeframe
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: "#A3A9B8" }}>
                                Price
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: "#A3A9B8" }}>
                                Indicator
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: "#A3A9B8" }}>
                                Trigger
                              </th>
                              {showWeights && (
                                <th className="px-4 py-2 text-right text-xs font-medium" style={{ color: "#A3A9B8" }}>
                                  Weight
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {group.alerts.map((alert, alertIndex) => {
                              const isExpiring = expiringAlerts.has(alert.id)
                              return (
                              <motion.tr
                                key={alert.id}
                                className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                                  alert.weight > 0 ? "bg-green-500/3 hover:bg-green-500/8" : "bg-red-500/3 hover:bg-red-500/8"
                                } ${
                                  isExpiring ? "opacity-60 animate-pulse" : ""
                                }`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: isExpiring ? 0.6 : 1, x: 0 }}
                                transition={{ duration: 0.2, delay: alertIndex * 0.05 }}
                              >
                                <td className="px-4 py-2 text-xs font-mono" style={{ color: "#E0E6ED" }}>
                                  <div className="flex items-center gap-2">
                                    {alert.time}
                                    {isExpiring && (
                                      <div className="flex items-center gap-1 text-amber-400">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-[10px]">
                                          {alertTimeframes && getTimeUntilExpiry(alert, alertTimeframes)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-xs font-mono" style={{ color: "#A3A9B8" }}>
                                  {normalizeTimeframe(alert.timeframe)}
                                </td>
                                <td className="px-4 py-2 text-xs" style={{ color: "#A3A9B8" }}>
                                  {alert.price ? `$${alert.price.toLocaleString()}` : '—'}
                                </td>
                                <td className="px-4 py-2 text-xs" style={{ color: "#A3A9B8" }}>
                                  {getWebhookIndicatorName(alert.indicator)}
                                </td>
                                <td className="px-4 py-2 text-xs" style={{ color: "#A3A9B8" }}>
                                  {alert.trigger}
                                </td>
                                {showWeights && (
                                  <td className="px-4 py-2 text-xs text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {alert.weight > 0 ? (
                                        <TrendingUp className="w-3 h-3 text-green-400" />
                                      ) : (
                                        <TrendingDown className="w-3 h-3 text-red-400" />
                                      )}
                                      <span className={`font-bold ${alert.weight > 0 ? "text-green-400" : "text-red-400"}`}>
                                        {alert.weight > 0 ? "+" : ""}
                                        {alert.weight.toFixed(1)}
                                      </span>
                                    </div>
                                  </td>
                                )}
                              </motion.tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
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