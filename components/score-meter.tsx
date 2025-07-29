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
  const getColor = () => {
    if (score >= sellThreshold) return "text-accent-sell"
    if (score <= buyThreshold) return "text-accent-buy"
    return "text-accent-neutral"
  }

  const getGlowClass = () => {
    if (score >= sellThreshold) return "neon-glow-red"
    if (score <= buyThreshold) return "neon-glow"
    return "neon-glow-orange"
  }

  const getIcon = () => {
    if (status === "BUY") return <TrendingUp className="w-8 h-8" />
    if (status === "SELL") return <TrendingDown className="w-8 h-8" />
    return <Minus className="w-8 h-8" />
  }

  const normalizedScore = Math.max(-10, Math.min(10, score))
  const percentage = ((normalizedScore + 10) / 20) * 100

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="trading-card p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-6">Market Score</h3>

      <div className="relative w-48 h-48 mx-auto mb-6">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-700" />

          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            className={getColor()}
            strokeDasharray={`${2 * Math.PI * 40}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
            animate={{
              strokeDashoffset: 2 * Math.PI * 40 * (1 - percentage / 100),
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className={`${getColor()} ${getGlowClass()}`}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          >
            {getIcon()}
          </motion.div>
          <motion.div
            className={`text-2xl font-bold mt-2 ${getColor()}`}
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {score.toFixed(1)}
          </motion.div>
          <div className={`text-sm font-medium ${getColor()}`}>{status}</div>
        </div>
      </div>

      {/* Threshold indicators */}
      <div className="flex justify-between text-xs text-text-secondary">
        <span className="text-accent-buy">BUY ≤ {buyThreshold}</span>
        <span className="text-accent-neutral">NEUTRAL</span>
        <span className="text-accent-sell">SELL ≥ {sellThreshold}</span>
      </div>
    </motion.div>
  )
}
