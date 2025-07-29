"use client"

import { motion } from "framer-motion"
import { Activity, Target, Zap } from "lucide-react"

interface StatsPanelProps {
  totalAlerts: number
  activeStrategies: number
  accuracy: number
}

export function StatsPanel({ totalAlerts, activeStrategies, accuracy }: StatsPanelProps) {
  const stats = [
    {
      label: "Total Alerts",
      value: totalAlerts,
      icon: Activity,
      color: "text-accent-neutral",
    },
    {
      label: "Active Strategies",
      value: activeStrategies,
      icon: Target,
      color: "text-accent-buy",
    },
    {
      label: "Accuracy",
      value: `${accuracy}%`,
      icon: Zap,
      color: "text-accent-buy",
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="trading-card p-6"
    >
      <h3 className="text-lg font-semibold text-text-primary mb-4">Statistics</h3>

      <div className="space-y-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-text-secondary">{stat.label}</span>
            </div>
            <span className="text-text-primary font-semibold">{stat.value}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
