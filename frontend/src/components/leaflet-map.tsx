"use client"

import { useEffect, useRef, useState } from "react"
// Defer Leaflet import to runtime with explicit ESM build to avoid Vite export mismatches
// We'll dynamically import inside useEffect

interface LeafletMapProps {
  className?: string
  climateData?: any
  seaLevelRiseData?: any
  seaLevelFeet?: number
  layerSettings?: {
    seaLevelEnabled: boolean
    seaLevelOpacity: number
    displayStyle?: string
    colorScheme?: string
    showBorder?: boolean
    borderColor?: string
    borderWidth?: number
  }
}

export function LeafletMap({ className, seaLevelRiseData, layerSettings, seaLevelFeet = 2 }: LeafletMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const mapInstanceRef = useRef<any>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const geoJsonLayerRef = useRef<any>(null)
  const climateLayerRef = useRef<any>(null)

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