/**
 * Minimal timeframe utilities for normalization and sorting
 */

/**
 * Normalize timeframe strings: remove spaces and convert to uppercase
 * Examples: "5 m" → "5M", "1 h" → "1H"
 */
export function normalizeTimeframe(timeframe: string): string {
  if (!timeframe) return ''
  return timeframe.replace(/\s+/g, '').toUpperCase()
}

/**
 * Get timeframe sort order (lower number = earlier in sort)
 */
export function getTimeframeSortOrder(timeframe: string): number {
  const normalized = normalizeTimeframe(timeframe)
  
  // Convert to minutes for sorting
  const match = normalized.match(/^(\d+)([A-Z]+)$/)
  if (!match) return 999999 // Put unknown timeframes at the end
  
  const num = parseInt(match[1], 10)
  const unit = match[2]
  
  let minutes = 0
  switch (unit) {
    case 'M': minutes = num; break
    case 'H': minutes = num * 60; break  
    case 'D': minutes = num * 60 * 24; break
    default: return 999999
  }
  
  return minutes
}