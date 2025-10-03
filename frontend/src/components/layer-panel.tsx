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
  onSeaLevelChange?: (feet: number) => void
  onLayerSettingsChange?: (settings: any) => void
  seaLevelFeet?: number
}

export function LayerPanel({ selectedLayer, onClose, onSeaLevelChange, onLayerSettingsChange, seaLevelFeet = 0 }: LayerPanelProps) {
  // Prevent mouse events from propagating to the map
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
  }
  const [dataSource, setDataSource] = useState("NOAA")
  const [selectedDataset, setSelectedDataset] = useState("sea_level_rise")
  const [datasetsExpanded, setDatasetsExpanded] = useState(true)
  const [seaLevelOpacity, setSeaLevelOpacity] = useState([60])
  const [size, setSize] = useState([8])
  const [temperatureThreshold, setTemperatureThreshold] = useState([3.2])
  const [borderWidth, setBorderWidth] = useState([1])
  const [displayStyle, setDisplayStyle] = useState("depth") // "depth" or "extent"
  const [showBorder, setShowBorder] = useState(true)  // Default to on
  const [borderColor, setBorderColor] = useState("cyan")  // Light blue default

  // Notify parent component of layer settings changes
  const updateLayerSettings = (settings: any) => {
    if (onLayerSettingsChange) {
      onLayerSettingsChange({
        selectedDataset: settings.selectedDataset ?? selectedDataset,
        seaLevelOpacity: (settings.opacity ?? seaLevelOpacity[0]) / 100,
        displayStyle: settings.displayStyle ?? displayStyle,
        showBorder: settings.showBorder ?? showBorder,
        borderColor: settings.borderColor ?? borderColor,
        borderWidth: settings.borderWidth ?? borderWidth[0]
      })
    }
  }


  const getLayerConfig = () => {
    switch (selectedLayer) {
      case "noaa_sea_level_rise":
        return {
          name: "NOAA Sea Level Rise",
          displayStyle: "polygon",
          colorScale: "from-blue-400 via-cyan-500 to-blue-600",
        }
      case "noaa_temperature_anomaly":
        return {
          name: "NOAA Temperature Anomaly",
          displayStyle: "heatmap",
          colorScale: "from-blue-500 via-yellow-500 to-red-500",
        }
      case "noaa_precipitation_trend":
        return {
          name: "NOAA Precipitation Trend",
          displayStyle: "heatmap",
          colorScale: "from-blue-400 via-sky-400 to-indigo-500",
        }
      default:
        return {
          name: "NOAA Climate Layer",
          displayStyle: "heatmap",
          colorScale: "from-blue-500 via-green-500 to-red-500",
        }
    }
  }

  const layerConfig = getLayerConfig()

  return (
    <div
      className="w-80 bg-card border-l border-gray-700 flex flex-col"
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
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
                  type="radio"
                  name="dataset"
                  checked={selectedDataset === "sea_level_rise"}
                  onChange={() => {
                    setSelectedDataset("sea_level_rise")
                    updateLayerSettings({ selectedDataset: "sea_level_rise" })
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Sea Level Rise</span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50">
                <input
                  type="radio"
                  name="dataset"
                  checked={selectedDataset === "flood_exposure"}
                  onChange={() => {
                    setSelectedDataset("flood_exposure")
                    updateLayerSettings({ selectedDataset: "flood_exposure" })
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Flood Exposure</span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50">
                <input
                  type="radio"
                  name="dataset"
                  checked={selectedDataset === "land_cover"}
                  onChange={() => {
                    setSelectedDataset("land_cover")
                    updateLayerSettings({ selectedDataset: "land_cover" })
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Land Cover</span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50">
                <input
                  type="radio"
                  name="dataset"
                  checked={selectedDataset === "elevation"}
                  onChange={() => {
                    setSelectedDataset("elevation")
                    updateLayerSettings({ selectedDataset: "elevation" })
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Elevation</span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50">
                <input
                  type="radio"
                  name="dataset"
                  checked={selectedDataset === "water_quality"}
                  onChange={() => {
                    setSelectedDataset("water_quality")
                    updateLayerSettings({ selectedDataset: "water_quality" })
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Water Quality</span>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Layer Tabs */}
      <div className="flex-1 overflow-y-auto px-4">
        <Tabs defaultValue="controls" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mt-4">
            <TabsTrigger value="controls" className="text-xs">
              Controls
            </TabsTrigger>
            <TabsTrigger value="reference" className="text-xs">
              Reference
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="py-4 space-y-6">
            {/* Sea Level Rise Slider - only show for sea level rise dataset */}
            {selectedLayer === "noaa_sea_level_rise" && selectedDataset === "sea_level_rise" && (
              <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">🌊 Sea Level Rise</label>
                  <span className="text-lg font-bold text-blue-400">{seaLevelFeet} feet</span>
                </div>
                <div className="space-y-2">
                  <Slider
                    value={[seaLevelFeet]}
                    onValueChange={(value) => {
                      if (onSeaLevelChange) {
                        onSeaLevelChange(value[0])
                      }
                    }}
                    min={0}
                    max={6}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0ft</span>
                    <span>3ft</span>
                    <span>6ft</span>
                  </div>
                  <div className="text-xs text-blue-300 mt-2">
                    {seaLevelFeet === 0 && "Baseline (Current)"}
                    {seaLevelFeet === 1 && "Low (~2050)"}
                    {seaLevelFeet === 2 && "Intermediate-Low (~2070)"}
                    {seaLevelFeet === 3 && "Intermediate (~2100)"}
                    {seaLevelFeet === 4 && "Intermediate-High (~2100)"}
                    {seaLevelFeet === 5 && "High (~2100)"}
                    {seaLevelFeet === 6 && "Extreme (~2150)"}
                  </div>
                </div>
              </div>
            )}

            {/* Display Style - Only show for sea level rise */}
            {selectedLayer === "noaa_sea_level_rise" && selectedDataset === "sea_level_rise" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Display style</label>
                </div>
                <Select value={displayStyle} onValueChange={(value) => {
                  setDisplayStyle(value)
                  updateLayerSettings({ displayStyle: value })
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="depth">Depth (Layer 1)</SelectItem>
                    <SelectItem value="extent">Extent Only (Layer 0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}


            {/* Opacity Control for Sea Level Rise */}
            {selectedLayer === "noaa_sea_level_rise" && selectedDataset === "sea_level_rise" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Layer Opacity</label>
                <div className="space-y-2">
                  <Slider
                    value={seaLevelOpacity}
                    onValueChange={(value) => {
                      setSeaLevelOpacity(value)
                      updateLayerSettings({ opacity: value[0] })
                    }}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <span className="text-xs text-muted-foreground">{seaLevelOpacity[0]}%</span>
                </div>
              </div>
            )}

            {selectedLayer === "noaa_sea_level_rise" && selectedDataset === "sea_level_rise" && (
              <>
                <Separator />

                {/* Border */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={showBorder}
                      onChange={(e) => {
                        setShowBorder(e.target.checked)
                        updateLayerSettings({ showBorder: e.target.checked })
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label className="text-sm font-medium">Show Border</label>
                  </div>

                  {showBorder && (
                    <div className="space-y-3 ml-6">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Border color</label>
                        <Select value={borderColor} onValueChange={(value) => {
                          setBorderColor(value)
                          updateLayerSettings({ borderColor: value })
                        }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cyan">Light Blue (Cyan)</SelectItem>
                            <SelectItem value="white">White</SelectItem>
                            <SelectItem value="black">Black</SelectItem>
                            <SelectItem value="yellow">Yellow</SelectItem>
                            <SelectItem value="red">Red</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block">Width: {borderWidth[0]}px</label>
                        <Slider
                          value={borderWidth}
                          onValueChange={(value) => {
                            setBorderWidth(value)
                            updateLayerSettings({ borderWidth: value[0] })
                          }}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

          </TabsContent>

          <TabsContent value="reference" className="py-4 space-y-4">
            <div className="text-sm">
              <div className="font-medium mb-1">Layer Name</div>
              <div className="text-muted-foreground text-xs">{layerConfig.name}</div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Data Source</div>
              <div className="text-muted-foreground text-xs">NOAA Climate API - Nassau County</div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Last Updated</div>
              <div className="text-muted-foreground text-xs">Real-time</div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Resolution</div>
              <div className="text-muted-foreground text-xs">1km² grid</div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Coverage Area</div>
              <div className="text-muted-foreground text-xs">Nassau County, NY</div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
