"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ArrowLeft, Layers, Search, ZoomIn, ZoomOut, Maximize2, Map, Plus, X, Trash2 } from "lucide-react"
import { LayerPanel } from "./layer-panel"
import { LeafletMap } from "./leaflet-map"
import { LayerList } from "./layer-list"

export function GISAnalysisApp() {
  const [selectedLayer, setSelectedLayer] = useState("noaa_sea_level_rise")
  const [layerPanelOpen, setLayerPanelOpen] = useState(true)
  const [seaLevelRiseData, setSeaLevelRiseData] = useState(null)
  const [seaLevelFeet, setSeaLevelFeet] = useState(3)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [mapName, setMapName] = useState("")
  const [projects, setProjects] = useState([
    {
      id: "1",
      name: "Sea Level Rise Analysis",
      description: "NOAA sea level rise projections for Nassau County",
      date: "2024-01-15"
    },
    {
      id: "2",
      name: "Nassau County Overview",
      description: "Main view of Nassau County with climate data",
      date: "2024-01-15"
    },
    {
      id: "3",
      name: "Temperature Analysis",
      description: "Heat map showing temperature projections",
      date: "2024-01-14"
    }
  ])

  const handleDeleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId))
  }

  // Climate data state - integrating with your existing APIs
  const [climateData, setClimateData] = useState({
    temperature: { value: 3.2, loading: true, timeSeries: null, data: null },
    seaLevel: { value: 2.5, loading: true, projections: null, summary: null },
    airQuality: { value: 85, loading: true, timeSeries: null, data: null },
    precipitation: { value: 85, loading: true, timeSeries: null },
    greenSpace: { value: 35, loading: true, timeSeries: null, benefits: null },
    loading: false,
    error: null
  });

  // Load climate data from your existing APIs
  useEffect(() => {
    const loadClimateData = async () => {
      try {
        console.log('🌍 Loading climate data from APIs...');

        // Use backend NOAA computed series endpoints (defaults to JFK station, 5 years max)
        const [tempRes, precipRes] = await Promise.all([
          fetch('http://localhost:3001/api/climate/noaa/temperature/anomaly?stationid=GHCND:USW00094789&years=5'),
          fetch('http://localhost:3001/api/climate/noaa/precipitation/trend?stationid=GHCND:USW00094789&years=5')
        ]);

        const tempPayload = await tempRes.json();
        const precipPayload = await precipRes.json();

        console.log('✅ Climate APIs loaded successfully');

        setClimateData({
          temperature: {
            value: (tempPayload?.data?.trendCPerDecade ?? 0),
            loading: false,
            timeSeries: tempPayload?.data?.anomaliesC || tempPayload?.data?.timeseries || null,
            data: tempPayload?.data || null
          },
          seaLevel: {
            value: 2.5,
            loading: false,
            projections: null,
            summary: null
          },
          airQuality: {
            value: 85,
            loading: false,
            timeSeries: null,
            data: null
          },
          precipitation: {
            value: Number((precipPayload?.data?.trendMmPerDecade ?? 0).toFixed(0)),
            loading: false,
            timeSeries: precipPayload?.data?.timeseries || null
          },
          greenSpace: {
            value: 35,
            loading: false,
            timeSeries: null,
            benefits: null
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

  // Fetch NOAA Sea Level Rise data
  const fetchSeaLevelRiseData = async (feet: number) => {
    try {
      console.log(`🌊 Fetching NOAA sea level rise data for ${feet}ft...`);

      // Nassau County bounding box
      const bounds = {
        north: 40.85,
        south: 40.60,
        east: -73.40,
        west: -73.75
      };

      const response = await fetch(
        `http://localhost:3001/api/noaa/sea-level-rise?feet=${feet}&north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`
      );

      const result = await response.json();

      if (result.success && result.data) {
        setSeaLevelRiseData(result.data);
        console.log(`✅ Loaded ${result.data.features?.length || 0} sea level rise features`);
      } else {
        console.error('❌ Failed to load NOAA data:', result.error);
      }
    } catch (error) {
      console.error('❌ Error fetching NOAA data:', error);
    }
  };

  // Handle sea level change from slider
  const handleSeaLevelChange = (feet: number) => {
    setSeaLevelFeet(feet);
    fetchSeaLevelRiseData(feet);
  };

  // Load initial sea level rise data
  useEffect(() => {
    if (selectedLayer === "noaa_sea_level_rise") {
      fetchSeaLevelRiseData(seaLevelFeet);
    }
  }, [selectedLayer]);

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

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search saved maps..." className="pl-10 bg-muted/50" />
          </div>
        </div>

        {/* Projects Section */}
        <div className="flex-1 overflow-y-auto px-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">Projects</h3>

          {projects.map((project, index) => (
            <div
              key={project.id}
              className={`mb-3 p-3 rounded-lg border ${
                index === 0
                  ? 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20'
                  : 'border-border hover:bg-muted/50'
              } cursor-pointer transition-colors group`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                  index === 0 ? 'bg-blue-500/20' : 'bg-muted'
                }`}>
                  <Map className={`h-4 w-4 ${index === 0 ? 'text-blue-400' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold mb-1">{project.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                    {project.description}
                  </p>
                  <span className="text-xs text-muted-foreground">{project.date}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteProject(project.id)
                  }}
                  className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Save Map Button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowSaveDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Save Map
          </Button>
        </div>
      </div>

      {/* Removed LayerList component */}
      <div className="hidden">
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
          <LeafletMap seaLevelRiseData={seaLevelRiseData} />

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

          {/* Control Buttons */}
          <div className="absolute top-4 left-4 flex gap-2">
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
            onSeaLevelChange={handleSeaLevelChange}
          />
        )}
      </div>

      {/* Save Map Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-card border border-border rounded-lg w-96 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Save Map</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSaveDialog(false)
                  setMapName("")
                }}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <label className="text-sm font-medium mb-2 block">Map Name</label>
              <Input
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder="Enter map name..."
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSaveDialog(false)
                  setMapName("")
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  console.log("Saving map:", mapName)
                  // TODO: Implement save functionality
                  setShowSaveDialog(false)
                  setMapName("")
                }}
                disabled={!mapName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}