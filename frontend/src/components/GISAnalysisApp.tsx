"use client"

import React, { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Layers, Search, Map, Plus, X, Trash2 } from "lucide-react"
import { LayerPanel } from "./layer-panel"
import { LeafletMap } from "./leaflet-map"

export function GISAnalysisApp() {
  const [selectedLayer, setSelectedLayer] = useState("noaa_sea_level_rise")
  const [layerPanelOpen, setLayerPanelOpen] = useState(true)
  const [seaLevelRiseData, setSeaLevelRiseData] = useState(null)
  const [temperatureData, setTemperatureData] = useState(null)
  const [urbanHeatData, setUrbanHeatData] = useState(null)
  const [seaLevelFeet, setSeaLevelFeet] = useState(0)  // Start at 0ft to show current water baseline
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [mapName, setMapName] = useState("")
  const [layerSettings, setLayerSettings] = useState({
    selectedDataset: 'sea_level_rise',
    seaLevelOpacity: 0.6,
    displayStyle: 'depth',
    showBorder: true,  // Enable border by default
    borderColor: 'cyan',  // Light blue border
    borderWidth: 1,
    temperatureThreshold: 3.2,
    urbanHeatOpacity: 0.2  // Urban Heat Island starts at 20%
  })
  const [selectedMapId, setSelectedMapId] = useState<string | null>("1")
  const [projects, setProjects] = useState([
    {
      id: "1",
      name: "Sea Level Rise Analysis",
      description: "NOAA sea level rise projections for Nassau County",
      date: "2024-01-15",
      config: {
        seaLevelFeet: 3,
        layerSettings: {
          seaLevelEnabled: true,
          seaLevelOpacity: 0.6
        }
      }
    },
    {
      id: "2",
      name: "Nassau County Overview",
      description: "Main view of Nassau County with climate data",
      date: "2024-01-15",
      config: {
        seaLevelFeet: 2,
        layerSettings: {
          seaLevelEnabled: false,
          seaLevelOpacity: 0.4
        }
      }
    },
    {
      id: "3",
      name: "Temperature Analysis",
      description: "Heat map showing temperature projections",
      date: "2024-01-14",
      config: {
        seaLevelFeet: 5,
        layerSettings: {
          seaLevelEnabled: true,
          seaLevelOpacity: 0.8
        }
      }
    }
  ])

  const handleDeleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId))
    if (selectedMapId === projectId) {
      setSelectedMapId(projects.length > 1 ? projects[0].id : null)
    }
  }

  const handleSelectMap = (projectId: string) => {
    setSelectedMapId(projectId)
    const project = projects.find(p => p.id === projectId)
    if (project && project.config) {
      setSeaLevelFeet(project.config.seaLevelFeet)
      setLayerSettings(project.config.layerSettings)
      // Trigger data fetch with new settings
      fetchSeaLevelRiseData(project.config.seaLevelFeet)
    }
  }

  const handleSaveMap = () => {
    if (!mapName.trim()) return

    const newProject = {
      id: Date.now().toString(),
      name: mapName,
      description: `Custom GIS analysis - ${new Date().toLocaleDateString()}`,
      date: new Date().toISOString().split('T')[0],
      config: {
        seaLevelFeet: seaLevelFeet,
        layerSettings: { ...layerSettings }
      }
    }

    setProjects([newProject, ...projects])
    setSelectedMapId(newProject.id)
    setShowSaveDialog(false)
    setMapName("")
  }


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

  // Fetch NASA GISTEMP Temperature data
  const fetchTemperatureData = async () => {
    try {
      console.log('🌡️ Fetching NASA GISTEMP temperature data...', {
        selectedDataset: layerSettings.selectedDataset
      });

      // Get global bounds for temperature data
      const bounds = {
        north: 90,
        south: -90,
        east: 180,
        west: -180
      };

      const response = await fetch(
        `http://localhost:3001/api/nasa/temperature?` +
        `north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&resolution=1`
      );

      const result = await response.json();
      console.log('✅ Temperature data loaded:', result.data.features.length, 'grid cells');
      setTemperatureData(result.data);
    } catch (error) {
      console.error('❌ Error fetching NASA temperature data:', error);
    }
  };

  // Fetch REAL NASA MODIS LST data for Urban Heat Island
  const fetchModisLSTData = async () => {
    try {
      console.log('🛰️ Fetching REAL NASA MODIS LST data...');

      // Nassau County bounding box (extended slightly for better coverage)
      const bounds = {
        north: 40.90,
        south: 40.55,
        east: -73.35,
        west: -73.80
      };

      // Use recent historical date (NASA POWER data is ~1 week delayed)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7); // 7 days ago
      const dateStr = recentDate.toISOString().split('T')[0].replace(/-/g, '');

      const response = await fetch(
        `http://localhost:3001/api/modis/lst?` +
        `north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&resolution=0.05&date=${dateStr}`
      );

      const result = await response.json();

      if (result.success && result.data) {
        setUrbanHeatData(result.data);
        console.log(`✅ MODIS LST data loaded: ${result.data.features.length} points`);
        console.log(`📊 Data source: ${result.data.properties.source}`);
        console.log(`🌡️ Reference temp: ${result.data.properties.reference_temp}°C`);
      } else {
        console.error('❌ Failed to load MODIS data:', result.error);
      }
    } catch (error) {
      console.error('❌ Error fetching MODIS LST data:', error);
    }
  };

  // Handle sea level change from slider
  const handleSeaLevelChange = (feet: number) => {
    setSeaLevelFeet(feet);
    fetchSeaLevelRiseData(feet);
  };

  // Load initial data based on selected dataset
  useEffect(() => {
    console.log('🔄 Dataset changed:', {
      selectedLayer,
      selectedDataset: layerSettings.selectedDataset
    });

    if (selectedLayer === "noaa_sea_level_rise" && layerSettings.selectedDataset === "sea_level_rise") {
      fetchSeaLevelRiseData(seaLevelFeet);
    } else if (layerSettings.selectedDataset === "temperature") {
      console.log('📡 Triggering temperature fetch');
      fetchTemperatureData();
    } else if (layerSettings.selectedDataset === "urban_heat_island") {
      console.log('🏙️ Loading Urban Heat Island layer with REAL NASA MODIS LST data');
      fetchModisLSTData();
    }
  }, [selectedLayer, layerSettings.selectedDataset]);

  // Debug: Log layerSettings changes
  useEffect(() => {
    console.log('⚙️ Layer settings updated:', layerSettings);
  }, [layerSettings]);

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Left Sidebar - Layer List */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-lg font-semibold">GIS Analysis</h1>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search saved maps..." className="pl-10 bg-muted/50" />
          </div>
        </div>

        {/* Projects Section */}
        <div className="flex-1 overflow-y-auto px-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 mt-4">Your Maps</h3>

          {projects.map((project, index) => (
            <div
              key={project.id}
              onClick={() => handleSelectMap(project.id)}
              className={`mb-3 p-3 rounded-lg border ${
                selectedMapId === project.id
                  ? 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20'
                  : 'border-border hover:bg-muted/50'
              } cursor-pointer transition-colors group`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                  selectedMapId === project.id ? 'bg-blue-500/20' : 'bg-muted'
                }`}>
                  <Map className={`h-4 w-4 ${selectedMapId === project.id ? 'text-blue-400' : ''}`} />
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


      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Map View */}
        <div className="flex-1 relative">
          <LeafletMap
            seaLevelRiseData={layerSettings.selectedDataset === 'sea_level_rise' ? seaLevelRiseData : null}
            temperatureData={layerSettings.selectedDataset === 'temperature' ? temperatureData : null}
            urbanHeatData={layerSettings.selectedDataset === 'urban_heat_island' ? urbanHeatData : null}
            layerSettings={layerSettings}
            seaLevelFeet={seaLevelFeet}
          />

          {/* Control Buttons */}
          <div className="absolute top-4 right-4 flex gap-2 z-[1000] pointer-events-auto">
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
        </div>

        {/* Right Panel - Layer Controls */}
        {layerPanelOpen && (
          <LayerPanel
            selectedLayer={selectedLayer}
            onClose={() => setLayerPanelOpen(false)}
            onSeaLevelChange={handleSeaLevelChange}
            onLayerSettingsChange={setLayerSettings}
            seaLevelFeet={seaLevelFeet}
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
                onClick={handleSaveMap}
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