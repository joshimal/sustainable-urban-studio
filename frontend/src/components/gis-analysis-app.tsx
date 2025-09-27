"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ArrowLeft, Layers, Search, ZoomIn, ZoomOut, Maximize2, Map } from "lucide-react"
import { LayerPanel } from "./layer-panel"
import { VisualizationPanel } from "./visualization-panel"
import { MapView } from "./map-view"
import { LeafletMap } from "./leaflet-map"
import { LayerList } from "./layer-list"

export function GISAnalysisApp() {
  const [selectedLayer, setSelectedLayer] = useState("airports_v02")
  const [layerPanelOpen, setLayerPanelOpen] = useState(true)
  const [vizPanelOpen, setVizPanelOpen] = useState(true)
  const [useLeafletMap, setUseLeafletMap] = useState(true)

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Left Sidebar - Layer List */}
      <div className="w-80 bg-card border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">GIS Analysis</h1>
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
              <span className="text-green-400">✓ NYC & Nassau County boundaries</span>
            </div>
          </div>
        </div>

        <LayerList selectedLayer={selectedLayer} onLayerSelect={setSelectedLayer} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Map View */}
        <div className="flex-1 relative">
          {useLeafletMap ? <LeafletMap /> : <MapView />}

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
        </div>

        {/* Right Panel - Layer Controls */}
        {layerPanelOpen && <LayerPanel selectedLayer={selectedLayer} onClose={() => setLayerPanelOpen(false)} />}
      </div>

      {/* Visualization Panel */}
      {vizPanelOpen && <VisualizationPanel onClose={() => setVizPanelOpen(false)} />}
    </div>
  )
}
