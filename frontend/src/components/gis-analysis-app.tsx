"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ArrowLeft, Plus, Search, ZoomIn, ZoomOut, Maximize2, Layers, BarChart3, X } from "lucide-react"
import { LayerPanel } from "./layer-panel"
import { VisualizationPanel } from "./visualization-panel"
import { MapView } from "./map-view"
import { LeafletMap } from "./leaflet-map"

interface SavedMap {
  id: string
  name: string
  description: string
  createdAt: string
  thumbnail: string
}

export function GISAnalysisApp() {
  const [selectedLayer, setSelectedLayer] = useState("airports_v02")
  const [layerPanelOpen, setLayerPanelOpen] = useState(true)
  const [vizPanelOpen, setVizPanelOpen] = useState(true)
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>([
    {
      id: "1",
      name: "Nassau County Overview",
      description: "Main view of Nassau County with climate data",
      createdAt: "2024-01-15",
      thumbnail: "/placeholder-map.jpg"
    },
    {
      id: "2", 
      name: "Temperature Analysis",
      description: "Heat map showing temperature projections",
      createdAt: "2024-01-14",
      thumbnail: "/placeholder-map.jpg"
    }
  ])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [newMapName, setNewMapName] = useState("")
  const [newMapDescription, setNewMapDescription] = useState("")
  
  console.log("GISAnalysisApp rendering, layerPanelOpen:", layerPanelOpen, "vizPanelOpen:", vizPanelOpen)

  const handleSaveMap = () => {
    if (newMapName.trim()) {
      const newMap: SavedMap = {
        id: Date.now().toString(),
        name: newMapName,
        description: newMapDescription,
        createdAt: new Date().toISOString().split('T')[0],
        thumbnail: "/placeholder-map.jpg"
      }
      setSavedMaps(prev => [newMap, ...prev])
      setNewMapName("")
      setNewMapDescription("")
      setShowSaveModal(false)
    }
  }

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Left Sidebar - Saved Maps */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Saved Maps</h1>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search saved maps..." className="pl-10 bg-muted/50" />
          </div>
        </div>

        {/* Saved Maps List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedMaps.map((map) => (
            <div
              key={map.id}
              className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-16 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  Map
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{map.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{map.description}</p>
                  <div className="text-xs text-muted-foreground mt-2">
                    {map.createdAt}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Map Button */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={() => setShowSaveModal(true)}
            className="w-full flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Save Current View
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Map View */}
        <div className="flex-1 relative">
          <LeafletMap />

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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setVizPanelOpen(!vizPanelOpen)}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Charts
            </Button>
          </div>
        </div>

        {/* Right Panel - Layer Controls */}
        {layerPanelOpen && <LayerPanel selectedLayer={selectedLayer} onClose={() => setLayerPanelOpen(false)} />}
      </div>

      {/* Visualization Panel */}
      {vizPanelOpen && <VisualizationPanel onClose={() => setVizPanelOpen(false)} />}

      {/* Save Map Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Save Current View</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSaveModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Map Name</label>
                <Input
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  placeholder="Enter map name..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Input
                  value={newMapDescription}
                  onChange={(e) => setNewMapDescription(e.target.value)}
                  placeholder="Enter description..."
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveMap}
                  disabled={!newMapName.trim()}
                  className="flex-1"
                >
                  Save Map
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
