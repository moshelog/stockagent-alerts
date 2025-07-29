"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface ScoreMeterProps {
  score: number
  status: "BUY" | "SELL" | "NEUTRAL"
  buyThreshold: number
  sellThreshold: number
}

export function ScoreMeter({ score, status, buyThreshold, sellThreshold }: ScoreMeterProps) {
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

  const normalizedScore = Math.max(-10, Math.min(10, score))
  const percentage = ((normalizedScore + 10) / 20) * 100

  return (
    <div className="bg-background-surface p-6 rounded-2xl shadow-lg">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2" style={{ color: "#E0E6ED" }}>
          Market Score
        </h3>
        <div className="flex items-center justify-center gap-2">
          <span className={`text-3xl font-bold ${getStatusColor()}`}>{score.toFixed(1)}</span>
        </div>
      </div>

      {/* Horizontal Bar Meter */}
      <div className="relative mb-4">
        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${
              status === "BUY" ? "bg-accent-buy" : status === "SELL" ? "bg-accent-sell" : "bg-accent-neutral"
            }`}
            initial={{ width: "50%" }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Threshold markers */}
        <div className="absolute top-0 left-1/4 w-0.5 h-4 bg-gray-600" />
        <div className="absolute top-0 right-1/4 w-0.5 h-4 bg-gray-600" />
      </div>

      {/* Status Display */}
      <motion.div
        className={`flex items-center justify-center gap-2 ${getStatusColor()}`}
        key={status}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {getStatusIcon()}
        <span className="text-xl font-bold">{status}</span>
      </motion.div>

      {/* Thresholds */}
      <div className="mt-4 flex justify-between text-sm" style={{ color: "#A3A9B8" }}>
        <span>Buy: ≤{buyThreshold}</span>
        <span>Sell: ≥{sellThreshold}</span>
      </div>
    </div>
  )
}
