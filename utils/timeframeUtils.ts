/**
 * Minimal timeframe utilities for normalization and sorting
 */

/**
 * Normalize timeframe strings: remove spaces, convert to uppercase, and ensure unit letter
 * Examples: "5 m" → "5M", "1 h" → "1H", "5" → "5M", "15" → "15M"
 */
export function normalizeTimeframe(timeframe: string): string {
  if (!timeframe) return ''
  
  // Remove spaces and convert to uppercase
  let normalized = timeframe.replace(/\s+/g, '').toUpperCase()
  
  // If it's just a number without a unit letter, assume minutes
  if (/^\d+$/.test(normalized)) {
    normalized += 'M'
  }
  
  return normalized
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