import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { MoreHorizontal } from "lucide-react"

interface Layer {
  id: string
  name: string
  type: string
  owner: string
  region: string
  visible: boolean
  thumbnail: string
}

// NOAA-only climate layers
const layers: Layer[] = [
  {
    id: "noaa_sea_level_rise",
    name: "NOAA Sea Level Rise",
    type: "Polygon",
    owner: "NOAA",
    region: "Nassau County",
    visible: true,
    thumbnail: "/sea-level-rise.jpg",
  },
  {
    id: "noaa_temperature_anomaly",
    name: "NOAA Temperature Anomaly",
    type: "Raster",
    owner: "NOAA",
    region: "Nassau County",
    visible: false,
    thumbnail: "/temperature-heatmap.jpg",
  },
  {
    id: "noaa_precipitation_trend",
    name: "NOAA Precipitation Trend",
    type: "Raster",
    owner: "NOAA",
    region: "Nassau County",
    visible: false,
    thumbnail: "/placeholder.svg",
  },
]

interface LayerListProps {
  selectedLayer: string
  onLayerSelect: (layerId: string) => void
  climateData?: any
}

export function LayerList({ selectedLayer, onLayerSelect, climateData }: LayerListProps) {
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>(
    layers.reduce((acc, layer) => ({ ...acc, [layer.id]: layer.visible }), {}),
  )

  const toggleVisibility = (layerId: string) => {
    setLayerVisibility((prev) => ({ ...prev, [layerId]: !prev[layerId] }))
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {layers.map((layer) => (
        <Card
          key={layer.id}
          className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
            selectedLayer === layer.id ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => onLayerSelect(layer.id)}
        >
          <div className="flex items-start gap-3">
            <img
              src={layer.thumbnail || "/placeholder.svg"}
              alt={layer.name}
              className="w-16 h-12 rounded object-cover bg-muted"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-sm truncate">{layer.name}</h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleVisibility(layer.id)
                    }}
                  >
                    {layerVisibility[layer.id] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  {layer.type}
                </Badge>
                <span className="text-xs text-muted-foreground">{layer.owner}</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{layer.region}</span>
                <span>•</span>
                <span>2w ago</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
