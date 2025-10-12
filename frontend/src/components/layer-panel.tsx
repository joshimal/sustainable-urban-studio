"use client"

import React, { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { X, GripVertical, ChevronDown, ChevronUp } from "lucide-react"

interface LayerPanelProps {
  selectedLayer: string
  onClose: () => void
  onSeaLevelChange: (feet: number) => void
  onProjectionYearChange: (year: number) => void
  onClimateScenarioChange: (scenario: string) => void
  onLayerSettingsChange: (settings: any) => void
  seaLevelFeet: number
  projectionYear: number
  climateScenario: string
  embedded?: boolean
  onlyLayerList?: boolean
  onlyControls?: boolean
  enabledLayers?: string[]
}

export function LayerPanel({
  selectedLayer,
  onClose,
  onSeaLevelChange,
  onProjectionYearChange,
  onClimateScenarioChange,
  onLayerSettingsChange,
  seaLevelFeet,
  projectionYear,
  climateScenario,
  embedded = false,
  onlyLayerList = false,
  onlyControls = false,
  enabledLayers = []
}: LayerPanelProps) {
  const [localSettings, setLocalSettings] = useState({
    selectedDataset: 'sea_level_rise',
    enabledLayers: (onlyControls ? enabledLayers : []) as string[],
    layerOrder: ['sea_level_rise', 'elevation', 'temperature_projection', 'temperature', 'urban_heat_island'],
    seaLevelOpacity: 60,
    displayStyle: 'depth',
    showBorder: true,
    borderColor: 'cyan',
    borderWidth: 1,
    temperatureThreshold: 0,
    urbanHeatOpacity: 20,
    urbanHeatIntensity: 50,
    tempProjectionOpacity: 60,
    temperatureOpacity: 50,
    elevationOpacity: 50
  })

  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({})
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    if (onlyLayerList && !hasInitialized) {
      setHasInitialized(true);
      return;
    }
    
    if (onlyControls) {
      return;
    }
    
    console.log('🔄 LayerPanel: Local settings changed:', localSettings.enabledLayers);
    console.log('🔄 LayerPanel: Calling onLayerSettingsChange');
    
    const settingsToSend = {
      ...localSettings,
      seaLevelOpacity: localSettings.seaLevelOpacity / 100,
      urbanHeatOpacity: localSettings.urbanHeatOpacity / 100,
      temperatureOpacity: localSettings.temperatureOpacity / 100,
      elevationOpacity: localSettings.elevationOpacity / 100
    };
    console.log('🔄 LayerPanel: Settings being sent:', settingsToSend);
    onLayerSettingsChange(settingsToSend);
  }, [localSettings, onlyControls, hasInitialized, onlyLayerList]);

  const toggleLayer = (layerId: string, checked: boolean) => {
    console.log('🔄 Toggling layer:', layerId, 'checked:', checked);
    
    setLocalSettings(prev => {
      const newEnabledLayers = checked
        ? [...prev.enabledLayers, layerId]
        : prev.enabledLayers.filter(id => id !== layerId);
      
      console.log('📋 New enabled layers:', newEnabledLayers);
      
      return {
        ...prev,
        enabledLayers: newEnabledLayers
      };
    });
  };

  const toggleCardCollapse = (layerId: string) => {
    setCollapsedCards(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  };

  const sendPartialUpdate = (updates: Partial<typeof localSettings>) => {
    if (!onlyControls) {
      return;
    }
    console.log('🎛️ Controls sending partial update:', updates);
    onLayerSettingsChange({
      enabledLayers: enabledLayers,
      ...updates
    });
  };

  const activeEnabledLayers = onlyControls ? enabledLayers : localSettings.enabledLayers;

  const LayerList = () => {
    const layerRowClass = (enabled: boolean) =>
      `flex items-center gap-2 p-2 rounded border transition-colors group ${
        enabled
          ? 'bg-blue-500/10 border-blue-500/50 hover:bg-blue-500/20'
          : 'bg-muted/30 border-border/50 hover:bg-muted/50'
      }`

    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          Check layers to enable • Drag to reorder
        </p>

        <div
          className={layerRowClass(localSettings.enabledLayers.includes('sea_level_rise'))}
          title="Sea Level Rise (NOAA)"
        >
          <GripVertical
            className={`h-4 w-4 cursor-move flex-shrink-0 ${
              localSettings.enabledLayers.includes('sea_level_rise') ? 'text-blue-400' : 'text-muted-foreground'
            }`}
          />
          <input
            type="checkbox"
            id="layer-sea-level"
            checked={localSettings.enabledLayers.includes('sea_level_rise')}
            onChange={(e) => toggleLayer('sea_level_rise', e.target.checked)}
            className="w-4 h-4 cursor-pointer flex-shrink-0 accent-blue-500"
          />
          <label
            htmlFor="layer-sea-level"
            className="text-sm flex-1 cursor-pointer truncate"
          >
            Sea Level Rise (NOAA)
          </label>
          <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
        </div>

        <div
          className={layerRowClass(localSettings.enabledLayers.includes('elevation'))}
          title="Elevation (USGS 3DEP)"
        >
          <GripVertical
            className={`h-4 w-4 cursor-move flex-shrink-0 ${
              localSettings.enabledLayers.includes('elevation') ? 'text-blue-400' : 'text-muted-foreground'
            }`}
          />
          <input
            type="checkbox"
            id="layer-elevation"
            checked={localSettings.enabledLayers.includes('elevation')}
            onChange={(e) => toggleLayer('elevation', e.target.checked)}
            className="w-4 h-4 cursor-pointer flex-shrink-0 accent-blue-500"
          />
          <label
            htmlFor="layer-elevation"
            className="text-sm flex-1 cursor-pointer truncate"
          >
            Elevation (USGS 3DEP)
          </label>
          <div className="w-3 h-3 rounded-full bg-cyan-500 flex-shrink-0"></div>
        </div>

        <div
          className={layerRowClass(localSettings.enabledLayers.includes('temperature_projection'))}
          title="Future Temperature (NASA NEX-GDDP)"
        >
          <GripVertical
            className={`h-4 w-4 cursor-move flex-shrink-0 ${
              localSettings.enabledLayers.includes('temperature_projection') ? 'text-blue-400' : 'text-muted-foreground'
            }`}
          />
          <input
            type="checkbox"
            id="layer-temp-projection"
            checked={localSettings.enabledLayers.includes('temperature_projection')}
            onChange={(e) => toggleLayer('temperature_projection', e.target.checked)}
            className="w-4 h-4 cursor-pointer flex-shrink-0 accent-blue-500"
          />
          <label
            htmlFor="layer-temp-projection"
            className="text-sm flex-1 cursor-pointer truncate"
          >
            Future Temperature (NASA NEX-GDDP)
          </label>
          <div className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0"></div>
        </div>

        <div
          className={layerRowClass(localSettings.enabledLayers.includes('temperature'))}
          title="Current Surface Temperature (NASA GISTEMP)"
        >
          <GripVertical
            className={`h-4 w-4 cursor-move flex-shrink-0 ${
              localSettings.enabledLayers.includes('temperature') ? 'text-blue-400' : 'text-muted-foreground'
            }`}
          />
          <input
            type="checkbox"
            id="layer-temperature"
            checked={localSettings.enabledLayers.includes('temperature')}
            onChange={(e) => toggleLayer('temperature', e.target.checked)}
            className="w-4 h-4 cursor-pointer flex-shrink-0 accent-blue-500"
          />
          <label
            htmlFor="layer-temperature"
            className="text-sm flex-1 cursor-pointer truncate"
          >
            Current Surface Temperature (NASA GISTEMP)
          </label>
          <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
        </div>

        <div
          className={layerRowClass(localSettings.enabledLayers.includes('urban_heat_island'))}
          title="Urban Heat Island (NASA MODIS LST)"
        >
          <GripVertical
            className={`h-4 w-4 cursor-move flex-shrink-0 ${
              localSettings.enabledLayers.includes('urban_heat_island') ? 'text-blue-400' : 'text-muted-foreground'
            }`}
          />
          <input
            type="checkbox"
            id="layer-urban-heat"
            checked={localSettings.enabledLayers.includes('urban_heat_island')}
            onChange={(e) => toggleLayer('urban_heat_island', e.target.checked)}
            className="w-4 h-4 cursor-pointer flex-shrink-0 accent-blue-500"
          />
          <label
            htmlFor="layer-urban-heat"
            className="text-sm flex-1 cursor-pointer truncate"
          >
            Urban Heat Island (NASA MODIS LST)
          </label>
          <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
        </div>
      </div>
    )
  }

  const LayerControls = () => (
    <div className="space-y-4">
      {/* Sea Level Rise Controls Card */}
{activeEnabledLayers.includes('sea_level_rise') && (
  <div className="border border-border rounded-lg overflow-hidden bg-card">
    <button
      onClick={() => toggleCardCollapse('sea_level_rise')}
      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
        <h4 className="text-sm font-semibold">Sea Level Rise (NOAA)</h4>
      </div>
      {collapsedCards['sea_level_rise'] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
    </button>
    
    {!collapsedCards['sea_level_rise'] && (
      <div className="p-4 pt-0 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted-foreground">Sea Level Rise</label>
            <span className="text-sm font-medium text-blue-400">{seaLevelFeet} feet</span>
          </div>
          <Slider
            value={[seaLevelFeet]}
            onValueChange={(value) => onSeaLevelChange(value[0])}
            min={0}
            max={6}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0ft</span>
            <span className="text-muted-foreground/50">Baseline (Current)</span>
            <span>6ft</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-2">Display style</label>
          <Select
            value={localSettings.displayStyle}
            onValueChange={(value) => {
              setLocalSettings(prev => ({ ...prev, displayStyle: value }));
              sendPartialUpdate({ displayStyle: value });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="depth">Depth (Layer 1)</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted-foreground">Layer Opacity</label>
            <span className="text-xs font-medium">{localSettings.seaLevelOpacity}%</span>
          </div>
          <Slider
            value={[localSettings.seaLevelOpacity]}
            onValueChange={(value) => {
              setLocalSettings(prev => ({ ...prev, seaLevelOpacity: value[0] }));
              sendPartialUpdate({ seaLevelOpacity: value[0] / 100 });
            }}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      </div>
    )}
  </div>
)}
      {activeEnabledLayers.includes('temperature_projection') && (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <button
            onClick={() => toggleCardCollapse('temperature_projection')}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <h4 className="text-sm font-semibold">Future Temperature (NASA NEX-GDDP)</h4>
            </div>
            {collapsedCards['temperature_projection'] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          
          {!collapsedCards['temperature_projection'] && (
            <div className="p-4 pt-0 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Layer Opacity</label>
                  <span className="text-xs font-medium">{Math.round((localSettings.tempProjectionOpacity || 0.6) * 100)}%</span>
                </div>
                <Slider
                  value={[Math.round((localSettings.tempProjectionOpacity || 0.6) * 100)]}
                  onValueChange={(value) => {
                    setLocalSettings(prev => ({ ...prev, tempProjectionOpacity: value[0] / 100 }));
                    sendPartialUpdate({ tempProjectionOpacity: value[0] / 100 });
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Projection Year</label>
                  <span className="text-xs font-medium">{projectionYear}</span>
                </div>
                <Slider
                  value={[projectionYear]}
                  onValueChange={(value) => onProjectionYearChange(value[0])}
                  min={2025}
                  max={2100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>2025</span>
                  <span>2100</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-2">Climate Scenario</label>
                <Select
                  value={climateScenario}
                  onValueChange={onClimateScenarioChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rcp26">RCP 2.6 (Low Emissions)</SelectItem>
                    <SelectItem value="rcp45">RCP 4.5 (Moderate Emissions)</SelectItem>
                    <SelectItem value="rcp85">RCP 8.5 (High Emissions)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {activeEnabledLayers.includes('urban_heat_island') && (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <button
            onClick={() => toggleCardCollapse('urban_heat_island')}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <h4 className="text-sm font-semibold">Urban Heat Island (NASA MODIS LST)</h4>
            </div>
            {collapsedCards['urban_heat_island'] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          
          {!collapsedCards['urban_heat_island'] && (
            <div className="p-4 pt-0 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Layer Opacity</label>
                  <span className="text-xs font-medium">{localSettings.urbanHeatOpacity}%</span>
                </div>
                <Slider
                  value={[localSettings.urbanHeatOpacity]}
                  onValueChange={(value) => {
                    setLocalSettings(prev => ({ ...prev, urbanHeatOpacity: value[0] }));
                    sendPartialUpdate({ urbanHeatOpacity: value[0] / 100 });
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeEnabledLayers.includes('temperature') && (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <button
            onClick={() => toggleCardCollapse('temperature')}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <h4 className="text-sm font-semibold">Land Surface Temperature</h4>
            </div>
            {collapsedCards['temperature'] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          
          {!collapsedCards['temperature'] && (
            <div className="p-4 pt-0 space-y-4">
              <p className="text-xs text-amber-400">
                Landsat 8/9 thermal imagery processed to show urban heat patterns
              </p>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Layer Opacity</label>
                  <span className="text-xs font-medium">{localSettings.temperatureOpacity}%</span>
                </div>
                <Slider
                  value={[localSettings.temperatureOpacity]}
                  onValueChange={(value) => {
                    setLocalSettings(prev => ({ ...prev, temperatureOpacity: value[0] }));
                    sendPartialUpdate({ temperatureOpacity: value[0] / 100 });
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-2">Temperature Scale</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500"></div>
                    <span className="text-xs">20-25°C (Cool)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-cyan-400"></div>
                    <span className="text-xs">25-35°C (Moderate)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-400"></div>
                    <span className="text-xs">35-40°C (Warm)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span className="text-xs">40-45°C (Hot)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-800"></div>
                    <span className="text-xs">45-50°C (Extreme)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeEnabledLayers.includes('elevation') && (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <button
            onClick={() => toggleCardCollapse('elevation')}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <h4 className="text-sm font-semibold">Elevation (USGS 3DEP)</h4>
            </div>
            {collapsedCards['elevation'] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          
          {!collapsedCards['elevation'] && (
            <div className="p-4 pt-0 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Layer Opacity</label>
                  <span className="text-xs font-medium">{localSettings.elevationOpacity}%</span>
                </div>
                <Slider
                  value={[localSettings.elevationOpacity]}
                  onValueChange={(value) => {
                    setLocalSettings(prev => ({ ...prev, elevationOpacity: value[0] }));
                    sendPartialUpdate({ elevationOpacity: value[0] / 100 });
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeEnabledLayers.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          Enable a layer to see controls
        </div>
      )}
    </div>
  );

  if (onlyLayerList) {
    return <LayerList />;
  }

  if (onlyControls) {
    return <LayerControls />;
  }

  return (
    <div className={embedded ? "" : "h-full bg-card flex flex-col"}>
      {!embedded && (
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Climate Data Layers</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className={embedded ? "" : "flex-1 overflow-y-auto p-4"}>
        <LayerList />
        <div className="border-t border-border my-4"></div>
        <LayerControls />
      </div>
    </div>
  )
}
