"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface ReloadConfigProps {
  onReload: () => void
  loading: boolean
}

export function ReloadConfig({ onReload, loading }: ReloadConfigProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="trading-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">Configuration</h4>
          <p className="text-xs text-text-secondary">Reload runtime config</p>
        </div>
        <Button
          onClick={onReload}
          disabled={loading}
          size="sm"
          variant="outline"
          className="border-gray-700 hover:bg-gray-800 bg-transparent"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </motion.div>
  )
}
