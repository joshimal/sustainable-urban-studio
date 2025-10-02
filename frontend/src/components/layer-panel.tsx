"use client"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Separator } from "./ui/separator"
import { useState } from "react"
import { X, MoreHorizontal, Plus, ChevronDown, ChevronRight } from "lucide-react"

interface LayerPanelProps {
  selectedLayer: string
  onClose?: () => void
  climateData?: any
  onSeaLevelChange?: (feet: number) => void
}

export function LayerPanel({ selectedLayer, onClose, climateData, onSeaLevelChange }: LayerPanelProps) {
  const [dataSource, setDataSource] = useState("NOAA")
  const [seaLevelEnabled, setSeaLevelEnabled] = useState(true)
  const [floodExposureEnabled, setFloodExposureEnabled] = useState(false)
  const [landCoverEnabled, setLandCoverEnabled] = useState(false)
  const [elevationEnabled, setElevationEnabled] = useState(false)
  const [waterQualityEnabled, setWaterQualityEnabled] = useState(false)
  const [datasetsExpanded, setDatasetsExpanded] = useState(true)
  const [opacity, setOpacity] = useState([75])
  const [size, setSize] = useState([8])
  const [temperatureThreshold, setTemperatureThreshold] = useState([3.2])
  const [seaLevelRange, setSeaLevelRange] = useState([3])
  const [borderWidth, setBorderWidth] = useState([1])


  const getLayerConfig = () => {
    switch (selectedLayer) {
      case "noaa_sea_level_rise":
        return {
          name: "NOAA Sea Level Rise",
          displayStyle: "polygon",
          colorScale: "from-blue-400 via-cyan-500 to-blue-600",
          currentValue: climateData?.seaLevel?.value || 2.5,
          unit: "cm rise",
        }
      case "noaa_temperature_anomaly":
        return {
          name: "NOAA Temperature Anomaly",
          displayStyle: "heatmap",
          colorScale: "from-blue-500 via-yellow-500 to-red-500",
          currentValue: climateData?.temperature?.value || 3.2,
          unit: "°C",
        }
      case "noaa_precipitation_trend":
        return {
          name: "NOAA Precipitation Trend",
          displayStyle: "heatmap",
          colorScale: "from-blue-400 via-sky-400 to-indigo-500",
          currentValue: climateData?.precipitation?.value || 85,
          unit: "index",
        }
      default:
        return {
          name: "NOAA Climate Layer",
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Layer Controls</h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Data Source Dropdown */}
        <div className="mb-3">
          <Select value={dataSource} onValueChange={setDataSource}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOAA">NOAA</SelectItem>
              <SelectItem value="FEMA">FEMA</SelectItem>
              <SelectItem value="USGS">USGS</SelectItem>
              <SelectItem value="Census">Census TIGER</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Datasets Dropdown */}
        <div className="mt-3">
          <div
            className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 cursor-pointer"
            onClick={() => setDatasetsExpanded(!datasetsExpanded)}
          >
            {datasetsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">Datasets</span>
          </div>

          {datasetsExpanded && (
            <div className="ml-6 mt-2 space-y-2">
              <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={seaLevelEnabled}
                  onChange={(e) => setSeaLevelEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Sea Level Rise</span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={floodExposureEnabled}
                  onChange={(e) => setFloodExposureEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Flood Exposure</span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={landCoverEnabled}
                  onChange={(e) => setLandCoverEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Land Cover</span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={elevationEnabled}
                  onChange={(e) => setElevationEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Elevation</span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={waterQualityEnabled}
                  onChange={(e) => setWaterQualityEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Water Quality</span>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Layer Tabs */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="style" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="general" className="text-xs">
              General
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs">
              Data
            </TabsTrigger>
            <TabsTrigger value="style" className="text-xs">
              Style
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
            {/* Sea Level Rise Slider - only show for sea level rise layer AND when enabled */}
            {selectedLayer === "noaa_sea_level_rise" && seaLevelEnabled && (
              <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">🌊 Sea Level Rise</label>
                  <span className="text-lg font-bold text-blue-400">{seaLevelRange[0]} feet</span>
                </div>
                <div className="space-y-2">
                  <Slider
                    value={seaLevelRange}
                    onValueChange={(value) => {
                      setSeaLevelRange(value)
                      if (onSeaLevelChange) {
                        onSeaLevelChange(value[0])
                      }
                    }}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0ft</span>
                    <span>5ft</span>
                    <span>10ft</span>
                  </div>
                  <div className="text-xs text-blue-300 mt-2">
                    {seaLevelRange[0] === 0 && "Baseline (Current)"}
                    {seaLevelRange[0] === 1 && "Low (~2050)"}
                    {seaLevelRange[0] > 1 && seaLevelRange[0] <= 3 && "Intermediate (~2100)"}
                    {seaLevelRange[0] > 3 && seaLevelRange[0] <= 6 && "High (~2100)"}
                    {seaLevelRange[0] > 6 && "Planning Scenario"}
                  </div>
                </div>
              </div>
            )}

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

        </Tabs>
      </div>
    </div>
  )
}
