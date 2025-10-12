"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { ChevronDown, ChevronRight, Map } from "lucide-react"
import { LayerPanel } from "./layer-panel"
import { LeafletMap } from "./leaflet-map"

const LOCATIONS = {
  west_long_island: {
    id: 'west_long_island',
    name: 'West Long Island, NY',
    center: { lat: 40.7589, lng: -73.9851 },
    bounds: {
      north: 40.85,
      south: 40.60,
      east: -73.40,
      west: -73.75
    },
    zoom: 10,
    hasCoastalRisk: true
  },
  raleigh: {
    id: 'raleigh',
    name: 'Raleigh, NC',
    center: { lat: 35.7796, lng: -78.6382 },
    bounds: {
      north: 35.95,
      south: 35.60,
      east: -78.40,
      west: -78.90
    },
    zoom: 11,
    hasCoastalRisk: false
  }
}

export function GISAnalysisApp() {
  const [selectedLocation, setSelectedLocation] = useState('west_long_island')
  const [selectedLayer, setSelectedLayer] = useState("noaa_sea_level_rise")
  const [layersCollapsed, setLayersCollapsed] = useState(false)
  const [mapsCollapsed, setMapsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'controls' | 'data'>('controls')
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [seaLevelRiseData, setSeaLevelRiseData] = useState(null)
  const [temperatureData, setTemperatureData] = useState(null)
  const [urbanHeatData, setUrbanHeatData] = useState(null)
  const [elevationData, setElevationData] = useState(null)
  const [tempProjectionData, setTempProjectionData] = useState(null)
  const [seaLevelFeet, setSeaLevelFeet] = useState(0)
  const [projectionYear, setProjectionYear] = useState(2050)
  const [climateScenario, setClimateScenario] = useState('rcp45')
  const [currentMapName, setCurrentMapName] = useState("Default Map")
  const [isEditingMapName, setIsEditingMapName] = useState(false)
  const [selectedMapId, setSelectedMapId] = useState("1")
  const [layerSettings, setLayerSettings] = useState({
    selectedDataset: 'sea_level_rise',
    enabledLayers: [] as string[],
    layerOrder: [] as string[],
    seaLevelOpacity: 0.6,
    displayStyle: 'depth',
    showBorder: true,
    borderColor: 'cyan',
    borderWidth: 1,
    temperatureThreshold: 3.2,
    urbanHeatOpacity: 0.7,
    urbanHeatIntensity: 0.5,
    tempProjectionOpacity: 0.6,
    temperatureOpacity: 0.5,
    elevationOpacity: 0.5
  })

  const isFirstRenderRef = useRef(true)

  const [maps, setMaps] = useState([
    {
      id: "1",
      name: "Default Map",
      location: selectedLocation,
      enabledLayers: [] as string[],
      seaLevelFeet: 0
    }
  ])

  const handleLayerSettingsChange = useCallback((newSettings: any) => {
    if (isFirstRenderRef.current && (!newSettings.enabledLayers || newSettings.enabledLayers.length === 0)) {
      isFirstRenderRef.current = false;
      return;
    }
    
    setLayerSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    isFirstRenderRef.current = false;
  }, []);

  const fetchSeaLevelRiseData = async (feet: number) => {
    try {
      const location = LOCATIONS[selectedLocation]
      if (!location.hasCoastalRisk) {
        setSeaLevelRiseData(null);
        return;
      }
      const bounds = location.bounds;
      const layerType = layerSettings.displayStyle || 'depth';
      const response = await fetch(
        `http://localhost:3001/api/noaa/sea-level-rise?feet=${feet}&north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&layer=${layerType}`
      );
      const result = await response.json();
      if (result.success && result.data) {
        setSeaLevelRiseData(result.data);
      }
    } catch (error) {
      console.error('❌ Error fetching NOAA data:', error);
    }
  };

  const fetchTemperatureData = async () => {
    try {
      const bounds = { north: 90, south: -90, east: 180, west: -180 };
      const response = await fetch(
        `http://localhost:3001/api/nasa/temperature?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&resolution=1`
      );
      const result = await response.json();
      setTemperatureData(result.data);
    } catch (error) {
      console.error('❌ Error fetching NASA temperature data:', error);
    }
  };

  const fetchModisLSTData = async () => {
    try {
      const location = LOCATIONS[selectedLocation]
      const bounds = location.bounds;
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7);
      const dateStr = recentDate.toISOString().split('T')[0].replace(/-/g, '');
      const response = await fetch(
        `http://localhost:3001/api/modis/lst?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&resolution=0.05&date=${dateStr}`
      );
      const result = await response.json();
      if (result.success && result.data) {
        setUrbanHeatData(result.data);
      }
    } catch (error) {
      console.error('❌ Error fetching MODIS LST data:', error);
    }
  };

  const fetchElevationData = async () => {
    try {
      const location = LOCATIONS[selectedLocation]
      const bounds = location.bounds;
      const response = await fetch(
        `http://localhost:3001/api/usgs/elevation?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&resolution=20`
      );
      const result = await response.json();
      if (result.success && result.data) {
        setElevationData(result.data);
      }
    } catch (error) {
      console.error('❌ Error fetching elevation data:', error);
    }
  };

  const fetchTemperatureProjection = async (year: number, scenario: string) => {
    try {
      const location = LOCATIONS[selectedLocation]
      const bounds = location.bounds;
      const response = await fetch(
        `http://localhost:3001/api/nasa/temperature-projection?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&year=${year}&scenario=${scenario}`
      );
      const result = await response.json();
      if (result.success && result.data) {
        setTempProjectionData(result.data);
      }
    } catch (error) {
      console.error('❌ Error fetching temperature projection:', error);
    }
  };

  const handleSeaLevelChange = (feet: number) => {
    setSeaLevelFeet(feet);
    fetchSeaLevelRiseData(feet);
  };

  const handleProjectionYearChange = (year: number) => {
    setProjectionYear(year);
    fetchTemperatureProjection(year, climateScenario);
  };

  const handleClimateScenarioChange = (scenario: string) => {
    setClimateScenario(scenario);
    fetchTemperatureProjection(projectionYear, scenario);
  };

  useEffect(() => {
    if (layerSettings.enabledLayers?.includes("sea_level_rise")) {
      fetchSeaLevelRiseData(seaLevelFeet);
    }
    if (layerSettings.enabledLayers?.includes("temperature")) {
      fetchTemperatureData();
    }
    if (layerSettings.enabledLayers?.includes("urban_heat_island")) {
      fetchModisLSTData();
    }
    if (layerSettings.enabledLayers?.includes("elevation")) {
      fetchElevationData();
    }
    if (layerSettings.enabledLayers?.includes("temperature_projection")) {
      fetchTemperatureProjection(projectionYear, climateScenario);
    }
  }, [JSON.stringify(layerSettings.enabledLayers), layerSettings.displayStyle]);

  useEffect(() => {
    if (layerSettings.enabledLayers?.includes("sea_level_rise")) {
      fetchSeaLevelRiseData(seaLevelFeet);
    }
    if (layerSettings.enabledLayers?.includes("temperature")) {
      fetchTemperatureData();
    }
    if (layerSettings.enabledLayers?.includes("urban_heat_island")) {
      fetchModisLSTData();
    }
    if (layerSettings.enabledLayers?.includes("elevation")) {
      fetchElevationData();
    }
    if (layerSettings.enabledLayers?.includes("temperature_projection")) {
      fetchTemperatureProjection(projectionYear, climateScenario);
    }
  }, [selectedLocation]);

  useEffect(() => {
    const mapState = {
      name: currentMapName,
      location: selectedLocation,
      seaLevelFeet,
      layerSettings,
      projectionYear,
      climateScenario,
      lastUpdated: new Date().toISOString()
    }
    localStorage.setItem('climate_map_state', JSON.stringify(mapState))
  }, [currentMapName, selectedLocation, seaLevelFeet, layerSettings, projectionYear, climateScenario])

  useEffect(() => {
    const savedState = localStorage.getItem('climate_map_state')
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        setCurrentMapName(state.name || "Default Map")
        setSelectedLocation(state.location || 'west_long_island')
        setSeaLevelFeet(state.seaLevelFeet || 0)
        setLayerSettings(state.layerSettings || layerSettings)
        setProjectionYear(state.projectionYear || 2050)
        setClimateScenario(state.climateScenario || 'rcp45')
      } catch (err) {
        console.error('Failed to load saved state:', err)
      }
    }
  }, [])

  const hasEnabledLayers = Array.isArray(layerSettings.enabledLayers) && layerSettings.enabledLayers.length > 0;

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Panel 1 - Climate Analysis */}
      <div className="w-80 bg-card border-r border-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-semibold mb-3">Climate Analysis</h1>
          
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="west_long_island">🏝️ West Long Island, NY</SelectItem>
              <SelectItem value="raleigh">🌲 Raleigh, NC</SelectItem>
            </SelectContent>
          </Select>
          {!LOCATIONS[selectedLocation].hasCoastalRisk && (
            <div className="mt-2 text-xs text-amber-400 bg-amber-400/10 p-2 rounded">
              ⚠️ Inland location - Sea level rise not applicable
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-border">
            <button
              onClick={() => setLayersCollapsed(!layersCollapsed)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-semibold">Climate Data Layers</span>
              {layersCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {!layersCollapsed && (
              <div className="px-4 pb-4">
                <LayerPanel
                  selectedLayer={selectedLayer}
                  onClose={() => {}}
                  onSeaLevelChange={handleSeaLevelChange}
                  onProjectionYearChange={handleProjectionYearChange}
                  onClimateScenarioChange={handleClimateScenarioChange}
                  onLayerSettingsChange={handleLayerSettingsChange}
                  seaLevelFeet={seaLevelFeet}
                  projectionYear={projectionYear}
                  climateScenario={climateScenario}
                  embedded={true}
                  onlyLayerList={true}
                />
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => setMapsCollapsed(!mapsCollapsed)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-semibold">Your Maps</span>
              {mapsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {!mapsCollapsed && (
              <div className="px-4 pb-4">
                {maps.map((map) => (
                  <div
                    key={map.id}
                    className={`flex items-center gap-3 p-3 rounded cursor-pointer mb-2 ${
                      selectedMapId === map.id ? 'bg-blue-500/10 border border-blue-500/50' : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedMapId(map.id)}
                  >
                    <div className="w-5 h-5 rounded border-2 border-muted-foreground flex items-center justify-center">
                      {selectedMapId === map.id && <div className="w-3 h-3 rounded-full bg-blue-500"></div>}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{map.name}</div>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-3" size="sm">
                  Create Maps
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel 2 - Controls/Data */}
      <div 
        className={`bg-card border-r border-border flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          hasEnabledLayers ? 'w-80' : 'w-0 border-0'
        }`}
      >
        <div className="w-80 h-full flex flex-col">
          <div className="border-b border-border flex">
            <button
              onClick={() => setActiveTab('controls')}
              className={`flex-1 p-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'controls'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent hover:bg-muted/50'
              }`}
            >
              Controls
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 p-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'data'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent hover:bg-muted/50'
              }`}
            >
              Data
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'controls' ? (
              <LayerPanel
                selectedLayer={selectedLayer}
                onClose={() => {}}
                onSeaLevelChange={handleSeaLevelChange}
                onProjectionYearChange={handleProjectionYearChange}
                onClimateScenarioChange={handleClimateScenarioChange}
                onLayerSettingsChange={handleLayerSettingsChange}
                seaLevelFeet={seaLevelFeet}
                projectionYear={projectionYear}
                climateScenario={climateScenario}
                embedded={true}
                onlyControls={true}
                enabledLayers={layerSettings.enabledLayers}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Data sources for enabled layers:</p>
                {layerSettings.enabledLayers?.map((layerId) => (
                  <div key={layerId} className="mb-3 p-3 bg-muted/30 rounded">
                    <div className="font-medium mb-1">{layerId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div className="text-xs text-muted-foreground">
                      {layerId === 'sea_level_rise' && 'Source: NOAA Digital Coast'}
                      {layerId === 'elevation' && 'Source: USGS 3DEP'}
                      {layerId === 'temperature' && 'Source: NASA GISTEMP'}
                      {layerId === 'temperature_projection' && 'Source: NASA NEX-GDDP'}
                      {layerId === 'urban_heat_island' && 'Source: NASA MODIS LST'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative transition-all duration-300 ease-in-out">
        <LeafletMap
          location={LOCATIONS[selectedLocation]}
          seaLevelRiseData={layerSettings.enabledLayers?.includes('sea_level_rise') ? seaLevelRiseData : null}
          temperatureData={layerSettings.enabledLayers?.includes('temperature') ? temperatureData : null}
          urbanHeatData={layerSettings.enabledLayers?.includes('urban_heat_island') ? urbanHeatData : null}
          elevationData={layerSettings.enabledLayers?.includes('elevation') ? elevationData : null}
          tempProjectionData={layerSettings.enabledLayers?.includes('temperature_projection') ? tempProjectionData : null}
          layerSettings={layerSettings}
          seaLevelFeet={seaLevelFeet}
          resizeSignal={layoutVersion}
        />
      </div>
    </div>
  )
}