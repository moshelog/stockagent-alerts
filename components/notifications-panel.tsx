"use client"

import React from "react"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Send, MessageSquare, AlertCircle } from "lucide-react"

interface NotificationsPanelProps {
  // Telegram props
  telegramBotToken: string
  setTelegramBotToken: (value: string) => void
  telegramChatId: string
  setTelegramChatId: (value: string) => void
  telegramMessageTemplate: any
  setTelegramMessageTemplate: (value: any) => void
  handleTestTelegram: () => void
  handleSaveTelegram: () => void
  handleSendTestAlert: (action: 'BUY' | 'SELL') => void
  testingTelegram: boolean
  sendingTestAlert: boolean
  telegramStatus: { type: "success" | "error" | null; message: string }
  telegramConfigured?: boolean
  
  // Discord props
  discordWebhookUrl: string
  setDiscordWebhookUrl: (value: string) => void
  discordMessageTemplate: any
  setDiscordMessageTemplate: (value: any) => void
  handleTestDiscord: () => void
  handleSaveDiscord: () => void
  handleSendDiscordTestAlert: (action: 'BUY' | 'SELL') => void
  testingDiscord: boolean
  sendingDiscordTestAlert: boolean
  discordStatus: { type: "success" | "error" | null; message: string }
  discordConfigured?: boolean
}

