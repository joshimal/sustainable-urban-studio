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
  const [enabledLayers, setEnabledLayers] = useState<string[]>(["sea_level_rise"])
  const [layerOrder, setLayerOrder] = useState<string[]>([
    "sea_level_rise",
    "flood_exposure",
    "land_cover",
    "elevation",
    "water_quality",
    "temperature",
    "urban_heat_island"
  ])
  const [draggedLayer, setDraggedLayer] = useState<string | null>(null)
  const [seaLevelOpacity, setSeaLevelOpacity] = useState([60])
  const [urbanHeatOpacity, setUrbanHeatOpacity] = useState([20])  // Urban Heat Island starts at 20%
  const [size, setSize] = useState([8])
  const [temperatureThreshold, setTemperatureThreshold] = useState([0])  // Start at 0°C to show all data
  const [borderWidth, setBorderWidth] = useState([1])
  const [displayStyle, setDisplayStyle] = useState("depth") // "depth" or "extent"
  const [showBorder, setShowBorder] = useState(true)  // Default to on
  const [borderColor, setBorderColor] = useState("cyan")  // Light blue default

  // Notify parent component of layer settings changes
  const updateLayerSettings = (settings: any) => {
    if (onLayerSettingsChange) {
      onLayerSettingsChange({
        selectedDataset: settings.selectedDataset ?? selectedDataset,
        enabledLayers: settings.enabledLayers ?? enabledLayers,
        layerOrder: settings.layerOrder ?? layerOrder,
        seaLevelOpacity: (settings.opacity ?? seaLevelOpacity[0]) / 100,
        urbanHeatOpacity: (settings.urbanHeatOpacity ?? urbanHeatOpacity[0]) / 100,
        displayStyle: settings.displayStyle ?? displayStyle,
        showBorder: settings.showBorder ?? showBorder,
        borderColor: settings.borderColor ?? borderColor,
        borderWidth: settings.borderWidth ?? borderWidth[0],
        temperatureThreshold: settings.temperatureThreshold ?? temperatureThreshold[0]
      })
    }
  }

  const toggleLayer = (layerId: string) => {
    const newEnabledLayers = enabledLayers.includes(layerId)
      ? enabledLayers.filter(id => id !== layerId)
      : [...enabledLayers, layerId]

    setEnabledLayers(newEnabledLayers)

    // Set as active dataset if enabling
    if (!enabledLayers.includes(layerId)) {
      setSelectedDataset(layerId)
      updateLayerSettings({
        selectedDataset: layerId,
        enabledLayers: newEnabledLayers
      })
    } else {
      updateLayerSettings({ enabledLayers: newEnabledLayers })
    }
  }

  const handleDragStart = (layerId: string) => {
    setDraggedLayer(layerId)
  }

  const handleDragOver = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault()
    if (!draggedLayer || draggedLayer === targetLayerId) return

    const newOrder = [...layerOrder]
    const draggedIndex = newOrder.indexOf(draggedLayer)
    const targetIndex = newOrder.indexOf(targetLayerId)

    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedLayer)

    setLayerOrder(newOrder)
    updateLayerSettings({ layerOrder: newOrder })
  }

  const handleDragEnd = () => {
    setDraggedLayer(null)
  }

  const getLayerName = (layerId: string): string => {
    const names: { [key: string]: string } = {
      sea_level_rise: "Sea Level Rise",
      flood_exposure: "Flood Exposure",
      land_cover: "Land Cover",
      elevation: "Elevation",
      water_quality: "Water Quality",
      temperature: "Surface Temperature (NASA GISTEMP)",
      urban_heat_island: "Urban Heat Island (NASA MODIS LST)"
    }
    return names[layerId] || layerId
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
            <div className="ml-2 mt-2 space-y-1">
              <div className="text-xs text-muted-foreground mb-2 px-2">
                Check layers to enable • Drag to reorder
              </div>
              {layerOrder.map((layerId) => (
                <div
                  key={layerId}
                  draggable
                  onDragStart={() => handleDragStart(layerId)}
                  onDragOver={(e) => handleDragOver(e, layerId)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (enabledLayers.includes(layerId)) {
                      setSelectedDataset(layerId)
                      updateLayerSettings({ selectedDataset: layerId })
                    }
                  }}
                  className={`flex items-center gap-2 p-2 rounded cursor-move hover:bg-gray-800/50 ${
                    selectedDataset === layerId && enabledLayers.includes(layerId)
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : ''
                  } ${draggedLayer === layerId ? 'opacity-50' : ''}`}
                >
                  <span className="text-gray-500 text-xs">⋮⋮</span>
                  <input
                    type="checkbox"
                    checked={enabledLayers.includes(layerId)}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleLayer(layerId)
                      console.log(`🔲 Layer "${layerId}" ${enabledLayers.includes(layerId) ? 'disabled' : 'enabled'}`)
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm flex-1">{getLayerName(layerId)}</span>
                  {enabledLayers.includes(layerId) && (
                    <span className="text-xs text-green-400">●</span>
                  )}
                </div>
              ))}
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

            {/* Temperature Controls - only show for temperature dataset */}
            {selectedDataset === "temperature" && (
              <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">🌡️ Temperature Anomaly Filter</label>
                  <span className="text-lg font-bold text-red-400">
                    {temperatureThreshold[0] === 0 ? 'All' : `≥${temperatureThreshold[0]}°C`}
                  </span>
                </div>
                <div className="space-y-2">
                  <Slider
                    value={temperatureThreshold}
                    onValueChange={(value) => {
                      setTemperatureThreshold(value)
                      updateLayerSettings({ temperatureThreshold: value[0] })
                    }}
                    min={0}
                    max={5}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0°C (All)</span>
                    <span>2.5°C</span>
                    <span>5°C</span>
                  </div>
                  <div className="text-xs text-red-300 mt-2">
                    NASA GISTEMP global surface temperature anomaly relative to 1951-1980 average. Heatmap shows all warming globally.
                  </div>
                </div>

                {/* Layer Opacity */}
                <div className="mt-4">
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
              </div>
            )}

            {/* Urban Heat Island Controls - only show for urban_heat_island dataset */}
            {selectedDataset === "urban_heat_island" && (
              <>
                <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">🛰️ Land Surface Temperature</label>
                  </div>
                  <div className="text-xs text-green-300 mb-2">
                    <strong>✅ REAL SATELLITE DATA</strong> - NASA MODIS LST
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">
                    Using NASA POWER API for satellite-derived land surface temperature
                  </div>

                  <div className="space-y-4">
                    {/* Layer Opacity */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Layer Opacity</label>
                      <div className="space-y-2">
                        <Slider
                          value={urbanHeatOpacity}
                          onValueChange={(value) => {
                            setUrbanHeatOpacity(value)
                            updateLayerSettings({ urbanHeatOpacity: value[0] })
                          }}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                        <span className="text-xs text-muted-foreground">{urbanHeatOpacity[0]}%</span>
                      </div>
                    </div>

                    {/* Temperature Range Legend */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Temperature Scale</label>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#2166ac] rounded"></div>
                          <span className="text-muted-foreground">Coolest (Blue)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#92c5de] rounded"></div>
                          <span className="text-muted-foreground">Cool (Cyan)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#fddbca] rounded"></div>
                          <span className="text-muted-foreground">Moderate (Beige)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#f4a582] rounded"></div>
                          <span className="text-muted-foreground">Warm (Orange)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#b2182b] rounded"></div>
                          <span className="text-muted-foreground">Hottest (Red)</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 italic">
                          * Range varies by location and season
                        </div>
                      </div>
                    </div>

                    {/* Show Hotspots Toggle */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        onChange={(e) => {
                          updateLayerSettings({ showHotspots: e.target.checked })
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <label className="text-sm font-medium">Show Heat Island Hotspots</label>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Data Source:</strong> Landsat 8/9 Thermal Band</p>
                  <p><strong>Processing:</strong> Digital Numbers → Radiance → Brightness Temperature → LST</p>
                  <p><strong>Emissivity Correction:</strong> Applied using NDVI</p>
                  <p><strong>Resolution:</strong> 30m (resampled from 100m thermal)</p>
                </div>
              </>
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
