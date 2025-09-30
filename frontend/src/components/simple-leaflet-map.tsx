import { useEffect, useRef } from "react"

export function SimpleLeafletMap() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return

    const initMap = async () => {
      try {
        const L = await import("leaflet")
        
        const map = L.map(mapRef.current!, {
          center: [40.7589, -73.9851],
          zoom: 10,
        })

        // Add dark tile layer
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "© CartoDB",
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map)

        // Add some sample markers
        const markers = [
          { lat: 40.7589, lng: -73.9851, name: "Times Square" },
          { lat: 40.6892, lng: -74.0445, name: "Statue of Liberty" },
          { lat: 40.7505, lng: -73.9934, name: "Empire State Building" },
        ]

        markers.forEach((marker) => {
          L.marker([marker.lat, marker.lng])
            .addTo(map)
            .bindPopup(marker.name)
        })

        console.log("Map initialized successfully")
      } catch (error) {
        console.error("Map initialization error:", error)
      }
    }

    initMap()
  }, [])

  return (
    <div 
      ref={mapRef} 
      className="h-full w-full"
      style={{ minHeight: "400px" }}
    />
  )
}


