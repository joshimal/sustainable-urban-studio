"use client"

import { useEffect, useRef } from "react"
import * as Cesium from "cesium"
import type { LayerStateMap } from "../hooks/useClimateLayerData"
import { LatLngBoundsLiteral } from "../types/geography"

interface CesiumGlobeProps {
  className?: string
  center: { lat: number; lng: number }
  zoom: number
  onViewportChange?: (viewport: { center: { lat: number; lng: number }; zoom: number }) => void
  onMapBoundsChange?: (bounds: LatLngBoundsLiteral) => void
  layerStates: LayerStateMap
}

// Disable Cesium Ion (we'll use free OSM tiles)
Cesium.Ion.defaultAccessToken = undefined

export function CesiumGlobe({
  className,
  center,
  zoom,
  onViewportChange,
  onMapBoundsChange,
  layerStates,
}: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    // Use OpenStreetMap as free base layer
    const osmProvider = new Cesium.OpenStreetMapImageryProvider({
      url: 'https://a.tile.openstreetmap.org/'
    })

    const viewer = new Cesium.Viewer(containerRef.current, {
      imageryProvider: osmProvider,
      baseLayerPicker: false,
      animation: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: true,
      infoBox: false,
      sceneModePicker: true,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      scene3DOnly: false,
      shouldAnimate: false,
      terrainProvider: undefined,
    })

    // Calculate camera height from zoom level
    const height = 10000000 / Math.pow(2, zoom - 1)

    // Set initial camera position
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(center.lng, center.lat, height),
    })

    // Enable globe lighting
    viewer.scene.globe.enableLighting = true

    viewerRef.current = viewer

    // Camera move end handler
    const moveEndListener = () => {
      const position = viewer.camera.positionCartographic
      const lat = Cesium.Math.toDegrees(position.latitude)
      const lng = Cesium.Math.toDegrees(position.longitude)
      const height = position.height

      // Approximate zoom level from height
      const approxZoom = Math.max(1, Math.min(20, 20 - Math.log2(height / 1000)))

      onViewportChange?.({
        center: { lat, lng },
        zoom: Math.round(approxZoom),
      })

      // Calculate visible bounds
      const canvas = viewer.scene.canvas
      const topLeft = viewer.camera.pickEllipsoid(
        new Cesium.Cartesian2(0, 0),
        viewer.scene.globe.ellipsoid
      )
      const bottomRight = viewer.camera.pickEllipsoid(
        new Cesium.Cartesian2(canvas.width, canvas.height),
        viewer.scene.globe.ellipsoid
      )

      if (topLeft && bottomRight) {
        const topLeftCartographic = Cesium.Cartographic.fromCartesian(topLeft)
        const bottomRightCartographic = Cesium.Cartographic.fromCartesian(bottomRight)

        onMapBoundsChange?.({
          north: Cesium.Math.toDegrees(topLeftCartographic.latitude),
          south: Cesium.Math.toDegrees(bottomRightCartographic.latitude),
          west: Cesium.Math.toDegrees(topLeftCartographic.longitude),
          east: Cesium.Math.toDegrees(bottomRightCartographic.longitude),
        })
      }
    }

    viewer.camera.moveEnd.addEventListener(moveEndListener)

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [])

  // Update camera when center/zoom changes externally
  useEffect(() => {
    if (!viewerRef.current) return

    const viewer = viewerRef.current
    const height = 10000000 / Math.pow(2, zoom - 1)

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(center.lng, center.lat, height),
      duration: 1.5,
    })
  }, [center.lat, center.lng, zoom])

  return <div ref={containerRef} className={`h-full w-full ${className ?? ""}`} />
}
