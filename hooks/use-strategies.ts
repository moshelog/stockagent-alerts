"use client"

import { useState, useEffect } from "react"
import { useConfig } from "./use-config"
import { authenticatedFetch, getAuthHeaders } from "@/utils/api"

export interface Strategy {
  id: string
  name: string
  timeframe: number
  rules: Array<{
    indicator: string
    trigger: string
  }>
  threshold: number
  enabled: boolean
  is_manual: boolean
  created_at: string
  updated_at?: string
  // UI group structure (preserves Group 2, OR logic, etc.)
  rule_groups?: Array<{
    id: string
    operator: "AND" | "OR"
    alerts: Array<{
      id: string
      indicator: string
      name: string
      weight: number
    }>
  }>
  // Inter-group operator (how groups are connected)
  interGroupOperator?: "AND" | "OR"
  // Frontend-specific properties for compatibility
  ruleGroups?: Array<{
    id: string
    operator: "AND" | "OR"
    alerts: Array<{
      id: string
      indicator: string
      name: string
      weight: number
    }>
  }>
  summary?: string
  rule?: string
  components?: Record<string, number>
  alertDetails?: Array<{
    id: string
    name: string
    weight: number
    indicator: string
  }>
  performance?: {
    netPL: number
    winRate: number
    maxDrawdown: number
  }
}

