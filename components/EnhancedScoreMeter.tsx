"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react"

interface EnhancedScoreMeterProps {
  score: number
  status: "BUY" | "SELL" | "NEUTRAL"
  buyThreshold: number
  sellThreshold: number
  totalAlerts: number
  lastUpdate: string
}

export function EnhancedScoreMeter({
  score,
  status,
  buyThreshold,
  sellThreshold,
  totalAlerts,
  lastUpdate,
}: EnhancedScoreMeterProps) {
  const getStatusColor = () => {
    switch (status) {
      case "BUY":
        return "text-accent-buy"
      case "SELL":
        return "text-accent-sell"
      default:
        return "text-accent-neutral"
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "BUY":
        return <TrendingUp className="w-6 h-6" />
      case "SELL":
        return <TrendingDown className="w-6 h-6" />
      default:
        return <Minus className="w-6 h-6" />
    }
  }

  const getStatusSymbol = () => {
    switch (status) {
      case "BUY":
        return "▲"
      case "SELL":
        return "▼"
      default:
        return "●"
    }
  }

  const normalizedScore = Math.max(-10, Math.min(10, score))
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - ((normalizedScore + 10) / 20) * circumference

  return (
    <div className="bg-background-surface p-6 rounded-2xl shadow-lg">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2" style={{ color: "#E0E6ED" }}>
          Live Scoring
        </h3>
      </div>

      {/* Circular Gauge */}
      <div className="relative w-40 h-40 mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-700" />

          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            className={getStatusColor()}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className={`text-3xl font-bold ${getStatusColor()}`}
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {score.toFixed(1)}
          </motion.div>
        </div>
      </div>

      {/* Status Badge */}
      <motion.div
        className={`flex items-center justify-center gap-2 mb-6 ${getStatusColor()}`}
        key={status}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {getStatusIcon()}
        <span className="text-xl font-bold">
          {status} {getStatusSymbol()}
        </span>
      </motion.div>

      {/* Mini Stats */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span style={{ color: "#A3A9B8" }}>Total Alerts:</span>
          <span style={{ color: "#E0E6ED" }} className="font-medium">
            {totalAlerts}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: "#A3A9B8" }}>Last Update:</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" style={{ color: "#A3A9B8" }} />
            <span style={{ color: "#E0E6ED" }} className="font-medium">
              {lastUpdate}
            </span>
          </div>
        </div>
      </div>

      {/* Thresholds */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between text-xs">
        <span className="text-accent-buy">Buy ≤ {buyThreshold}</span>
        <span className="text-accent-sell">Sell ≥ {sellThreshold}</span>
      </div>
    </div>
  )
}
