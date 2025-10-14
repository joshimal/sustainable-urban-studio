"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useClimate } from "../contexts/ClimateContext"
import { loadLeaflet } from "../utils/loadLeaflet"
import type { LayerStateMap } from "../hooks/useClimateLayerData"
import { getClimateLayer } from "../config/climateLayers"
import { LatLngBoundsLiteral } from "../types/geography"

interface LeafletMapProps {
  className?: string
  center: { lat: number; lng: number }
  zoom: number
  onViewportChange?: (viewport: { center: { lat: number; lng: number }; zoom: number }) => void
  onMapBoundsChange?: (bounds: LatLngBoundsLiteral) => void
  layerStates: LayerStateMap
}

const PANES: Record<string, string> = {
  sea_level_rise: "pane_sea_level",
  elevation: "pane_elevation",
  temperature_projection: "pane_temp_projection",
  temperature_current: "pane_temperature",
  urban_heat_island: "pane_urban_heat",
}

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:3001'

// Carto free basemap - no API key required
// Available free styles: dark_all, light_all, voyager, voyager_nolabels, dark_nolabels, light_nolabels
const CARTO_BASEMAP_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"
const OSM_BASEMAP_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

type LeafletModule = typeof import("leaflet")

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006]
const DEFAULT_ZOOM = 5

