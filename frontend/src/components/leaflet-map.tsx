// COMPLETE FIXED VERSION - Replace your entire leaflet-map.tsx with this

"use client"

import { useEffect, useRef, useState } from "react"
import { loadLeaflet } from "@/utils/loadLeaflet"

interface LeafletMapProps {
  className?: string
  climateData?: any
  location?: {
    id: string
    name: string
    center: { lat: number; lng: number }
    bounds: { north: number; south: number; east: number; west: number }
    zoom: number
    hasCoastalRisk: boolean
  }
  seaLevelRiseData?: any
  temperatureData?: any
  urbanHeatData?: any
  elevationData?: any
  tempProjectionData?: any
  seaLevelFeet?: number
  resizeSignal?: number
  uhiDate?: string
  layerSettings?: {
    selectedDataset?: string
    seaLevelEnabled?: boolean
    seaLevelOpacity: number
    displayStyle?: string
    colorScheme?: string
    showBorder?: boolean
    borderColor?: string
    borderWidth?: number
    temperatureThreshold?: number
    urbanHeatOpacity?: number
    layerOrder?: string[]
    enabledLayers?: string[]
    [k: string]: any
  }
}

export function LeafletMap({
  className,
  location,
  seaLevelRiseData,
  temperatureData,
  urbanHeatData,
  elevationData,
  tempProjectionData,
  layerSettings,
  seaLevelFeet = 2,
  resizeSignal,
  uhiDate
}: LeafletMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)

  const mapInstanceRef = useRef<any>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  const seaLevelLayerRef = useRef<any>(null)
  const temperatureLayerRef = useRef<any>(null)
  const urbanHeatLayerRef = useRef<any>(null)
  const elevationLayerRef = useRef<any>(null)
  const tempProjectionLayerRef = useRef<any>(null)

  // Pane names for consistent ordering
  const PANES: Record<string, string> = {
    sea_level_rise: 'pane_sea_level',
    elevation: 'pane_elevation',
    temperature_projection: 'pane_temp_projection',
    temperature: 'pane_temperature',
    urban_heat_island: 'pane_urban_heat'
  }

  // Ensure panes exist and apply blend modes
  const ensurePanes = (L: any) => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    const createIfMissing = (name: string, zIndex: string, blendMode: string = 'normal') => {
      if (!map.getPane(name)) map.createPane(name)
      const pane = map.getPane(name)!
      pane.style.zIndex = zIndex
      pane.style.mixBlendMode = blendMode
      return pane
    }

    createIfMissing(PANES.sea_level_rise, '450', 'normal')
    createIfMissing(PANES.elevation, '452', 'multiply')
    createIfMissing(PANES.temperature, '460', 'screen')
    createIfMissing(PANES.urban_heat_island, '465', 'screen')
    createIfMissing(PANES.temperature_projection, '470', 'normal')
  }

  // Helper: YYYY-MM-DD for NASA GIBS TIME param (defaults to today)
  const getUHIDate = () => {
    if (uhiDate && /^\d{4}-\d{2}-\d{2}$/.test(uhiDate)) return uhiDate
    const d = new Date()
    const y = d.getFullYear()
    const m = `${d.getMonth() + 1}`.padStart(2, '0')
    const day = `${d.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // NASA GIBS (EPSG:3857) WMTS REST pattern for MODIS LST Day (1km)
  // Using GoogleMapsCompatible_Level7 tiles (max native zoom for this layer)
  const gibsWMTSUrl = (layerId: string, timeISO: string) =>
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/all/${layerId}/default/${timeISO}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`

  const latLngToTile = (lat: number, lng: number, zoom: number) => {
    const scale = Math.pow(2, zoom)
    const x = Math.min(scale - 1, Math.max(0, Math.floor(((lng + 180) / 360) * scale)))
    const sinLat = Math.sin((lat * Math.PI) / 180)
    const rawY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
    const y = Math.min(scale - 1, Math.max(0, Math.floor(rawY)))
    return { x, y, z: zoom }
  }

  const buildDateCandidates = (baseISO: string) => {
    const base = new Date(baseISO + 'T00:00:00Z')
    if (Number.isNaN(base.valueOf())) return [baseISO]

    const offsets = [0, 1, 3, 7, 14, 30, 60, 90, 180]
    const seen = new Set<string>()
    const dates: string[] = []

    for (const days of offsets) {
      const candidate = new Date(base)
      candidate.setUTCDate(candidate.getUTCDate() - days)
      const iso = candidate.toISOString().slice(0, 10)
      if (!seen.has(iso)) {
        seen.add(iso)
        dates.push(iso)
      }
    }

    return dates
  }

  const findAvailableGibsDate = async (
    layerId: string,
    dateCandidates: string[],
    lat: number,
    lng: number
  ) => {
    const zoomCandidates = [7, 6, 5, 4, 3, 2, 1, 0]

    for (const candidate of dateCandidates) {
      const template = gibsWMTSUrl(layerId, candidate)

      for (const zoom of zoomCandidates) {
        const coords = latLngToTile(lat, lng, zoom)
        const url = template
          .replaceAll('{z}', `${zoom}`)
          .replace('{x}', `${coords.x}`)
          .replace('{y}', `${coords.y}`)

        try {
          const response = await fetch(url, { method: 'HEAD' })
          if (response.ok) {
            return { date: candidate, template, maxNativeZoom: zoom }
          }
        } catch (err) {
          console.warn('Failed to probe GIBS tile availability:', err)
        }
      }
    }

    return null
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !location) return
    mapInstanceRef.current.setView([location.center.lat, location.center.lng], location.zoom)
  }, [location])

  useEffect(() => {
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.invalidateSize(true) } catch {}
    }
  }, [resizeSignal])

  useEffect(() => {
    if (!isMounted) return
    let isComponentMounted = true

    const initMap = async () => {
      try {
        // wait for container
        let attempts = 0
        while (!mapRef.current && attempts < 50) {
          await new Promise(r => setTimeout(r, 50))
          attempts++
        }
        if (!mapRef.current) {
          if (isComponentMounted) setError("Map container not found after waiting")
          return
        }

        const L: any = await loadLeaflet()
        const center = location ? [location.center.lat, location.center.lng] : [40.7589, -73.9851]
        const zoom = location?.zoom || 10
        const locationName = location?.name || 'Nassau County, NY'

        const leafletMap = L.map(mapRef.current as any, {
          center: center as any,
          zoom,
          zoomControl: true,
          attributionControl: true,
          dragging: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          zoomAnimation: true
        })

        ensurePanes(L)

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(leafletMap)

        L.marker(center as any).addTo(leafletMap).bindPopup(locationName)

        if (isComponentMounted) {
          mapInstanceRef.current = leafletMap
          setIsLoading(false)
          setIsMapReady(true)
        }
      } catch (err) {
        console.error('Map initialization error:', err)
        if (isComponentMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load map')
          setIsLoading(false)
        }
      }
    }

    initMap()

    return () => {
      isComponentMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      setIsMapReady(false)
    }
  }, [isMounted])

  // Sea Level Rise Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return
    const addSeaLevelLayer = async () => {
      try {
        const L: any = await loadLeaflet()
        if (seaLevelLayerRef.current) {
          mapInstanceRef.current.removeLayer(seaLevelLayerRef.current)
          seaLevelLayerRef.current = null
        }
        if (layerSettings?.enabledLayers?.includes('sea_level_rise')) {
          if (location && location.hasCoastalRisk === false) {
            console.log('⚠️ Location has no coastal risk, skipping sea level tiles')
            return
          }
          const opacity = layerSettings?.seaLevelOpacity ?? 0.6
          ensurePanes(L)
          const tileLayer = L.tileLayer(
            `https://www.coast.noaa.gov/arcgis/rest/services/dc_slr/slr_${seaLevelFeet}ft/MapServer/tile/{z}/{y}/{x}`,
            { opacity, attribution: '© NOAA', pane: PANES.sea_level_rise, maxZoom: 16 }
          )
          seaLevelLayerRef.current = tileLayer.addTo(mapInstanceRef.current)
        }
      } catch (err) {
        console.error('Error adding sea level rise layer:', err)
      }
    }
    addSeaLevelLayer()
  }, [seaLevelFeet, layerSettings?.seaLevelOpacity, layerSettings?.enabledLayers, isMapReady, location])

  // Temperature Layer (leaflet.heat)
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return
    if (!layerSettings?.enabledLayers?.includes('temperature')) {
      if (temperatureLayerRef.current) {
        mapInstanceRef.current.removeLayer(temperatureLayerRef.current)
        temperatureLayerRef.current = null
      }
      return
    }
    if (!temperatureData) return

    const addTemperatureLayer = async () => {
      try {
        if (temperatureLayerRef.current) {
          mapInstanceRef.current.removeLayer(temperatureLayerRef.current)
          temperatureLayerRef.current = null
        }
        const L: any = await loadLeaflet()
        await import('leaflet.heat')
        const LeafletWithHeat = (window as any).L || L

        const bounds = mapInstanceRef.current.getBounds()
        const threshold = layerSettings?.temperatureThreshold ?? 0

        const heatPoints = temperatureData.features
          .filter((f: any) => {
            const coords = f.geometry?.coordinates
            if (!coords || coords.length < 2) return false
            const [lon, lat] = coords
            const anomaly = f.properties?.anomaly ?? 0
            return bounds.contains([lat, lon]) && anomaly >= threshold
          })
          .map((f: any) => {
            const [lon, lat] = f.geometry.coordinates
            const anomaly = f.properties.anomaly || 0
            const intensity = Math.min(1.0, Math.max(0.0, (anomaly - 0.5) / 2.0))
            return [lat, lon, intensity]
          })

        if (heatPoints.length === 0) return

        const tempOpacity = ((layerSettings as any)?.temperatureOpacity || 70) / 100
        temperatureLayerRef.current = LeafletWithHeat.heatLayer(heatPoints, {
          radius: 25,
          blur: 35,
          maxZoom: 18,
          max: 1.0,
          minOpacity: Math.max(0.05, tempOpacity),
          pane: PANES.temperature,
          gradient: {
            0.0: '#053061',
            0.15: '#2166ac',
            0.3: '#4393c3',
            0.45: '#92c5de',
            0.55: '#fddbc7',
            0.7: '#f4a582',
            0.85: '#d6604d',
            1.0: '#67001f'
          }
        }).addTo(mapInstanceRef.current)
      } catch (err) {
        console.error('❌ Error adding temperature layer:', err)
      }
    }

    addTemperatureLayer()
  }, [temperatureData, layerSettings?.enabledLayers, layerSettings?.temperatureThreshold, (layerSettings as any)?.temperatureOpacity, isMapReady])

  // ✅ Urban Heat Island Layer — NASA GIBS MODIS LST Day (1km) with native zoom clamp + smooth upscale
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return

    if (!layerSettings?.enabledLayers?.includes('urban_heat_island')) {
      if (urbanHeatLayerRef.current) {
        mapInstanceRef.current.removeLayer(urbanHeatLayerRef.current)
        urbanHeatLayerRef.current = null
      }
      return
    }

    const addUrbanHeatLayer = async () => {
      try {
        const L: any = await loadLeaflet()
        if (urbanHeatLayerRef.current) {
          mapInstanceRef.current.removeLayer(urbanHeatLayerRef.current)
          urbanHeatLayerRef.current = null
        }

        ensurePanes(L)

        const mapCenter = mapInstanceRef.current.getCenter()
        const centerLat = mapCenter?.lat ?? (location?.center.lat ?? 0)
        const centerLng = mapCenter?.lng ?? (location?.center.lng ?? 0)

        const LAYER_ID = "MODIS_Terra_Land_Surface_Temp_Day_TES"
        const preferredDate = getUHIDate()
        const candidates = buildDateCandidates(preferredDate)
        const availability = await findAvailableGibsDate(LAYER_ID, candidates, centerLat, centerLng)

        const finalDate = availability?.date || preferredDate
        const template = availability?.template || gibsWMTSUrl(LAYER_ID, finalDate)
        const MAX_NATIVE_Z = availability?.maxNativeZoom ?? 7 // default to published native zoom

        if (!availability) {
          console.warn(`⚠️ Falling back to requested UHI date ${preferredDate}; probe did not find a valid tile`)
        } else if (availability.date !== preferredDate) {
          console.log(`ℹ️ UHI using fallback date ${availability.date} (preferred ${preferredDate})`)
        }

        if (availability && availability.maxNativeZoom !== 7) {
          console.log(`ℹ️ UHI limiting native zoom to ${availability.maxNativeZoom} based on available tiles`)
        }

        const uhiOpacity = layerSettings?.urbanHeatOpacity ?? 0.45

        // TileLayer subclass that clamps z and maps x/y to parent tile when over-zooming
        const UhiLayer = L.TileLayer.extend({
          getTileUrl: function (coords: any) {
            const z = Math.min(coords.z, MAX_NATIVE_Z)
            const dz = coords.z - z
            const x = dz > 0 ? (coords.x >> dz) : coords.x
            const y = dz > 0 ? (coords.y >> dz) : coords.y
            return template
              .replaceAll("{z}", `${z}`)
              .replace("{x}", `${x}`)
              .replace("{y}", `${y}`)
          }
        })

        const uhi = new UhiLayer(undefined, {
          pane: PANES.urban_heat_island,
          opacity: uhiOpacity,
          maxZoom: 19,               // allow deep map zoom; tiles upscale smoothly
          maxNativeZoom: MAX_NATIVE_Z,
          tileSize: 256,
          updateWhenZooming: true,
          updateWhenIdle: true,
          crossOrigin: true,
          tms: false,
          className: "gibs-smooth-raster"
        })

        urbanHeatLayerRef.current = uhi.addTo(mapInstanceRef.current)
        console.log(`✅ UHI (MODIS LST Day) added for TIME=${finalDate}, maxNativeZoom=${MAX_NATIVE_Z}`)
      } catch (err) {
        console.error('Error adding Urban Heat Island (GIBS LST) layer:', err)
      }
    }

    addUrbanHeatLayer()
  }, [layerSettings?.enabledLayers, layerSettings?.urbanHeatOpacity, isMapReady, uhiDate])

  // Elevation Layer (unchanged logic)
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return

    if (!layerSettings?.enabledLayers?.includes('elevation')) {
      if (elevationLayerRef.current) {
        mapInstanceRef.current.removeLayer(elevationLayerRef.current)
        elevationLayerRef.current = null
      }
      return
    }

    if (!elevationData) {
      console.log('⏳ Waiting for elevation data...')
      return
    }

    const addElevationLayer = async () => {
      try {
        if (elevationLayerRef.current) {
          mapInstanceRef.current.removeLayer(elevationLayerRef.current)
          elevationLayerRef.current = null
        }

        const L: any = await loadLeaflet()
        const mapBounds = mapInstanceRef.current.getBounds()

        const canvas = document.createElement('canvas')
        canvas.width = 600
        canvas.height = 450
        const ctx = canvas.getContext('2d')!

        const elevValues = elevationData.features.map((f: any) => f.properties.elevation)
        const minElev = Math.min(...elevValues)
        const maxElev = Math.max(...elevValues)

        const imageData = ctx.createImageData(canvas.width, canvas.height)
        const data = imageData.data

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const lat = mapBounds.getNorth() - (y / canvas.height) * (mapBounds.getNorth() - mapBounds.getSouth())
            const lon = mapBounds.getWest() + (x / canvas.width) * (mapBounds.getEast() - mapBounds.getWest())

            const nearest = elevationData.features.reduce((closest: any, f: any) => {
              const [flon, flat] = f.geometry.coordinates
              const dist = Math.sqrt(Math.pow(flat - lat, 2) + Math.pow(flon - lon, 2))
              return !closest || dist < closest.dist ? { dist, elev: f.properties.elevation } : closest
            }, null)

            const normalized = nearest ? (nearest.elev - minElev) / (maxElev - minElev) : 0
            const i = (y * canvas.width + x) * 4

            let r, g, b
            if (normalized < 0.33) {
              const t = normalized / 0.33
              r = 0
              g = Math.round(100 + (255 - 100) * t)
              b = Math.round(200 + (255 - 200) * t)
            } else if (normalized < 0.66) {
              const t = (normalized - 0.33) / 0.33
              r = Math.round(255 * t)
              g = 255
              b = Math.round(255 * (1 - t))
            } else {
              const t = (normalized - 0.66) / 0.34
              r = 255
              g = Math.round(255 * (1 - t))
              b = 0
            }

            data[i] = r
            data[i + 1] = g
            data[i + 2] = b
            data[i + 3] = 255
          }
        }

        ctx.putImageData(imageData, 0, 0)

        const bounds = [
          [mapBounds.getSouth(), mapBounds.getWest()],
          [mapBounds.getNorth(), mapBounds.getEast()]
        ] as any

        elevationLayerRef.current = L.imageOverlay(canvas.toDataURL(), bounds, {
          opacity: 0.5,
          interactive: false,
          pane: PANES.elevation
        }).addTo(mapInstanceRef.current)
      } catch (err) {
        console.error('❌ Error adding elevation layer:', err)
      }
    }

    addElevationLayer()
  }, [elevationData, layerSettings?.enabledLayers, isMapReady])

  // Temperature Projection Layer (unchanged logic)
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return

    if (!layerSettings?.enabledLayers?.includes('temperature_projection')) {
      if (tempProjectionLayerRef.current) {
        mapInstanceRef.current.removeLayer(tempProjectionLayerRef.current)
        tempProjectionLayerRef.current = null
      }
      return
    }

    if (!tempProjectionData) {
      console.log('⏳ Waiting for temperature projection data...')
      return
    }

    const addTempProjectionLayer = async () => {
      try {
        const L: any = await loadLeaflet()

        const circles = tempProjectionData.features.map((feature: any) => {
          const coords = feature.geometry.coordinates
          const tempAnomaly = feature.properties.tempAnomaly || feature.properties.temperature_anomaly || 0

          let color
          if (tempAnomaly < 1) color = '#3b82f6'
          else if (tempAnomaly < 2) color = '#eab308'
          else if (tempAnomaly < 3) color = '#f97316'
          else color = '#ef4444'

          return L.circle([coords[1], coords[0]], {
            radius: 5000,
            fillColor: color,
            fillOpacity: 0.4,
            color: color,
            weight: 1,
            pane: PANES.temperature_projection,
            interactive: false
          })
        })

        const layerGroup = L.layerGroup(circles)
        layerGroup.addTo(mapInstanceRef.current)
        tempProjectionLayerRef.current = layerGroup
      } catch (err) {
        console.error('❌ Error adding temp projection layer:', err)
      }
    }

    addTempProjectionLayer()
  }, [tempProjectionData, layerSettings?.enabledLayers, isMapReady])

  return (
    <div className={`relative h-full ${className}`}>
      {/* Smooth raster hint for browsers (no styled-jsx in Vite) */}
      <style>{`
        .gibs-smooth-raster {
          image-rendering: auto !important; /* prefer bilinear/cubic over nearest */
        }
      `}</style>

      <div className="absolute bottom-4 left-2 z-[2000] bg-black/80 text-white p-2 text-xs rounded">
        <div>Map Ready: {isMapReady ? '✅' : '❌'}</div>
        <div>Sea Level: {seaLevelLayerRef.current ? '✅' : '❌'}</div>
        <div>Elevation: {elevationLayerRef.current ? '✅' : '❌'}</div>
        <div>Temp Proj: {tempProjectionLayerRef.current ? '✅' : '❌'}</div>
        <div>Temperature: {temperatureLayerRef.current ? '✅' : '❌'}</div>
        <div>Urban Heat: {urbanHeatLayerRef.current ? '✅' : '❌'}</div>
        <div>Enabled: {layerSettings?.enabledLayers?.join(', ') || 'none'}</div>
      </div>

      <div
        ref={mapRef}
        className="absolute inset-0"
        style={{
          backgroundColor: '#f3f4f6',
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          zIndex: 0
        }}
      />

      {isLoading && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none" style={{ zIndex: 10 }}>
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading map...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center pointer-events-auto" style={{ zIndex: 10 }}>
          <div className="text-white text-center bg-red-900/70 px-4 py-3 rounded">
            <p className="text-red-300 mb-2">Map Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
