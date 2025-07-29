"use client"
import { motion } from "framer-motion"
import { Copy, Webhook, TrendingUp, BarChart3, Waves } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"

interface AlertType {
  id: string
  indicator: string
  trigger: string
  category: "oscillator" | "market_core" | "market_waves"
  enabled: boolean
  weight: number
  icon: string
}

interface AvailableAlertsSidebarProps {
  webhookUrl: string
  alerts: AlertType[]
  onToggleAlert: (id: string, enabled: boolean) => void
  onUpdateWeight: (id: string, weight: number) => void
}

const mockAlerts: AlertType[] = [
  // Oscillator Alerts
  {
    id: "rsi_oversold",
    indicator: "RSI",
    trigger: "Oversold",
    category: "oscillator",
    enabled: true,
    weight: -2.5,
    icon: "📊",
  },
  {
    id: "rsi_overbought",
    indicator: "RSI",
    trigger: "Overbought",
    category: "oscillator",
    enabled: true,
    weight: 2.0,
    icon: "📊",
  },
  {
    id: "stoch_oversold",
    indicator: "STOCH",
    trigger: "Oversold",
    category: "oscillator",
    enabled: false,
    weight: -1.8,
    icon: "📈",
  },
  {
    id: "macd_bullish",
    indicator: "MACD",
    trigger: "Bullish Cross",
    category: "oscillator",
    enabled: true,
    weight: 1.8,
    icon: "📉",
  },
  {
    id: "macd_bearish",
    indicator: "MACD",
    trigger: "Bearish Cross",
    category: "oscillator",
    enabled: true,
    weight: -1.5,
    icon: "📉",
  },

  // Market Core Alerts
  {
    id: "volume_spike",
    indicator: "VOL",
    trigger: "Volume Spike",
    category: "market_core",
    enabled: true,
    weight: 0.8,
    icon: "📊",
  },
  {
    id: "bollinger_upper",
    indicator: "BB",
    trigger: "Upper Band",
    category: "market_core",
    enabled: true,
    weight: 1.2,
    icon: "🎯",
  },
  {
    id: "bollinger_lower",
    indicator: "BB",
    trigger: "Lower Band",
    category: "market_core",
    enabled: true,
    weight: -1.8,
    icon: "🎯",
  },
  {
    id: "support_break",
    indicator: "S/R",
    trigger: "Support Break",
    category: "market_core",
    enabled: false,
    weight: -2.2,
    icon: "🔻",
  },
  {
    id: "resistance_break",
    indicator: "S/R",
    trigger: "Resistance Break",
    category: "market_core",
    enabled: false,
    weight: 2.1,
    icon: "🔺",
  },

  // Market Waves Alerts
  {
    id: "elliott_wave_5",
    indicator: "EW",
    trigger: "Wave 5 Complete",
    category: "market_waves",
    enabled: false,
    weight: 1.5,
    icon: "🌊",
  },
  {
    id: "fibonacci_618",
    indicator: "FIB",
    trigger: "61.8% Retracement",
    category: "market_waves",
    enabled: true,
    weight: -1.3,
    icon: "📐",
  },
  {
    id: "trend_reversal",
    indicator: "TREND",
    trigger: "Reversal Signal",
    category: "market_waves",
    enabled: true,
    weight: -2.0,
    icon: "🔄",
  },
  {
    id: "momentum_divergence",
    indicator: "MOM",
    trigger: "Bearish Divergence",
    category: "market_waves",
    enabled: false,
    weight: -1.7,
    icon: "📊",
  },
]

const categoryIcons = {
  oscillator: <TrendingUp className="w-4 h-4 text-accent-buy" />,
  market_core: <BarChart3 className="w-4 h-4 text-accent-neutral" />,
  market_waves: <Waves className="w-4 h-4 text-accent-sell" />,
}

const categoryTitles = {
  oscillator: "Oscillator Alerts",
  market_core: "Market Core Alerts",
  market_waves: "Market Waves Alerts",
}

export function AvailableAlertsSidebar({
  webhookUrl,
  alerts = mockAlerts,
  onToggleAlert,
  onUpdateWeight,
}: AvailableAlertsSidebarProps) {
  const { toast } = useToast()

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast({
      title: "Copied!",
      description: "Webhook URL copied to clipboard",
      className: "bg-accent-buy text-white border-accent-buy",
    })
  }

  const groupedAlerts = alerts.reduce(
    (acc, alert) => {
      if (!acc[alert.category]) {
        acc[alert.category] = []
      }
      acc[alert.category].push(alert)
      return acc
    },
    {} as Record<string, AlertType[]>,
  )

  return (
    <motion.div
      className="bg-background-surface rounded-2xl shadow-lg p-6 h-fit"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Webhook className="w-5 h-5 text-accent-neutral" />
        <h3 className="text-lg font-semibold" style={{ color: "#E0E6ED" }}>
          Available Alerts
        </h3>
      </div>

      {/* Webhook URL */}
      <div className="mb-6">
        <label className="text-xs font-medium mb-2 block" style={{ color: "#A3A9B8" }}>
          Webhook Endpoint
        </label>
        <div className="flex">
          <Input
            value={webhookUrl}
            readOnly
            className="bg-background border-gray-700 rounded-r-none text-xs font-mono"
            style={{ color: "#E0E6ED" }}
          />
          <Button
            onClick={copyWebhookUrl}
            variant="outline"
            size="sm"
            className="rounded-l-none border-l-0 bg-transparent px-3"
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Alert Categories */}
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {Object.entries(groupedAlerts).map(([category, categoryAlerts]) => (
          <div key={category}>
            {/* Category Header */}
            <div className="flex items-center gap-2 mb-3">
              {categoryIcons[category as keyof typeof categoryIcons]}
              <h4 className="text-sm font-semibold" style={{ color: "#E0E6ED" }}>
                {categoryTitles[category as keyof typeof categoryTitles]}
              </h4>
            </div>

            {/* Alert Items */}
            <div className="space-y-3 ml-6">
              {categoryAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  className="bg-background border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{alert.icon}</span>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                          {alert.indicator}
                        </div>
                        <div className="text-xs" style={{ color: "#A3A9B8" }}>
                          {alert.trigger}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={(enabled) => onToggleAlert(alert.id, enabled)}
                      size="sm"
                    />
                  </div>

                  {/* Weight Control */}
                  <div className="flex items-center gap-3">
                    <label className="text-xs" style={{ color: "#A3A9B8" }}>
                      Weight:
                    </label>
                    <div className="flex-1">
                      <Slider
                        value={[alert.weight]}
                        onValueChange={(value) => onUpdateWeight(alert.id, value[0])}
                        min={-5}
                        max={5}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                    <span
                      className={`text-xs font-medium w-10 text-center ${
                        alert.weight > 0 ? "text-accent-sell" : "text-accent-buy"
                      }`}
                    >
                      {alert.weight > 0 ? "+" : ""}
                      {alert.weight.toFixed(1)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
