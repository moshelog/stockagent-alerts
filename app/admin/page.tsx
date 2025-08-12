"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Settings, Database, Bell, Plus, Edit3, Trash2, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useConfig } from "@/hooks/useConfig"
import Link from "next/link"
import { getAuthHeaders } from "@/utils/api"

interface Indicator {
  id: string
  name: string
  display_name: string
  description?: string
  category: string
  enabled: boolean
  created_at: string
  updated_at: string
}

interface Alert {
  id: string
  indicator: string
  trigger: string
  weight: number
  enabled: boolean
  tooltip?: string
  indicator_id?: string
  created_at: string
}

export default function AdminPage() {
  const { config } = useConfig()
  const [activeTab, setActiveTab] = useState<"indicators" | "alerts">("indicators")
  const [apiStatus, setApiStatus] = useState<"checking" | "available" | "unavailable">("checking")
  
  // Indicators state
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loadingIndicators, setLoadingIndicators] = useState(true)
  const [editingIndicator, setEditingIndicator] = useState<string | null>(null)
  const [newIndicator, setNewIndicator] = useState({
    name: "",
    display_name: "",
    description: "",
    category: "general"
  })

  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [editingAlert, setEditingAlert] = useState<string | null>(null)
  const [newAlert, setNewAlert] = useState({
    indicator: "",
    trigger: "",
    weight: 0,
    enabled: true,
    tooltip: "",
    indicator_id: ""
  })

  // Load indicators
  const loadIndicators = async () => {
    if (!config) return
    
    try {
      setLoadingIndicators(true)
      const response = await fetch(`${config.apiBase}/indicators`, {
        headers: getAuthHeaders()
      })
      
      if (!response.ok) {
        console.warn('Indicators API not available yet, using fallback')
        setApiStatus("unavailable")
        // Fallback data if API is not ready
        setIndicators([
          { id: '1', name: 'nautilus', display_name: 'Oscillator', description: 'Advanced oscillator with divergence detection and volume analysis', category: 'oscillator', enabled: true, created_at: '', updated_at: '' },
          { id: '2', name: 'market_core', display_name: 'SMC', description: 'Smart Money Concepts (SMC) with order blocks, FVG, and structure breaks', category: 'smc', enabled: true, created_at: '', updated_at: '' },
          { id: '3', name: 'market_waves', display_name: 'Waves', description: 'Trend analysis with flow detection and wave patterns', category: 'trend', enabled: true, created_at: '', updated_at: '' },
          { id: '4', name: 'extreme_zones', display_name: 'Extreme Zones', description: 'Premium, discount, and equilibrium zone analysis', category: 'zones', enabled: true, created_at: '', updated_at: '' }
        ])
        return
      }
      
      setApiStatus("available")
      
      const data = await response.json()
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setIndicators(data)
      } else {
        console.error('Indicators API returned non-array:', data)
        setIndicators([])
      }
    } catch (error) {
      console.error('Failed to load indicators:', error)
      setIndicators([])
    } finally {
      setLoadingIndicators(false)
    }
  }

  // Load alerts
  const loadAlerts = async () => {
    if (!config) return
    
    try {
      setLoadingAlerts(true)
      const response = await fetch(`${config.apiBase}/available-alerts`, {
        headers: getAuthHeaders()
      })
      
      if (!response.ok) {
        console.error('Failed to load alerts:', response.status, response.statusText)
        setAlerts([])
        return
      }
      
      const data = await response.json()
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setAlerts(data)
      } else {
        console.error('Available alerts API returned non-array:', data)
        setAlerts([])
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
      setAlerts([])
    } finally {
      setLoadingAlerts(false)
    }
  }

  // Initialize data
  React.useEffect(() => {
    if (config) {
      loadIndicators()
      loadAlerts()
    }
  }, [config])

  // Create indicator
  const createIndicator = async () => {
    if (!config || !newIndicator.name || !newIndicator.display_name) return

    try {
      const response = await fetch(`${config.apiBase}/indicators`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newIndicator)
      })

      if (response.ok) {
        setNewIndicator({ name: "", display_name: "", description: "", category: "general" })
        loadIndicators()
        alert('Indicator created successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to create indicator: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create indicator:', error)
      alert('Failed to create indicator. The API may not be available yet.')
    }
  }

  // Update indicator
  const updateIndicator = async (id: string, updates: Partial<Indicator>) => {
    if (!config) return

    try {
      const response = await fetch(`${config.apiBase}/indicators/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setEditingIndicator(null)
        loadIndicators()
      }
    } catch (error) {
      console.error('Failed to update indicator:', error)
    }
  }

  // Delete indicator
  const deleteIndicator = async (id: string) => {
    if (!config || !confirm('Are you sure you want to delete this indicator?')) return

    try {
      const response = await fetch(`${config.apiBase}/indicators/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        loadIndicators()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Failed to delete indicator:', error)
    }
  }

  // Create alert
  const createAlert = async () => {
    if (!config || !newAlert.indicator || !newAlert.trigger) return

    try {
      const response = await fetch(`${config.apiBase}/available-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert)
      })

      if (response.ok) {
        setNewAlert({
          indicator: "",
          trigger: "",
          weight: 0,
          enabled: true,
          tooltip: "",
          indicator_id: ""
        })
        loadAlerts()
        alert('Alert created successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to create alert: ${error.error || 'API endpoint not available yet'}`)
      }
    } catch (error) {
      console.error('Failed to create alert:', error)
      alert('Failed to create alert. The admin API may not be fully deployed yet. Try again in a few minutes.')
    }
  }

  // Update alert
  const updateAlert = async (id: string, updates: Partial<Alert>) => {
    if (!config) return

    try {
      const response = await fetch(`${config.apiBase}/available-alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setEditingAlert(null)
        loadAlerts()
      }
    } catch (error) {
      console.error('Failed to update alert:', error)
    }
  }

  // Delete alert
  const deleteAlert = async (id: string) => {
    if (!config || !confirm('Are you sure you want to delete this alert?')) return

    try {
      const response = await fetch(`${config.apiBase}/available-alerts/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadAlerts()
      }
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4" />
          <p style={{ color: "#E0E6ED" }}>Loading Admin Panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        className="border-b border-gray-800 bg-background-surface"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#E0E6ED" }}>
                  Admin Panel
                </h1>
                <p className="text-sm text-gray-400">Manage Indicators & Alerts</p>
              </div>
            </div>

            <Link href="/">
              <Button variant="outline" size="sm" className="bg-transparent">
                <Settings className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Status Banner */}
        {apiStatus === "unavailable" && (
          <div className="mb-6 p-4 bg-orange-900/20 border border-orange-700 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              <div className="text-orange-300 text-sm">
                <p>
                  <strong>Admin API Deploying:</strong> The backend is updating with admin endpoints. You can view existing data, but create/edit/delete operations are temporarily unavailable.
                </p>
                <p className="mt-2 text-orange-200">
                  <strong>Workaround:</strong> Use the "📋 SQL" buttons to generate SQL commands for manual database operations until deployment completes.
                </p>
                <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700 rounded">
                  <p className="text-blue-200 text-xs">
                    <strong>Quick Access:</strong> Connect to your database using: <code className="bg-blue-800 px-1 rounded">psql [your-supabase-connection-string]</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8">
          <Button
            variant={activeTab === "indicators" ? "default" : "outline"}
            onClick={() => setActiveTab("indicators")}
            className="bg-transparent"
          >
            <Database className="w-4 h-4 mr-2" />
            Indicators
          </Button>
          <Button
            variant={activeTab === "alerts" ? "default" : "outline"}
            onClick={() => setActiveTab("alerts")}
            className="bg-transparent"
          >
            <Bell className="w-4 h-4 mr-2" />
            Alerts
          </Button>
        </div>

        {/* Indicators Tab */}
        {activeTab === "indicators" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Add New Indicator */}
            <div className="bg-background-surface rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: "#E0E6ED" }}>
                Add New Indicator
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="indicator-name">Name (Key)</Label>
                  <Input
                    id="indicator-name"
                    value={newIndicator.name}
                    onChange={(e) => setNewIndicator(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., nautilus"
                  />
                </div>
                <div>
                  <Label htmlFor="indicator-display">Display Name</Label>
                  <Input
                    id="indicator-display"
                    value={newIndicator.display_name}
                    onChange={(e) => setNewIndicator(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="e.g., Nautilus™"
                  />
                </div>
                <div>
                  <Label htmlFor="indicator-category">Category</Label>
                  <Select
                    value={newIndicator.category}
                    onValueChange={(value) => setNewIndicator(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="oscillator">Oscillator</SelectItem>
                      <SelectItem value="smc">SMC</SelectItem>
                      <SelectItem value="trend">Trend</SelectItem>
                      <SelectItem value="zones">Zones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={createIndicator} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Indicator
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="indicator-description">Description</Label>
                <Textarea
                  id="indicator-description"
                  value={newIndicator.description}
                  onChange={(e) => setNewIndicator(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the indicator..."
                  rows={2}
                />
              </div>
            </div>

            {/* Indicators List */}
            <div className="bg-background-surface rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold" style={{ color: "#E0E6ED" }}>
                  Indicators ({indicators.length})
                </h3>
              </div>
              
              {loadingIndicators ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4" />
                  <p style={{ color: "#A3A9B8" }}>Loading indicators...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-background border-b border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>Display Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>Category</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>Description</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>Enabled</th>
                        <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: "#A3A9B8" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indicators.map((indicator) => (
                        <IndicatorRow
                          key={indicator.id}
                          indicator={indicator}
                          isEditing={editingIndicator === indicator.id}
                          onEdit={(id) => setEditingIndicator(id)}
                          onSave={(id, updates) => updateIndicator(id, updates)}
                          onCancel={() => setEditingIndicator(null)}
                          onDelete={(id) => deleteIndicator(id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Add New Alert */}
            <div className="bg-background-surface rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: "#E0E6ED" }}>
                Add New Alert
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="alert-indicator">Indicator</Label>
                  <Select
                    value={newAlert.indicator}
                    onValueChange={(value) => setNewAlert(prev => ({ ...prev, indicator: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select indicator" />
                    </SelectTrigger>
                    <SelectContent>
                      {indicators.map((indicator) => (
                        <SelectItem key={indicator.id} value={indicator.display_name}>
                          {indicator.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alert-trigger">Trigger Name</Label>
                  <Input
                    id="alert-trigger"
                    value={newAlert.trigger}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, trigger: e.target.value }))}
                    placeholder="e.g., Bullish Peak"
                  />
                </div>
                <div>
                  <Label htmlFor="alert-weight">Weight</Label>
                  <Input
                    id="alert-weight"
                    type="number"
                    min="-10"
                    max="10"
                    step="1"
                    value={newAlert.weight}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="alert-enabled">Enabled</Label>
                  <Select
                    value={newAlert.enabled ? "true" : "false"}
                    onValueChange={(value) => setNewAlert(prev => ({ ...prev, enabled: value === "true" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={createAlert} className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Alert
                  </Button>
                  {apiStatus === "unavailable" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const sql = `INSERT INTO available_alerts (indicator, trigger, weight, enabled, tooltip) VALUES ('${newAlert.indicator}', '${newAlert.trigger}', ${newAlert.weight}, ${newAlert.enabled}, '${newAlert.tooltip || ''}');`
                        navigator.clipboard.writeText(sql)
                        alert('SQL command copied to clipboard! Run this in your database.')
                      }}
                      className="px-3"
                    >
                      📋 SQL
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="alert-tooltip">Tooltip Text</Label>
                <Textarea
                  id="alert-tooltip"
                  value={newAlert.tooltip}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, tooltip: e.target.value }))}
                  placeholder="Brief explanation of what this alert means..."
                  rows={2}
                />
              </div>
            </div>

            {/* Alerts List */}
            <div className="bg-background-surface rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold" style={{ color: "#E0E6ED" }}>
                  Alerts ({alerts.length})
                </h3>
              </div>
              
              {loadingAlerts ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4" />
                  <p style={{ color: "#A3A9B8" }}>Loading alerts...</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-background border-b border-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>Indicator</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>Trigger</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>Weight</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>Enabled</th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: "#A3A9B8" }}>Tooltip</th>
                        <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: "#A3A9B8" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((alert) => (
                        <AlertRow
                          key={alert.id}
                          alert={alert}
                          indicators={indicators}
                          isEditing={editingAlert === alert.id}
                          onEdit={(id) => setEditingAlert(id)}
                          onSave={(id, updates) => updateAlert(id, updates)}
                          onCancel={() => setEditingAlert(null)}
                          onDelete={(id) => deleteAlert(id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}

// Component for editing indicator rows
function IndicatorRow({ 
  indicator, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete 
}: {
  indicator: Indicator
  isEditing: boolean
  onEdit: (id: string) => void
  onSave: (id: string, updates: Partial<Indicator>) => void
  onCancel: () => void
  onDelete: (id: string) => void
}) {
  const [editData, setEditData] = useState(indicator)

  React.useEffect(() => {
    setEditData(indicator)
  }, [indicator, isEditing])

  if (isEditing) {
    return (
      <tr className="border-b border-gray-800 bg-gray-800/30">
        <td className="px-4 py-3">
          <Input
            value={editData.name}
            onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
          />
        </td>
        <td className="px-4 py-3">
          <Input
            value={editData.display_name}
            onChange={(e) => setEditData(prev => ({ ...prev, display_name: e.target.value }))}
          />
        </td>
        <td className="px-4 py-3">
          <Select
            value={editData.category}
            onValueChange={(value) => setEditData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="oscillator">Oscillator</SelectItem>
              <SelectItem value="smc">SMC</SelectItem>
              <SelectItem value="trend">Trend</SelectItem>
              <SelectItem value="zones">Zones</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3">
          <Input
            value={editData.description || ""}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
          />
        </td>
        <td className="px-4 py-3">
          <Select
            value={editData.enabled ? "true" : "false"}
            onValueChange={(value) => setEditData(prev => ({ ...prev, enabled: value === "true" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => onSave(indicator.id, editData)}>
              <Save className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3 text-sm font-mono" style={{ color: "#E0E6ED" }}>
        {indicator.name}
      </td>
      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#E0E6ED" }}>
        {indicator.display_name}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: "#A3A9B8" }}>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          indicator.category === 'oscillator' ? 'bg-blue-900/30 text-blue-300' :
          indicator.category === 'smc' ? 'bg-purple-900/30 text-purple-300' :
          indicator.category === 'trend' ? 'bg-green-900/30 text-green-300' :
          indicator.category === 'zones' ? 'bg-orange-900/30 text-orange-300' :
          'bg-gray-900/30 text-gray-300'
        }`}>
          {indicator.category}
        </span>
      </td>
      <td className="px-4 py-3 text-sm max-w-xs truncate" style={{ color: "#A3A9B8" }}>
        {indicator.description || '—'}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          indicator.enabled ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
        }`}>
          {indicator.enabled ? 'Yes' : 'No'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(indicator.id)}>
            <Edit3 className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(indicator.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// Component for editing alert rows
function AlertRow({ 
  alert, 
  indicators,
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete 
}: {
  alert: Alert
  indicators: Indicator[]
  isEditing: boolean
  onEdit: (id: string) => void
  onSave: (id: string, updates: Partial<Alert>) => void
  onCancel: () => void
  onDelete: (id: string) => void
}) {
  const [editData, setEditData] = useState(alert)

  React.useEffect(() => {
    setEditData(alert)
  }, [alert, isEditing])

  if (isEditing) {
    return (
      <tr className="border-b border-gray-800 bg-gray-800/30">
        <td className="px-4 py-3">
          <Select
            value={editData.indicator}
            onValueChange={(value) => setEditData(prev => ({ ...prev, indicator: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {indicators.map((indicator) => (
                <SelectItem key={indicator.id} value={indicator.display_name}>
                  {indicator.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3">
          <Input
            value={editData.trigger}
            onChange={(e) => setEditData(prev => ({ ...prev, trigger: e.target.value }))}
          />
        </td>
        <td className="px-4 py-3">
          <Input
            type="number"
            min="-10"
            max="10"
            step="1"
            value={editData.weight}
            onChange={(e) => setEditData(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
          />
        </td>
        <td className="px-4 py-3">
          <Select
            value={editData.enabled ? "true" : "false"}
            onValueChange={(value) => setEditData(prev => ({ ...prev, enabled: value === "true" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3">
          <Textarea
            value={editData.tooltip || ""}
            onChange={(e) => setEditData(prev => ({ ...prev, tooltip: e.target.value }))}
            rows={2}
            className="w-full min-w-[200px]"
          />
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => onSave(alert.id, editData)}>
              <Save className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3 text-sm" style={{ color: "#E0E6ED" }}>
        {alert.indicator}
      </td>
      <td className="px-4 py-3 text-sm font-medium" style={{ color: "#E0E6ED" }}>
        {alert.trigger}
      </td>
      <td className="px-4 py-3 text-sm font-mono">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          alert.weight > 0 ? 'bg-green-900/30 text-green-300' :
          alert.weight < 0 ? 'bg-red-900/30 text-red-300' :
          'bg-gray-900/30 text-gray-300'
        }`}>
          {alert.weight > 0 ? '+' : ''}{alert.weight}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          alert.enabled ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
        }`}>
          {alert.enabled ? 'Yes' : 'No'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm max-w-xs">
        <div className="truncate" style={{ color: "#A3A9B8" }} title={alert.tooltip}>
          {alert.tooltip || '—'}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(alert.id)}>
            <Edit3 className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(alert.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}