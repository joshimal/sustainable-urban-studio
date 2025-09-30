"use client"

import { useEffect, useRef, useState } from "react"
import { map, tileLayer, marker } from "leaflet"

interface LeafletMapProps {
  className?: string
  climateData?: any
}

export function LeafletMap({ className }: LeafletMapProps) {
  console.log('LeafletMap component rendering...')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const mapInstanceRef = useRef<any>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  // Track when component is mounted and ref is ready
  useEffect(() => {
    console.log('Component mounted, setting isMounted to true')
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) {
      console.log('Component not mounted yet, skipping map init')
      return
    }

    console.log('LeafletMap useEffect running, isMounted:', isMounted)

    let isComponentMounted = true
    let timeoutId: NodeJS.Timeout

    const initMap = async () => {
      try {
        console.log('Starting map initialization...')
        console.log('Using static Leaflet imports')

        // Wait for container to be available
        let attempts = 0
        const maxAttempts = 50
        
        while (!mapRef.current && attempts < maxAttempts) {
          console.log(`Waiting for container, attempt ${attempts + 1}/${maxAttempts}, mapRef.current:`, mapRef.current)
          await new Promise(resolve => setTimeout(resolve, 50))
          attempts++
        }

        if (!mapRef.current) {
          console.error('Map container not found after waiting')
          if (isComponentMounted) {
            setError("Map container not found after waiting")
          }
          return
        }

        console.log('Container found, creating map...')
        // Create map using static imports
        const leafletMap = map(mapRef.current, {
          center: [40.7589, -73.9851], // Nassau County
          zoom: 10,
          zoomControl: true,
          attributionControl: true
        })

        console.log('Map created, adding tile layer...')
        // Add tile layer
        tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(leafletMap)

        console.log('Adding marker...')
        // Add a simple marker to test
        marker([40.7589, -73.9851]).addTo(leafletMap)
          .bindPopup('Nassau County, NY')

        console.log('Map initialization complete!')
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

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isComponentMounted && isLoading) {
        console.error('Map initialization timeout')
        setError("Map initialization timeout")
        setIsLoading(false)
      }
    }, 5000) // 5 second timeout

    // Start initialization immediately
    initMap()

    return () => {
      isComponentMounted = false
      clearTimeout(timeoutId)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isMounted])

  console.log('LeafletMap rendering return statement, mapRef.current:', mapRef.current)

  return (
    <div className={`relative h-full ${className}`}>
      <div
        ref={mapRef}
        className="absolute inset-0"
        style={{ backgroundColor: '#1a1a1a' }}
      />

      {isLoading && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading map...</p>
          </div>
          </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-white text-center bg-red-900/70 px-4 py-3 rounded">
            <p className="text-red-300 mb-2">Map Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}