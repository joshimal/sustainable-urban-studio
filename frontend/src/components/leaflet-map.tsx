"use client"

import { useEffect, useRef, useState } from "react"
// Defer Leaflet import to runtime with explicit ESM build to avoid Vite export mismatches
// We'll dynamically import inside useEffect

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
  }
}

export function LeafletMap({ className, location, seaLevelRiseData, temperatureData, urbanHeatData, elevationData, tempProjectionData, layerSettings, seaLevelFeet = 2 }: LeafletMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const mapInstanceRef = useRef<any>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const seaLevelLayerRef = useRef<any>(null)
  const temperatureLayerRef = useRef<any>(null)
  const urbanHeatLayerRef = useRef<any>(null)
  const elevationLayerRef = useRef<any>(null)
  const tempProjectionLayerRef = useRef<any>(null)
  const climateLayerRef = useRef<any>(null)
  const lastOpacityRef = useRef<number>(0.2)

  // Debug: Log props changes
  useEffect(() => {
    console.log('🗺️ LeafletMap props updated:', {
      selectedDataset: layerSettings?.selectedDataset,
      enabledLayers: layerSettings?.enabledLayers,
      hasTemperatureData: !!temperatureData,
      temperatureFeatures: temperatureData?.features?.length,
      hasUrbanHeatData: !!urbanHeatData,
      urbanHeatFeatures: urbanHeatData?.features?.length,
      hasSeaLevelData: !!seaLevelRiseData,
      seaLevelFeet
    });

    if (temperatureData) {
      console.log('📊 Temperature data details:', {
        features: temperatureData.features.length,
        source: temperatureData.properties?.source
      });
    }

    if (urbanHeatData) {
      console.log('📊 Urban heat data details:', {
        features: urbanHeatData.features.length,
        source: urbanHeatData.properties?.source,
        refTemp: urbanHeatData.properties?.reference_temp
      });
    }
  }, [layerSettings, temperatureData, urbanHeatData, seaLevelRiseData, seaLevelFeet]);

  // Track when component is mounted and ref is ready
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Update map view when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !location) return

    console.log(`🗺️ Updating map view to: ${location.name}`)
    mapInstanceRef.current.setView([location.center.lat, location.center.lng], location.zoom)
  }, [location])

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

        // Dynamically import a single Leaflet instance everywhere
        const L = (await import('leaflet')).default
        // Ensure plugins like leaflet.heat can attach to the same global L
        if (typeof window !== 'undefined') {
          ;(window as any).L = L
        }

        // Use location prop or default to Nassau County
        const center = location ? [location.center.lat, location.center.lng] : [40.7589, -73.9851]
        const zoom = location?.zoom || 10
        const locationName = location?.name || 'Nassau County, NY'

        // Create map with interaction handlers
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

        // Add dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(leafletMap)

        // Add a simple marker to test
        L.marker(center as any).addTo(leafletMap)
          .bindPopup(locationName)

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
    console.log('🌊 Sea level effect triggered:', {
      hasMap: !!mapInstanceRef.current,
      enabledLayers: layerSettings?.enabledLayers,
      isEnabled: layerSettings?.enabledLayers?.includes('sea_level_rise'),
      seaLevelFeet
    });

    if (!mapInstanceRef.current) {
      console.log('❌ No map instance for sea level');
      return;
    }

    const addSeaLevelLayer = async () => {
      try {
        const L = (await import('leaflet')).default

        // Remove existing sea level layer if present
        if (seaLevelLayerRef.current) {
          console.log('🧹 Removing existing sea level layer');
          mapInstanceRef.current.removeLayer(seaLevelLayerRef.current)
          seaLevelLayerRef.current = null
        }

        // Add NOAA tile layer if sea level rise is enabled
        if (layerSettings?.enabledLayers?.includes('sea_level_rise')) {
          const opacity = layerSettings?.seaLevelOpacity ?? 0.6

          console.log(`✅ Sea level rise is enabled! Loading NOAA tiles for ${seaLevelFeet}ft with opacity ${opacity}`)

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

          seaLevelLayerRef.current = tileLayer.addTo(mapInstanceRef.current)
          console.log('✅ Sea level tile layer added to map successfully');

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
      enabledLayers: layerSettings?.enabledLayers,
      isEnabled: layerSettings?.enabledLayers?.includes('temperature')
    })

    if (!mapInstanceRef.current) {
      console.log('❌ No map instance for temperature')
      return
    }

    // Clean up if switching away from temperature or no data
    if (!layerSettings?.enabledLayers?.includes('temperature')) {
      console.log('🧹 Temperature not enabled, cleaning up layer')
      if (temperatureLayerRef.current) {
        mapInstanceRef.current.removeLayer(temperatureLayerRef.current)
        temperatureLayerRef.current = null
      }
      return
    }

    if (!temperatureData) {
      console.log('⏳ Temperature enabled but waiting for data...')
      return
    }

    const addTemperatureLayer = async () => {
      try {
        console.log('🌡️ Starting to add temperature heatmap...')

        // Remove existing temperature layer
        if (temperatureLayerRef.current) {
          console.log('Removing existing layer')
          mapInstanceRef.current.removeLayer(temperatureLayerRef.current)
          temperatureLayerRef.current = null
        }

        // Import Leaflet first and expose on window for the plugin
        const leafletModule = await import('leaflet')
        const L = leafletModule.default
        if (typeof window !== 'undefined') {
          ;(window as any).L = L
        }
        // Now load the heat plugin so it augments the same L
        const heatModule = await import('leaflet.heat')

        console.log('✅ Leaflet loaded')
        console.log('✅ Leaflet.heat loaded')
        console.log('L.heatLayer available:', typeof (L as any).heatLayer)

        // If heatLayer still not available, try using the global L
        if (!(L as any).heatLayer && typeof window !== 'undefined' && (window as any).L) {
          console.log('⚠️ Using global L instead');
          const globalL = (window as any).L;
          console.log('Global L.heatLayer available:', typeof globalL.heatLayer);
        }

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

        // The heat module extends L directly, so use the imported L
        let heatLayerFn = (L as any).heatLayer;

        // If not available on imported L, check heat module export
        if (!heatLayerFn && heatModule) {
          console.log('Trying heatModule export:', Object.keys(heatModule));
          heatLayerFn = (heatModule as any).default || (heatModule as any).heatLayer;
        }

        // Last resort: use global L if available
        if (!heatLayerFn && typeof window !== 'undefined' && (window as any).L?.heatLayer) {
          console.log('⚠️ Using global L.heatLayer');
          heatLayerFn = (window as any).L.heatLayer;
        }

        if (!heatLayerFn) {
          console.error('❌ leaflet.heat plugin not loaded! heatLayer is not available');
          console.log('L keys:', Object.keys(L).slice(0, 20));
          console.log('heatModule:', heatModule);
          return;
        }

        console.log('✅ Creating temperature heatmap with', heatPoints.length, 'points');

        // Create heatmap layer with finer, smoother appearance
        temperatureLayerRef.current = heatLayerFn(heatPoints, {
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

        console.log('✅ Temperature heatmap added to map successfully');
        console.log('Temperature layer ref:', temperatureLayerRef.current);
        console.log('Layer on map:', mapInstanceRef.current.hasLayer(temperatureLayerRef.current))
      } catch (err) {
        console.error('❌ Error adding temperature layer:', err)
      }
    }

    addTemperatureLayer()
  }, [temperatureData, layerSettings?.enabledLayers])

  // Update Urban Heat Island opacity only (separate from layer creation to prevent re-rendering)
  useEffect(() => {
    if (!mapInstanceRef.current || !urbanHeatLayerRef.current) return
    if (!layerSettings?.enabledLayers?.includes('urban_heat_island')) return

    const newOpacity = layerSettings?.urbanHeatOpacity || 0.2

    // Only update if opacity actually changed
    if (Math.abs(newOpacity - lastOpacityRef.current) > 0.001) {
      console.log('🎨 Updating Urban Heat Island opacity:', newOpacity)
      urbanHeatLayerRef.current.setOpacity(newOpacity)
      lastOpacityRef.current = newOpacity
    }
  }, [layerSettings?.urbanHeatOpacity, layerSettings?.enabledLayers])

  // Add Urban Heat Island layer - REAL NASA MODIS LST data
  useEffect(() => {
    console.log('🔍 Urban Heat Island effect triggered', {
      hasMap: !!mapInstanceRef.current,
      hasUrbanHeatData: !!urbanHeatData,
      enabledLayers: layerSettings?.enabledLayers,
      shouldShow: layerSettings?.enabledLayers?.includes('urban_heat_island')
    })

    if (!mapInstanceRef.current) {
      console.log('❌ No map instance')
      return
    }

    // Remove existing layer when not enabled
    if (!layerSettings?.enabledLayers?.includes('urban_heat_island')) {
      console.log('🧹 Urban heat island not enabled, cleaning up if needed')
      if (urbanHeatLayerRef.current) {
        mapInstanceRef.current.removeLayer(urbanHeatLayerRef.current)
        urbanHeatLayerRef.current = null
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
        if (urbanHeatLayerRef.current) {
          console.log('Removing existing layer')
          mapInstanceRef.current.removeLayer(urbanHeatLayerRef.current)
          urbanHeatLayerRef.current = null
        }

        const L = (await import('leaflet')).default
        if (typeof window !== 'undefined') {
          ;(window as any).L = L
        }

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

        urbanHeatLayerRef.current = imageOverlay.addTo(mapInstanceRef.current)

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
  }, [layerSettings?.enabledLayers, urbanHeatData])  // Re-render when enabled or data changes

  // Add Elevation layer - translucent 30%
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

    // Clean up if not enabled
    if (!layerSettings?.enabledLayers?.includes('elevation')) {
      console.log('🧹 Elevation not enabled, cleaning up layer')
      if (elevationLayerRef.current) {
        mapInstanceRef.current.removeLayer(elevationLayerRef.current)
        elevationLayerRef.current = null
      }
      return
    }

    if (!elevationData) {
      console.log('⏳ Elevation enabled but waiting for data...')
      return
    }

    const addElevationLayer = async () => {
      try {
        console.log('🏔️ Starting to add elevation layer...')

        // Remove existing elevation layer
        if (elevationLayerRef.current) {
          console.log('Removing existing layer')
          mapInstanceRef.current.removeLayer(elevationLayerRef.current)
          elevationLayerRef.current = null
        }

        const L = (await import('leaflet')).default
        if (typeof window !== 'undefined') {
          ;(window as any).L = L
        }

        // Get current map bounds
        const mapBounds = mapInstanceRef.current.getBounds()
        const south = mapBounds.getSouth()
        const west = mapBounds.getWest()
        const north = mapBounds.getNorth()
        const east = mapBounds.getEast()

        console.log('Map bounds:', { south, west, north, east })

        // Create canvas for elevation heatmap
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const ctx = canvas.getContext('2d')!

        const width = canvas.width
        const height = canvas.height
        const imageData = ctx.createImageData(width, height)
        const data = imageData.data

        // Get elevation values
        const elevValues = elevationData.features.map((f: any) => f.properties.elevation)
        const minElev = Math.min(...elevValues)
        const maxElev = Math.max(...elevValues)

        console.log(`📊 Elevation range: ${minElev.toFixed(1)}m - ${maxElev.toFixed(1)}m`)

        // Create spatial index
        const elevGrid: { [key: string]: number } = {}
        elevationData.features.forEach((feature: any) => {
          const [lon, lat] = feature.geometry.coordinates
          const elev = feature.properties.elevation
          const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
          elevGrid[key] = elev
        })

        // Render elevation pattern
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4

            // Convert pixel to lat/lon
            const lat = north - (y / height) * (north - south)
            const lon = west + (x / width) * (east - west)

            // Find nearest elevation
            const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
            let elevValue = elevGrid[key]

            if (!elevValue) {
              const nearby = elevationData.features
                .map((f: any) => {
                  const [flon, flat] = f.geometry.coordinates
                  const dist = Math.sqrt(Math.pow(flat - lat, 2) + Math.pow(flon - lon, 2))
                  return { dist, elev: f.properties.elevation }
                })
                .sort((a: any, b: any) => a.dist - b.dist)
                .slice(0, 4)

              if (nearby.length > 0) {
                const totalWeight = nearby.reduce((sum: number, p: any) => sum + (1 / (p.dist + 0.001)), 0)
                elevValue = nearby.reduce((sum: number, p: any) =>
                  sum + p.elev * (1 / (p.dist + 0.001)), 0) / totalWeight
              } else {
                elevValue = minElev
              }
            }

            // Normalize elevation to 0-1
            const normalized = (elevValue - minElev) / (maxElev - minElev)

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

        ctx.putImageData(imageData, 0, 0)
        console.log('✅ Elevation data rendered to canvas')

        // Convert canvas to image overlay
        const bounds = [
          [south, west],
          [north, east]
        ] as any

        const imageOverlay = L.imageOverlay(canvas.toDataURL(), bounds, {
          opacity: 0.65,  // 65% opacity for better visibility on dark maps
          interactive: false,
          className: 'elevation-overlay'
        })

        elevationLayerRef.current = imageOverlay.addTo(mapInstanceRef.current)

        console.log('✅ Elevation overlay added with 65% opacity')
      } catch (err) {
        console.error('❌ Error adding elevation layer:', err)
      }
    }

    addElevationLayer()
  }, [elevationData, layerSettings?.enabledLayers])

  return (
    <div className={`relative h-full ${className}`}>
      {/* Debug layer status */}
      <div className="absolute top-2 left-2 z-[2000] bg-black/80 text-white p-2 text-xs rounded">
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