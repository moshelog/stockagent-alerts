"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown, ChevronUp } from "lucide-react"
import AvailableAlertsPanel from "./AvailableAlertsPanel"

interface MobileAlertsAccordionProps {
  alertConfig?: any
  onUpdateWeight: (alertId: string, weight: number) => void
  showWeights?: boolean
}

export default function MobileAlertsAccordion({ alertConfig, onUpdateWeight, showWeights = true }: MobileAlertsAccordionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="lg:hidden bg-background-surface rounded-2xl shadow-lg overflow-hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
        aria-expanded={isOpen}
        aria-controls="mobile-alerts-content"
      >
        <h3 className="text-lg font-semibold" style={{ color: "#E0E6ED" }}>
          Available Alerts
        </h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5" style={{ color: "#A3A9B8" }} />
        ) : (
          <ChevronDown className="w-5 h-5" style={{ color: "#A3A9B8" }} />
        )}
      </button>

      <motion.div
        id="mobile-alerts-content"
        initial={false}
        animate={{ height: isOpen ? "auto" : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="p-4 pt-0">
          <AvailableAlertsPanel alertConfig={alertConfig} onUpdateWeight={onUpdateWeight} showWeights={showWeights} />
        </div>
      </motion.div>
    </div>
  )
}
