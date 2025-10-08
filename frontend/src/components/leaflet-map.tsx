"use client"

import { useEffect, useRef, useState } from "react"
// Defer Leaflet import to runtime with explicit ESM build to avoid Vite export mismatches
// We'll dynamically import inside useEffect

interface LeafletMapProps {
  className?: string
  climateData?: any
  seaLevelRiseData?: any
  elevationData?: any
  temperatureData?: any
  urbanHeatData?: any
  seaLevelFeet?: number
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
    enabledLayers?: string[]
    elevationOpacity?: number
  }
}

export function LeafletMap({ className, seaLevelRiseData, elevationData, temperatureData, urbanHeatData, layerSettings, seaLevelFeet = 2 }: LeafletMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const mapInstanceRef = useRef<any>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const geoJsonLayerRef = useRef<any>(null)
  const climateLayerRef = useRef<any>(null)
  const elevationLayerRef = useRef<any>(null)
  const lastOpacityRef = useRef<number>(0.2)

  // Debug: Log props changes
  useEffect(() => {
    console.log('🗺️ LeafletMap props updated:', {
      selectedDataset: layerSettings?.selectedDataset,
      hasTemperatureData: !!temperatureData,
      hasUrbanHeatData: !!urbanHeatData,
      hasSeaLevelData: !!seaLevelRiseData,
      hasElevationData: !!elevationData,
      seaLevelFeet,
      enabledLayers: layerSettings?.enabledLayers
    });
  }, [layerSettings, temperatureData, urbanHeatData, seaLevelRiseData, elevationData, seaLevelFeet]);

  // Track when component is mounted and ref is ready
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) {
      return
    }

    let isComponentMounted = true
    let timeoutId: NodeJS.Timeout

    const initMap = async () => {
      try {
        // Wait for container to be available
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

        // Dynamically import Leaflet ESM build
        const L = await import('leaflet/dist/leaflet-src.esm.js')

        // Create map with interaction handlers
        const leafletMap = L.map(mapRef.current as any, {
          center: [40.7589, -73.9851], // Nassau County
          zoom: 10,
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

        // Add dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(leafletMap)

        // Add a simple marker to test
        L.marker([40.7589, -73.9851]).addTo(leafletMap)
          .bindPopup('Nassau County, NY')

        if (isComponentMounted) {
          mapInstanceRef.current = leafletMap
          setIsLoading(false)
        }

      } catch (err) {
        console.error('Map initialization error:', err)
        if (isComponentMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load map')
          setIsLoading(false)
        }
      }
    }

    // Start initialization immediately
    initMap()

    return () => {
      isComponentMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isMounted])

  // Handle sea level rise data overlay using NOAA tile service
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const addSeaLevelLayer = async () => {
      try {
        const L = await import('leaflet/dist/leaflet-src.esm.js')

        // Remove existing layer if present
        if (geoJsonLayerRef.current) {
          mapInstanceRef.current.removeLayer(geoJsonLayerRef.current)
          geoJsonLayerRef.current = null
        }

        // Add NOAA tile layer if sea level rise is selected
        if (layerSettings?.selectedDataset === 'sea_level_rise') {
          const opacity = layerSettings?.seaLevelOpacity ?? 0.6

          console.log(`Loading NOAA tiles for ${seaLevelFeet}ft`)

          // Use NOAA's cached tile service directly (works for all feet values)
          // Add cache buster to force reload
          const tileLayer = L.tileLayer(
            `https://www.coast.noaa.gov/arcgis/rest/services/dc_slr/slr_${seaLevelFeet}ft/MapServer/tile/{z}/{y}/{x}?v=${Date.now()}`,
            {
              opacity: opacity,
              attribution: '© NOAA Office for Coastal Management',
              className: 'noaa-sea-level-layer',
              maxZoom: 16,  // Tiles cached down to level 16
              updateWhenZooming: false,
              updateWhenIdle: true,
              keepBuffer: 2
            }
          )

          geoJsonLayerRef.current = tileLayer.addTo(mapInstanceRef.current)

          // Apply color adjustment and border effect using CSS filters
          const showBorder = layerSettings?.showBorder ?? true
          const borderColor = layerSettings?.borderColor ?? 'cyan'
          const borderWidth = layerSettings?.borderWidth ?? 1

          setTimeout(() => {
            const pane = mapInstanceRef.current.getPane('tilePane')
            const layers = pane?.querySelectorAll('.noaa-sea-level-layer')
            layers?.forEach((layer: any) => {
              // Color adjustment: shift bright blue to #123B5F
              // brightness(0.6) - darken, saturate(0.7) - less saturated, hue-rotate(5deg) - slight hue shift
              let filters = 'brightness(0.6) saturate(0.7) hue-rotate(5deg)'

              // Add border effect if enabled
              if (showBorder) {
                const colorMap: any = {
                  'cyan': '0, 255, 255',
                  'white': '255, 255, 255',
                  'black': '0, 0, 0',
                  'yellow': '255, 255, 0',
                  'red': '255, 0, 0'
                }
                const rgb = colorMap[borderColor] || '0, 255, 255'
                filters += ` drop-shadow(0 0 ${borderWidth}px rgba(${rgb}, 0.8)) drop-shadow(0 0 ${borderWidth}px rgba(${rgb}, 0.8))`
              }

              layer.style.filter = filters
            })
          }, 100)
        }
      } catch (err) {
        console.error('Error adding sea level rise layer:', err)
      }
    }

    addSeaLevelLayer()
  }, [seaLevelFeet, layerSettings?.seaLevelOpacity, layerSettings?.selectedDataset, layerSettings?.displayStyle, layerSettings?.showBorder, layerSettings?.borderColor, layerSettings?.borderWidth])

  // Add temperature layer when data changes
  useEffect(() => {
    console.log('🌡️ Temperature effect triggered', {
      hasMap: !!mapInstanceRef.current,
      hasData: !!temperatureData,
      dataFeatures: temperatureData?.features?.length,
      selectedDataset: layerSettings?.selectedDataset
    })

    if (!mapInstanceRef.current) {
      console.log('❌ No map instance for temperature')
      return
    }

    // Clean up if switching away from temperature
    if (!temperatureData || layerSettings?.selectedDataset !== 'temperature') {
      console.log('🧹 Cleaning up temperature layer')
      if (geoJsonLayerRef.current) {
        mapInstanceRef.current.removeLayer(geoJsonLayerRef.current)
        geoJsonLayerRef.current = null
      }
      return
    }

    const addTemperatureLayer = async () => {
      try {
        console.log('🌡️ Starting to add temperature heatmap...')

        // Remove existing temperature layer
        if (geoJsonLayerRef.current) {
          console.log('Removing existing layer')
          mapInstanceRef.current.removeLayer(geoJsonLayerRef.current)
          geoJsonLayerRef.current = null
        }

        const L = (await import('leaflet')).default
        console.log('✅ Leaflet loaded')

        const leafletHeat = (await import('leaflet.heat')).default
        console.log('✅ Leaflet.heat loaded')

        // Get map bounds to filter points
        const bounds = mapInstanceRef.current.getBounds()
        const southWest = bounds.getSouthWest()
        const northEast = bounds.getNorthEast()

        // Add buffer around visible area (20 degrees in each direction)
        const buffer = 20
        const minLat = Math.max(-90, southWest.lat - buffer)
        const maxLat = Math.min(90, northEast.lat + buffer)
        const minLng = Math.max(-180, southWest.lng - buffer)
        const maxLng = Math.min(180, northEast.lng + buffer)

        console.log('Map bounds:', { minLat, maxLat, minLng, maxLng })

        // Extract points from temperature data for heatmap
        const heatPoints = temperatureData.features
          .filter((feature: any) => {
            const coords = feature.geometry?.coordinates
            // Ensure coordinates exist and are valid numbers
            if (!coords || coords.length < 2) return false
            const lon = coords[0]
            const lat = coords[1]

            return typeof lon === 'number' &&
                   typeof lat === 'number' &&
                   !isNaN(lon) &&
                   !isNaN(lat) &&
                   lat >= minLat && lat <= maxLat &&
                   lon >= minLng && lon <= maxLng
          })
          .map((feature: any) => {
            const coords = feature.geometry.coordinates
            const anomaly = feature.properties.anomaly || 0
            // Normalize intensity (0.5-2.5°C range -> 0.0-1.0)
            const intensity = Math.min(1.0, Math.max(0.0, (anomaly - 0.5) / 2.0))
            // Return [lat, lon, intensity] format that leaflet.heat expects
            return [coords[1], coords[0], intensity]
          })

        console.log(`📊 Processing ${heatPoints.length} heat points (filtered from ${temperatureData.features.length})`)
        if (heatPoints.length > 0) {
          console.log('Sample point:', heatPoints[0])
        }

        if (heatPoints.length === 0) {
          console.warn('⚠️ No temperature points in visible area')
          return
        }

        // Create heatmap layer with finer, smoother appearance
        geoJsonLayerRef.current = (L as any).heatLayer(heatPoints, {
          radius: 25,        // Larger radius for smoother appearance
          blur: 35,          // More blur for smooth gradients
          maxZoom: 18,       // Works at all zoom levels
          max: 1.0,
          minOpacity: 0.5,
          gradient: {
            0.0: '#053061',   // Deep navy blue (coldest)
            0.15: '#2166ac',  // Blue
            0.3: '#4393c3',   // Light blue
            0.45: '#92c5de',  // Pale blue
            0.55: '#fddbc7',  // Pale orange
            0.7: '#f4a582',   // Light red-orange
            0.85: '#d6604d',  // Medium red
            1.0: '#67001f'    // Deep maroon (hottest)
          }
        }).addTo(mapInstanceRef.current)

        console.log('✅ Temperature heatmap added to map')
      } catch (err) {
        console.error('❌ Error adding temperature layer:', err)
      }
    }

    addTemperatureLayer()
  }, [temperatureData, layerSettings?.selectedDataset])

  // Update Urban Heat Island opacity only (separate from layer creation to prevent re-rendering)
  useEffect(() => {
    if (!mapInstanceRef.current || !geoJsonLayerRef.current) return
    if (layerSettings?.selectedDataset !== 'urban_heat_island') return

    const newOpacity = layerSettings?.urbanHeatOpacity || 0.2

    // Only update if opacity actually changed
    if (Math.abs(newOpacity - lastOpacityRef.current) > 0.001) {
      console.log('🎨 Updating Urban Heat Island opacity:', newOpacity)
      geoJsonLayerRef.current.setOpacity(newOpacity)
      lastOpacityRef.current = newOpacity
    }
  }, [layerSettings?.urbanHeatOpacity, layerSettings?.selectedDataset])

  // Add Urban Heat Island layer - REAL NASA MODIS LST data
  useEffect(() => {
    console.log('🔍 Urban Heat Island effect triggered', {
      hasMap: !!mapInstanceRef.current,
      hasUrbanHeatData: !!urbanHeatData,
      selectedDataset: layerSettings?.selectedDataset,
      shouldShow: layerSettings?.selectedDataset === 'urban_heat_island'
    })

    if (!mapInstanceRef.current) {
      console.log('❌ No map instance')
      return
    }

    // Remove existing layer when switching away from urban heat island
    if (layerSettings?.selectedDataset !== 'urban_heat_island') {
      console.log('🧹 Not urban heat island dataset, cleaning up if needed')
      if (geoJsonLayerRef.current) {
        mapInstanceRef.current.removeLayer(geoJsonLayerRef.current)
        geoJsonLayerRef.current = null
      }
      // Remove map move listener
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('moveend')
      }
      return
    }

    // Need urbanHeatData to proceed
    if (!urbanHeatData) {
      console.log('⏳ Waiting for Urban Heat Island data...')
      console.log('Current urbanHeatData:', urbanHeatData)
      return
    }

    console.log('✅ Urban Heat Island data available:', {
      features: urbanHeatData.features?.length,
      source: urbanHeatData.properties?.source,
      dataType: urbanHeatData.properties?.data_type
    })

    const createHeatPatternFromRealData = (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      mapBounds: { south: number; west: number; north: number; east: number }
    ) => {
      // Create heat pattern from REAL NASA MODIS LST data
      console.log('🛰️ Rendering REAL NASA MODIS LST data...')

      const width = canvas.width
      const height = canvas.height
      const imageData = ctx.createImageData(width, height)
      const data = imageData.data

      // Get LST values from real data
      const lstValues = urbanHeatData.features.map((f: any) => f.properties.lst)
      const minLST = Math.min(...lstValues)
      const maxLST = Math.max(...lstValues)
      const refTemp = urbanHeatData.properties?.reference_temp || 25

      console.log(`📊 LST range: ${minLST.toFixed(1)}°C - ${maxLST.toFixed(1)}°C (ref: ${refTemp.toFixed(1)}°C)`)

      // Create spatial index of LST points for faster lookup
      const lstGrid: { [key: string]: number } = {}
      urbanHeatData.features.forEach((feature: any) => {
        const [lon, lat] = feature.geometry.coordinates
        const lstVal = feature.properties.lst
        const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
        lstGrid[key] = lstVal
      })

      // Render heat pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4

          // Convert pixel coordinates to lat/lon
          const lat = mapBounds.north - (y / height) * (mapBounds.north - mapBounds.south)
          const lon = mapBounds.west + (x / width) * (mapBounds.east - mapBounds.west)

          // Find nearest LST value
          const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
          let lstValue = lstGrid[key]

          // If no exact match, interpolate from nearby points
          if (!lstValue) {
            const nearby = urbanHeatData.features
              .map((f: any) => {
                const [flon, flat] = f.geometry.coordinates
                const dist = Math.sqrt(Math.pow(flat - lat, 2) + Math.pow(flon - lon, 2))
                return { dist, lst: f.properties.lst }
              })
              .sort((a: any, b: any) => a.dist - b.dist)
              .slice(0, 4) // Use 4 nearest points

            if (nearby.length > 0) {
              // Weighted average based on distance
              const totalWeight = nearby.reduce((sum: number, p: any) => sum + (1 / (p.dist + 0.001)), 0)
              lstValue = nearby.reduce((sum: number, p: any) =>
                sum + p.lst * (1 / (p.dist + 0.001)), 0) / totalWeight
            } else {
              lstValue = refTemp // Fallback to reference temperature
            }
          }

          // Normalize temperature to 0-1
          const temp = (lstValue - minLST) / (maxLST - minLST)

          // Color gradient: blue (cool) -> cyan -> yellow -> orange -> red (hot)
          let r, g, b
          if (temp < 0.2) {
            const t = temp / 0.2
            r = 33 + (146 - 33) * t
            g = 102 + (197 - 102) * t
            b = 172 + (222 - 172) * t
          } else if (temp < 0.4) {
            const t = (temp - 0.2) / 0.2
            r = 146 + (253 - 146) * t
            g = 197 + (219 - 197) * t
            b = 222 + (199 - 222) * t
          } else if (temp < 0.6) {
            const t = (temp - 0.4) / 0.2
            r = 253 + (255 - 253) * t
            g = 219 + (237 - 219) * t
            b = 199 + (160 - 199) * t
          } else if (temp < 0.8) {
            const t = (temp - 0.6) / 0.2
            r = 255 + (244 - 255) * t
            g = 237 + (165 - 237) * t
            b = 160 + (130 - 160) * t
          } else {
            const t = (temp - 0.8) / 0.2
            r = 244 + (178 - 244) * t
            g = 165 + (24 - 165) * t
            b = 130 + (43 - 130) * t
          }

          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
          data[i + 3] = 255
        }
      }

      ctx.putImageData(imageData, 0, 0)
      console.log('✅ REAL NASA MODIS LST data rendered to canvas')
    }

    const addUrbanHeatIslandLayer = async () => {
      try {
        console.log('🌡️ Starting to add Urban Heat Island layer with REAL NASA MODIS LST data...')

        // Remove existing layer
        if (geoJsonLayerRef.current) {
          console.log('Removing existing layer')
          mapInstanceRef.current.removeLayer(geoJsonLayerRef.current)
          geoJsonLayerRef.current = null
        }

        const L = (await import('leaflet')).default

        // Get current map bounds to cover entire visible area
        const mapBounds = mapInstanceRef.current.getBounds()
        const south = mapBounds.getSouth()
        const west = mapBounds.getWest()
        const north = mapBounds.getNorth()
        const east = mapBounds.getEast()

        console.log('Map bounds:', { south, west, north, east })

        // Create canvas with REAL MODIS LST data
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const ctx = canvas.getContext('2d')!

        // Render REAL NASA MODIS LST data to canvas
        createHeatPatternFromRealData(canvas, ctx, { south, west, north, east })

        // Convert canvas to image overlay using current map bounds
        const bounds = [
          [south, west],  // Southwest corner
          [north, east]   // Northeast corner
        ] as any

        const opacity = (layerSettings?.urbanHeatOpacity || 0.2)
        const imageOverlay = L.imageOverlay(canvas.toDataURL(), bounds, {
          opacity: opacity,
          interactive: false,
          className: 'urban-heat-overlay'
        })

        geoJsonLayerRef.current = imageOverlay.addTo(mapInstanceRef.current)

        console.log('✅ Urban Heat Island overlay added with opacity:', opacity)
        console.log(`🛰️ Data source: ${urbanHeatData.properties.source}`)
        console.log(`📊 Data type: ${urbanHeatData.properties.data_type}`)
      } catch (err) {
        console.error('Error adding Urban Heat Island layer:', err)
      }
    }

    // Initial layer render
    addUrbanHeatIslandLayer()

    // Update layer when map is panned or zoomed (with debounce to prevent getting stuck)
    let updateTimeout: NodeJS.Timeout | null = null

    const handleMapMove = () => {
      if (layerSettings?.selectedDataset === 'urban_heat_island') {
        // Clear previous timeout
        if (updateTimeout) {
          clearTimeout(updateTimeout)
        }

        // Debounce: only update after user stops moving for 300ms
        updateTimeout = setTimeout(() => {
          console.log('🗺️ Map movement ended, updating heat island layer...')
          addUrbanHeatIslandLayer()
        }, 300)
      }
    }

    mapInstanceRef.current.on('moveend', handleMapMove)

    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('moveend', handleMapMove)
      }
    }
  }, [layerSettings?.selectedDataset, urbanHeatData])  // Re-render when data changes

  // Add Elevation layer from USGS 3DEP data
  useEffect(() => {
    console.log('🏔️ ==== ELEVATION EFFECT TRIGGERED ====', {
      hasMap: !!mapInstanceRef.current,
      hasData: !!elevationData,
      dataFeatures: elevationData?.features?.length,
      enabledLayers: layerSettings?.enabledLayers,
      isEnabled: layerSettings?.enabledLayers?.includes('elevation'),
      elevationDataSample: elevationData?.features?.[0]
    })

    if (!mapInstanceRef.current) {
      console.log('❌ No map instance for elevation')
      return
    }

    // Remove existing elevation layer when disabled
    if (!layerSettings?.enabledLayers?.includes('elevation')) {
      if (elevationLayerRef.current) {
        console.log('🗑️ Removing elevation layer (disabled)')
        mapInstanceRef.current.removeLayer(elevationLayerRef.current)
        elevationLayerRef.current = null
      }
      return
    }

    // Need elevationData to proceed
    if (!elevationData || !elevationData.features || elevationData.features.length === 0) {
      console.log('⏳ Waiting for elevation data...')
      return
    }

    console.log('✅ Elevation data available:', {
      features: elevationData.features.length,
      bbox: elevationData.bbox
    })

    const addElevationLayer = async () => {
      try {
        console.log('🏔️ Starting to add elevation layer...')

        // Remove existing layer
        if (elevationLayerRef.current) {
          console.log('Removing existing elevation layer')
          mapInstanceRef.current.removeLayer(elevationLayerRef.current)
          elevationLayerRef.current = null
        }

        // Import Leaflet
        const leafletModule = await import('leaflet')
        const L = leafletModule.default
        console.log('✅ Leaflet loaded for elevation:', !!L)
        console.log('Has imageOverlay?', typeof L?.imageOverlay)

        if (!L || !L.imageOverlay) {
          console.error('❌ Leaflet or imageOverlay not available')
          return
        }

        // Calculate bounds from features if bbox not present
        let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity

        if (elevationData.bbox && Array.isArray(elevationData.bbox) && elevationData.bbox.length === 4) {
          [west, south, east, north] = elevationData.bbox
        } else {
          // Calculate bounds from features
          elevationData.features.forEach((f: any) => {
            const [lon, lat] = f.geometry.coordinates
            west = Math.min(west, lon)
            east = Math.max(east, lon)
            south = Math.min(south, lat)
            north = Math.max(north, lat)
          })
        }

        const bounds: [[number, number], [number, number]] = [[south, west], [north, east]]
        console.log('📍 Elevation bounds:', { west, south, east, north })

        // Create canvas for elevation data
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          console.error('❌ Could not get canvas context')
          return
        }

        // Find min/max elevation for color scaling
        let minElev = Infinity
        let maxElev = -Infinity
        elevationData.features.forEach((f: any) => {
          const elev = f.properties.elevation
          if (elev !== null && elev !== undefined) {
            minElev = Math.min(minElev, elev)
            maxElev = Math.max(maxElev, elev)
          }
        })

        console.log('📊 Elevation range:', { minElev, maxElev })

        // Build grid
        const lats = new Set<number>()
        const lons = new Set<number>()
        elevationData.features.forEach((f: any) => {
          lats.add(f.geometry.coordinates[1])
          lons.add(f.geometry.coordinates[0])
        })
        const sortedLats = Array.from(lats).sort((a, b) => b - a)
        const sortedLons = Array.from(lons).sort((a, b) => a - b)

        const gridHeight = sortedLats.length
        const gridWidth = sortedLons.length

        canvas.width = gridWidth
        canvas.height = gridHeight

        const imageData = ctx.createImageData(gridWidth, gridHeight)
        const data = imageData.data

        // Create lookup map
        const elevationMap = new Map<string, number>()
        elevationData.features.forEach((f: any) => {
          const lat = f.geometry.coordinates[1]
          const lon = f.geometry.coordinates[0]
          const key = `${lat},${lon}`
          elevationMap.set(key, f.properties.elevation)
        })

        // Fill pixels with VIBRANT color gradient for dark maps
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            const lat = sortedLats[y]
            const lon = sortedLons[x]
            const key = `${lat},${lon}`
            const elevation = elevationMap.get(key)

            const i = (y * gridWidth + x) * 4

            if (elevation === null || elevation === undefined) {
              // Transparent for missing data
              data[i + 3] = 0
            } else {
              // Normalize elevation to 0-1 range
              const normalized = (elevation - minElev) / (maxElev - minElev)

              // Color gradient: VIBRANT for dark maps - deep blue (low) -> cyan -> yellow -> red (high)
              let r, g, b
              if (normalized < 0.33) {
                // Deep blue to cyan
                const t = normalized / 0.33
                r = Math.round(0 + (0 - 0) * t)
                g = Math.round(100 + (255 - 100) * t)
                b = Math.round(200 + (255 - 200) * t)
              } else if (normalized < 0.66) {
                // Cyan to yellow
                const t = (normalized - 0.33) / 0.33
                r = Math.round(0 + (255 - 0) * t)
                g = Math.round(255 + (255 - 255) * t)
                b = Math.round(255 + (0 - 255) * t)
              } else {
                // Yellow to red
                const t = (normalized - 0.66) / 0.34
                r = Math.round(255 + (255 - 255) * t)
                g = Math.round(255 + (0 - 255) * t)
                b = Math.round(0 + (0 - 0) * t)
              }

              data[i] = r
              data[i + 1] = g
              data[i + 2] = b
              data[i + 3] = 255
            }
          }
        }

        ctx.putImageData(imageData, 0, 0)
        console.log('✅ Elevation data rendered to canvas')

        const opacity = layerSettings?.elevationOpacity ?? 0.65
        const imageOverlay = L.imageOverlay(canvas.toDataURL(), bounds, {
          opacity: opacity,
          interactive: false,
          className: 'elevation-overlay'
        })

        elevationLayerRef.current = imageOverlay.addTo(mapInstanceRef.current)
        console.log('✅ Elevation overlay added with opacity:', opacity)
      } catch (err) {
        console.error('❌ Error adding elevation layer:', err)
      }
    }

    addElevationLayer()

    return () => {
      if (elevationLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(elevationLayerRef.current)
        elevationLayerRef.current = null
      }
    }
  }, [elevationData, layerSettings?.enabledLayers, layerSettings?.elevationOpacity])

  return (
    <div className={`relative h-full ${className}`}>
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