export function LeafletMap({
  className,
  center,
  zoom,
  onViewportChange,
  onMapBoundsChange,
  layerStates,
}: LeafletMapProps) {
  const { controls, isLayerActive } = useClimate()
  const seaLevelActive = isLayerActive("sea_level_rise")
  const temperatureActive = isLayerActive("temperature_current")
  const urbanHeatActive = isLayerActive("urban_heat_island")
  const elevationActive = isLayerActive("elevation")
  const projectionActive = isLayerActive("temperature_projection")
  const [isReady, setIsReady] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletModule["Map"] | null>(null)
  const leafletRef = useRef<LeafletModule | null>(null)

  const baseLayerRef = useRef<LeafletModule["TileLayer"] | null>(null)
  const seaLevelLayerRef = useRef<LeafletModule["TileLayer"] | null>(null)
  const temperatureLayerRef = useRef<any>(null)
  const urbanHeatLayerRef = useRef<any>(null)
  const elevationLayerRef = useRef<LeafletModule["ImageOverlay"] | null>(null)
  const tempProjectionLayerRef = useRef<any>(null)

  const getLeaflet = async () => {
    if (!leafletRef.current) {
      leafletRef.current = await loadLeaflet()
    }
    return leafletRef.current
  }

  const ensurePanes = async () => {
    const L = await getLeaflet()
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    const createIfMissing = (name: string, zIndex: string, blendMode: string = "normal") => {
      if (!map.getPane(name)) map.createPane(name)
      const pane = map.getPane(name)!
      pane.style.zIndex = zIndex
      pane.style.mixBlendMode = blendMode
    }

    createIfMissing(PANES.elevation, "450", "multiply")
    createIfMissing(PANES.sea_level_rise, "452", "normal")
    createIfMissing(PANES.temperature_projection, "455", "screen")
    createIfMissing(PANES.temperature_current, "460", "screen")
    createIfMissing(PANES.urban_heat_island, "465", "normal")
  }

  useEffect(() => {
    let mounted = true

    const initMap = async () => {
      if (!mapContainerRef.current) return
      if (mapInstanceRef.current) return

      const L = await getLeaflet()
      const leafletMap = L.map(mapContainerRef.current, {
        center: center ? [center.lat, center.lng] : DEFAULT_CENTER,
        zoom: zoom ?? DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: true,
      })

      // Add zoom control to bottom right
      L.control.zoom({
        position: 'bottomright'
      }).addTo(leafletMap)

      const addBaseLayer = (url: string, options: L.TileLayerOptions) => {
        if (baseLayerRef.current) {
          leafletMap.removeLayer(baseLayerRef.current)
          baseLayerRef.current = null
        }
        const layer = L.tileLayer(url, options).addTo(leafletMap)
        baseLayerRef.current = layer
        return layer
      }

      const cartoLayer = addBaseLayer(
        CARTO_BASEMAP_URL,
        {
          attribution: "© OpenStreetMap contributors © CARTO",
          subdomains: "abcd",
          maxZoom: 19,
          crossOrigin: true,
          className: 'carto-basemap-blue-water'
        }
      )

      cartoLayer.on("tileerror", () => {
        if (!mapInstanceRef.current || baseLayerRef.current !== cartoLayer) return
        console.warn("Carto basemap tile failed; falling back to OpenStreetMap tiles.")
        const fallbackLayer = addBaseLayer(
          OSM_BASEMAP_URL,
          {
            attribution: "© OpenStreetMap contributors",
            subdomains: "abc",
            maxZoom: 19,
            crossOrigin: true,
          }
        )
        fallbackLayer.once("load", () => {
          // remove error handler once fallback loads successfully
          cartoLayer.off("tileerror")
        })
      })

      mapInstanceRef.current = leafletMap
      await ensurePanes()

      leafletMap.on("moveend", () => {
        if (!mapInstanceRef.current) return
        const map = mapInstanceRef.current
        const newCenter = map.getCenter()
        const newZoom = map.getZoom()
        const bounds = map.getBounds()
        onViewportChange?.({
          center: { lat: newCenter.lat, lng: newCenter.lng },
          zoom: newZoom,
        })
        onMapBoundsChange?.({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        })
      })

      if (mounted) setIsReady(true)

      const bounds = leafletMap.getBounds()
      onMapBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    }

    initMap()

    return () => {
      mounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      baseLayerRef.current = null
      setIsReady(false)
    }
  }, [center, zoom, onViewportChange, onMapBoundsChange])

  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current
    const currentCenter = map.getCenter()
    if (Math.abs(currentCenter.lat - center.lat) > 0.0001 || Math.abs(currentCenter.lng - center.lng) > 0.0001) {
      map.setView([center.lat, center.lng], zoom)
    } else if (map.getZoom() !== zoom) {
      map.setZoom(zoom)
    }
  }, [center, zoom])

  useEffect(() => {
    if (!isReady) return
    ensurePanes()
  }, [isReady])

  // Sea level rise tile layer - create/remove layer
  useEffect(() => {
    const updateSeaLevelLayer = async () => {
      if (!mapInstanceRef.current || !isReady) return

      const map = mapInstanceRef.current
      const L = await getLeaflet()
      await ensurePanes()

      if (!seaLevelActive) {
        if (seaLevelLayerRef.current) {
          map.removeLayer(seaLevelLayerRef.current)
          seaLevelLayerRef.current = null
        }
        return
      }

      // Only remove and recreate if feet changed (need new URL)
      const backendUrl = window.location.origin.replace(':8080', ':3001')
      const tileUrl = `${backendUrl}/api/tiles/noaa-slr/${controls.seaLevelFeet}/{z}/{x}/{y}.png`

      if (seaLevelLayerRef.current) {
        // Check if URL changed
        const currentUrl = (seaLevelLayerRef.current as any)._url
        if (currentUrl && currentUrl.includes(`noaa-slr/${controls.seaLevelFeet}/`)) {
          // Same URL, don't recreate
          return
        }
        // Different URL, remove old layer
        map.removeLayer(seaLevelLayerRef.current)
        seaLevelLayerRef.current = null
      }

      // Create new layer
      console.log('🌊 Creating sea level tile layer:', {
        url: tileUrl,
        opacity: controls.seaLevelOpacity,
        seaLevelFeet: controls.seaLevelFeet
      })

      const tileLayer = L.tileLayer(tileUrl, {
        attribution: 'NOAA Sea Level Rise',
        opacity: controls.seaLevelOpacity,
        maxZoom: 16,
        minZoom: 0,
        pane: PANES.sea_level_rise,
        className: 'sea-level-tiles',
        crossOrigin: true,
        keepBuffer: 2,
        updateWhenIdle: false,
        updateWhenZooming: true,
        updateInterval: 150
      })

      seaLevelLayerRef.current = tileLayer
      tileLayer.addTo(map)

      // Force redraw after a short delay to ensure tiles load
      setTimeout(() => {
        if (seaLevelLayerRef.current) {
          seaLevelLayerRef.current.redraw()
        }
      }, 100)

      console.log('🌊 Sea level tile layer added to map')
    }

    updateSeaLevelLayer()
  }, [isReady, seaLevelActive, controls.seaLevelFeet])

  // Update opacity separately without recreating the layer
  useEffect(() => {
    if (seaLevelLayerRef.current && seaLevelActive) {
      seaLevelLayerRef.current.setOpacity(controls.seaLevelOpacity)
      // Force redraw when opacity changes to ensure visibility
      seaLevelLayerRef.current.redraw()
      console.log('🌊 Updated sea level opacity to:', controls.seaLevelOpacity)
    }
  }, [controls.seaLevelOpacity, seaLevelActive])

  const temperatureData = layerStates.temperature_current?.data
  useEffect(() => {
    const updateTemperatureLayer = async () => {
      if (!mapInstanceRef.current) return
      const map = mapInstanceRef.current
      const L = await getLeaflet()
      await ensurePanes()

      if (temperatureLayerRef.current) {
        map.removeLayer(temperatureLayerRef.current)
        temperatureLayerRef.current = null
      }

      if (!temperatureActive) return
      if (layerStates.temperature_current?.status !== "success" || !temperatureData?.features) return
      if (!L.heatLayer) {
        console.error("leaflet.heat plugin is required for temperature layer")
        return
      }

      const bounds = map.getBounds()
      const heatPoints = temperatureData.features
        .map((feature: any) => {
          const [lon, lat] = feature.geometry?.coordinates ?? []
          if (typeof lon !== "number" || typeof lat !== "number") return null
          if (!bounds.contains([lat, lon])) return null
          const anomaly = feature.properties?.anomaly ?? 0
          const intensity = Math.min(1, Math.max(0, (anomaly + 5) / 10))
          return [lat, lon, intensity]
        })
        .filter(Boolean)

      if (heatPoints.length === 0) return

      const opacity = getClimateLayer("temperature_current")?.style.opacity ?? 0.5

      temperatureLayerRef.current = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 35,
        maxZoom: 18,
        max: 1.0,
        minOpacity: Math.max(0.1, opacity),
        pane: PANES.temperature_current,
        gradient: {
          0.0: "#053061",
          0.2: "#2166ac",
          0.4: "#4393c3",
          0.6: "#f4a582",
          0.8: "#d6604d",
          1.0: "#67001f",
        },
      }).addTo(map)
    }

    updateTemperatureLayer()

    return () => {
      if (temperatureLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(temperatureLayerRef.current)
        temperatureLayerRef.current = null
      }
    }
  }, [temperatureData, layerStates.temperature_current?.status, temperatureActive])

  const urbanHeatData = layerStates.urban_heat_island?.data
  useEffect(() => {
    const updateUrbanHeatLayer = async () => {
      if (!mapInstanceRef.current) return
      const map = mapInstanceRef.current
      const L = await getLeaflet()
      await ensurePanes()

      if (urbanHeatLayerRef.current) {
        map.removeLayer(urbanHeatLayerRef.current)
        urbanHeatLayerRef.current = null
      }

      if (!urbanHeatActive) return
      if (layerStates.urban_heat_island?.status !== "success" || !urbanHeatData?.features) return
      if (!L.heatLayer) {
        console.error("leaflet.heat plugin is required for urban heat island layer")
        return
      }

      const bounds = map.getBounds()
      const heatPoints = urbanHeatData.features
        .map((feature: any) => {
          const [lon, lat] = feature.geometry?.coordinates ?? []
          if (typeof lon !== "number" || typeof lat !== "number") return null
          if (!bounds.contains([lat, lon])) return null
          const intensity = feature.properties?.heatIslandIntensity ?? 0
          const normalized = Math.min(1, Math.max(0, (intensity + 2) / 6))
          return [lat, lon, normalized]
        })
        .filter(Boolean)

      if (heatPoints.length === 0) return

      const opacity = getClimateLayer("urban_heat_island")?.style.opacity ?? 0.7

      urbanHeatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 35,
        blur: 55,
        maxZoom: 18,
        minOpacity: Math.max(0.1, opacity),
        pane: PANES.urban_heat_island,
        gradient: {
          0.0: "#1d4ed8",
          0.3: "#3b82f6",
          0.5: "#facc15",
          0.7: "#f97316",
          1.0: "#dc2626",
        },
      }).addTo(map)
    }

    updateUrbanHeatLayer()

    return () => {
      if (urbanHeatLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(urbanHeatLayerRef.current)
        urbanHeatLayerRef.current = null
      }
    }
  }, [urbanHeatData, layerStates.urban_heat_island?.status, urbanHeatActive])

  const elevationData = layerStates.elevation?.data
  useEffect(() => {
    const updateElevationOverlay = async () => {
      if (!mapInstanceRef.current) return
      const map = mapInstanceRef.current
      const L = await getLeaflet()
      await ensurePanes()

      if (elevationLayerRef.current) {
        map.removeLayer(elevationLayerRef.current)
        elevationLayerRef.current = null
      }

      if (!elevationActive) return
      if (layerStates.elevation?.status !== "success" || !Array.isArray(elevationData?.features)) return

      const features = elevationData.features
      if (features.length === 0) return

      const elevations = features.map((feature: any) => feature.properties?.elevation ?? 0)
      const minElevation = Math.min(...elevations)
      const maxElevation = Math.max(...elevations)

      const determineColor = (elevation: number) => {
        if (elevation <= minElevation + 5) return [34, 211, 238] as [number, number, number] // cyan for sea level
        if (elevation <= minElevation + 25) return [16, 185, 129] as [number, number, number] // green lowlands
        if (elevation <= minElevation + 100) return [250, 204, 21] as [number, number, number] // hills
        return [248, 113, 113] as [number, number, number] // higher terrain
      }

      const canvas = document.createElement("canvas")
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const imageData = ctx.createImageData(canvas.width, canvas.height)
      const data = imageData.data
      const mapBounds = map.getBounds()

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const lat =
            mapBounds.getNorth() - (y / canvas.height) * (mapBounds.getNorth() - mapBounds.getSouth())
          const lon =
            mapBounds.getWest() + (x / canvas.width) * (mapBounds.getEast() - mapBounds.getWest())

          const nearest = features.reduce(
            (closest: any, feature: any) => {
              const [flon, flat] = feature.geometry.coordinates
              const dist = Math.sqrt(Math.pow(flat - lat, 2) + Math.pow(flon - lon, 2))
              if (!closest || dist < closest.dist) {
                return { dist, elev: feature.properties.elevation }
              }
              return closest
            },
            null
          )

          const elevation = nearest ? nearest.elev : minElevation
          const [r, g, b] = determineColor(elevation)
          const i = (y * canvas.width + x) * 4

          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
          data[i + 3] = 210
        }
      }

      ctx.putImageData(imageData, 0, 0)

      const bounds: LatLngBoundsLiteral = {
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      }

      elevationLayerRef.current = L.imageOverlay(canvas.toDataURL(), [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ], {
        opacity: getClimateLayer("elevation")?.style.opacity ?? 0.5,
        pane: PANES.elevation,
      }).addTo(map)
    }

    updateElevationOverlay()

    return () => {
      if (elevationLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(elevationLayerRef.current)
        elevationLayerRef.current = null
      }
    }
  }, [elevationData, layerStates.elevation?.status, elevationActive])

  const tempProjectionData = layerStates.temperature_projection?.data
  useEffect(() => {
    const updateProjectionLayer = async () => {
      if (!mapInstanceRef.current) return
      const map = mapInstanceRef.current
      const L = await getLeaflet()
      await ensurePanes()

      if (tempProjectionLayerRef.current) {
        map.removeLayer(tempProjectionLayerRef.current)
        tempProjectionLayerRef.current = null
      }

      if (!projectionActive) return
      if (layerStates.temperature_projection?.status !== "success" || !tempProjectionData?.features) return

      const opacityControl = controls.projectionOpacity ?? (getClimateLayer("temperature_projection")?.style.opacity ?? 0.6)

      const getTempColor = (anomaly: number) => {
        // Clamp to 0-8 range for better color distribution
        const value = Math.max(0, Math.min(8, anomaly || 0))

        const stops = [
          { value: 0, color: [59, 130, 246] },      // 0°C - Blue (no warming)
          { value: 1, color: [96, 165, 250] },      // 1°C - Light Blue
          { value: 2, color: [147, 197, 253] },     // 2°C - Sky Blue
          { value: 3, color: [254, 240, 138] },     // 3°C - Light Yellow
          { value: 4, color: [251, 191, 36] },      // 4°C - Yellow/Gold
          { value: 5, color: [251, 146, 60] },      // 5°C - Orange
          { value: 6, color: [239, 68, 68] },       // 6°C - Red
          { value: 8, color: [127, 29, 29] }        // 8°C+ - Dark Red
        ]

        let left = stops[0]
        let right = stops[stops.length - 1]

        for (let i = 0; i < stops.length - 1; i++) {
          if (value >= stops[i].value && value <= stops[i + 1].value) {
            left = stops[i]
            right = stops[i + 1]
            break
          }
        }

        const range = right.value - left.value || 1
        const t = Math.min(1, Math.max(0, (value - left.value) / range))
        const interpolate = (start: number, end: number) => Math.round(start + (end - start) * t)
        const r = interpolate(left.color[0], right.color[0])
        const g = interpolate(left.color[1], right.color[1])
        const b = interpolate(left.color[2], right.color[2])
        return `#${[r, g, b].map(channel => channel.toString(16).padStart(2, "0")).join("")}`
      }

      // Get current zoom level to adjust hexagon opacity
      const currentZoom = map.getZoom()

      // Reduce individual hexagon opacity when zoomed out to prevent cumulative opacity from overlapping hexagons
      let hexOpacity = 1.0
      if (currentZoom <= 5) {
        hexOpacity = 0.3
      } else if (currentZoom <= 8) {
        hexOpacity = 0.5
      } else if (currentZoom <= 10) {
        hexOpacity = 0.7
      }

      tempProjectionLayerRef.current = L.geoJSON(tempProjectionData, {
        pane: PANES.temperature_projection,
        style: feature => {
          const anomaly = feature?.properties?.tempAnomaly ?? feature?.properties?.temperature_anomaly ?? 0
          const color = getTempColor(anomaly)
          return {
            color: color,
            fillColor: color,
            fillOpacity: hexOpacity,  // Adjusted based on zoom to prevent overlapping
            weight: 0,
            opacity: 0,
            pane: PANES.temperature_projection,
          }
        },
        onEachFeature: (feature, layer) => {
          const anomaly = feature?.properties?.tempAnomaly ?? feature?.properties?.temperature_anomaly ?? 0
          layer.bindPopup(`<strong>Temperature anomaly:</strong> ${anomaly.toFixed(2)}°C`)
        },
      }).addTo(map)
    }

    updateProjectionLayer()

    return () => {
      if (tempProjectionLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(tempProjectionLayerRef.current)
        tempProjectionLayerRef.current = null
      }
    }
  }, [tempProjectionData, layerStates.temperature_projection?.status, projectionActive, controls.projectionOpacity, zoom])

  // Update temperature projection pane opacity when slider changes
  useEffect(() => {
    if (!mapInstanceRef.current || !projectionActive) return
    const pane = mapInstanceRef.current.getPane(PANES.temperature_projection)
    if (pane) {
      pane.style.opacity = String(controls.projectionOpacity)
    }
  }, [controls.projectionOpacity, projectionActive])

  // Urban Heat Island Layer - hexagonal rendering
  const heatIslandActive = urbanHeatActive
  const heatIslandLayerRef = useRef<L.GeoJSON | null>(null)
  const heatIslandData = layerStates.urban_heat_island?.data

  useEffect(() => {
    const updateHeatIslandLayer = async () => {
      if (!mapInstanceRef.current) return
      const map = mapInstanceRef.current
      const L = await getLeaflet()
      await ensurePanes()

      if (heatIslandLayerRef.current) {
        map.removeLayer(heatIslandLayerRef.current)
        heatIslandLayerRef.current = null
      }

      if (!heatIslandActive) return
      if (layerStates.urban_heat_island?.status !== "success" || !heatIslandData?.features) return

      const getHeatIslandColor = (intensity: number) => {
        // Clamp to 0-6 range
        const value = Math.max(0, Math.min(6, intensity || 0))

        const stops = [
          { value: 0, color: [34, 139, 34] },      // 0°C - Green (no heat island)
          { value: 1, color: [255, 255, 0] },      // 1°C - Yellow (low)
          { value: 2, color: [255, 200, 0] },      // 2°C - Gold (moderate)
          { value: 3.5, color: [255, 140, 0] },    // 3.5°C - Orange (high)
          { value: 5, color: [255, 69, 0] },       // 5°C - Red-Orange (very high)
          { value: 6, color: [178, 34, 34] }       // 6°C+ - Dark Red (extreme)
        ]

        let left = stops[0]
        let right = stops[stops.length - 1]

        for (let i = 0; i < stops.length - 1; i++) {
          if (value >= stops[i].value && value <= stops[i + 1].value) {
            left = stops[i]
            right = stops[i + 1]
            break
          }
        }

        const range = right.value - left.value || 1
        const t = Math.min(1, Math.max(0, (value - left.value) / range))
        const interpolate = (start: number, end: number) => Math.round(start + (end - start) * t)
        const r = interpolate(left.color[0], right.color[0])
        const g = interpolate(left.color[1], right.color[1])
        const b = interpolate(left.color[2], right.color[2])
        return `#${[r, g, b].map(channel => channel.toString(16).padStart(2, "0")).join("")}`
      }

      heatIslandLayerRef.current = L.geoJSON(heatIslandData, {
        pane: PANES.urban_heat_island,
        style: feature => {
          const intensity = feature?.properties?.heatIslandIntensity ?? 0
          const color = getHeatIslandColor(intensity)
          return {
            color: color,
            fillColor: color,
            fillOpacity: 0.7,
            weight: 0,
            opacity: 0,
            pane: PANES.urban_heat_island,
          }
        },
        onEachFeature: (feature, layer) => {
          const intensity = feature?.properties?.heatIslandIntensity ?? 0
          const level = feature?.properties?.level ?? 'unknown'
          layer.bindPopup(`<strong>Urban Heat Island</strong><br/>Intensity: ${intensity.toFixed(1)}°C<br/>Level: ${level}`)
        },
      }).addTo(map)
    }

    updateHeatIslandLayer()

    return () => {
      if (heatIslandLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(heatIslandLayerRef.current)
        heatIslandLayerRef.current = null
      }
    }
  }, [heatIslandData, layerStates.urban_heat_island?.status, heatIslandActive])

  return <div ref={mapContainerRef} className={`h-full w-full ${className ?? ""}`} />
}
