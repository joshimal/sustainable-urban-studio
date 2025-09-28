"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Info } from "lucide-react"

interface LeafletMapProps {
  className?: string
  climateData?: any
}

export function LeafletMap({ className, climateData }: LeafletMapProps) {
  console.log("LeafletMap component rendering...")

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    console.log("useEffect running - isInitialized:", isInitialized, "mapContainerRef.current:", !!mapContainerRef.current)

    if (isInitialized || !mapContainerRef.current) {
      console.log("Skipping map init - already initialized or no container")
      return
    }

    const initMap = async () => {
      try {
        console.log("Starting map initialization...")

        // Dynamic import of Leaflet
        const L = (await import("leaflet")).default
        console.log("Leaflet imported successfully")

        // Initialize map
        const map = L.map(mapContainerRef.current!, {
          center: [40.7589, -73.9851], // Nassau County coordinates
          zoom: 10,
          zoomControl: true,
          attributionControl: false,
        })
        console.log("Map created successfully")

        // Add dark minimal tile layer
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
          attribution: "© CartoDB",
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map)
        console.log("Tiles added successfully")

        // Store map instance
        mapInstanceRef.current = map
        setIsInitialized(true)
        setIsLoading(false)
        console.log("Map initialization complete!")

      } catch (error) {
        console.error("Leaflet map initialization error:", error)
        setMapError(error instanceof Error ? error.message : "Failed to initialize map")
        setIsLoading(false)
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 200)
    return () => clearTimeout(timer)
  }, [isInitialized])

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className={`h-full bg-slate-900 relative overflow-hidden flex items-center justify-center ${className}`}>
        <Card className="p-6 bg-card/90 backdrop-blur-sm text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading dark minimal map...</p>
        </Card>
      </div>
    )
  }

  if (mapError) {
    return (
      <div className={`h-full bg-slate-900 relative overflow-hidden flex items-center justify-center p-4 ${className}`}>
        <Card className="p-6 bg-card/90 backdrop-blur-sm max-w-lg">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Map Error:</strong> {mapError}
            </AlertDescription>
          </Alert>
          <div className="text-sm text-muted-foreground">
            <p>The Leaflet map failed to initialize.</p>
            <p className="mt-2">Check the console for details.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={`h-full relative ${className}`}>
      <div
        ref={mapContainerRef}
        className="h-full w-full"
        style={{ minHeight: "400px" }}
      />

      {/* Climate data overlay */}
      {climateData && (
        <Card className="absolute bottom-4 left-4 p-3 bg-card/90 backdrop-blur-sm border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-semibold">Nassau Climate Data</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>🌡️ Temperature: +{climateData.temperature?.value?.toFixed(1) || "3.2"}°C</div>
            <div>🌊 Sea Level: +{climateData.seaLevel?.value || "2.5"}cm</div>
            <div>💨 AQI: {climateData.airQuality?.value || "85"}</div>
          </div>
        </Card>
      )}
    </div>
  )
}