import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { X } from "lucide-react"
import { useState } from "react"

interface VisualizationPanelProps {
  onClose?: () => void
  climateData?: any
}

// NOAA-focused charts only
const chartTypes = [
  { key: "seaLevelRise", name: "Sea Level Rise", icon: "🌊", description: "Coastal flooding projections (NOAA)" },
]

export function VisualizationPanel({ onClose, climateData }: VisualizationPanelProps) {
  const [activeCharts, setActiveCharts] = useState({
    seaLevelRise: true
  })

  const toggleChart = (chartKey: string) => {
    setActiveCharts(prev => ({
      ...prev,
      [chartKey]: !prev[chartKey as keyof typeof prev]
    }))
  }

  return (
    <div className="w-64 bg-card border-l border-gray-700 p-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-sm">Climate Charts</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {chartTypes.map((chart, index) => {
          const isActive = activeCharts[chart.key as keyof typeof activeCharts]
          return (
            <div key={chart.key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{chart.name}</span>
                {isActive && (
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                )}
              </div>

              <Card
                className={`p-3 cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:scale-[1.02] ${
                  isActive ? "ring-2 ring-primary bg-accent/20" : ""
                }`}
                onClick={() => toggleChart(chart.key)}
              >
                <div className="flex items-center justify-center h-16 bg-muted/50 rounded mb-2">
                  <div className="text-2xl">{chart.icon}</div>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {chart.description}
                </div>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
