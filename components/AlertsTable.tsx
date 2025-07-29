"use client"

import { motion } from "framer-motion"

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
  loading?: boolean
}

export function AlertsTable({ alerts, loading }: AlertsTableProps) {
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
        <h3 className="text-lg font-semibold" style={{ color: "#E0E6ED" }}>
          Recent Alerts ({alerts.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background border-b border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>
                Time
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>
                Ticker
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>
                Indicator
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>
                Trigger
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: "#A3A9B8" }}>
                Weight
              </th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, index) => (
              <motion.tr
                key={alert.id}
                className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <td className="px-4 py-3 text-sm" style={{ color: "#E0E6ED" }}>
                  {alert.time}
                </td>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "#E0E6ED" }}>
                  {alert.ticker}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#A3A9B8" }}>
                  {alert.indicator}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#A3A9B8" }}>
                  {alert.trigger}
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  <span className={alert.weight >= 0 ? "text-accent-buy" : "text-accent-sell"}>
                    {alert.weight > 0 ? "+" : ""}
                    {alert.weight.toFixed(2)}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
