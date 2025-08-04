"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
  TestTube,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useConfig } from "@/hooks/useConfig"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NotificationsPanel } from "@/components/notifications-panel"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { authenticatedFetch } from "@/utils/api"

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
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { config, loading, error, saving, reload, updateConfig } = useConfig()
  const [isReloading, setIsReloading] = useState(false)
  const [localConfig, setLocalConfig] = useState(config)

  // Notification states
  const [telegramBotToken, setTelegramBotToken] = useState("")
  const [telegramChatId, setTelegramChatId] = useState("")
  const [telegramConfigured, setTelegramConfigured] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [sendingTestAlert, setSendingTestAlert] = useState(false)
  const [testAlertType, setTestAlertType] = useState<'BUY' | 'SELL'>('BUY')
  const [telegramStatus, setTelegramStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  const [loadingTelegramSettings, setLoadingTelegramSettings] = useState(true)
  
  // Discord states
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("")
  const [discordConfigured, setDiscordConfigured] = useState(false)
  const [testingDiscord, setTestingDiscord] = useState(false)
  const [sendingDiscordTestAlert, setSendingDiscordTestAlert] = useState(false)
  const [discordStatus, setDiscordStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  const [loadingDiscordSettings, setLoadingDiscordSettings] = useState(true)
  
  // Message template states (shared between Telegram and Discord)
  const [telegramMessageTemplate, setTelegramMessageTemplate] = useState({
    showTimestamp: true,
    showTicker: true,
    showStrategy: true,
    showTriggers: true,
    showScore: true,
    format: 'detailed' as 'detailed' | 'compact' | 'minimal'
  })
  
  const [discordMessageTemplate, setDiscordMessageTemplate] = useState({
    showTimestamp: true,
    showTicker: true,
    showStrategy: true,
    showTriggers: true,
    showScore: true,
    format: 'detailed' as 'detailed' | 'compact' | 'minimal'
  })

  // Webhook Tester states
  const [webhookTesterTicker, setWebhookTesterTicker] = useState("BTCUSDT.P")
  const [webhookTesterIndicator, setWebhookTesterIndicator] = useState("Extreme Zones")
  const [webhookTesterTrigger, setWebhookTesterTrigger] = useState("Premium Zone")
  const [sendingWebhookTest, setSendingWebhookTest] = useState(false)
  const [webhookTestStatus, setWebhookTestStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  const [availableAlerts, setAvailableAlerts] = useState<Record<string, string[]>>({
    "Extreme Zones": ["Premium Zone", "Premium Zone Reversed", "Discount Zone", "Discount Zone Reversed", "Equilibrium Zone", "RSI: Bearish", "RSI: Neutral", "RSI: Bullish", "HTF: No Synergy"],
    "Nautilus™": ["Normal Bullish Divergence", "Normal Bearish Divergence", "Hidden Bullish Divergence", "Hidden Bearish Divergence", "Bullish Volume Cross", "Bearish Volume Cross"],
    "Market Core Pro™": ["Bullish OB Touch", "Bearish OB Touch", "Bullish OB Breakout", "Bearish OB Breakout", "SFP Bullish formed", "SFP Bearish formed", "Bullish Smart Money OB Touch", "Bearish Smart Money OB Touch"],
    "Market Waves Pro™": ["Buy Signals", "Sell Signals", "Buy Trend", "Sell Trend", "HTF Buy Trend", "HTF Sell Trend"],
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Load notification settings on mount
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        // Load Telegram settings
        const telegramResponse = await authenticatedFetch(`${config?.apiBase}/telegram/settings`)
        const telegramData = await telegramResponse.json()
        
        if (telegramData.configured) {
          setTelegramConfigured(true)
          // Don't set the bot token if it's masked (for security)
          if (telegramData.botToken && telegramData.botToken !== '***') {
            setTelegramBotToken(telegramData.botToken)
          }
          setTelegramChatId(telegramData.chatId || '')
          if (telegramData.messageTemplate) {
            setTelegramMessageTemplate(telegramData.messageTemplate)
          }
        }
        
        // Load Discord settings
        const discordResponse = await authenticatedFetch(`${config?.apiBase}/discord/settings`)
        const discordData = await discordResponse.json()
        
        if (discordData.configured) {
          setDiscordConfigured(true)
          // Don't set the webhook URL if it's masked (for security)
          // User will need to re-enter it if they want to change it
          if (discordData.webhookUrl && discordData.webhookUrl !== '***') {
            setDiscordWebhookUrl(discordData.webhookUrl)
          }
          if (discordData.messageTemplate) {
            setDiscordMessageTemplate(discordData.messageTemplate)
          }
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error)
      } finally {
        setLoadingTelegramSettings(false)
        setLoadingDiscordSettings(false)
      }
    }

    if (config?.apiBase) {
      loadNotificationSettings()
    }
  }, [config])

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
    // Check if we have credentials in state OR if Telegram is configured
    if (!telegramBotToken && !telegramChatId && !telegramConfigured) {
      setTelegramStatus({ type: "error", message: "Please enter both Bot Token and Chat ID" })
      return
    }

    // Check if we have chat ID (required even if token is saved)
    if (!telegramChatId) {
      setTelegramStatus({ type: "error", message: "Please enter Chat ID" })
      return
    }

    setTestingTelegram(true)
    setTelegramStatus({ type: null, message: "" })

    try {
      const response = await authenticatedFetch(`${config.apiBase}/telegram/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken || undefined, // Send only if available
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

  const handleSendTestAlert = async (action: 'BUY' | 'SELL') => {
    setSendingTestAlert(true)
    setTelegramStatus({ type: null, message: "" })

    try {
      const response = await authenticatedFetch(`${config.apiBase}/telegram/test-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          botToken: telegramBotToken || undefined,
          chatId: telegramChatId || undefined
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setTelegramStatus({ type: "success", message: result.message })
        toast({
          title: "Success",
          description: `Test ${action} alert sent to Telegram!`,
          className: "bg-accent-buy text-white border-accent-buy",
        })
      } else {
        throw new Error(result.message || "Failed to send test alert")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send test alert"
      setTelegramStatus({ type: "error", message: errorMessage })
      toast({
        title: "Error",
        description: errorMessage,
        className: "bg-accent-sell text-white border-accent-sell",
      })
    } finally {
      setSendingTestAlert(false)
    }
  }

  const handleTestDiscord = async () => {
    setTestingDiscord(true)
    setDiscordStatus({ type: null, message: "" })

    try {
      const response = await authenticatedFetch(`${config.apiBase}/discord/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl || undefined // Send undefined to use saved webhook
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setDiscordStatus({ type: "success", message: "Test message sent successfully!" })
        toast({
          title: "Success",
          description: "Discord connection test successful",
          className: "bg-accent-buy text-white border-accent-buy",
        })
      } else {
        throw new Error(result.message || "Invalid webhook URL")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send test message"
      setDiscordStatus({ type: "error", message: errorMessage })
      toast({
        title: "Error",
        description: "Discord connection test failed",
        className: "bg-accent-sell text-white border-accent-sell",
      })
    } finally {
      setTestingDiscord(false)
    }
  }

  const handleSendDiscordTestAlert = async (action: 'BUY' | 'SELL') => {
    setSendingDiscordTestAlert(true)
    setDiscordStatus({ type: null, message: "" })

    try {
      const response = await authenticatedFetch(`${config.apiBase}/discord/test-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          webhookUrl: discordWebhookUrl || undefined
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setDiscordStatus({ type: "success", message: result.message })
        toast({
          title: "Success",
          description: `Test ${action} alert sent to Discord!`,
          className: "bg-accent-buy text-white border-accent-buy",
        })
      } else {
        throw new Error(result.message || "Failed to send test alert")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send test alert"
      setDiscordStatus({ type: "error", message: errorMessage })
      toast({
        title: "Error",
        description: errorMessage,
        className: "bg-accent-sell text-white border-accent-sell",
      })
    } finally {
      setSendingDiscordTestAlert(false)
    }
  }

  const handleSaveDiscord = async () => {
    if (!discordWebhookUrl) {
      setDiscordStatus({ type: "error", message: "Please enter a webhook URL" })
      return
    }

    try {
      const response = await authenticatedFetch(`${config.apiBase}/discord/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl,
          messageTemplate: discordMessageTemplate
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setDiscordStatus({ type: "success", message: "Discord settings saved successfully!" })
        setDiscordConfigured(true)
        // Clear the webhook URL from the input for security
        setDiscordWebhookUrl("")
        toast({
          title: "Saved",
          description: "Discord notification settings updated",
          className: "bg-accent-buy text-white border-accent-buy",
        })
      } else {
        throw new Error(result.message || "Failed to save settings")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save settings"
      setDiscordStatus({ type: "error", message: errorMessage })
      toast({
        title: "Error",
        description: errorMessage,
        className: "bg-accent-sell text-white border-accent-sell",
      })
    }
  }

  const handleSaveTelegram = async () => {
    // Check if we have a chat ID (bot token might be masked)
    if (!telegramChatId) {
      setTelegramStatus({ type: "error", message: "Please enter Chat ID" })
      return
    }
    
    // If bot token starts with ***, it means it's already saved and user didn't change it
    const tokenToSave = telegramBotToken.startsWith('***') ? null : telegramBotToken
    
    if (!tokenToSave && !telegramBotToken.startsWith('***')) {
      setTelegramStatus({ type: "error", message: "Please enter Bot Token" })
      return
    }

    try {
      const response = await authenticatedFetch(`${config.apiBase}/telegram/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tokenToSave, // null means don't update
          chatId: telegramChatId,
          messageTemplate: telegramMessageTemplate
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setTelegramStatus({ type: "success", message: "Telegram settings saved successfully!" })
        setTelegramConfigured(true)
        // Clear the bot token from the input for security
        setTelegramBotToken("")
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

      const success = typeof window !== 'undefined' ? Math.random() > 0.3 : true
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

      const success = typeof window !== 'undefined' ? Math.random() > 0.3 : true
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

      const success = typeof window !== 'undefined' ? Math.random() > 0.3 : true
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

  const handleTestWebhook = async () => {
    if (!webhookTesterTrigger) {
      setWebhookTestStatus({ type: "error", message: "Please select a trigger" })
      return
    }

    setSendingWebhookTest(true)
    setWebhookTestStatus({ type: null, message: "" })

    try {
      // Use the regular webhook endpoint in text format
      const webhookUrl = config.apiBase.replace('/api', '') + '/webhook'
      
      // Format as text payload: "TICKER|TIMEFRAME|INDICATOR|TRIGGER"
      const payload = `${webhookTesterTicker}|15m|${webhookTesterIndicator}|${webhookTesterTrigger}`
      
      console.log('Sending webhook test with payload:', payload, 'to URL:', webhookUrl)
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      })

      if (response.ok) {
        setWebhookTestStatus({ type: "success", message: "Webhook test sent successfully! Check your dashboard for results." })
        toast({
          title: "Success",
          description: "Test webhook sent successfully",
          className: "bg-accent-buy text-white border-accent-buy",
        })
      } else {
        let errorMessage = "Failed to send test webhook"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.error('Webhook test error:', errorData)
        } catch (e) {
          console.error('Failed to parse error response:', e)
        }
        setWebhookTestStatus({ type: "error", message: errorMessage })
        toast({
          title: "Error",
          description: errorMessage,
          className: "bg-accent-sell text-white border-accent-sell",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send test webhook"
      setWebhookTestStatus({ type: "error", message: errorMessage })
      toast({
        title: "Error",
        description: errorMessage,
        className: "bg-accent-sell text-white border-accent-sell",
      })
    } finally {
      setSendingWebhookTest(false)
    }
  }

  if (authLoading || loading) {
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
                      Accepts text format: <code className="bg-gray-800 px-1 rounded text-blue-300">TICKER|TIMEFRAME|INDICATOR|TRIGGER</code>
                    </span>
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        // Use the regular webhook endpoint with text format
                        const webhookUrl = config.webhookUrl
                        
                        // Format as text payload: "TICKER|TIMEFRAME|INDICATOR|TRIGGER|HTF"
                        const payload = "BTCUSDT.P|15m|Extreme Zones|Discount Zone|↑15m↑4H↓=85%"
                        
                        console.log('Testing webhook at:', webhookUrl, 'with payload:', payload)
                        
                        const response = await fetch(webhookUrl, {
                          method: "POST",
                          headers: { 
                            "Content-Type": "text/plain"
                          },
                          body: payload
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
            <NotificationsPanel
              // Telegram props
              telegramBotToken={telegramBotToken}
              setTelegramBotToken={setTelegramBotToken}
              telegramChatId={telegramChatId}
              setTelegramChatId={setTelegramChatId}
              telegramMessageTemplate={telegramMessageTemplate}
              setTelegramMessageTemplate={setTelegramMessageTemplate}
              handleTestTelegram={handleTestTelegram}
              handleSaveTelegram={handleSaveTelegram}
              handleSendTestAlert={handleSendTestAlert}
              testingTelegram={testingTelegram}
              sendingTestAlert={sendingTestAlert}
              telegramStatus={telegramStatus}
              telegramConfigured={telegramConfigured}
              
              // Discord props
              discordWebhookUrl={discordWebhookUrl}
              setDiscordWebhookUrl={setDiscordWebhookUrl}
              discordMessageTemplate={discordMessageTemplate}
              setDiscordMessageTemplate={setDiscordMessageTemplate}
              handleTestDiscord={handleTestDiscord}
              handleSaveDiscord={handleSaveDiscord}
              handleSendDiscordTestAlert={handleSendDiscordTestAlert}
              testingDiscord={testingDiscord}
              sendingDiscordTestAlert={sendingDiscordTestAlert}
              discordStatus={discordStatus}
              discordConfigured={discordConfigured}
            />
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

          {/* Webhook Tester */}
          <CollapsiblePanel title="Webhook Tester" icon={<TestTube className="w-5 h-5 text-accent-neutral" />}>
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2 text-blue-400">Test Webhook Integration</h4>
                <p className="text-xs" style={{ color: "#A3A9B8" }}>
                  Send test webhook alerts to verify your strategies and notifications are working correctly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ticker Selection */}
                <div>
                  <Label htmlFor="webhookTicker" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                    Ticker
                  </Label>
                  <Select
                    value={webhookTesterTicker}
                    onValueChange={setWebhookTesterTicker}
                  >
                    <SelectTrigger id="webhookTicker" className="mt-1 bg-background border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTCUSDT.P">BTCUSDT.P</SelectItem>
                      <SelectItem value="ETHUSDT.P">ETHUSDT.P</SelectItem>
                      <SelectItem value="BNBUSDT.P">BNBUSDT.P</SelectItem>
                      <SelectItem value="XRPUSDT.P">XRPUSDT.P</SelectItem>
                      <SelectItem value="SOLUSDT.P">SOLUSDT.P</SelectItem>
                      <SelectItem value="ADAUSDT.P">ADAUSDT.P</SelectItem>
                      <SelectItem value="USDT.D">USDT.D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Indicator Selection */}
                <div>
                  <Label htmlFor="webhookIndicator" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                    Indicator
                  </Label>
                  <Select
                    value={webhookTesterIndicator}
                    onValueChange={(value) => {
                      setWebhookTesterIndicator(value)
                      setWebhookTesterTrigger("") // Reset trigger when indicator changes
                    }}
                  >
                    <SelectTrigger id="webhookIndicator" className="mt-1 bg-background border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Extreme Zones">Extreme Zones</SelectItem>
                      <SelectItem value="Nautilus™">Nautilus™</SelectItem>
                      <SelectItem value="Market Core Pro™">Market Core Pro™</SelectItem>
                      <SelectItem value="Market Waves Pro™">Market Waves Pro™</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Trigger Selection */}
                <div>
                  <Label htmlFor="webhookTrigger" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
                    Trigger
                  </Label>
                  <Select
                    value={webhookTesterTrigger}
                    onValueChange={setWebhookTesterTrigger}
                  >
                    <SelectTrigger id="webhookTrigger" className="mt-1 bg-background border-gray-700">
                      <SelectValue placeholder="Select a trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAlerts[webhookTesterIndicator]?.map((trigger) => (
                        <SelectItem key={trigger} value={trigger}>
                          {trigger}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Test Button */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleTestWebhook}
                  disabled={sendingWebhookTest || !webhookTesterTrigger}
                  className="bg-accent-buy hover:bg-accent-buy/80 text-white focus:ring-accent-buy"
                >
                  {sendingWebhookTest ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending Test...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Test Webhook
                    </>
                  )}
                </Button>

                {!webhookTesterTrigger && (
                  <p className="text-xs text-amber-500">
                    ⚠️ Please select a trigger first
                  </p>
                )}
              </div>

              {/* Status Message */}
              {webhookTestStatus.message && (
                <div
                  className={`text-sm p-3 rounded-lg ${
                    webhookTestStatus.type === "success"
                      ? "bg-accent-buy/20 text-accent-buy border border-accent-buy/30"
                      : "bg-accent-sell/20 text-accent-sell border border-accent-sell/30"
                  }`}
                >
                  {webhookTestStatus.message}
                </div>
              )}

              {/* Info */}
              <div className="mt-4 p-4 bg-gray-800/30 rounded-lg">
                <h5 className="text-sm font-semibold mb-2" style={{ color: "#E0E6ED" }}>
                  How it works:
                </h5>
                <ul className="text-xs space-y-1" style={{ color: "#A3A9B8" }}>
                  <li>• Select a ticker, indicator, and trigger to simulate a TradingView webhook</li>
                  <li>• The webhook will be processed by your strategies</li>
                  <li>• If a strategy completes, you'll receive notifications</li>
                  <li>• Check your dashboard to see the alert and any triggered actions</li>
                </ul>
              </div>
            </div>
          </CollapsiblePanel>
        </div>
      </main>
    </div>
  )
}
