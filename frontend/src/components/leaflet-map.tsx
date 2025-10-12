// ENHANCED VERSION - Hot colors for UHI + Dark map + Better Future Temperature

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
    urbanHeatIntensity?: number
    tempProjectionOpacity?: number
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
  resizeSignal
}: LeafletMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [uhiLoadingState, setUhiLoadingState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

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
    createIfMissing(PANES.temperature_projection, '455', 'screen')
    createIfMissing(PANES.temperature, '460', 'screen')
    createIfMissing(PANES.urban_heat_island, '465', 'normal')
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

        // Dark basemap for better heat visualization
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(leafletMap)

        L.marker(center as any).addTo(leafletMap).bindPopup(locationName)

        if (isComponentMounted) {
          mapInstanceRef.current = leafletMap
          setIsLoading(false)
          setIsMapReady(true)
          console.log('✅ Map initialized and ready')
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
          console.log('✅ Sea level layer added')
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
        console.log('✅ Temperature layer added')
      } catch (err) {
        console.error('❌ Error adding temperature layer:', err)
      }
    }

    addTemperatureLayer()
  }, [temperatureData, layerSettings?.enabledLayers, layerSettings?.temperatureThreshold, (layerSettings as any)?.temperatureOpacity, isMapReady])

  // ✅ Urban Heat Island - Using backend API with proper red=hot heatmap
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return

    if (!layerSettings?.enabledLayers?.includes('urban_heat_island')) {
      if (urbanHeatLayerRef.current) {
        mapInstanceRef.current.removeLayer(urbanHeatLayerRef.current)
        urbanHeatLayerRef.current = null
        setUhiLoadingState('idle')
      }
      return
    }

    const addUrbanHeatLayer = async () => {
      try {
        setUhiLoadingState('loading')
        console.log('🌡️ Loading Urban Heat Island layer from backend API...')

        const L: any = await loadLeaflet()
        await import('leaflet.heat')
        const LeafletWithHeat = (window as any).L || L

        if (!LeafletWithHeat.heatLayer) {
          console.error('❌ leaflet.heat not loaded')
          setUhiLoadingState('error')
          return
        }

        if (urbanHeatLayerRef.current) {
          mapInstanceRef.current.removeLayer(urbanHeatLayerRef.current)
          urbanHeatLayerRef.current = null
        }

        ensurePanes(L)

        // Fetch data from backend API
        const bounds = location?.bounds
        if (!bounds) {
          console.error('No bounds available')
          setUhiLoadingState('error')
          return
        }

        const response = await fetch(
          `http://localhost:3001/api/modis/lst?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&resolution=0.02`
        )
        const result = await response.json()

        if (!result.success || !result.data?.features) {
          console.warn('⚠️ No UHI data from backend')
          setUhiLoadingState('error')
          return
        }

        console.log(`✅ Received ${result.data.features.length} temperature points`)

        // Convert temperature data to heatmap points [lat, lng, intensity]
        const heatPoints = result.data.features.map((feature: any) => {
          const [lon, lat] = feature.geometry.coordinates
          const temp = feature.properties.lst || feature.properties.temperature || 20

          // Map temperature to intensity (0-1)
          // Typical LST range: 15°C (cool) to 35°C (hot)
          const intensity = Math.min(1.0, Math.max(0.0, (temp - 15) / 20))

          return [lat, lon, intensity]
        })

        if (heatPoints.length === 0) {
          console.warn('⚠️ No heat points to display')
          setUhiLoadingState('error')
          return
        }

        const uhiOpacity = layerSettings?.urbanHeatOpacity ?? 0.7
        const uhiIntensity = layerSettings?.urbanHeatIntensity ?? 0.5

        // Create heatmap with proper red=hot, blue=cold gradient
        urbanHeatLayerRef.current = LeafletWithHeat.heatLayer(heatPoints, {
          radius: 35 + (uhiIntensity * 25), // 35-60 pixels
          blur: 45 + (uhiIntensity * 35), // 45-80 pixels
          maxZoom: 18,
          max: 1.0,
          minOpacity: uhiOpacity * 0.3,
          pane: PANES.urban_heat_island,
          gradient: {
            0.0: '#0571b0',    // dark blue - very cold
            0.2: '#92c5de',    // light blue - cold
            0.4: '#f7f7f7',    // white - moderate
            0.6: '#fdb863',    // light orange - warm
            0.8: '#e08214',    // orange - hot
            1.0: '#b30000'     // dark red - very hot
          }
        }).addTo(mapInstanceRef.current)

        urbanHeatLayerRef.current.setOpacity(uhiOpacity)
        setUhiLoadingState('loaded')
        console.log('✅ UHI heatmap layer added with proper red=hot colors')

      } catch (err) {
        console.error('❌ Error adding Urban Heat Island layer:', err)
        setUhiLoadingState('error')
      }
    }

    addUrbanHeatLayer()
  }, [
    layerSettings?.enabledLayers,
    layerSettings?.urbanHeatOpacity,
    layerSettings?.urbanHeatIntensity,
    isMapReady,
    location
  ])

  // Elevation Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return

    if (!layerSettings?.enabledLayers?.includes('elevation')) {
      if (elevationLayerRef.current) {
        mapInstanceRef.current.removeLayer(elevationLayerRef.current)
        elevationLayerRef.current = null
      }
      return
    }

    if (!elevationData) return

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
        console.log('✅ Elevation layer added')
      } catch (err) {
        console.error('❌ Error adding elevation layer:', err)
      }
    }

    addElevationLayer()
  }, [elevationData, layerSettings?.enabledLayers, isMapReady])

  // ✅✅ Temperature Projection - Enhanced with heatmap style
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return

    if (!layerSettings?.enabledLayers?.includes('temperature_projection')) {
      if (tempProjectionLayerRef.current) {
        mapInstanceRef.current.removeLayer(tempProjectionLayerRef.current)
        tempProjectionLayerRef.current = null
      }
      return
    }

    if (!tempProjectionData) return

    const addTempProjectionLayer = async () => {
      try {
        console.log('🌡️ Adding temperature projection heatmap...')
        
        if (tempProjectionLayerRef.current) {
          mapInstanceRef.current.removeLayer(tempProjectionLayerRef.current)
          tempProjectionLayerRef.current = null
        }

        const L: any = await loadLeaflet()
        await import('leaflet.heat')
        const LeafletWithHeat = (window as any).L || L

        if (!LeafletWithHeat.heatLayer) {
          console.error('❌ leaflet.heat not loaded')
          return
        }

        const bounds = mapInstanceRef.current.getBounds()

        // Convert projection data to heatmap points
        const heatPoints = tempProjectionData.features
          .filter((f: any) => {
            const coords = f.geometry?.coordinates
            if (!coords || coords.length < 2) return false
            const [lon, lat] = coords
            return bounds.contains([lat, lon])
          })
          .map((f: any) => {
            const [lon, lat] = f.geometry.coordinates
            const tempAnomaly = f.properties.tempAnomaly || f.properties.temperature_anomaly || 0
            
            // Map temperature anomaly to intensity (0-1)
            // Assume range: 0°C to 5°C anomaly
            const intensity = Math.min(1.0, Math.max(0.0, tempAnomaly / 5.0))
            
            return [lat, lon, intensity]
          })

        if (heatPoints.length === 0) {
          console.warn('⚠️ No temperature projection points in view')
          return
        }

        console.log(`✅ Creating temp projection heatmap with ${heatPoints.length} points`)

        // Get opacity from settings (comes as 0-1 from layer panel)
        const projOpacity = (layerSettings as any)?.tempProjectionOpacity ?? 0.6

        tempProjectionLayerRef.current = LeafletWithHeat.heatLayer(heatPoints, {
          radius: 50,
          blur: 70,
          maxZoom: 18,
          max: 0.8,  // Lower max to make colors more visible
          minOpacity: 0.4,  // Higher minOpacity for visibility
          pane: PANES.temperature_projection,
          gradient: {
            0.0: '#0571b0',    // dark blue - low warming
            0.25: '#92c5de',   // light blue
            0.4: '#ffffbf',    // pale yellow - moderate
            0.6: '#fc8d59',    // orange - high
            0.8: '#d7301f',    // red - very high
            1.0: '#7f0000'     // dark red - extreme
          }
        }).addTo(mapInstanceRef.current)

        // Set the layer opacity
        tempProjectionLayerRef.current.setOpacity(projOpacity)
        console.log(`✅ Temperature projection heatmap added with opacity ${projOpacity}`)
      } catch (err) {
        console.error('❌ Error adding temp projection layer:', err)
      }
    }

    addTempProjectionLayer()
  }, [tempProjectionData, layerSettings?.enabledLayers, (layerSettings as any)?.tempProjectionOpacity, isMapReady])

  return (
    <div className={`relative h-full ${className}`}>
      <style>{`
        .uhi-heat-layer {
          image-rendering: auto !important;
        }
      `}</style>

      {/* Debug Panel */}
      <div className="absolute bottom-4 left-2 z-[2000] bg-black/80 text-white px-3 py-2.5 text-xs rounded space-y-1">
        <div>Map: {isMapReady ? '✅' : '⏳'}</div>
        <div>Sea Level: {seaLevelLayerRef.current ? '✅' : '❌'}</div>
        <div>Elevation: {elevationLayerRef.current ? '✅' : '❌'}</div>
        <div>Temp Proj: {tempProjectionLayerRef.current ? '✅' : '❌'}</div>
        <div>Temperature: {temperatureLayerRef.current ? '✅' : '❌'}</div>
        <div className={`${uhiLoadingState === 'loading' ? 'text-yellow-400' : uhiLoadingState === 'loaded' ? 'text-green-400' : ''}`}>
          Urban Heat: {
            uhiLoadingState === 'idle' ? '❌' :
            uhiLoadingState === 'loading' ? '⏳ Loading...' :
            uhiLoadingState === 'loaded' ? '✅' : '⚠️ Error'
          }
        </div>
        {layerSettings?.urbanHeatOpacity !== undefined && (
          <div className="text-yellow-400">UHI Opacity: {Math.round((layerSettings.urbanHeatOpacity ?? 0) * 100)}%</div>
        )}
        {layerSettings?.urbanHeatIntensity !== undefined && (
          <div className="text-orange-400">UHI Intensity: {Math.round((layerSettings.urbanHeatIntensity ?? 0) * 100)}%</div>
        )}
      </div>

      <div
        ref={mapRef}
        className="absolute inset-0"
        style={{
          backgroundColor: '#1a1a1a',
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
