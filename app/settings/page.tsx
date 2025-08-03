"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  SettingsIcon,
  Brain,
  ArrowLeft,
  Key,
  Eye,
  EyeOff,
  Bell,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useConfig } from "@/hooks/useConfig"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CollapsiblePanelProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsiblePanel({ title, icon, children, defaultOpen = false }: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-background-surface rounded-2xl shadow-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-xl font-semibold" style={{ color: "#E0E6ED" }}>
            {title}
          </h2>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5" style={{ color: "#A3A9B8" }} />
        ) : (
          <ChevronDown className="w-5 h-5" style={{ color: "#A3A9B8" }} />
        )}
      </button>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="p-6 pt-0 border-t border-gray-700">{children}</div>
      </motion.div>
    </div>
  )
}

export default function SettingsPage() {
  const { config, loading, error, saving, reload, updateConfig } = useConfig()
  const [isReloading, setIsReloading] = useState(false)
  const [localConfig, setLocalConfig] = useState(config)

  // Notification states
  const [telegramBotToken, setTelegramBotToken] = useState("")
  const [telegramChatId, setTelegramChatId] = useState("")
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [telegramStatus, setTelegramStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  
  // Message template states
  const [messageTemplate, setMessageTemplate] = useState({
    showTimestamp: true,
    showTicker: true,
    showStrategy: true,
    showTriggers: true,
    showScore: true,
    format: 'detailed' as 'detailed' | 'compact' | 'minimal'
  })

  // Exchange credentials states
  const [binanceApiKey, setBinanceApiKey] = useState("")
  const [binanceApiSecret, setBinanceApiSecret] = useState("")
  const [showBinanceSecret, setShowBinanceSecret] = useState(false)
  const [testingBinance, setTestingBinance] = useState(false)
  const [binanceStatus, setBinanceStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })

  const [ibkrApiKey, setIbkrApiKey] = useState("")
  const [ibkrApiSecret, setIbkrApiSecret] = useState("")
  const [showIbkrSecret, setShowIbkrSecret] = useState(false)
  const [testingIbkr, setTestingIbkr] = useState(false)
  const [ibkrStatus, setIbkrStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })

  // OpenAI API key states
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [testingOpenAI, setTestingOpenAI] = useState(false)
  const [openaiStatus, setOpenaiStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })

  const { toast } = useToast()

  const handleReload = async () => {
    setIsReloading(true)
    await reload()
    setTimeout(() => setIsReloading(false), 500)
  }

  const copyWebhookUrl = () => {
    if (config?.webhookUrl) {
      navigator.clipboard.writeText(config.webhookUrl)
    }
  }

  const resetWeightsToDefaults = () => {
    const defaultWeights = {
      rsi_oversold: -2.5,
      rsi_overbought: 2.0,
      macd_bullish: 1.8,
      macd_bearish: -1.5,
      bollinger_upper: 1.2,
      bollinger_lower: -1.8,
      volume_spike: 0.8,
      momentum_positive: 1.5,
      momentum_negative: -1.2,
      sentiment_bullish: 0.9,
      sentiment_bearish: -0.7,
    }
    updateConfig({ weights: defaultWeights })
  }

  const handleTestTelegram = async () => {
    if (!telegramBotToken || !telegramChatId) {
      setTelegramStatus({ type: "error", message: "Please enter both Bot Token and Chat ID" })
      return
    }

    setTestingTelegram(true)
    setTelegramStatus({ type: null, message: "" })

    try {
      const response = await fetch(`${config.apiBase}/telegram/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken,
          chatId: telegramChatId
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setTelegramStatus({ type: "success", message: "Test message sent successfully!" })
        toast({
          title: "Success",
          description: "Telegram connection test successful",
          className: "bg-accent-buy text-white border-accent-buy",
        })
      } else {
        throw new Error(result.message || "Invalid bot token or chat ID")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send test message"
      setTelegramStatus({ type: "error", message: errorMessage })
      toast({
        title: "Error",
        description: "Telegram connection test failed",
        className: "bg-accent-sell text-white border-accent-sell",
      })
    } finally {
      setTestingTelegram(false)
    }
  }

  const handleSaveTelegram = async () => {
    if (!telegramBotToken || !telegramChatId) {
      setTelegramStatus({ type: "error", message: "Please enter both Bot Token and Chat ID" })
      return
    }

    try {
      const response = await fetch(`${config.apiBase}/telegram/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken,
          chatId: telegramChatId,
          messageTemplate
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setTelegramStatus({ type: "success", message: "Telegram settings saved successfully!" })
        toast({
          title: "Saved",
          description: "Telegram notification settings updated",
          className: "bg-accent-buy text-white border-accent-buy",
        })
      } else {
        throw new Error(result.message || "Failed to save settings")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save settings"
      setTelegramStatus({ type: "error", message: errorMessage })
      toast({
        title: "Error",
        description: errorMessage,
        className: "bg-accent-sell text-white border-accent-sell",
      })
    }
  }

  const handleTestBinance = async () => {
    if (!binanceApiKey || !binanceApiSecret) {
      setBinanceStatus({ type: "error", message: "Please enter both API Key and Secret" })
      return
    }

    setTestingBinance(true)
    setBinanceStatus({ type: null, message: "" })

    try {
      // Simulate API call - replace with actual Binance API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const success = Math.random() > 0.3
      if (success) {
        setBinanceStatus({ type: "success", message: "Connection successful! Account balance retrieved." })
        toast({
          title: "Success",
          description: "Binance API connection verified",
          className: "bg-accent-buy text-white border-accent-buy",
        })
      } else {
        throw new Error("Invalid API credentials")
      }
    } catch (error) {
      setBinanceStatus({ type: "error", message: "Failed to connect. Check your API credentials." })
      toast({
        title: "Error",
        description: "Binance API connection failed",
        className: "bg-accent-sell text-white border-accent-sell",
      })
    } finally {
      setTestingBinance(false)
    }
  }

  const handleTestIbkr = async () => {
    if (!ibkrApiKey || !ibkrApiSecret) {
      setIbkrStatus({ type: "error", message: "Please enter both API Key and Secret" })
      return
    }

    setTestingIbkr(true)
    setIbkrStatus({ type: null, message: "" })

    try {
      // Simulate API call - replace with actual IBKR API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const success = Math.random() > 0.3
      if (success) {
        setIbkrStatus({ type: "success", message: "Connection successful! Current positions retrieved." })
        toast({
          title: "Success",
          description: "IBKR API connection verified",
          className: "bg-accent-buy text-white border-accent-buy",
        })
      } else {
        throw new Error("Invalid API credentials")
      }
    } catch (error) {
      setIbkrStatus({ type: "error", message: "Failed to connect. Check your API credentials." })
      toast({
        title: "Error",
        description: "IBKR API connection failed",
        className: "bg-accent-sell text-white border-accent-sell",
      })
    } finally {
      setTestingIbkr(false)
    }
  }

  const handleTestOpenAI = async () => {
    if (!openaiApiKey) {
      setOpenaiStatus({ type: "error", message: "Please enter your OpenAI API key" })
      return
    }

    setTestingOpenAI(true)
    setOpenaiStatus({ type: null, message: "" })

    try {
      // Simulate API call - replace with actual OpenAI API test
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const success = Math.random() > 0.3
      if (success) {
        setOpenaiStatus({ type: "success", message: "OpenAI API connection successful!" })
        toast({
          title: "Success",
          description: "OpenAI API key verified",
          className: "bg-accent-buy text-white border-accent-buy",
        })
      } else {
        throw new Error("Invalid API key")
      }
    } catch (error) {
      setOpenaiStatus({ type: "error", message: "Invalid API key or connection failed" })
      toast({
        title: "Error",
        description: "OpenAI API connection failed",
        className: "bg-accent-sell text-white border-accent-sell",
      })
    } finally {
      setTestingOpenAI(false)
    }
  }

  const handleSaveOpenAI = async () => {
    try {
      // Simulate save operation
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setOpenaiStatus({ type: "success", message: "OpenAI API key saved successfully!" })
      toast({
        title: "Saved",
        description: "OpenAI API key updated",
        className: "bg-accent-buy text-white border-accent-buy",
      })
    } catch (error) {
      setOpenaiStatus({ type: "error", message: "Failed to save API key" })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-buy mx-auto mb-4" />
          <p style={{ color: "#E0E6ED" }}>Loading settings...</p>
        </div>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-accent-sell mb-4">Error loading settings: {error}</p>
          <Button onClick={handleReload} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-800 bg-background-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-6 h-6 text-accent-neutral" />
                <h1 className="text-2xl font-bold" style={{ color: "#E0E6ED" }}>
                  Settings
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* General Settings */}
          <CollapsiblePanel
            title="General"
            icon={<SettingsIcon className="w-5 h-5 text-accent-neutral" />}
            defaultOpen={true}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="apiBase" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                    API Base URL
                  </Label>
                  <Input
                    id="apiBase"
                    value={config.apiBase}
                    onChange={(e) => updateConfig({ apiBase: e.target.value })}
                    className="mt-1 bg-background border-gray-700"
                  />
                </div>
                <div>
                  <Label htmlFor="pollInterval" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                    Poll Interval (seconds)
                  </Label>
                  <Input
                    id="pollInterval"
                    type="number"
                    value={config.pollIntervalMs / 1000}
                    onChange={(e) => updateConfig({ pollIntervalMs: Number.parseInt(e.target.value) * 1000 })}
                    className="mt-1 bg-background border-gray-700"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="webhookUrl" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                  Webhook URL
                </Label>
                <div className="flex mt-1">
                  <Input
                    id="webhookUrl"
                    value={config.webhookUrl}
                    readOnly
                    className="bg-gray-800 border-gray-700 rounded-r-none"
                  />
                  <Button
                    onClick={copyWebhookUrl}
                    variant="outline"
                    className="rounded-l-none border-l-0 bg-transparent"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs" style={{ color: "#A3A9B8" }}>
                    This is your unique webhook endpoint for receiving alerts.
                    <br />
                    <span className="text-xs opacity-75">
                      For JSON payloads, append: <code className="bg-gray-800 px-1 rounded text-blue-300">/webhook-json</code>
                    </span>
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        // Construct the JSON webhook URL properly
                        let jsonWebhookUrl = config.webhookUrl
                        if (jsonWebhookUrl.endsWith('/webhook')) {
                          jsonWebhookUrl = jsonWebhookUrl.replace('/webhook', '/webhook-json')
                        } else if (!jsonWebhookUrl.includes('/webhook-json')) {
                          // If URL doesn't end with /webhook, append /webhook-json
                          jsonWebhookUrl = jsonWebhookUrl.replace(/\/$/, '') + '/webhook-json'
                        }
                        
                        console.log('Testing webhook at:', jsonWebhookUrl)
                        
                        const response = await fetch(jsonWebhookUrl, {
                          method: "POST",
                          headers: { 
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                          },
                          body: JSON.stringify({ 
                            ticker: "BTC",
                            indicator: "Extreme Zones", 
                            trigger: "Discount Zone",
                            htf: "↑15m↑4H↓=85%",
                            time: new Date().toISOString()
                          }),
                        })

                        const responseText = await response.text()
                        console.log('Webhook response:', response.status, responseText)

                        if (response.ok) {
                          toast({
                            title: "Success",
                            description: "Test webhook sent successfully with HTF field! Check your dashboard for the alert with purple HTF badge.",
                            className: "bg-accent-buy text-white border-accent-buy",
                          })
                        } else {
                          let errorMessage = `HTTP ${response.status}`
                          try {
                            const errorData = JSON.parse(responseText)
                            errorMessage = errorData.error || errorData.message || errorMessage
                          } catch {
                            errorMessage = responseText || errorMessage
                          }
                          throw new Error(`Failed to send test webhook: ${errorMessage}`)
                        }
                      } catch (error) {
                        console.error("Webhook test error:", error)
                        toast({
                          title: "Error",
                          description: `Failed to send test webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
                          className: "bg-accent-sell text-white border-accent-sell",
                        })
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Test webhook
                  </button>
                </div>
              </div>

              <Button
                onClick={handleReload}
                disabled={isReloading}
                className="bg-accent-buy hover:bg-accent-buy/80 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isReloading ? "animate-spin" : ""}`} />
                Reload Config
              </Button>
            </div>
          </CollapsiblePanel>

          {/* UI Configuration */}
          <CollapsiblePanel title="UI Configuration" icon={<Eye className="w-5 h-5 text-accent-neutral" />}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                    Show Weights/Scores
                  </Label>
                  <p className="text-xs mt-1" style={{ color: "#A3A9B8" }}>
                    Display weight values in alerts, scoring system, and strategy manager
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newShowWeights = !config.ui.showWeights;
                      updateConfig({
                        ui: {
                          ...config.ui,
                          showWeights: newShowWeights
                        }
                      });
                    }}
                    className={`w-16 h-8 ${
                      config.ui.showWeights 
                        ? 'bg-accent-buy text-white border-accent-buy' 
                        : 'bg-gray-700 text-gray-300 border-gray-600'
                    }`}
                  >
                    {config.ui.showWeights ? 'ON' : 'OFF'}
                  </Button>
                  {saving && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: "#A3A9B8" }}>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsiblePanel>

          {/* OpenAI API Key */}
          <CollapsiblePanel title="OpenAI Integration" icon={<Brain className="w-5 h-5 text-accent-neutral" />}>
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2 text-blue-400">How to get your OpenAI API Key:</h4>
                <ol className="text-xs space-y-1" style={{ color: "#A3A9B8" }}>
                  <li>
                    1. Go to{" "}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      platform.openai.com/api-keys
                    </a>
                  </li>
                  <li>2. Sign in to your OpenAI account (create one if needed)</li>
                  <li>3. Click "Create new secret key"</li>
                  <li>4. Give it a name (e.g., "StockAgent")</li>
                  <li>5. Copy the key and paste it below</li>
                  <li>6. Make sure you have credits in your OpenAI account</li>
                </ol>
              </div>

              <div>
                <Label htmlFor="openaiApiKey" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                  OpenAI API Key
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="openaiApiKey"
                    type={showOpenAIKey ? "text" : "password"}
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="bg-background border-gray-700 focus:border-accent-buy focus:ring-accent-buy pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                  >
                    {showOpenAIKey ? (
                      <EyeOff className="w-4 h-4" style={{ color: "#A3A9B8" }} />
                    ) : (
                      <Eye className="w-4 h-4" style={{ color: "#A3A9B8" }} />
                    )}
                  </Button>
                </div>
                <p className="text-xs mt-1" style={{ color: "#A3A9B8" }}>
                  Required for AI strategy generation and analysis
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleTestOpenAI}
                  disabled={testingOpenAI}
                  variant="outline"
                  className="bg-transparent border-accent-neutral text-accent-neutral hover:bg-accent-neutral/10 focus:ring-accent-neutral"
                >
                  {testingOpenAI ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Test Connection
                </Button>
                <Button
                  onClick={handleSaveOpenAI}
                  className="bg-accent-buy hover:bg-accent-buy/80 text-white focus:ring-accent-buy"
                >
                  Save
                </Button>
              </div>

              {openaiStatus.message && (
                <div
                  className={`text-sm p-3 rounded-lg ${
                    openaiStatus.type === "success"
                      ? "bg-accent-buy/20 text-accent-buy border border-accent-buy/30"
                      : "bg-accent-sell/20 text-accent-sell border border-accent-sell/30"
                  }`}
                >
                  {openaiStatus.message}
                </div>
              )}
            </div>
          </CollapsiblePanel>

          {/* Notifications */}
          <CollapsiblePanel title="Notifications" icon={<Bell className="w-5 h-5 text-accent-neutral" />}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="telegramBotToken" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                    Bot Token
                  </Label>
                  <Input
                    id="telegramBotToken"
                    type="text"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    placeholder="Enter your Telegram bot token..."
                    className="mt-1 bg-background border-gray-700 focus:border-accent-buy focus:ring-accent-buy"
                  />
                  <p className="text-xs mt-1" style={{ color: "#A3A9B8" }}>
                    Get this from @BotFather on Telegram
                  </p>
                </div>
                <div>
                  <Label htmlFor="telegramChatId" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                    Chat ID
                  </Label>
                  <Input
                    id="telegramChatId"
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="Enter chat or channel ID..."
                    className="mt-1 bg-background border-gray-700 focus:border-accent-buy focus:ring-accent-buy"
                  />
                  <p className="text-xs mt-1" style={{ color: "#A3A9B8" }}>
                    Your personal chat ID or channel ID
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleTestTelegram}
                  disabled={testingTelegram}
                  variant="outline"
                  className="bg-transparent border-accent-neutral text-accent-neutral hover:bg-accent-neutral/10 focus:ring-accent-neutral"
                >
                  {testingTelegram ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Test Connection
                </Button>
                <Button
                  onClick={handleSaveTelegram}
                  className="bg-accent-buy hover:bg-accent-buy/80 text-white focus:ring-accent-buy"
                >
                  Save
                </Button>
              </div>

              {telegramStatus.message && (
                <div
                  className={`text-sm p-3 rounded-lg ${
                    telegramStatus.type === "success"
                      ? "bg-accent-buy/20 text-accent-buy border border-accent-buy/30"
                      : "bg-accent-sell/20 text-accent-sell border border-accent-sell/30"
                  }`}
                >
                  {telegramStatus.message}
                </div>
              )}
              
              {/* Message Customization */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <h4 className="text-lg font-semibold mb-4" style={{ color: "#E0E6ED" }}>
                  ✏️ Customize Message Format
                </h4>
                
                <div className="space-y-4">
                  {/* Format Selection */}
                  <div>
                    <Label className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                      Message Format
                    </Label>
                    <Select
                      value={messageTemplate.format}
                      onValueChange={(value: 'detailed' | 'compact' | 'minimal') => 
                        setMessageTemplate({ ...messageTemplate, format: value })
                      }
                    >
                      <SelectTrigger className="mt-1 bg-background border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="detailed">Detailed - Full information</SelectItem>
                        <SelectItem value="compact">Compact - One line summary</SelectItem>
                        <SelectItem value="minimal">Minimal - Just action and ticker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Toggle Options */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTimestamp" className="text-sm" style={{ color: "#E0E6ED" }}>
                        Show Timestamp
                      </Label>
                      <Switch
                        id="showTimestamp"
                        checked={messageTemplate.showTimestamp}
                        onCheckedChange={(checked) => 
                          setMessageTemplate({ ...messageTemplate, showTimestamp: checked })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTicker" className="text-sm" style={{ color: "#E0E6ED" }}>
                        Show Ticker
                      </Label>
                      <Switch
                        id="showTicker"
                        checked={messageTemplate.showTicker}
                        onCheckedChange={(checked) => 
                          setMessageTemplate({ ...messageTemplate, showTicker: checked })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showStrategy" className="text-sm" style={{ color: "#E0E6ED" }}>
                        Show Strategy
                      </Label>
                      <Switch
                        id="showStrategy"
                        checked={messageTemplate.showStrategy}
                        onCheckedChange={(checked) => 
                          setMessageTemplate({ ...messageTemplate, showStrategy: checked })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTriggers" className="text-sm" style={{ color: "#E0E6ED" }}>
                        Show Triggers
                      </Label>
                      <Switch
                        id="showTriggers"
                        checked={messageTemplate.showTriggers}
                        onCheckedChange={(checked) => 
                          setMessageTemplate({ ...messageTemplate, showTriggers: checked })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showScore" className="text-sm" style={{ color: "#E0E6ED" }}>
                        Show Score
                      </Label>
                      <Switch
                        id="showScore"
                        checked={messageTemplate.showScore}
                        onCheckedChange={(checked) => 
                          setMessageTemplate({ ...messageTemplate, showScore: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notification Preview */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "#E0E6ED" }}>
                  📱 Notification Preview
                </h4>
                <p className="text-sm mb-4" style={{ color: "#A3A9B8" }}>
                  This is how your notifications will appear when a strategy triggers an action:
                </p>

                {/* Dynamic Preview based on message format */}
                <div className="space-y-4">
                  {/* Buy Signal Preview */}
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    {messageTemplate.format === 'minimal' ? (
                      <p className="text-sm">
                        <span className="text-green-400">🟢 BUY BTC</span>
                        {messageTemplate.showScore && <span className="text-green-400"> (+4.2)</span>}
                      </p>
                    ) : messageTemplate.format === 'compact' ? (
                      <p className="text-sm">
                        <span className="text-green-400 font-bold">🟢 BUY BTC</span>
                        {messageTemplate.showStrategy && <span style={{ color: "#E0E6ED" }}> | Buy on discount zone</span>}
                        {messageTemplate.showScore && <span className="text-green-400"> | Score: +4.2</span>}
                      </p>
                    ) : (
                      <>
                        <div className="text-sm">
                          <span className="text-green-400 font-bold">🟢 BUY SIGNAL</span>
                          <div className="mt-2" style={{ borderTop: '1px solid #374151' }}>
                            <div className="space-y-1 mt-2">
                              {messageTemplate.showTimestamp && (
                                <div>📅 <strong>Time:</strong> {new Date().toLocaleString()}</div>
                              )}
                              {messageTemplate.showTicker && (
                                <div>📈 <strong>Ticker:</strong> BTC</div>
                              )}
                              {messageTemplate.showStrategy && (
                                <div>📊 <strong>Strategy:</strong> Buy on discount zone</div>
                              )}
                              {messageTemplate.showTriggers && (
                                <div>🎯 <strong>Triggers:</strong> Discount Zone, Normal Bullish Divergence</div>
                              )}
                              {messageTemplate.showScore && (
                                <div>📈 <strong>Score:</strong> +4.2</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sell Signal Preview */}
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    {messageTemplate.format === 'minimal' ? (
                      <p className="text-sm">
                        <span className="text-red-400">🔴 SELL ETH</span>
                        {messageTemplate.showScore && <span className="text-red-400"> (-4.3)</span>}
                      </p>
                    ) : messageTemplate.format === 'compact' ? (
                      <p className="text-sm">
                        <span className="text-red-400 font-bold">🔴 SELL ETH</span>
                        {messageTemplate.showStrategy && <span style={{ color: "#E0E6ED" }}> | Sell on Premium zone</span>}
                        {messageTemplate.showScore && <span className="text-red-400"> | Score: -4.3</span>}
                      </p>
                    ) : (
                      <>
                        <div className="text-sm">
                          <span className="text-red-400 font-bold">🔴 SELL SIGNAL</span>
                          <div className="mt-2" style={{ borderTop: '1px solid #374151' }}>
                            <div className="space-y-1 mt-2">
                              {messageTemplate.showTimestamp && (
                                <div>📅 <strong>Time:</strong> {new Date(Date.now() - 300000).toLocaleString()}</div>
                              )}
                              {messageTemplate.showTicker && (
                                <div>📈 <strong>Ticker:</strong> ETH</div>
                              )}
                              {messageTemplate.showStrategy && (
                                <div>📊 <strong>Strategy:</strong> Sell on Premium zone</div>
                              )}
                              {messageTemplate.showTriggers && (
                                <div>🎯 <strong>Triggers:</strong> Premium Zone, Normal Bearish Divergence</div>
                              )}
                              {messageTemplate.showScore && (
                                <div>📉 <strong>Score:</strong> -4.3</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs" style={{ color: "#A3A9B8" }}>
                    💡 <strong>Tip:</strong> Notifications are sent instantly when a strategy's conditions are met and
                    the total score crosses your defined threshold.
                  </p>
                </div>
              </div>
            </div>
          </CollapsiblePanel>

          {/* Exchange Credentials */}
          <CollapsiblePanel title="Exchange Credentials" icon={<Key className="w-5 h-5 text-accent-sell" />}>
            <div className="space-y-8">
              {/* Binance Section */}
              <div>
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "#E0E6ED" }}>
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-black text-xs font-bold">
                    B
                  </div>
                  Binance
                </h4>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="binanceApiKey" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                        API Key
                      </Label>
                      <Input
                        id="binanceApiKey"
                        type="text"
                        value={binanceApiKey}
                        onChange={(e) => setBinanceApiKey(e.target.value)}
                        placeholder="Enter Binance API key..."
                        className="mt-1 bg-background border-gray-700 focus:border-accent-buy focus:ring-accent-buy"
                      />
                    </div>
                    <div>
                      <Label htmlFor="binanceApiSecret" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                        API Secret
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="binanceApiSecret"
                          type={showBinanceSecret ? "text" : "password"}
                          value={binanceApiSecret}
                          onChange={(e) => setBinanceApiSecret(e.target.value)}
                          placeholder="Enter Binance API secret..."
                          className="bg-background border-gray-700 focus:border-accent-buy focus:ring-accent-buy pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowBinanceSecret(!showBinanceSecret)}
                        >
                          {showBinanceSecret ? (
                            <EyeOff className="w-4 h-4" style={{ color: "#A3A9B8" }} />
                          ) : (
                            <Eye className="w-4 h-4" style={{ color: "#A3A9B8" }} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleTestBinance}
                    disabled={testingBinance}
                    variant="outline"
                    className="bg-transparent border-accent-neutral text-accent-neutral hover:bg-accent-neutral/10 focus:ring-accent-neutral"
                  >
                    {testingBinance ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Test Connection
                  </Button>

                  {binanceStatus.message && (
                    <div
                      className={`text-sm p-3 rounded-lg ${
                        binanceStatus.type === "success"
                          ? "bg-accent-buy/20 text-accent-buy border border-accent-buy/30"
                          : "bg-accent-sell/20 text-accent-sell border border-accent-sell/30"
                      }`}
                    >
                      {binanceStatus.message}
                    </div>
                  )}
                </div>
              </div>

              {/* IBKR Section */}
              <div>
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "#E0E6ED" }}>
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    IB
                  </div>
                  Interactive Brokers (IBKR)
                </h4>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ibkrApiKey" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                        API Key
                      </Label>
                      <Input
                        id="ibkrApiKey"
                        type="text"
                        value={ibkrApiKey}
                        onChange={(e) => setIbkrApiKey(e.target.value)}
                        placeholder="Enter IBKR API key..."
                        className="mt-1 bg-background border-gray-700 focus:border-accent-buy focus:ring-accent-buy"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ibkrApiSecret" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                        API Secret
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="ibkrApiSecret"
                          type={showIbkrSecret ? "text" : "password"}
                          value={ibkrApiSecret}
                          onChange={(e) => setIbkrApiSecret(e.target.value)}
                          placeholder="Enter IBKR API secret..."
                          className="bg-background border-gray-700 focus:border-accent-buy focus:ring-accent-buy pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowIbkrSecret(!showIbkrSecret)}
                        >
                          {showIbkrSecret ? (
                            <EyeOff className="w-4 h-4" style={{ color: "#A3A9B8" }} />
                          ) : (
                            <Eye className="w-4 h-4" style={{ color: "#A3A9B8" }} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleTestIbkr}
                    disabled={testingIbkr}
                    variant="outline"
                    className="bg-transparent border-accent-neutral text-accent-neutral hover:bg-accent-neutral/10 focus:ring-accent-neutral"
                  >
                    {testingIbkr ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Test Connection
                  </Button>

                  {ibkrStatus.message && (
                    <div
                      className={`text-sm p-3 rounded-lg ${
                        ibkrStatus.type === "success"
                          ? "bg-accent-buy/20 text-accent-buy border border-accent-buy/30"
                          : "bg-accent-sell/20 text-accent-sell border border-accent-sell/30"
                      }`}
                    >
                      {ibkrStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsiblePanel>
        </div>
      </main>
    </div>
  )
}
