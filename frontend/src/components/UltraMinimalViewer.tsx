import React, { useState, useEffect, useRef } from 'react';

interface UltraMinimalViewerProps {
  center?: [number, number];
  zoom?: number;
}

const UltraMinimalViewer: React.FC<UltraMinimalViewerProps> = ({
  center = [40.7259, -73.5143],
  zoom = 11
}) => {
  const mapRef = useRef<any>(null);
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      const leafletMap = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap);

      setMap(leafletMap);
    };

    if (mapRef.current) initMap();
    return () => map?.remove();
  }, []);

  return <div ref={mapRef} className="w-full h-full" />;
};

export default UltraMinimalViewer;