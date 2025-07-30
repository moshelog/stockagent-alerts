"use client"

import { motion } from "framer-motion"
import { Zap, Settings, Clock } from "lucide-react"

interface TickerAlert {
  strategy: string
  ticker: string
  timeframe: string
  timestamp: string
  alertsFound: string[]
  missingAlerts: string[]
  score: number
}

interface CompactLiveScoringProps {
  lastAction?: {
    action: "Buy" | "Sell"
    ticker: string
    strategy?: string | null
  }
  tickerData: TickerAlert[]
  totalAlerts: number
  activeStrategies: number
  timeWindowMinutes?: number
  onTimeWindowChange?: (minutes: number) => void
  showWeights?: boolean
}

export function CompactLiveScoring({ 
  lastAction, 
  tickerData, 
  totalAlerts, 
  activeStrategies, 
  timeWindowMinutes = 60,
  onTimeWindowChange,
  showWeights = true
}: CompactLiveScoringProps) {
  const getScoreColor = (score: number) => {
    if (score > 0) return "text-green-400"
    if (score < 0) return "text-red-400"
    return "text-gray-400"
  }

  const getActionColor = (action: string) => {
    return action === "Buy" ? "text-green-400" : "text-red-400"
  }

  const formatAlertsList = (alerts: string[]) => {
    if (alerts.length === 0) return "—"
    if (alerts.length <= 3) return alerts.join(", ")
    return `${alerts.slice(0, 2).join(", ")}, +${alerts.length - 2}`
  }

  const formatAction = (alerts: string[]) => {
    if (alerts.length === 0) return <span>—</span>
    
    return (
      <span>
        {alerts.map((alert, index) => {
          if (alert === "Buy") {
            return (
              <span key={index} className="px-2 py-1 bg-green-500/20 text-green-400 rounded-md text-xs font-semibold">
                Buy
              </span>
            )
          } else if (alert === "Sell") {
            return (
              <span key={index} className="px-2 py-1 bg-red-500/20 text-red-400 rounded-md text-xs font-semibold">
                Sell
              </span>
            )
          } else {
            return <span key={index}>{alert}</span>
          }
        }).reduce((prev, curr, index) => 
          index === 0 ? curr : [prev, ", ", curr]
        )}
      </span>
    )
  }

  return (
    <motion.div
      className="bg-background-surface rounded-2xl shadow-lg border border-gray-800/50 overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header - Recent Action and Time Window */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: "#E0E6ED" }}>
            {lastAction ? (
              <>
                Recent Action:{" "}
                <span className={`font-bold ${getActionColor(lastAction.action)}`}>
                  {lastAction.action} {lastAction.ticker}
                </span>
                {lastAction.strategy && (
                  <span className="text-xs ml-2 px-2 py-1 bg-gray-700 rounded-full" style={{ color: "#A3A9B8" }}>
                    {lastAction.strategy}
                  </span>
                )}
              </>
            ) : (
              <>
                Recent Action: <span className="font-bold text-gray-400">None</span>
              </>
            )}
          </div>
          
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700/50" />

      {/* Ticker Table */}
      <div 
        className="border border-gray-700/30 rounded relative"
        style={{ height: "280px" }}
      >
        <div 
          className="absolute inset-0 overflow-y-scroll overflow-x-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#4B5563 #1F2937"
          }}
        >
        <table className="w-full">
          <thead className="bg-background border-b border-gray-700 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: "#A3A9B8" }}>
                Timestamp
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: "#A3A9B8" }}>
                Ticker
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: "#A3A9B8" }}>
                Timeframe
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: "#A3A9B8" }}>
                Alerts Found
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: "#A3A9B8" }}>
                Action
              </th>
              {showWeights && (
                <th className="px-3 py-2 text-right text-xs font-medium" style={{ color: "#A3A9B8" }}>
                  Score
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {tickerData.length === 0 ? (
              // Show message when no strategies are triggered
              [...Array(1)].map((_, index) => (
                <tr key={`no-triggers-${index}`} className="border-b border-gray-800/50">
                  <td className="px-3 py-3 text-sm text-gray-400 text-center" colSpan={6}>
                    No strategy conditions were met.
                  </td>
                </tr>
              ))
            ) : (
              [
                ...tickerData.map((item, index) => (
              <motion.tr
                key={`${item.strategy}-${item.ticker}`}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <td className="px-3 py-2 text-xs" style={{ color: "#A3A9B8" }}>
                  {item.timestamp}
                </td>
                <td className="px-3 py-2 text-sm font-bold" style={{ color: "#E0E6ED" }}>
                  {item.ticker}
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: "#A3A9B8" }}>
                  <span className="bg-blue-900/30 px-2 py-1 rounded text-xs font-mono text-blue-300">
                    {item.timeframe}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: "#E0E6ED" }}>
                  {formatAlertsList(item.alertsFound)}
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: "#A3A9B8" }}>
                  {formatAction(item.missingAlerts)}
                </td>
                {showWeights && (
                  <td className="px-3 py-2 text-right">
                    <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>
                      {item.score > 0 ? "+" : ""}
                      {item.score.toFixed(1)}
                    </span>
                  </td>
                )}
              </motion.tr>
                )),
                // Add extra rows to ensure scrollbar is always visible
                ...Array(5).fill(null).map((_, index) => (
                  <tr key={`spacer-${index}`} className="border-b border-gray-800/50">
                    <td className="px-3 py-3 text-xs text-transparent" colSpan={6}>
                      &nbsp;
                    </td>
                  </tr>
                ))
              ]
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700/50" />

      {/* Footer Stats */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-900/30 to-gray-800/20">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-neutral" />
            <span style={{ color: "#E0E6ED" }}>
              <span className="font-semibold">{totalAlerts}</span> alerts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent-buy" />
            <span style={{ color: "#E0E6ED" }}>
              <span className="font-semibold">{activeStrategies}</span> strategies active
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
