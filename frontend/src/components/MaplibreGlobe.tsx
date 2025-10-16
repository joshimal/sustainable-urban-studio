"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Map, { NavigationControl, GeolocateControl, ScaleControl } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import type { LayerStateMap } from "../hooks/useClimateLayerData"
import { LatLngBoundsLiteral } from "../types/geography"
import type { MapRef } from "react-map-gl/maplibre"

interface MaplibreGlobeProps {
  className?: string
  center: { lat: number; lng: number }
  zoom: number
  onViewportChange?: (viewport: { center: { lat: number; lng: number }; zoom: number }) => void
  onMapBoundsChange?: (bounds: LatLngBoundsLiteral) => void
  layerStates: LayerStateMap
}

export function MaplibreGlobe({
  className,
  center,
  zoom,
  onViewportChange,
  onMapBoundsChange,
  layerStates,
}: MaplibreGlobeProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: center.lng,
    latitude: center.lat,
    zoom: zoom,
    pitch: 0,
    bearing: 0,
  })

  // Update view state when props change
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      longitude: center.lng,
      latitude: center.lat,
      zoom: zoom,
    }))
  }, [center.lng, center.lat, zoom])

  const handleMove = useCallback((evt: any) => {
    setViewState(evt.viewState)

    const { longitude, latitude, zoom } = evt.viewState
    onViewportChange?.({
      center: { lat: latitude, lng: longitude },
      zoom: zoom,
    })

    // Get map bounds
    if (mapRef.current) {
      const map = mapRef.current.getMap()
      const bounds = map.getBounds()

      onMapBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    }
  }, [onViewportChange, onMapBoundsChange])

  const handleLoad = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap()

      // Set globe projection for 3D sphere with no distortion
      map.setProjection('globe')

      // Add atmosphere effect for better globe visualization
      map.setFog({
        range: [0.8, 8],
        color: '#ffffff',
        'horizon-blend': 0.1,
        'high-color': '#245bde',
        'space-color': '#000000',
        'star-intensity': 0.15
      })

      // Trigger initial bounds calculation
      const bounds = map.getBounds()
      onMapBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    }
  }, [onMapBoundsChange])

  return (
    <div className={`h-full w-full ${className ?? ""}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onLoad={handleLoad}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
        attributionControl={true}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" />
        <ScaleControl position="bottom-left" />
      </Map>
    </div>
  )
}
