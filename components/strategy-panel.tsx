"use client"

import { motion } from "framer-motion"
import { Brain, CheckCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Strategy {
  id: string
  name: string
  rule: string
  metrics: {
    netPL: number
    winRate: number
    drawdown: number
  }
}

interface StrategyPanelProps {
  strategies: Strategy[]
  loading: boolean
}

export function StrategyPanel({ strategies, loading }: StrategyPanelProps) {
  if (loading) {
    return (
      <div className="trading-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">AI Strategies</h3>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-800 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="trading-card p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-accent-neutral" />
        <h3 className="text-lg font-semibold text-text-primary">AI Strategies</h3>
      </div>

      <div className="space-y-4">
        {strategies.map((strategy, index) => (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-background rounded-lg p-4 border border-gray-800/50"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-text-primary">{strategy.name}</h4>
              <div className="flex items-center gap-1">
                {strategy.metrics.netPL > 0 ? (
                  <TrendingUp className="w-4 h-4 text-accent-buy" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-accent-sell" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    strategy.metrics.netPL > 0 ? "text-accent-buy" : "text-accent-sell"
                  }`}
                >
                  {strategy.metrics.netPL > 0 ? "+" : ""}
                  {strategy.metrics.netPL}%
                </span>
              </div>
            </div>

            <div className="bg-gray-900 rounded p-3 mb-3">
              <code className="text-xs text-text-primary font-mono">{strategy.rule}</code>
            </div>

            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-4 text-xs">
                <span className="text-text-secondary">
                  Win Rate: <span className="text-text-primary">{strategy.metrics.winRate}%</span>
                </span>
                <span className="text-text-secondary">
                  Drawdown: <span className="text-accent-sell">{strategy.metrics.drawdown}%</span>
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="bg-accent-buy hover:bg-accent-buy/80 text-white flex-1">
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-accent-sell text-accent-sell hover:bg-accent-sell/10 flex-1 bg-transparent"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
