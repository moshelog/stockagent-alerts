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
  // Oscillator Alerts
  "Bullish Peak": "Signals a momentum low or exhaustion at the bottom — potential for an upward move (bullish).",
  "Bearish Peak": "Signals a momentum high or exhaustion at the top — potential for a downward move (bearish).",
  "Bullish DipX": "Diamond below oscillator — indicates oversold conditions and a possible bullish reversal (bullish).",
  "Bearish DipX": "Diamond above oscillator — indicates overbought conditions and a possible bearish reversal (bearish).",
  "Normal Bullish Divergence": "Oscillator forms higher low while price makes lower low — potential for bullish reversal (bullish).",
  "Normal Bearish Divergence": "Oscillator forms lower high while price makes higher high — potential for bearish reversal (bearish).",
  "Hidden Bullish Divergence": "Oscillator makes higher low while price makes higher low — suggests uptrend continuation (bullish).",
  "Hidden Bearish Divergence": "Oscillator makes lower high while price makes lower high — suggests downtrend continuation (bearish).",
  "Oscillator Overbought": "Oscillator reaches overbought zone — warns of possible exhaustion or start of a drop (bearish).",
  "Oscillator Oversold": "Oscillator reaches oversold zone — warns of possible exhaustion or start of a bounce (bullish).",
  "Buy Signal": "Green triple lines below oscillator — signals potential buying opportunity (bullish).",
  "Sell Signal": "Red triple lines above oscillator — signals potential selling opportunity (bearish).",
  "Bullish Volume Cross": "Bullish volume overtakes bearish — shift toward buying pressure (bullish).",
  "Bearish Volume Cross": "Bearish volume overtakes bullish — shift toward selling pressure (bearish).",
  
  // SMC Alerts
  "Bullish FVG Created": "A new bullish fair value gap is formed — marks a price imbalance likely to attract buyers (bullish).",
  "Bearish FVG Created": "A new bearish fair value gap is formed — marks a price imbalance likely to attract sellers (bearish).",
  "Bullish FVG Break": "Price breaks above a bullish fair value gap — signals confirmation of upward momentum (bullish).",
  "Bearish Fvg Break": "Price breaks below a bearish fair value gap — signals confirmation of downward momentum (bearish).",
  "Touching Bullish OB": "Price touches a bullish order block — potential support zone and possible upward bounce (bullish).",
  "Touching Bearish OB": "Price touches a bearish order block — potential resistance zone and possible downward rejection (bearish).",
  "Bullish OB Break": "Price breaks above a bullish order block — confirms buyer strength, supporting a move up (bullish).",
  "Bearish OB Break": "Price breaks below a bearish order block — confirms seller strength, supporting a move down (bearish).",
  "Bullish Liquidity Crossed": "Price briefly grabs liquidity above a high or below a low before reversing direction (bullish).",
  "Bearish Liquidity Crossed": "Price briefly grabs liquidity above a high or below a low before reversing direction (bearish).",
  "Bullish SFP Formed": "Price sweeps a recent low but fails to break down — possible bullish reversal (bullish).",
  "Bearish SFP Formed": "Price sweeps a recent high but fails to break up — possible bearish reversal (bearish).",
  "Bullish BoS": "Price breaks the previous high — confirms a bullish trend continuation (bullish).",
  "Bearish BoS": "Price breaks the previous low — confirms a bearish trend continuation (bearish).",
  "Bullish ChoCH": "A key level breaks upward, signaling a potential bullish trend reversal (bullish).",
  "Bearish ChoCH": "A key level breaks downward, signaling a potential bearish trend reversal (bearish).",
  "Bullish Fibonacci Created": "Price reaches a key Fibonacci retracement level to the upside — possible reaction zone (bullish).",
  "Bearish Fibonacci Created": "Price reaches a key Fibonacci retracement level to the downside — possible reaction zone (bearish).",
  "Bullish Channel Breakout": "Price breaks upward out of a channel — may accelerate an uptrend (bullish).",
  "Bullish Channel Breakdown": "Price breaks downward out of a channel — may accelerate a downtrend (bearish).",
  "Bearish Channel Breakout": "Price breaks above a resistance zone — signals possible start of an uptrend (bullish).",
  "Bearish Channel Breakdown": "Price breaks below a support zone — signals possible start of a downtrend (bearish).",
  "Wedge Breakout": "Price breaks upward out of a wedge pattern — signals potential upward move (bullish).",
  "Wedge Breakdown": "Price breaks downward out of a wedge pattern — signals potential downward move (bearish)."
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
    // Clamp weight between 0 and 10
    const clampedWeight = Math.max(0, Math.min(10, Math.round(weight)))
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
                    className="text-sm font-medium block truncate" 
                    style={{ color: "#E0E6ED" }} 
                    title={alertExplanations[alert.name] || undefined}
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
                        const value = Number.parseInt(e.target.value) || 0
                        handleWeightChange(alert.id, value)
                      }}
                      min={0}
                      max={10}
                      step={1}
                      className={`w-16 h-8 text-xs bg-background border-gray-700 text-center font-medium ${
                        alert.weight > 0
                          ? "text-green-400 border-green-400/30"
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
