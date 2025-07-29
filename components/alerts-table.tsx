"use client"

import { motion } from "framer-motion"
import { Clock, TrendingUp, TrendingDown } from "lucide-react"

interface Alert {
  id: string
  time: string
  ticker: string
  indicator: string
  trigger: string
  weight: number
}

interface AlertsTableProps {
  alerts: Alert[]
  loading: boolean
}

export function AlertsTable({ alerts, loading }: AlertsTableProps) {
  if (loading) {
    return (
      <div className="trading-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Alerts</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="trading-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-text-secondary" />
        <h3 className="text-lg font-semibold text-text-primary">Recent Alerts</h3>
      </div>

      <div className="overflow-hidden rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-gray-700">
              <th className="text-left py-3 px-4 text-text-secondary text-sm font-medium">Time</th>
              <th className="text-left py-3 px-4 text-text-secondary text-sm font-medium">Ticker</th>
              <th className="text-left py-3 px-4 text-text-secondary text-sm font-medium">Indicator</th>
              <th className="text-left py-3 px-4 text-text-secondary text-sm font-medium">Trigger</th>
              <th className="text-right py-3 px-4 text-text-secondary text-sm font-medium">Weight</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, index) => (
              <motion.tr
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border-b border-gray-800/50 hover:bg-background-surface/50 transition-colors"
              >
                <td className="py-3 px-4 text-text-primary text-sm font-mono">{alert.time}</td>
                <td className="py-3 px-4 text-text-primary font-semibold">{alert.ticker}</td>
                <td className="py-3 px-4 text-text-secondary">{alert.indicator}</td>
                <td className="py-3 px-4 text-text-secondary">{alert.trigger}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {alert.weight > 0 ? (
                      <TrendingUp className="w-4 h-4 text-accent-sell" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-accent-buy" />
                    )}
                    <span className={`font-semibold ${alert.weight > 0 ? "text-accent-sell" : "text-accent-buy"}`}>
                      {alert.weight > 0 ? "+" : ""}
                      {alert.weight}
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
