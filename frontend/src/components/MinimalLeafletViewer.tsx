import React, { useEffect, useRef } from 'react';
import * as leafletNS from 'leaflet';
import { loadLeaflet } from '@/utils/loadLeaflet';
import 'leaflet/dist/leaflet.css';

type MinimalLeafletViewerProps = {
  center: [number, number];
  zoom?: number;
};

const MinimalLeafletViewer: React.FC<MinimalLeafletViewerProps> = ({ center, zoom = 11 }) => {
  const mapRef = useRef<leafletNS.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const init = async () => {
      if (containerRef.current && !mapRef.current) {
        const L: any = await loadLeaflet();
        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: true
        }).setView(center, zoom);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution:
            "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>",
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);

        L.control.scale({ imperial: true, metric: true }).addTo(map);
        L.control.zoom({ position: 'topright' }).addTo(map);

        mapRef.current = map;

        const points: Array<{ lat: number; lng: number; value: number }> = [
          { lat: center[0] + 0.02, lng: center[1] - 0.02, value: 3.5 },
          { lat: center[0] - 0.01, lng: center[1] + 0.03, value: 2.8 },
          { lat: center[0] + 0.015, lng: center[1] + 0.015, value: 4.2 }
        ];

        points.forEach((p) => {
          L.circleMarker([p.lat, p.lng], {
            radius: 6,
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.7,
            weight: 1
          })
            .bindPopup(`<strong>Temp Δ:</strong> ${p.value.toFixed(1)}°F`)
            .addTo(map);
        });
      }
    }

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
  );
};

export default MinimalLeafletViewer;