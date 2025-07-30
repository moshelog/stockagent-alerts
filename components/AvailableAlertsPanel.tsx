"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Bell } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Alert {
  id: string
  name: string
  weight: number
}

interface IndicatorAlerts {
  [key: string]: Alert[]
}

const indicatorOptions = [
  { value: "nautilus", label: "Oscillator" },
  { value: "market_core", label: "SMC" },
  { value: "market_waves", label: "Waves" },
  { value: "extreme_zones", label: "Extreme Zones" },
]

// Alert explanations for tooltips
const alertExplanations: { [key: string]: string } = {
  "Bullish Peak": "Signals a momentum low or exhaustion at the bottom — potential for an upward move (bullish)."
}

interface AvailableAlertsPanelProps {
  alertConfig?: any
  onUpdateWeight?: (alertId: string, weight: number) => void
  showWeights?: boolean
}

export default function AvailableAlertsPanel({ alertConfig, onUpdateWeight, showWeights = true }: AvailableAlertsPanelProps) {
  const [selectedIndicator, setSelectedIndicator] = useState("nautilus")
  const alerts = alertConfig || {
    nautilus: [],
    market_core: [],
    market_waves: [],
    extreme_zones: [],
  }

  const currentAlerts = alerts[selectedIndicator] || []

  const handleWeightChange = (alertId: string, weight: number) => {
    // Clamp weight between -5 and 5
    const clampedWeight = Math.max(-5, Math.min(5, weight))
    onUpdateWeight?.(alertId, clampedWeight)
  }

  return (
    <motion.div
      className="bg-background-surface rounded-2xl shadow-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-accent-neutral" />
        <h3 className="text-lg font-semibold" style={{ color: "#E0E6ED" }}>
          Available Alerts
        </h3>
      </div>

      {/* Indicator Dropdown */}
      <div className="mb-6">
        <Label htmlFor="indicator-select" className="text-sm font-medium mb-2 block" style={{ color: "#A3A9B8" }}>
          Indicator
        </Label>
        <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
          <SelectTrigger
            id="indicator-select"
            className="bg-background border-gray-700 hover:border-gray-600 transition-colors"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background-surface border-gray-700">
            {indicatorOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-white hover:bg-gray-800 focus:bg-gray-800"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Alert List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        <motion.div
          key={selectedIndicator}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {currentAlerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              className="bg-background border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Alert Name */}
                <div className="flex-1 min-w-0">
                  <span 
                    className="text-sm font-medium block truncate cursor-help" 
                    style={{ color: "#E0E6ED" }} 
                    title={alertExplanations[alert.name] || alert.name}
                  >
                    {alert.name}
                  </span>
                </div>

                {/* Weight Input */}
                {showWeights && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Label htmlFor={`weight-${alert.id}`} className="text-xs sr-only">
                      Weight for {alert.name}
                    </Label>
                    <Input
                      id={`weight-${alert.id}`}
                      type="number"
                      value={alert.weight}
                      onChange={(e) => {
                        const value = Number.parseFloat(e.target.value) || 0
                        handleWeightChange(alert.id, value)
                      }}
                      min={-5}
                      max={5}
                      step={0.1}
                      className={`w-16 h-8 text-xs bg-background border-gray-700 text-center font-medium ${
                        alert.weight > 0
                          ? "text-green-400 border-green-400/30"
                          : alert.weight < 0
                            ? "text-red-400 border-red-400/30"
                            : "text-accent-neutral border-gray-700"
                      }`}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center text-xs" style={{ color: "#A3A9B8" }}>
          <span>{currentAlerts.length} alerts available</span>
          {showWeights && (
            <span>
              Avg weight:{" "}
              {currentAlerts.length > 0
                ? (currentAlerts.reduce((sum, alert) => sum + alert.weight, 0) / currentAlerts.length).toFixed(1)
                : "0.0"}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
