import { useState, useEffect } from 'react'

interface TickerIndicator {
  id: string
  ticker: string
  vwap_value?: number
  rsi_value?: number
  rsi_status?: string
  adx_value?: number
  adx_strength?: string
  adx_direction?: string
  htf_status?: string
  volume_amount?: string
  volume_change?: number
  volume_level?: string
  updated_at: string
  created_at: string
}

export const useTickerIndicators = () => {
  const [indicators, setIndicators] = useState<Record<string, TickerIndicator>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIndicators = async () => {
    try {
      // Try the public endpoint first, then fall back to the API endpoint
      const urls = process.env.NODE_ENV === 'production' 
        ? ['https://api.stockagent.app/ticker-indicators', 'https://api.stockagent.app/api/ticker-indicators']
        : ['http://localhost:3001/ticker-indicators', 'http://localhost:3001/api/ticker-indicators']
      
      let response
      let lastError
      
      for (const url of urls) {
        try {
          response = await fetch(url, {
            credentials: 'include'
          })
          if (response.ok) {
            break
          }
          lastError = new Error(`HTTP error! status: ${response.status}`)
        } catch (err) {
          lastError = err
          continue
        }
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error('All endpoints failed')
      }
      const data: TickerIndicator[] = await response.json()
      
      // Convert array to map keyed by ticker for easy lookup
      const indicatorsMap = data.reduce((acc, indicator) => {
        acc[indicator.ticker] = indicator
        return acc
      }, {} as Record<string, TickerIndicator>)
      
      setIndicators(indicatorsMap)
      setError(null)
    } catch (err) {
      console.error('Error fetching ticker indicators:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch indicators')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIndicators()
    
    // Poll for updates every 5 seconds when component is mounted
    const interval = setInterval(fetchIndicators, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const getIndicatorForTicker = (ticker: string): TickerIndicator | null => {
    return indicators[ticker.toUpperCase()] || null
  }

  const getRSIDisplay = (ticker: string) => {
    const indicator = getIndicatorForTicker(ticker)
    if (!indicator?.rsi_value) {
      return { value: '0', status: 'Neutral' }
    }
    return {
      value: indicator.rsi_value.toString(),
      status: indicator.rsi_status || 'Neutral'
    }
  }

  const getADXDisplay = (ticker: string) => {
    const indicator = getIndicatorForTicker(ticker)
    if (!indicator?.adx_value) {
      return { value: '0', status: 'Neutral' }
    }
    const strength = indicator.adx_strength || 'Weak'
    const direction = indicator.adx_direction || 'Neutral'
    return {
      value: indicator.adx_value.toString(),
      status: `${strength} ${direction}`
    }
  }

  const getVWAPDisplay = (ticker: string) => {
    const indicator = getIndicatorForTicker(ticker)
    if (!indicator?.vwap_value) {
      return { value: '0%' }
    }
    const sign = indicator.vwap_value >= 0 ? '+' : ''
    return {
      value: `${sign}${indicator.vwap_value.toFixed(2)}%`
    }
  }

  const getHTFDisplay = (ticker: string) => {
    const indicator = getIndicatorForTicker(ticker)
    return {
      status: indicator?.htf_status || 'None'
    }
  }

  const getVolumeDisplay = (ticker: string) => {
    const indicator = getIndicatorForTicker(ticker)
    if (!indicator?.volume_amount) {
      return { amount: '0', change: 0, level: 'NORMAL' }
    }
    return {
      amount: indicator.volume_amount,
      change: indicator.volume_change || 0,
      level: indicator.volume_level || 'NORMAL'
    }
  }

  return {
    indicators,
    loading,
    error,
    getIndicatorForTicker,
    getRSIDisplay,
    getADXDisplay,
    getVWAPDisplay,
    getHTFDisplay,
    getVolumeDisplay,
    refresh: fetchIndicators
  }
}