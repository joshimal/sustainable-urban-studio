"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ArrowLeft, Layers, Search, ZoomIn, ZoomOut, Maximize2, Map } from "lucide-react"
import { LayerPanel } from "./layer-panel"
import { VisualizationPanel } from "./visualization-panel"
import { MapView } from "./map-view"
import { LeafletMap } from "./leaflet-map"
import { LayerList } from "./layer-list"

export function GISAnalysisApp() {
  const [selectedLayer, setSelectedLayer] = useState("temperature_heatmap")
  const [layerPanelOpen, setLayerPanelOpen] = useState(true)
  const [vizPanelOpen, setVizPanelOpen] = useState(true)
  const [useLeafletMap, setUseLeafletMap] = useState(true)

  // Climate data state - integrating with your existing APIs
  const [climateData, setClimateData] = useState({
    temperature: { value: 3.2, loading: true },
    seaLevel: { value: 2.5, loading: true },
    airQuality: { value: 85, loading: true },
    precipitation: { value: 85, loading: true },
    greenSpace: { value: 35, loading: true },
    loading: false,
    error: null
  });

  // Load climate data from your existing APIs
  useEffect(() => {
    const loadClimateData = async () => {
      try {
        console.log('🌍 Loading climate data from APIs...');

        const [tempRes, seaRes, airRes, precipRes, greenRes] = await Promise.all([
          fetch('http://localhost:3002/api/climate/temperature/heatmap?year=2030&scenario=moderate'),
          fetch('http://localhost:3002/api/climate/sea-level-rise/projection?level=2.5&timeframe=2050'),
          fetch('http://localhost:3002/api/environment/air-quality/index?pollutant=pm25'),
          fetch('http://localhost:3002/api/climate/precipitation/annual?year=2030'),
          fetch('http://localhost:3002/api/urban/green-space/coverage?percentage=35')
        ]);

        const tempData = await tempRes.json();
        const seaData = await seaRes.json();
        const airData = await airRes.json();
        const precipData = await precipRes.json();
        const greenData = await greenRes.json();

        console.log('✅ Climate APIs loaded successfully', { tempData, seaData, airData });

        setClimateData({
          temperature: {
            value: tempData.projectedIncrease || 3.2,
            loading: false,
            timeSeries: tempData.timeSeries,
            data: tempData.data
          },
          seaLevel: {
            value: seaData.seaLevelRise || 2.5,
            loading: false,
            projections: seaData.projections,
            summary: seaData.summary
          },
          airQuality: {
            value: Math.round(airData.data?.[0]?.aqi || 85),
            loading: false,
            timeSeries: airData.timeSeries,
            data: airData.data
          },
          precipitation: {
            value: Math.round(precipData.timeSeries?.[10]?.value || 85),
            loading: false,
            timeSeries: precipData.timeSeries
          },
          greenSpace: {
            value: Math.round(greenData.data?.[0]?.greenSpaceCoverage || 35),
            loading: false,
            timeSeries: greenData.timeSeries,
            benefits: greenData.benefits
          },
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('❌ Error loading climate data:', error);
        setClimateData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load climate data - using mock values'
        }));
      }
    };

    // Load climate data after a short delay
    const timer = setTimeout(loadClimateData, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Left Sidebar - Layer List */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Climate Analysis</h1>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search layers..." className="pl-10 bg-muted/50" />
          </div>

          <div className="space-y-2">
            <Button
              variant={useLeafletMap ? "default" : "outline"}
              size="sm"
              onClick={() => setUseLeafletMap(!useLeafletMap)}
              className="w-full flex items-center gap-2"
            >
              <Map className="h-4 w-4" />
              {useLeafletMap ? "Interactive Map" : "Demo View"}
            </Button>

            <div className="text-xs text-center">
              <span className="text-green-400">✓ Nassau County Climate Data</span>
            </div>
          </div>
        </div>

        <LayerList
          selectedLayer={selectedLayer}
          onLayerSelect={setSelectedLayer}
          climateData={climateData}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Map View */}
        <div className="flex-1 relative">
          {useLeafletMap ? <LeafletMap climateData={climateData} /> : <MapView />}

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button size="sm" variant="secondary" className="p-2">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" className="p-2">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" className="p-2">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Layer Panel Toggle */}
          <div className="absolute top-4 left-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLayerPanelOpen(!layerPanelOpen)}
              className="flex items-center gap-2"
            >
              <Layers className="h-4 w-4" />
              Layers
            </Button>
          </div>

          {/* Climate Status Overlay */}
          <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-semibold">Nassau Climate Analysis</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>🌡️ Temperature: +{climateData.temperature.value.toFixed(1)}°C</div>
              <div>🌊 Sea Level: +{climateData.seaLevel.value}cm</div>
              <div>💨 AQI: {climateData.airQuality.value}</div>
            </div>
          </div>
        </div>

        {/* Right Panel - Layer Controls */}
        {layerPanelOpen && (
          <LayerPanel
            selectedLayer={selectedLayer}
            onClose={() => setLayerPanelOpen(false)}
            climateData={climateData}
          />
        )}
      </div>

      {/* Visualization Panel */}
      {vizPanelOpen && (
        <VisualizationPanel
          onClose={() => setVizPanelOpen(false)}
          climateData={climateData}
        />
      )}
    </div>
  )
}