import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { X } from "lucide-react"

interface VisualizationPanelProps {
  onClose: () => void
  climateData?: any
}

const chartTypes = [
  { name: "Temperature Trends", icon: "🌡️", active: true, description: "Historical and projected temperature data" },
  { name: "Sea Level Rise", icon: "🌊", active: false, description: "Coastal flooding projections" },
  { name: "Air Quality Index", icon: "💨", active: false, description: "Real-time air quality metrics" },
  { name: "Climate Summary", icon: "📈", active: false, description: "Comprehensive climate overview" },
  { name: "Risk Assessment", icon: "⚠️", active: false, description: "Environmental risk analysis" },
]

export function VisualizationPanel({ onClose, climateData }: VisualizationPanelProps) {
  return (
    <div className="w-64 bg-card border-l border-gray-700 p-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-sm">Climate Charts</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {chartTypes.map((chart, index) => (
          <div key={chart.name}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{chart.name}</span>
              {chart.active && (
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              )}
            </div>

            <Card
              className={`p-3 cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:scale-[1.02] ${
                chart.active ? "ring-2 ring-primary bg-accent/20" : ""
              }`}
            >
              <div className="flex items-center justify-center h-16 bg-muted/50 rounded mb-2">
                <div className="text-2xl">{chart.icon}</div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {chart.description}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
