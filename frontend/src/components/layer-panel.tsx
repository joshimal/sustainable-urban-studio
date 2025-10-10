"use client"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Separator } from "./ui/separator"
import { useState } from "react"
import { X, MoreHorizontal, Plus, ChevronDown, ChevronRight } from "lucide-react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

interface LayerPanelProps {
  selectedLayer: string
  onClose?: () => void
  onSeaLevelChange?: (feet: number) => void
  onProjectionYearChange?: (year: number) => void
  onClimateScenarioChange?: (scenario: string) => void
  onLayerSettingsChange?: (settings: any) => void
  seaLevelFeet?: number
  projectionYear?: number
  climateScenario?: string
}

export function LayerPanel({ selectedLayer, onClose, onSeaLevelChange, onProjectionYearChange, onClimateScenarioChange, onLayerSettingsChange, seaLevelFeet = 0, projectionYear = 2050, climateScenario = 'rcp45' }: LayerPanelProps) {
  // Prevent mouse events from propagating to the map
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
  }
  const [dataSource, setDataSource] = useState("NOAA")
  const [selectedDataset, setSelectedDataset] = useState("sea_level_rise")
  const [datasetsExpanded, setDatasetsExpanded] = useState(true)
  const [enabledLayers, setEnabledLayers] = useState<string[]>([])
  const [layerOrder, setLayerOrder] = useState<string[]>([
    "sea_level_rise",
    "elevation",
    "temperature_projection",
    "temperature",
    "urban_heat_island"
  ])
  const [draggedLayer, setDraggedLayer] = useState<string | null>(null)
  const [expandedLayers, setExpandedLayers] = useState<string[]>([])  // Track which layer panels are expanded
  const [seaLevelOpacity, setSeaLevelOpacity] = useState([60])
  const [temperatureOpacity, setTemperatureOpacity] = useState([70])  // Temperature starts at 70%
  const [urbanHeatOpacity, setUrbanHeatOpacity] = useState([20])  // Urban Heat Island starts at 20%
  const [size, setSize] = useState([8])
  const [temperatureThreshold, setTemperatureThreshold] = useState([0])  // Start at 0°C to show all data
  const [borderWidth, setBorderWidth] = useState([1])
  const [displayStyle, setDisplayStyle] = useState("depth") // "depth" or "extent"
  const [showBorder, setShowBorder] = useState(true)  // Default to on
  const [borderColor, setBorderColor] = useState("cyan")  // Light blue default

  const toggleLayerExpanded = (layerId: string) => {
    setExpandedLayers(prev =>
      prev.includes(layerId)
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    )
  }

  // Notify parent component of layer settings changes
  const updateLayerSettings = (settings: any) => {
    if (onLayerSettingsChange) {
      onLayerSettingsChange({
        selectedDataset: settings.selectedDataset ?? selectedDataset,
        enabledLayers: settings.enabledLayers ?? enabledLayers,
        layerOrder: settings.layerOrder ?? layerOrder,
        seaLevelOpacity: (settings.opacity ?? seaLevelOpacity[0]) / 100,
        // Temperature opacity is provided as 0-100 from the slider; the map divides by 100
        temperatureOpacity: settings.temperatureOpacity ?? temperatureOpacity[0],
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
    const wasEnabled = enabledLayers.includes(layerId)
    const newEnabledLayers = wasEnabled
      ? enabledLayers.filter(id => id !== layerId)
      : [...enabledLayers, layerId]

    console.log('🔲 toggleLayer called:', {
      layerId,
      wasEnabled,
      newEnabledLayers
    });

    setEnabledLayers(newEnabledLayers)

    // Auto-expand panel when enabling a layer
    if (!wasEnabled) {
      setExpandedLayers(prev => [...prev, layerId])
      setSelectedDataset(layerId)
      console.log('📤 Calling updateLayerSettings with:', {
        selectedDataset: layerId,
        enabledLayers: newEnabledLayers
      });
      updateLayerSettings({
        selectedDataset: layerId,
        enabledLayers: newEnabledLayers
      })
    } else {
      // Collapse panel when disabling a layer
      setExpandedLayers(prev => prev.filter(id => id !== layerId))
      console.log('📤 Calling updateLayerSettings with:', {
        enabledLayers: newEnabledLayers
      });
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
      sea_level_rise: "Sea Level Rise (NOAA)",
      elevation: "Elevation (USGS 3DEP)",
      temperature_projection: "Future Temperature (NASA NEX-GDDP)",
      temperature: "Current Surface Temperature (NASA GISTEMP)",
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
      className="w-full min-w-[280px] max-w-[520px] h-full bg-card border-l border-gray-700 flex flex-col"
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
      </div>

      {/* Resizable Panels */}
      <PanelGroup direction="vertical" className="flex-1">
        {/* Climate Data Layers Panel */}
        <Panel defaultSize={35} minSize={20}>
          <div className="h-full overflow-y-auto px-4 pt-3">
            <div
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 cursor-pointer"
              onClick={() => setDatasetsExpanded(!datasetsExpanded)}
            >
              {datasetsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">Climate Data Layers</span>
            </div>

            {datasetsExpanded && (
              <div className="ml-2 mt-2 space-y-1 pb-4">
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
                    <span className="text-sm flex-1 truncate">{getLayerName(layerId)}</span>
                    {enabledLayers.includes(layerId) && (
                      <span className="text-xs text-green-400">●</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Draggable Divider */}
        <PanelResizeHandle className="h-1 bg-gray-700 hover:bg-blue-500 transition-colors cursor-row-resize" />

        {/* Layer Controls Panel */}
        <Panel defaultSize={65} minSize={30}>
          <div className="h-full overflow-y-auto px-4">
        <Tabs defaultValue="controls" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mt-4">
            <TabsTrigger value="controls" className="text-xs">
              Controls
            </TabsTrigger>
            <TabsTrigger value="reference" className="text-xs">
              Reference
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="py-4 space-y-3">
            {/* Render enabled layers as collapsible panels in order */}
            {layerOrder.filter(layerId => enabledLayers.includes(layerId)).map((layerId) => (
              <div key={layerId} className="border border-gray-700 rounded-lg overflow-hidden">
                {/* Layer header - clickable to expand/collapse */}
                <div
                  className="flex items-center justify-between p-3 bg-gray-800/50 cursor-pointer hover:bg-gray-800/70"
                  onClick={() => toggleLayerExpanded(layerId)}
                >
                  <div className="flex items-center gap-2">
                    {expandedLayers.includes(layerId) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium truncate">{getLayerName(layerId)}</span>
                  </div>
                  <span className="text-xs text-green-400">●</span>
                </div>

                {/* Layer controls - shown when expanded */}
                {expandedLayers.includes(layerId) && (
                  <div className="p-4 space-y-4">
                    {layerId === "sea_level_rise" && selectedLayer === "noaa_sea_level_rise" && (
                      <>
                        {/* Sea Level Rise Controls */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium">Sea Level Rise</label>
                            <span className="text-lg font-bold text-blue-400">{seaLevelFeet} feet</span>
                          </div>
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
                          <div className="flex justify-between text-xs text-muted-foreground mt-2">
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

                        <Separator />

                        {/* Opacity */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Layer Opacity</label>
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

                        <Separator />

                        {/* Border Controls */}
                        <div>
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

                    {layerId === "elevation" && (
                      <>
                        <div className="text-xs text-cyan-300 mb-2">
                          Terrain elevation data shown with 65% opacity overlay
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Deep Blue (low elevation) → Cyan → Yellow → Red (high elevation)
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Optimized colors for dark map background
                        </div>
                      </>
                    )}

                    {layerId === "temperature_projection" && (
                      <>
                        {/* Year Slider */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Projection Year</label>
                            <span className="text-lg font-bold text-orange-400">{projectionYear}</span>
                          </div>
                          <Slider
                            value={[projectionYear]}
                            onValueChange={(value) => {
                              if (onProjectionYearChange) {
                                onProjectionYearChange(value[0])
                              }
                            }}
                            min={2030}
                            max={2100}
                            step={10}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>2030</span>
                            <span>2065</span>
                            <span>2100</span>
                          </div>
                        </div>

                        <Separator />

                        {/* Climate Scenario */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Emissions Scenario</label>
                          <Select value={climateScenario} onValueChange={(value) => {
                            if (onClimateScenarioChange) {
                              onClimateScenarioChange(value)
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rcp26">RCP 2.6 (Low Emissions)</SelectItem>
                              <SelectItem value="rcp45">RCP 4.5 (Moderate Emissions)</SelectItem>
                              <SelectItem value="rcp85">RCP 8.5 (High Emissions)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="text-xs text-orange-300 mt-2">
                          NASA NEX-GDDP-CMIP6 climate model projections
                        </div>
                      </>
                    )}

                    {layerId === "temperature" && (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Temperature Anomaly Filter</label>
                            <span className="text-lg font-bold text-red-400">
                              {temperatureThreshold[0] === 0 ? 'All' : `≥${temperatureThreshold[0]}°C`}
                            </span>
                          </div>
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
                          <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>0°C (All)</span>
                            <span>2.5°C</span>
                            <span>5°C</span>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <label className="text-sm font-medium mb-2 block">Layer Opacity</label>
                          <Slider
                            value={temperatureOpacity}
                            onValueChange={(value) => {
                              setTemperatureOpacity(value)
                              updateLayerSettings({ temperatureOpacity: value[0] })
                            }}
                            max={100}
                            step={1}
                            className="w-full"
                          />
                          <span className="text-xs text-muted-foreground">{temperatureOpacity[0]}%</span>
                        </div>

                        <div className="text-xs text-red-300 mt-2">
                          NASA GISTEMP global surface temperature anomaly
                        </div>
                      </>
                    )}

                    {layerId === "urban_heat_island" && (
                      <>
                        <div className="text-xs text-green-300 mb-2">
                          <strong>✅ REAL SATELLITE DATA</strong> - NASA MODIS LST
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Layer Opacity</label>
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

                        <Separator />

                        {/* Temperature Scale Legend */}
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
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Show message if no layers are enabled */}
            {enabledLayers.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                Check a layer above to see its controls
              </div>
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
        </Panel>
      </PanelGroup>
    </div>
  )
}
