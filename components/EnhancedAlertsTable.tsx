"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useMemo } from "react"

interface Alert {
  id: string
  time: string
  ticker: string
  timeframe: string
  indicator: string
  trigger: string
  weight: number
  htf?: string
}

interface EnhancedAlertsTableProps {
  alerts: Alert[]
  loading?: boolean
  onClearAlerts?: () => void
  showWeights?: boolean
}

type SortField = 'time' | 'ticker' | 'timeframe' | 'indicator' | 'trigger' | 'weight' | 'htf'
type SortDirection = 'asc' | 'desc'

export function EnhancedAlertsTable({ alerts, loading, onClearAlerts, showWeights = true }: EnhancedAlertsTableProps) {
  const [isClearing, setIsClearing] = useState(false)
  const [sortField, setSortField] = useState<SortField>('time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Special handling for time sorting - use timestamp for accurate sorting
      if (sortField === 'time') {
        aValue = a.timestamp || a.time
        bValue = b.timestamp || b.time
      }

      // Handle string comparisons
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [alerts, sortField, sortDirection])

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-400" /> : 
      <ChevronDown className="w-4 h-4 text-blue-400" />
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
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: "#E0E6ED" }}>
          Recent Alerts ({alerts.length}) - HTF Test
        </h3>
        {onClearAlerts && alerts.length > 0 && (
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

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-background border-b border-gray-700">
            <tr>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-gray-800/50 transition-colors group"
                style={{ color: "#A3A9B8" }}
                onClick={() => handleSort('time')}
              >
                <div className="flex items-center justify-between">
                  Time
                  {getSortIcon('time')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-gray-800/50 transition-colors group"
                style={{ color: "#A3A9B8" }}
                onClick={() => handleSort('ticker')}
              >
                <div className="flex items-center justify-between">
                  Ticker
                  {getSortIcon('ticker')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-gray-800/50 transition-colors group"
                style={{ color: "#A3A9B8" }}
                onClick={() => handleSort('timeframe')}
              >
                <div className="flex items-center justify-between">
                  Timeframe
                  {getSortIcon('timeframe')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-gray-800/50 transition-colors group"
                style={{ color: "#A3A9B8" }}
                onClick={() => handleSort('indicator')}
              >
                <div className="flex items-center justify-between">
                  Indicator
                  {getSortIcon('indicator')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-gray-800/50 transition-colors group"
                style={{ color: "#A3A9B8" }}
                onClick={() => handleSort('trigger')}
              >
                <div className="flex items-center justify-between">
                  Trigger
                  {getSortIcon('trigger')}
                </div>
              </th>
              {showWeights && (
                <th 
                  className="px-4 py-3 text-right text-sm font-medium cursor-pointer hover:bg-gray-800/50 transition-colors group"
                  style={{ color: "#A3A9B8" }}
                  onClick={() => handleSort('weight')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Weight
                    {getSortIcon('weight')}
                  </div>
                </th>
              )}
              {/* HTF Column - positioned last after Weight */}
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-gray-800/50 transition-colors group"
                style={{ color: "#A3A9B8" }}
                onClick={() => handleSort('htf')}
              >
                <div className="flex items-center justify-between">
                  HTF
                  {getSortIcon('htf')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAlerts.map((alert, index) => (
              <motion.tr
                key={alert.id}
                className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                  alert.weight > 0 ? "bg-green-500/5 hover:bg-green-500/10" : "bg-red-500/5 hover:bg-red-500/10"
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <td className="px-4 py-3 text-sm font-mono" style={{ color: "#E0E6ED" }}>
                  {alert.time}
                </td>
                <td className="px-4 py-3 text-sm font-bold" style={{ color: "#E0E6ED" }}>
                  {alert.ticker}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#A3A9B8" }}>
                  <span className="bg-blue-900/30 px-2 py-1 rounded text-xs font-mono text-blue-300">
                    {alert.timeframe}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#A3A9B8" }}>
                  {alert.indicator}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#A3A9B8" }}>
                  {alert.trigger}
                </td>
                {showWeights && (
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      {alert.weight > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`font-bold ${alert.weight > 0 ? "text-green-400" : "text-red-400"}`}>
                        {alert.weight > 0 ? "+" : ""}
                        {alert.weight.toFixed(1)}
                      </span>
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 text-sm" style={{ color: "#A3A9B8" }}>
                  {alert.htf ? (
                    <span className="bg-purple-900/30 px-2 py-1 rounded text-xs font-mono text-purple-300">
                      {alert.htf}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">-</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