export function useStrategies() {
  const { config } = useConfig()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!config) return

    const fetchStrategies = async () => {
      try {
        setLoading(true)
        const response = await authenticatedFetch(`${config.apiBase}/strategies`)
        const data = await response.json()

        // Transform API data to include frontend compatibility fields
        const transformedStrategies: Strategy[] = data.map((strategy: any) => {
          // Parse rules if they come as JSON string from backend
          const parsedRules = typeof strategy.rules === 'string' ? JSON.parse(strategy.rules) : strategy.rules
          
          // Parse rule_groups if they exist (preserves UI group structure)
          let parsedRuleGroups = null
          if (strategy.rule_groups) {
            parsedRuleGroups = typeof strategy.rule_groups === 'string' ? JSON.parse(strategy.rule_groups) : strategy.rule_groups
          }
          
          return {
            ...strategy,
            rules: parsedRules, // Use parsed rules
            rule_groups: parsedRuleGroups, // Database field
            ruleGroups: parsedRuleGroups, // Frontend alias for compatibility
            // Add frontend compatibility fields
            summary: `${parsedRules.length} alerts • ${strategy.timeframe} • ${strategy.threshold > 0 ? 'SELL' : 'BUY'} threshold`,
            rule: `IF ${parsedRules.map((r: any) => `${r.indicator}: ${r.trigger}`).join(' + ')} THEN ${strategy.threshold > 0 ? 'SELL' : 'BUY'}`,
            components: {},
            alertDetails: parsedRules.map((r: any, index: number) => ({
              id: `${r.indicator.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${r.trigger.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              name: r.trigger,
              weight: 0, // Will be populated from available_alerts if needed
              indicator: r.indicator
            })),
            performance: {
              netPL: 0, // Would come from actions table analysis
              winRate: 0,
              maxDrawdown: 0
            }
          }
        })

        setStrategies(transformedStrategies)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch strategies:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch strategies')
      } finally {
        setLoading(false)
      }
    }

    fetchStrategies()
  }, [config])

  const createStrategy = async (strategyData: {
    name: string
    timeframe: number
    rules: Array<{ indicator: string, trigger: string }>
    threshold: number
    enabled?: boolean
    ruleGroups?: Array<{
      id: string
      operator: "AND" | "OR"
      alerts: Array<{
        id: string
        indicator: string
        name: string
        weight: number
      }>
    }>
    interGroupOperator?: "AND" | "OR"
  }) => {
    if (!config) {
      console.error('❌ No config available for createStrategy')
      return null
    }

    try {
      console.log('🔄 Creating strategy with data:', strategyData)
      console.log('🌐 API endpoint:', `${config.apiBase}/strategies`)
      
      const response = await authenticatedFetch(`${config.apiBase}/strategies`, {
        method: 'POST',
        body: JSON.stringify({
          name: strategyData.name,
          timeframe: strategyData.timeframe,
          rules: strategyData.rules,
          threshold: strategyData.threshold,
          enabled: strategyData.enabled ?? true,
          ruleGroups: strategyData.ruleGroups, // Include group structure
          interGroupOperator: strategyData.interGroupOperator || "OR" // Include inter-group operator
        })
      })

      console.log('📡 Response status:', response.status, response.statusText)
      console.log('📡 Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error Response:', errorText)
        throw new Error(`Failed to create strategy: ${response.status} ${errorText}`)
      }

      const newStrategy = await response.json()
      console.log('📥 Raw API response:', newStrategy)
      
      // Parse rules if they come as JSON string from backend
      const parsedRules = typeof newStrategy.rules === 'string' ? JSON.parse(newStrategy.rules) : newStrategy.rules
      console.log('🔧 Parsed rules:', parsedRules)
      
      // Parse rule_groups if they exist
      let parsedRuleGroups = null
      if (newStrategy.rule_groups) {
        parsedRuleGroups = typeof newStrategy.rule_groups === 'string' ? JSON.parse(newStrategy.rule_groups) : newStrategy.rule_groups
        console.log('🔧 Parsed rule_groups:', parsedRuleGroups)
      }
      
      // Transform and add to local state
      const transformedStrategy: Strategy = {
        ...newStrategy,
        rules: parsedRules, // Use parsed rules
        rule_groups: parsedRuleGroups, // Database field
        ruleGroups: parsedRuleGroups, // Frontend alias
        summary: `${parsedRules.length} alerts • ${newStrategy.timeframe}m • ${newStrategy.threshold > 0 ? 'SELL' : 'BUY'} threshold`,
        rule: `IF ${parsedRules.map((r: any) => `${r.indicator}: ${r.trigger}`).join(' + ')} THEN ${newStrategy.threshold > 0 ? 'SELL' : 'BUY'}`,
        components: {},
        alertDetails: parsedRules.map((r: any) => ({
          id: `${r.indicator.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${r.trigger.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: r.trigger,
          weight: 0,
          indicator: r.indicator
        })),
        performance: {
          netPL: 0,
          winRate: 0,
          maxDrawdown: 0
        }
      }

      setStrategies(prev => [...prev, transformedStrategy])
      return transformedStrategy
    } catch (err) {
      console.error('Failed to create strategy:', err)
      setError(err instanceof Error ? err.message : 'Failed to create strategy')
      return null
    }
  }

  const updateStrategy = async (id: string, updates: Partial<{
    name: string
    timeframe: number
    rules: Array<{ indicator: string, trigger: string }>
    threshold: number
    enabled: boolean
    ruleGroups: Array<{
      id: string
      operator: "AND" | "OR"
      alerts: Array<{
        id: string
        indicator: string
        name: string
        weight: number
      }>
    }>
    interGroupOperator: "AND" | "OR"
  }>) => {
    if (!config) return false

    try {
      const response = await authenticatedFetch(`${config.apiBase}/strategies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update strategy')
      }

      const updatedStrategy = await response.json()

      // Parse rules if they come as JSON string from backend (same as in fetchStrategies)
      const parsedRules = typeof updatedStrategy.rules === 'string' ? JSON.parse(updatedStrategy.rules) : updatedStrategy.rules
      console.log('🔧 Update: Parsed rules:', parsedRules)
      
      // Parse rule_groups if they exist
      let parsedRuleGroups = null
      if (updatedStrategy.rule_groups) {
        parsedRuleGroups = typeof updatedStrategy.rule_groups === 'string' ? JSON.parse(updatedStrategy.rule_groups) : updatedStrategy.rule_groups
        console.log('🔧 Update: Parsed rule_groups:', parsedRuleGroups)
      }

      // Transform and update local state
      const transformedStrategy: Strategy = {
        ...updatedStrategy,
        rules: parsedRules, // Use parsed rules
        rule_groups: parsedRuleGroups, // Database field
        ruleGroups: parsedRuleGroups, // Frontend alias
        summary: `${parsedRules.length} alerts • ${updatedStrategy.timeframe}m • ${updatedStrategy.threshold > 0 ? 'SELL' : 'BUY'} threshold`,
        rule: `IF ${parsedRules.map((r: any) => `${r.indicator}: ${r.trigger}`).join(' + ')} THEN ${updatedStrategy.threshold > 0 ? 'SELL' : 'BUY'}`,
        components: {},
        alertDetails: parsedRules.map((r: any) => ({
          id: `${r.indicator.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${r.trigger.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: r.trigger,
          weight: 0,
          indicator: r.indicator
        })),
        performance: {
          netPL: 0,
          winRate: 0,
          maxDrawdown: 0
        }
      }

      setStrategies(prev => prev.map(s => s.id === id ? transformedStrategy : s))
      return true
    } catch (err) {
      console.error('Failed to update strategy:', err)
      setError(err instanceof Error ? err.message : 'Failed to update strategy')
      return false
    }
  }

  const deleteStrategy = async (id: string) => {
    if (!config) return false

    try {
      const response = await authenticatedFetch(`${config.apiBase}/strategies/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete strategy')
      }

      setStrategies(prev => prev.filter(s => s.id !== id))
      return true
    } catch (err) {
      console.error('Failed to delete strategy:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete strategy')
      return false
    }
  }

  const toggleStrategy = async (id: string, enabled: boolean) => {
    return updateStrategy(id, { enabled })
  }

  const updateThreshold = async (id: string, threshold: number) => {
    return updateStrategy(id, { threshold })
  }

  return {
    strategies,
    loading,
    error,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    toggleStrategy,
    updateThreshold
  }
}