export function NotificationsPanel({
  telegramBotToken,
  setTelegramBotToken,
  telegramChatId,
  setTelegramChatId,
  telegramMessageTemplate,
  setTelegramMessageTemplate,
  handleTestTelegram,
  handleSaveTelegram,
  handleSendTestAlert,
  testingTelegram,
  sendingTestAlert,
  telegramStatus,
  telegramConfigured = false,
  discordWebhookUrl,
  setDiscordWebhookUrl,
  discordMessageTemplate,
  setDiscordMessageTemplate,
  handleTestDiscord,
  handleSaveDiscord,
  handleSendDiscordTestAlert,
  testingDiscord,
  sendingDiscordTestAlert,
  discordStatus,
  discordConfigured = false
}: NotificationsPanelProps) {
  const [activeTab, setActiveTab] = useState("telegram")

  const renderMessageCustomization = (template: any, setTemplate: (value: any) => void, platform: 'telegram' | 'discord') => (
    <div className="space-y-4">
      {/* Format Selection */}
      <div>
        <Label className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
          Message Format
        </Label>
        <Select
          value={template.format}
          onValueChange={(value: 'detailed' | 'compact' | 'minimal') => 
            setTemplate({ ...template, format: value })
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
          <Label htmlFor={`showTimestamp-${platform}`} className="text-sm" style={{ color: "#E0E6ED" }}>
            Show Timestamp
          </Label>
          <Switch
            id={`showTimestamp-${platform}`}
            checked={template.showTimestamp}
            onCheckedChange={(checked) => 
              setTemplate({ ...template, showTimestamp: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor={`showTicker-${platform}`} className="text-sm" style={{ color: "#E0E6ED" }}>
            Show Ticker
          </Label>
          <Switch
            id={`showTicker-${platform}`}
            checked={template.showTicker}
            onCheckedChange={(checked) => 
              setTemplate({ ...template, showTicker: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor={`showStrategy-${platform}`} className="text-sm" style={{ color: "#E0E6ED" }}>
            Show Strategy
          </Label>
          <Switch
            id={`showStrategy-${platform}`}
            checked={template.showStrategy}
            onCheckedChange={(checked) => 
              setTemplate({ ...template, showStrategy: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor={`showTriggers-${platform}`} className="text-sm" style={{ color: "#E0E6ED" }}>
            Show Triggers
          </Label>
          <Switch
            id={`showTriggers-${platform}`}
            checked={template.showTriggers}
            onCheckedChange={(checked) => 
              setTemplate({ ...template, showTriggers: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor={`showScore-${platform}`} className="text-sm" style={{ color: "#E0E6ED" }}>
            Show Score
          </Label>
          <Switch
            id={`showScore-${platform}`}
            checked={template.showScore}
            onCheckedChange={(checked) => 
              setTemplate({ ...template, showScore: checked })
            }
          />
        </div>
      </div>
    </div>
  )

  const renderPreview = (template: any, platform: 'telegram' | 'discord') => {
    if (platform === 'discord') {
      // Discord uses embeds, so show a different preview
      return (
        <div className="space-y-4">
          {/* Buy Signal Preview */}
          <Card className="bg-[#2f3136] border-l-4 border-l-emerald-500 p-4">
            <div className="space-y-2">
              {template.format === 'minimal' ? (
                <>
                  <h3 className="text-emerald-400 font-semibold">BUY BTC</h3>
                  {template.showScore && <p className="text-sm text-gray-300">Score: +4.2</p>}
                </>
              ) : template.format === 'compact' ? (
                <>
                  <h3 className="text-emerald-400 font-semibold">BUY Signal: BTC</h3>
                  <div className="flex gap-4 text-sm">
                    {template.showStrategy && <span className="text-gray-300"><strong>Strategy:</strong> Buy on discount zone</span>}
                    {template.showScore && <span className="text-gray-300"><strong>Score:</strong> +4.2</span>}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-emerald-400 font-semibold flex items-center gap-2">
                    🟢 BUY Signal
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {template.showTicker && (
                      <div>
                        <span className="text-gray-400">📈 Ticker</span>
                        <p className="text-gray-200">BTC</p>
                      </div>
                    )}
                    {template.showStrategy && (
                      <div>
                        <span className="text-gray-400">📊 Strategy</span>
                        <p className="text-gray-200">Buy on discount zone</p>
                      </div>
                    )}
                    {template.showScore && (
                      <div>
                        <span className="text-gray-400">📈 Score</span>
                        <p className="text-gray-200">+4.2</p>
                      </div>
                    )}
                  </div>
                  {template.showTriggers && (
                    <div>
                      <span className="text-gray-400 text-sm">🎯 Triggers</span>
                      <p className="text-gray-200 text-sm">Discount Zone<br/>Normal Bullish Divergence<br/>Bullish OB Break</p>
                    </div>
                  )}
                </>
              )}
              {template.showTimestamp && (
                <p className="text-xs text-gray-500 mt-2">StockAgent Alerts • {typeof window !== 'undefined' ? new Date().toLocaleTimeString() : '12:34:56'}</p>
              )}
            </div>
          </Card>

          {/* Sell Signal Preview */}
          <Card className="bg-[#2f3136] border-l-4 border-l-rose-500 p-4">
            <div className="space-y-2">
              {template.format === 'minimal' ? (
                <>
                  <h3 className="text-rose-400 font-semibold">SELL ETH</h3>
                  {template.showScore && <p className="text-sm text-gray-300">Score: -4.3</p>}
                </>
              ) : template.format === 'compact' ? (
                <>
                  <h3 className="text-rose-400 font-semibold">SELL Signal: ETH</h3>
                  <div className="flex gap-4 text-sm">
                    {template.showStrategy && <span className="text-gray-300"><strong>Strategy:</strong> Sell on Premium zone</span>}
                    {template.showScore && <span className="text-gray-300"><strong>Score:</strong> -4.3</span>}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-rose-400 font-semibold flex items-center gap-2">
                    🔴 SELL Signal
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {template.showTicker && (
                      <div>
                        <span className="text-gray-400">📈 Ticker</span>
                        <p className="text-gray-200">ETH</p>
                      </div>
                    )}
                    {template.showStrategy && (
                      <div>
                        <span className="text-gray-400">📊 Strategy</span>
                        <p className="text-gray-200">Sell on Premium zone</p>
                      </div>
                    )}
                    {template.showScore && (
                      <div>
                        <span className="text-gray-400">📉 Score</span>
                        <p className="text-gray-200">-4.3</p>
                      </div>
                    )}
                  </div>
                  {template.showTriggers && (
                    <div>
                      <span className="text-gray-400 text-sm">🎯 Triggers</span>
                      <p className="text-gray-200 text-sm">Premium Zone<br/>Normal Bearish Divergence<br/>Bearish OB Break</p>
                    </div>
                  )}
                </>
              )}
              {template.showTimestamp && (
                <p className="text-xs text-gray-500 mt-2">StockAgent Alerts • {typeof window !== 'undefined' ? new Date().toLocaleTimeString() : '12:34:56'}</p>
              )}
            </div>
          </Card>
        </div>
      )
    }

    // Telegram preview (existing)
    return (
      <div className="space-y-4">
        {/* Buy Signal Preview */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          {template.format === 'minimal' ? (
            <p className="text-sm">
              <span className="text-green-400">🟢 BUY BTC</span>
              {template.showScore && <span className="text-green-400"> (+4.2)</span>}
            </p>
          ) : template.format === 'compact' ? (
            <p className="text-sm">
              <span className="text-green-400 font-bold">🟢 BUY BTC</span>
              {template.showStrategy && <span style={{ color: "#E0E6ED" }}> | Buy on discount zone</span>}
              {template.showScore && <span className="text-green-400"> | Score: +4.2</span>}
            </p>
          ) : (
            <>
              <div className="text-sm">
                <span className="text-green-400 font-bold">🟢 BUY SIGNAL</span>
                <div className="mt-2" style={{ borderTop: '1px solid #374151' }}>
                  <div className="space-y-1 mt-2">
                    {template.showTimestamp && (
                      <div>📅 <strong>Time:</strong> {typeof window !== 'undefined' ? new Date().toLocaleString() : 'Just now'}</div>
                    )}
                    {template.showTicker && (
                      <div>📈 <strong>Ticker:</strong> BTC</div>
                    )}
                    {template.showStrategy && (
                      <div>📊 <strong>Strategy:</strong> Buy on discount zone</div>
                    )}
                    {template.showTriggers && (
                      <div>🎯 <strong>Triggers:</strong> Discount Zone, Normal Bullish Divergence</div>
                    )}
                    {template.showScore && (
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
          {template.format === 'minimal' ? (
            <p className="text-sm">
              <span className="text-red-400">🔴 SELL ETH</span>
              {template.showScore && <span className="text-red-400"> (-4.3)</span>}
            </p>
          ) : template.format === 'compact' ? (
            <p className="text-sm">
              <span className="text-red-400 font-bold">🔴 SELL ETH</span>
              {template.showStrategy && <span style={{ color: "#E0E6ED" }}> | Sell on Premium zone</span>}
              {template.showScore && <span className="text-red-400"> | Score: -4.3</span>}
            </p>
          ) : (
            <>
              <div className="text-sm">
                <span className="text-red-400 font-bold">🔴 SELL SIGNAL</span>
                <div className="mt-2" style={{ borderTop: '1px solid #374151' }}>
                  <div className="space-y-1 mt-2">
                    {template.showTimestamp && (
                      <div>📅 <strong>Time:</strong> {typeof window !== 'undefined' ? new Date(Date.now() - 300000).toLocaleString() : '5 minutes ago'}</div>
                    )}
                    {template.showTicker && (
                      <div>📈 <strong>Ticker:</strong> ETH</div>
                    )}
                    {template.showStrategy && (
                      <div>📊 <strong>Strategy:</strong> Sell on Premium zone</div>
                    )}
                    {template.showTriggers && (
                      <div>🎯 <strong>Triggers:</strong> Premium Zone, Normal Bearish Divergence</div>
                    )}
                    {template.showScore && (
                      <div>📉 <strong>Score:</strong> -4.3</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-gray-800">
        <TabsTrigger value="telegram" className="data-[state=active]:bg-gray-700">
          <Send className="w-4 h-4 mr-2" />
          Telegram
        </TabsTrigger>
        <TabsTrigger value="discord" className="data-[state=active]:bg-gray-700">
          <MessageSquare className="w-4 h-4 mr-2" />
          Discord
        </TabsTrigger>
      </TabsList>

      {/* Telegram Tab */}
      <TabsContent value="telegram" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="telegramBotToken" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
              Bot Token
            </Label>
            <Input
              id="telegramBotToken"
              type="password"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder={telegramConfigured && !telegramBotToken ? "Token saved (enter new to change)" : "Enter your Telegram bot token..."}
              className="mt-1 bg-background border-gray-700 focus:border-accent-buy focus:ring-accent-buy"
            />
            <p className="text-xs mt-1" style={{ color: "#A3A9B8" }}>
              Get this from @BotFather on Telegram
            </p>
            {telegramConfigured && !telegramBotToken && (
              <p className="text-xs mt-1 text-amber-500">
                ℹ️ Bot token is saved but hidden for security. To test connection or change token, please enter it again.
              </p>
            )}
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
          {renderMessageCustomization(telegramMessageTemplate, setTelegramMessageTemplate, 'telegram')}
        </div>

        {/* Preview */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "#E0E6ED" }}>
            📱 Notification Preview
          </h4>
          <p className="text-sm mb-4" style={{ color: "#A3A9B8" }}>
            This is how your notifications will appear in Telegram:
          </p>
          {renderPreview(telegramMessageTemplate, 'telegram')}
        </div>

        {/* Send Test Alert */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <h4 className="text-lg font-semibold mb-4" style={{ color: "#E0E6ED" }}>
            🚀 Send Test Alert
          </h4>
          <p className="text-sm mb-4" style={{ color: "#A3A9B8" }}>
            Send a realistic test alert to your Telegram to verify your configuration is working properly.
          </p>
          
          <div className="flex gap-3">
            <Button
              onClick={() => handleSendTestAlert('BUY')}
              disabled={sendingTestAlert || !telegramChatId || (!telegramBotToken && !telegramConfigured)}
              variant="outline"
              className="flex-1 border-emerald-600/50 text-emerald-600 hover:bg-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingTestAlert ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🟢</span>
                  <span>Send Test BUY Alert</span>
                </span>
              )}
            </Button>
            
            <Button
              onClick={() => handleSendTestAlert('SELL')}
              disabled={sendingTestAlert || !telegramChatId || (!telegramBotToken && !telegramConfigured)}
              variant="outline"
              className="flex-1 border-rose-600/50 text-rose-600 hover:bg-rose-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingTestAlert ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🔴</span>
                  <span>Send Test SELL Alert</span>
                </span>
              )}
            </Button>
          </div>
          
          {(!telegramChatId || (!telegramBotToken && !telegramConfigured)) && (
            <p className="text-xs mt-2 text-amber-500">
              ⚠️ Please configure and save your Telegram Bot Token and Chat ID first
            </p>
          )}
        </div>
      </TabsContent>

      {/* Discord Tab */}
      <TabsContent value="discord" className="space-y-6 mt-6">
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2 text-blue-400">How to get your Discord Webhook URL:</h4>
            <ol className="text-xs space-y-1" style={{ color: "#A3A9B8" }}>
              <li>1. Go to your Discord server and select the channel for alerts</li>
              <li>2. Click the gear icon (Edit Channel) next to the channel name</li>
              <li>3. Go to "Integrations" → "Webhooks"</li>
              <li>4. Click "New Webhook" or select an existing one</li>
              <li>5. Give it a name (e.g., "StockAgent Alerts")</li>
              <li>6. Click "Copy Webhook URL" and paste it below</li>
            </ol>
          </div>

          <div>
            <Label htmlFor="discordWebhookUrl" className="text-sm font-medium" style={{ color: "#E0E6ED" }}>
              Webhook URL
            </Label>
            <Input
              id="discordWebhookUrl"
              type="text"
              value={discordWebhookUrl}
              onChange={(e) => setDiscordWebhookUrl(e.target.value)}
              placeholder={discordConfigured && !discordWebhookUrl ? "Webhook saved (enter new URL to change)" : "https://discord.com/api/webhooks/..."}
              className="mt-1 bg-background border-gray-700 focus:border-accent-buy focus:ring-accent-buy"
            />
            <p className="text-xs mt-1" style={{ color: "#A3A9B8" }}>
              Discord webhook URL for your channel
            </p>
            {discordConfigured && !discordWebhookUrl && (
              <p className="text-xs mt-1 text-amber-500">
                ℹ️ Webhook URL is saved but hidden for security. To test connection or change URL, please enter it again.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleTestDiscord}
            disabled={testingDiscord}
            variant="outline"
            className="bg-transparent border-accent-neutral text-accent-neutral hover:bg-accent-neutral/10 focus:ring-accent-neutral"
          >
            {testingDiscord ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
            Test Connection
          </Button>
          <Button
            onClick={handleSaveDiscord}
            className="bg-accent-buy hover:bg-accent-buy/80 text-white focus:ring-accent-buy"
          >
            Save
          </Button>
        </div>

        {discordStatus.message && (
          <div
            className={`text-sm p-3 rounded-lg ${
              discordStatus.type === "success"
                ? "bg-accent-buy/20 text-accent-buy border border-accent-buy/30"
                : "bg-accent-sell/20 text-accent-sell border border-accent-sell/30"
            }`}
          >
            {discordStatus.message}
          </div>
        )}

        {/* Message Customization */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <h4 className="text-lg font-semibold mb-4" style={{ color: "#E0E6ED" }}>
            ✏️ Customize Message Format
          </h4>
          {renderMessageCustomization(discordMessageTemplate, setDiscordMessageTemplate, 'discord')}
        </div>

        {/* Preview */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "#E0E6ED" }}>
            💬 Discord Embed Preview
          </h4>
          <p className="text-sm mb-4" style={{ color: "#A3A9B8" }}>
            This is how your notifications will appear in Discord:
          </p>
          {renderPreview(discordMessageTemplate, 'discord')}
        </div>

        {/* Send Test Alert */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <h4 className="text-lg font-semibold mb-4" style={{ color: "#E0E6ED" }}>
            🚀 Send Test Alert
          </h4>
          <p className="text-sm mb-4" style={{ color: "#A3A9B8" }}>
            Send a realistic test alert to your Discord channel to verify your configuration is working properly.
          </p>
          
          <div className="flex gap-3">
            <Button
              onClick={() => handleSendDiscordTestAlert('BUY')}
              disabled={sendingDiscordTestAlert || (!discordWebhookUrl && !discordConfigured)}
              variant="outline"
              className="flex-1 border-emerald-600/50 text-emerald-600 hover:bg-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingDiscordTestAlert ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🟢</span>
                  <span>Send Test BUY Alert</span>
                </span>
              )}
            </Button>
            
            <Button
              onClick={() => handleSendDiscordTestAlert('SELL')}
              disabled={sendingDiscordTestAlert || (!discordWebhookUrl && !discordConfigured)}
              variant="outline"
              className="flex-1 border-rose-600/50 text-rose-600 hover:bg-rose-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingDiscordTestAlert ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🔴</span>
                  <span>Send Test SELL Alert</span>
                </span>
              )}
            </Button>
          </div>
          
          {!discordWebhookUrl && !discordConfigured && (
            <p className="text-xs mt-2 text-amber-500">
              ⚠️ Please enter and save your Discord Webhook URL first
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}