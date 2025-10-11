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
  }
}

export function LeafletMap({ className, location, seaLevelRiseData, temperatureData, urbanHeatData, elevationData, tempProjectionData, layerSettings, seaLevelFeet = 2, resizeSignal }: LeafletMapProps) {
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
  const lastOpacityRef = useRef<number>(0.2)

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
      if (!map.getPane(name)) {
        map.createPane(name)
      }
      const pane = map.getPane(name)
      if (pane) {
        pane.style.zIndex = zIndex
        pane.style.mixBlendMode = blendMode
      }
      return pane
    }

    createIfMissing(PANES.sea_level_rise, '450', 'normal')
    createIfMissing(PANES.elevation, '452', 'multiply')  // Changed z-index to not conflict
    createIfMissing(PANES.temperature, '460', 'screen')
    createIfMissing(PANES.urban_heat_island, '465', 'screen')
    createIfMissing(PANES.temperature_projection, '470', 'normal')
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !location) return
    console.log(`🗺️ Updating map view to: ${location.name}`)
    mapInstanceRef.current.setView([location.center.lat, location.center.lng], location.zoom)
  }, [location])

  useEffect(() => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.invalidateSize(true)
      } catch {}
    }
  }, [resizeSignal])

  useEffect(() => {
    if (!isMounted) return

    let isComponentMounted = true

    const initMap = async () => {
      try {
        let attempts = 0
        const maxAttempts = 50

        while (!mapRef.current && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 50))
          attempts++
        }

        if (!mapRef.current) {
          if (isComponentMounted) {
            setError("Map container not found after waiting")
          }
          return
        }

        const L: any = await loadLeaflet()

        const center = location ? [location.center.lat, location.center.lng] : [40.7589, -73.9851]
        const zoom = location?.zoom || 10
        const locationName = location?.name || 'Nassau County, NY'

        const leafletMap = L.map(mapRef.current as any, {
          center: center as any,
          zoom: zoom,
          zoomControl: true,
          attributionControl: true,
          dragging: true,
          touchZoom: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          inertia: true,
          worldCopyJump: false,
          zoomAnimation: true
        })

        ensurePanes(L)

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(leafletMap)

        L.marker(center as any).addTo(leafletMap)
          .bindPopup(locationName)

        if (isComponentMounted) {
          mapInstanceRef.current = leafletMap
          setIsLoading(false)
          setIsMapReady(true)
          console.log('✅ Map initialized and ready for layers')
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
          console.log(`✅ Loading NOAA tiles for ${seaLevelFeet}ft`)

          ensurePanes(L)

          const tileLayer = L.tileLayer(
            `https://www.coast.noaa.gov/arcgis/rest/services/dc_slr/slr_${seaLevelFeet}ft/MapServer/tile/{z}/{y}/{x}`,
            {
              opacity: opacity,
              attribution: '© NOAA',
              pane: PANES.sea_level_rise,
              maxZoom: 16
            }
          )

          seaLevelLayerRef.current = tileLayer.addTo(mapInstanceRef.current)
          console.log('✅ Sea level tile layer added')
        }
      } catch (err) {
        console.error('Error adding sea level rise layer:', err)
      }
    }

    addSeaLevelLayer()
  }, [seaLevelFeet, layerSettings?.seaLevelOpacity, layerSettings?.enabledLayers, isMapReady, location])

  // Temperature Layer - FIXED LEAFLET.HEAT ISSUE
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) {
      return
    }

    if (!layerSettings?.enabledLayers?.includes('temperature')) {
      if (temperatureLayerRef.current) {
        mapInstanceRef.current.removeLayer(temperatureLayerRef.current)
        temperatureLayerRef.current = null
      }
      return
    }

    if (!temperatureData) {
      console.log('⏳ Waiting for temperature data...')
      return
    }

    const addTemperatureLayer = async () => {
      try {
        console.log('🌡️ Adding temperature heatmap...')

        if (temperatureLayerRef.current) {
          mapInstanceRef.current.removeLayer(temperatureLayerRef.current)
          temperatureLayerRef.current = null
        }

        const L: any = await loadLeaflet()

        // FIX: Import leaflet.heat and attach to window.L BEFORE using
        await import('leaflet.heat')
        
        // Use window.L which leaflet.heat extends
        const LeafletWithHeat = (window as any).L || L

        if (!LeafletWithHeat.heatLayer) {
          console.error('❌ leaflet.heat not loaded properly')
          return
        }

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

        if (heatPoints.length === 0) {
          console.warn('⚠️ No temperature points in view')
          return
        }

        console.log(`✅ Creating heatmap with ${heatPoints.length} points`)

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

        console.log('✅ Temperature heatmap added successfully')
      } catch (err) {
        console.error('❌ Error adding temperature layer:', err)
      }
    }

    addTemperatureLayer()
  }, [temperatureData, layerSettings?.enabledLayers, layerSettings?.temperatureThreshold, (layerSettings as any)?.temperatureOpacity, isMapReady])

  // Urban Heat Island Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return

    if (!layerSettings?.enabledLayers?.includes('urban_heat_island')) {
      if (urbanHeatLayerRef.current) {
        mapInstanceRef.current.removeLayer(urbanHeatLayerRef.current)
        urbanHeatLayerRef.current = null
      }
      return
    }

    if (!urbanHeatData) {
      console.log('⏳ Waiting for urban heat data...')
      return
    }

    const addUrbanHeatLayer = async () => {
      try {
        console.log('🌡️ Adding Urban Heat Island layer...')

        if (urbanHeatLayerRef.current) {
          mapInstanceRef.current.removeLayer(urbanHeatLayerRef.current)
          urbanHeatLayerRef.current = null
        }

        const L: any = await loadLeaflet()
        const mapBounds = mapInstanceRef.current.getBounds()

        // Create heat pattern canvas
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const ctx = canvas.getContext('2d')!

        const lstValues = urbanHeatData.features.map((f: any) => f.properties.lst)
        const minLST = Math.min(...lstValues)
        const maxLST = Math.max(...lstValues)

        const imageData = ctx.createImageData(canvas.width, canvas.height)
        const data = imageData.data

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const lat = mapBounds.getNorth() - (y / canvas.height) * (mapBounds.getNorth() - mapBounds.getSouth())
            const lon = mapBounds.getWest() + (x / canvas.width) * (mapBounds.getEast() - mapBounds.getWest())

            // Find nearest LST point
            const nearest = urbanHeatData.features.reduce((closest: any, f: any) => {
              const [flon, flat] = f.geometry.coordinates
              const dist = Math.sqrt(Math.pow(flat - lat, 2) + Math.pow(flon - lon, 2))
              return !closest || dist < closest.dist ? { dist, lst: f.properties.lst } : closest
            }, null)

            const temp = nearest ? (nearest.lst - minLST) / (maxLST - minLST) : 0
            const i = (y * canvas.width + x) * 4

            // Color gradient
            let r, g, b
            if (temp < 0.5) {
              const t = temp / 0.5
              r = Math.round(33 + (253 - 33) * t)
              g = Math.round(102 + (219 - 102) * t)
              b = Math.round(172 + (199 - 172) * t)
            } else {
              const t = (temp - 0.5) / 0.5
              r = Math.round(253 + (178 - 253) * t)
              g = Math.round(219 + (24 - 219) * t)
              b = Math.round(199 + (43 - 199) * t)
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

        const opacity = layerSettings?.urbanHeatOpacity || 0.2

        urbanHeatLayerRef.current = L.imageOverlay(canvas.toDataURL(), bounds, {
          opacity: opacity,
          interactive: false,
          pane: PANES.urban_heat_island
        }).addTo(mapInstanceRef.current)

        console.log('✅ Urban Heat Island overlay added')
      } catch (err) {
        console.error('Error adding Urban Heat Island layer:', err)
      }
    }

    addUrbanHeatLayer()
  }, [layerSettings?.enabledLayers, urbanHeatData, layerSettings?.urbanHeatOpacity, isMapReady])

  // Elevation Layer - FIXED TO NOT INTERFERE WITH SEA LEVEL
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
        console.log('🏔️ Adding elevation layer...')

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

        console.log(`📊 Elevation range: ${minElev.toFixed(1)}m - ${maxElev.toFixed(1)}m`)

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

            // Color gradient
            let r, g, b
            if (normalized < 0.33) {
              const t = normalized / 0.33
              r = Math.round(0 + (0 - 0) * t)
              g = Math.round(100 + (255 - 100) * t)
              b = Math.round(200 + (255 - 200) * t)
            } else if (normalized < 0.66) {
              const t = (normalized - 0.33) / 0.33
              r = Math.round(0 + (255 - 0) * t)
              g = Math.round(255 + (255 - 255) * t)
              b = Math.round(255 + (0 - 255) * t)
            } else {
              const t = (normalized - 0.66) / 0.34
              r = 255
              g = Math.round(255 + (0 - 255) * t)
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
          opacity: 0.5,  // Reduced opacity to not interfere
          interactive: false,
          pane: PANES.elevation
        }).addTo(mapInstanceRef.current)

        console.log('✅ Elevation overlay added')
      } catch (err) {
        console.error('❌ Error adding elevation layer:', err)
      }
    }

    addElevationLayer()
  }, [elevationData, layerSettings?.enabledLayers, isMapReady])

  // Temperature Projection Layer - FIXED PROPERTY NAME
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
        console.log('🌡️ Adding temperature projection layer...')

        if (tempProjectionLayerRef.current) {
          mapInstanceRef.current.removeLayer(tempProjectionLayerRef.current)
          tempProjectionLayerRef.current = null
        }

        const L: any = await loadLeaflet()

        console.log('Sample projection feature:', tempProjectionData.features[0])

        const circles = tempProjectionData.features.map((feature: any) => {
          const coords = feature.geometry.coordinates
          // FIX: Use correct property name from backend
          const tempAnomaly = feature.properties.tempAnomaly || feature.properties.temperature_anomaly || 0

          console.log('Anomaly value:', tempAnomaly)

          // Color scale
          let color
          if (tempAnomaly < 1) {
            color = '#3b82f6' // blue
          } else if (tempAnomaly < 2) {
            color = '#eab308' // yellow
          } else if (tempAnomaly < 3) {
            color = '#f97316' // orange
          } else {
            color = '#ef4444' // red
          }

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

        console.log(`✅ Added ${circles.length} temperature projection circles`)
      } catch (err) {
        console.error('❌ Error adding temp projection layer:', err)
      }
    }

    addTempProjectionLayer()
  }, [tempProjectionData, layerSettings?.enabledLayers, isMapReady])

  return (
    <div className={`relative h-full ${className}`}>
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