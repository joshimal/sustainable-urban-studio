"use client"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Separator } from "./ui/separator"
import { useState } from "react"
import { X, MoreHorizontal, Plus } from "lucide-react"

interface LayerPanelProps {
  selectedLayer: string
  onClose: () => void
  climateData?: any
}

export function LayerPanel({ selectedLayer, onClose, climateData }: LayerPanelProps) {
  const [opacity, setOpacity] = useState([75])
  const [size, setSize] = useState([8])
  const [temperatureThreshold, setTemperatureThreshold] = useState([3.2])
  const [seaLevelRange, setSeaLevelRange] = useState([2.5])
  const [borderWidth, setBorderWidth] = useState([1])

  const getLayerConfig = () => {
    switch (selectedLayer) {
      case "temperature_heatmap":
        return {
          name: "Temperature Projections",
          displayStyle: "heatmap",
          colorScale: "from-blue-500 via-yellow-500 to-red-500",
          currentValue: climateData?.temperature?.value || 3.2,
          unit: "°C increase",
        }
      case "sea_level_rise":
        return {
          name: "Sea Level Rise",
          displayStyle: "polygon",
          colorScale: "from-blue-400 via-cyan-500 to-blue-600",
          currentValue: climateData?.seaLevel?.value || 2.5,
          unit: "cm rise",
        }
      case "air_quality":
        return {
          name: "Air Quality",
          displayStyle: "points",
          colorScale: "from-green-500 via-yellow-500 to-red-500",
          currentValue: climateData?.airQuality?.value || 85,
          unit: "AQI",
        }
      default:
        return {
          name: "Climate Layer",
          displayStyle: "heatmap",
          colorScale: "from-blue-500 via-green-500 to-red-500",
          currentValue: 0,
          unit: "",
        }
    }
  }

  const layerConfig = getLayerConfig()

  return (
    <div className="w-80 bg-card border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Climate Controls</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{layerConfig.name}</span>
          <Button variant="ghost" size="sm" className="p-1">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Layer Tabs */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="style" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mx-4 mt-4">
            <TabsTrigger value="general" className="text-xs">
              General
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs">
              Data
            </TabsTrigger>
            <TabsTrigger value="style" className="text-xs">
              Style
            </TabsTrigger>
            <TabsTrigger value="hover" className="text-xs">
              Hover
            </TabsTrigger>
            <TabsTrigger value="click" className="text-xs">
              Click
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="p-4 space-y-4">
            <div className="text-sm">
              <div className="font-medium mb-1">Layer Name</div>
              <div className="text-muted-foreground text-xs">{layerConfig.name}</div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Data Source</div>
              <div className="text-muted-foreground text-xs">Climate API - Nassau County</div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Last Updated</div>
              <div className="text-muted-foreground text-xs">Real-time</div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Resolution</div>
              <div className="text-muted-foreground text-xs">1km² grid</div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="p-4 space-y-4">
            <div className="text-sm">
              <div className="font-medium mb-1">Data Source</div>
              <div className="text-muted-foreground text-xs">Climate API - Nassau County</div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Last Updated</div>
              <div className="text-muted-foreground text-xs">Real-time</div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Resolution</div>
              <div className="text-muted-foreground text-xs">1km² grid</div>
            </div>
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-6">
            {/* Display Style */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Display style</label>
                <Button variant="ghost" size="sm" className="p-1">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <Select value={layerConfig.displayStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heatmap">Heatmap</SelectItem>
                  <SelectItem value="points">Points</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="clusters">Clusters</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color Scale */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Color scale</label>
                <label className="text-sm font-medium">Density threshold</label>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className={`h-2 bg-gradient-to-r ${layerConfig.colorScale} rounded`}></div>
                </div>
                <Select defaultValue="128">
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="64">64</SelectItem>
                    <SelectItem value="128">128</SelectItem>
                    <SelectItem value="256">256</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Opacity and Size */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Opacity</label>
                <div className="space-y-2">
                  <Slider value={opacity} onValueChange={setOpacity} max={100} step={1} className="w-full" />
                  <span className="text-xs text-muted-foreground">{opacity[0]}%</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Size</label>
                <div className="space-y-2">
                  <Slider value={size} onValueChange={setSize} max={20} step={1} className="w-full" />
                  <span className="text-xs text-muted-foreground">{size[0]} px</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Border */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Border</label>
                <Button variant="ghost" size="sm" className="p-1">
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Border color</label>
                    <Select defaultValue="select">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="white">White</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Color offset</label>
                    <Select defaultValue="3">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Width</label>
                  <Slider value={borderWidth} onValueChange={setBorderWidth} max={10} step={1} className="w-full" />
                  <span className="text-xs text-muted-foreground mt-1">{borderWidth[0]}px</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                <Plus className="h-3 w-3" />
                Label
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                <Plus className="h-3 w-3" />
                Badge
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="hover" className="p-4">
            <div className="text-sm text-muted-foreground">Hover interaction settings</div>
          </TabsContent>

          <TabsContent value="click" className="p-4">
            <div className="text-sm text-muted-foreground">Click interaction settings</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
