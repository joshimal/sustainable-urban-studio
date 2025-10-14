"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { LayerControlsPanel, LayerPanel } from "./layer-panel"
import { LeafletMap } from "./leaflet-map"
import { climateLayers } from "../config/climateLayers"
import type { ClimateControl } from "../config/climateLayers"
import { useClimate } from "../contexts/ClimateContext"
import { useClimateLayerData } from "../hooks/useClimateLayerData"
import { LatLngBoundsLiteral } from "../types/geography"
import { Loader2, MapPin, Search } from "lucide-react"

interface GeoSearchResult {
  display_name: string
  lat: string
  lon: string
  boundingbox?: [string, string, string, string]
}

interface ViewportState {
  center: { lat: number; lng: number }
  zoom: number
}

const DEFAULT_VIEWPORT: ViewportState = {
  center: { lat: 40.7128, lng: -74.006 },
  zoom: 12,
}

export function GISAnalysisApp() {
  const { activeLayerIds, controls } = useClimate()
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT)
  const [mapBounds, setMapBounds] = useState<LatLngBoundsLiteral | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<GeoSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchControllerRef = useRef<AbortController | null>(null)

  const { layers: layerStates } = useClimateLayerData(mapBounds)

  const hasLayerControls = useMemo(
    () =>
      climateLayers
        .filter(layer => activeLayerIds.includes(layer.id))
        .some(layer => layer.controls.length > 0),
    [activeLayerIds]
  )

  const activeLayers = useMemo(
    () => climateLayers.filter(layer => activeLayerIds.includes(layer.id)),
    [activeLayerIds]
  )

  type ControlSnapshot = { control: ClimateControl; label: string; value: string }

  const formatControlSnapshot = useCallback(
    (control: ClimateControl) => {
      switch (control) {
        case "scenario":
          return { label: "Scenario", value: controls.scenario.toUpperCase() }
        case "projectionYear":
          return { label: "Projection Year", value: `${controls.projectionYear}` }
        case "seaLevelFeet":
          return { label: "Sea Level Rise", value: `${controls.seaLevelFeet} ft` }
        case "seaLevelOpacity":
          return { label: "Sea Level Opacity", value: `${Math.round(controls.seaLevelOpacity * 100)}%` }
        case "analysisDate": {
          const parsed = new Date(controls.analysisDate)
          const formatted = Number.isNaN(parsed.getTime())
            ? controls.analysisDate
            : parsed.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
          return { label: "Analysis Date", value: formatted }
        }
        case "displayStyle": {
          const label = controls.displayStyle === "confidence" ? "Confidence Extent" : "Depth Grid"
          return { label: "Display Style", value: label }
        }
        case "resolution":
          return { label: "Sampling Resolution", value: `${controls.resolution}°` }
        case "projectionOpacity":
          return { label: "Projection Opacity", value: `${Math.round(controls.projectionOpacity * 100)}%` }
        default:
          return null
      }
    },
    [controls]
  )

  const handleBoundsChange = useCallback((bounds: LatLngBoundsLiteral) => {
    setMapBounds(prev => ({ ...bounds, zoom: viewport.zoom }))
  }, [viewport.zoom])

  const handleViewportChange = useCallback((nextViewport: ViewportState) => {
    setViewport(nextViewport)
    // Update bounds with new zoom level
    setMapBounds(prev => prev ? { ...prev, zoom: nextViewport.zoom } : null)
  }, [])

  const executeSearch = useCallback(
    async (term: string) => {
      const query = term.trim()
      if (!query) {
        setSearchResults([])
        return
      }

      try {
        if (searchControllerRef.current) {
          searchControllerRef.current.abort()
        }

        const controller = new AbortController()
        searchControllerRef.current = controller
        setIsSearching(true)

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
          {
            headers: {
              "Accept": "application/json"
            },
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error(`Geocoding failed with status ${response.status}`)
        }

        const results: GeoSearchResult[] = await response.json()
        setSearchResults(results)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Geocoding error:", error)
        }
      } finally {
        setIsSearching(false)
      }
    },
    []
  )

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      executeSearch(searchTerm)
    },
    [executeSearch, searchTerm]
  )

  const moveToResult = useCallback((result: GeoSearchResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const bbox = result.boundingbox

    const newZoom = bbox
      ? Math.min(
          12,
          Math.max(
            4,
            Math.round(
              13 -
                Math.log2(
                  Math.max(
                    Math.abs(parseFloat(bbox[0]) - parseFloat(bbox[1])),
                    Math.abs(parseFloat(bbox[2]) - parseFloat(bbox[3]))
                  ) + 1e-6
                )
            )
          )
        )
      : 10

    setViewport({
      center: { lat, lng },
      zoom: newZoom,
    })
    setSearchResults([])
  }, [])

  // Get user's location on mount
  React.useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setViewport({
            center: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            },
            zoom: 12
          })
        },
        (error) => {
          console.log('Geolocation error:', error.message)
          // If geolocation fails, use default NYC location
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0
        }
      )
    } else {
    }
  }, [])

  return (
    <div className="relative h-screen text-foreground">
      <aside className="absolute left-0 top-0 z-[1000] flex h-full w-96 flex-col pointer-events-none">
        <div className="flex-1 overflow-y-auto space-y-6 pointer-events-auto">
          <div className="mx-4 mt-4 rounded-lg border border-border/60 bg-card/95 backdrop-blur-lg p-4">
            <form className="flex gap-2" onSubmit={handleSearchSubmit}>
              <div className="relative flex-1">
                <Input
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Search for a city, state, or country"
                  className="pr-10 bg-background/80 border-border"
                />
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Button type="submit" variant="secondary" disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Search results</div>
                <ul className="space-y-2">
                  {searchResults.map(result => (
                    <li key={`${result.lat}-${result.lon}`}>
                      <button
                        onClick={() => moveToResult(result)}
                        className="flex w-full items-start gap-2 rounded-md border border-transparent p-2 text-left text-sm hover:border-border hover:bg-background/80"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 text-blue-500" />
                        <span>{result.display_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <section className="mx-4 rounded-lg border border-border/60 bg-card/95 backdrop-blur-lg">
            <LayerPanel layerStates={layerStates} />
          </section>

          <section className="mx-4 rounded-lg border border-border/60 bg-card/95 backdrop-blur-lg p-4">
            <h3 className="text-sm font-semibold">Scenario Snapshot</h3>
            {activeLayers.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Activate a climate layer to review its current settings.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {activeLayers.map(layer => {
                  const controlEntries = layer.controls.reduce<ControlSnapshot[]>((entries, control) => {
                    const snapshot = formatControlSnapshot(control)
                    if (snapshot) {
                      entries.push({
                        control,
                        label: snapshot.label,
                        value: snapshot.value,
                      })
                    }
                    return entries
                  }, [])

                  return (
                    <div key={layer.id} className="rounded-md border border-border/60 bg-card/70 p-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>{layer.title}</span>
                        <span>{layer.category}</span>
                      </div>
                      {controlEntries.length > 0 ? (
                        <dl className="mt-2 grid grid-cols-2 gap-3 text-xs">
                          {controlEntries.map(entry => (
                            <div key={`${layer.id}-${entry.control}`}>
                              <dt className="text-muted-foreground/80">{entry.label}</dt>
                              <dd className="font-medium text-foreground">{entry.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          No adjustable controls for this layer.
                        </p>
                      )}
                    </div>
                  )
                })}
                <div className="rounded-md border border-border/60 bg-card/70 p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Global Settings</span>
                    <span>{activeLayers.length} Active</span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground/80">Active Layers</dt>
                      <dd className="font-medium text-foreground">
                        {activeLayers.map(layer => layer.title).join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground/80">Real Data Mode</dt>
                      <dd className="font-medium text-foreground">
                        {controls.useRealData ? "Enabled" : "Simulated"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </section>
        </div>
      </aside>

      <main className="relative h-full w-full">
        {hasLayerControls && (
          <div className="absolute top-4 right-4 z-[1000] w-80 max-h-[calc(100vh-2rem)] overflow-y-auto pointer-events-auto">
            <LayerControlsPanel layerStates={layerStates} />
          </div>
        )}
        <LeafletMap
          center={viewport.center}
          zoom={viewport.zoom}
          onViewportChange={handleViewportChange}
          onMapBoundsChange={handleBoundsChange}
          layerStates={layerStates}
        />
        <div className="absolute bottom-4 left-4 rounded-lg border border-border/60 bg-card/70 px-4 py-2 text-xs backdrop-blur">
          <div className="font-semibold">Viewport</div>
          <div className="mt-1 space-y-1 text-muted-foreground">
            <div>
              Lat/Lng: {viewport.center.lat.toFixed(3)}, {viewport.center.lng.toFixed(3)}
            </div>
            <div>Zoom: {viewport.zoom.toFixed(1)}</div>
          </div>
        </div>
      </main>
    </div>
  )
}
