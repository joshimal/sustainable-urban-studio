import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewerProps {
  center?: [number, number];
  zoom?: number;
}

const MapViewer: React.FC<MapViewerProps> = ({
  center = [-73.5143, 40.7259], // Note: Mapbox uses [lng, lat]
  zoom = 10
}) => {
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom: zoom,
    bearing: 0,
    pitch: 0
  });

  const [selectedLayers, setSelectedLayers] = useState({
    parcels: true,
    lirr_stations: true,
    lirr_lines: true,
    flood_zones: true
  });

  const [mapData, setMapData] = useState<{
    parcels: any;
    stations: any;
    flood_zones: any;
  }>({
    parcels: null,
    stations: null,
    flood_zones: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // LIRR line data
  const lirrLines = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "name": "Main Line", "color": "#1f2937" },
        "geometry": {
          "type": "LineString",
          "coordinates": [
            [-73.5876, 40.7557], // Westbury
            [-73.5251, 40.7684], // Hicksville
            [-73.6404, 40.7490], // Mineola
            [-73.6095, 40.7509], // Carle Place
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "name": "Port Washington Branch", "color": "#dc2626" },
        "geometry": {
          "type": "LineString",
          "coordinates": [
            [-73.6404, 40.7490], // Mineola
            [-73.7279, 40.7865], // Great Neck
            [-73.6982, 40.8257], // Port Washington
          ]
        }
      }
    ]
  };

  // Load Nassau County data with debugging
  useEffect(() => {
    const loadMapData = async () => {
      console.log('🔄 Starting to load Nassau County data...');
      setLoading(true);
      setError(null);

      try {
        // Test server connectivity first
        console.log('🔗 Testing server connection...');
        const healthResponse = await fetch('http://localhost:3001/api/qgis/health');
        console.log('Health response status:', healthResponse.status);

        if (!healthResponse.ok) {
          throw new Error(`Server not healthy: ${healthResponse.status}`);
        }

        // Load parcels
        console.log('📍 Loading parcels...');
        const parcelsResponse = await fetch('http://localhost:3001/api/qgis/nassau/get-data?type=parcels');
        console.log('Parcels response status:', parcelsResponse.status);
        const parcelsResult = await parcelsResponse.json();
        console.log('Parcels result:', parcelsResult);

        // Load LIRR stations
        console.log('🚂 Loading LIRR stations...');
        const stationsResponse = await fetch('http://localhost:3001/api/qgis/nassau/get-data?type=stations');
        console.log('Stations response status:', stationsResponse.status);
        const stationsResult = await stationsResponse.json();
        console.log('Stations result:', stationsResult);

        // Load flood zones
        console.log('🌊 Loading flood zones...');
        const floodResponse = await fetch('http://localhost:3001/api/qgis/nassau/get-data?type=flood_zones');
        console.log('Flood response status:', floodResponse.status);
        const floodResult = await floodResponse.json();
        console.log('Flood result:', floodResult);

        // Validate data structure
        if (!parcelsResult.success || !stationsResult.success || !floodResult.success) {
          throw new Error('One or more data requests failed');
        }

        setMapData({
          parcels: parcelsResult.data,
          stations: stationsResult.data,
          flood_zones: floodResult.data
        });

        console.log('✅ All data loaded successfully');

      } catch (error) {
        console.error('❌ Error loading map data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }

      setLoading(false);
    };

    loadMapData();
  }, []);

  // Mapbox layer styles
  const parcelLayerStyle = {
    'id': 'parcels',
    'type': 'circle' as const,
    'paint': {
      'circle-radius': 4,
      'circle-color': [
        'match',
        ['get', 'zoning'],
        'R-1', '#22c55e',
        'R-A', '#16a34a',
        'R-2', '#fbbf24',
        'R-3', '#f59e0b',
        'C', '#ef4444',
        'M', '#8b5cf6',
        '#6b7280'
      ],
      'circle-opacity': 0.8,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1
    }
  };

  const floodZoneLayerStyle = {
    'id': 'flood-zones',
    'type': 'fill' as const,
    'paint': {
      'fill-color': [
        'match',
        ['get', 'zone'],
        'AE', '#3b82f6',
        'VE', '#dc2626',
        'X', '#10b981',
        '#6b7280'
      ],
      'fill-opacity': 0.4,
      'fill-outline-color': '#ffffff'
    }
  };

  const lirrLineLayerStyle = {
    'id': 'lirr-lines',
    'type': 'line' as const,
    'paint': {
      'line-color': ['get', 'color'],
      'line-width': 4,
      'line-opacity': 0.8
    }
  };

  // Debug info
  console.log('🗺️ MapViewer render - Loading:', loading, 'Error:', error);
  console.log('📊 Map data:', {
    parcels: mapData.parcels ? `${mapData.parcels.features?.length} features` : 'null',
    stations: mapData.stations ? `${mapData.stations.features?.length} features` : 'null',
    flood_zones: mapData.flood_zones ? `${mapData.flood_zones.features?.length} features` : 'null'
  });

  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '1.5rem',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0' }}>
        Nassau County Interactive Map
      </h3>

      {/* Status and controls */}
      <div style={{ marginBottom: '1rem' }}>
        {loading && <p style={{ color: 'yellow' }}>Loading Nassau County data...</p>}
        {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          {Object.entries(selectedLayers).map(([key, checked]) => (
            <label key={key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'white',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)'
            }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setSelectedLayers(prev => ({
                  ...prev,
                  [key]: e.target.checked
                }))}
              />
              {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{
        borderRadius: '15px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        height: '600px'
      }}>
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          style={{width: '100%', height: '100%'}}
          mapStyle="mapbox://styles/mapbox/light-v11"
          mapboxAccessToken="pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjazE3aXBmaHUwMXJ6M2JsdnFzNXBrdmcwIn0.0123456789abcdef0123456789abcdef"
        >
          {/* LIRR Lines */}
          {selectedLayers.lirr_lines && (
            <Source id="lirr-lines" type="geojson" data={lirrLines}>
              <Layer {...lirrLineLayerStyle} />
            </Source>
          )}

          {/* Property Parcels */}
          {selectedLayers.parcels && mapData.parcels && (
            <Source id="parcels" type="geojson" data={mapData.parcels}>
              <Layer {...parcelLayerStyle} />
            </Source>
          )}

          {/* Flood Zones */}
          {selectedLayers.flood_zones && mapData.flood_zones && (
            <Source id="flood-zones" type="geojson" data={mapData.flood_zones}>
              <Layer {...floodZoneLayerStyle} />
            </Source>
          )}

          {/* LIRR Stations */}
          {selectedLayers.lirr_stations && mapData.stations && mapData.stations.features?.map((station: any, index: number) => (
            <Marker
              key={`station-${index}`}
              longitude={station.geometry.coordinates[0]}
              latitude={station.geometry.coordinates[1]}
            >
              <div style={{
                background: '#1f2937',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                🚂
              </div>
            </Marker>
          ))}
        </Map>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '1rem',
        background: 'rgba(255,255,255,0.1)',
        padding: '1rem',
        borderRadius: '12px'
      }}>
        <h4 style={{ color: 'white', margin: '0 0 0.75rem 0' }}>Legend</h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ color: 'white', fontSize: '0.9rem' }}>
            <strong>Zoning:</strong><br/>
            <span style={{ color: '#22c55e' }}>● R-1</span> Single Family<br/>
            <span style={{ color: '#16a34a' }}>● R-A</span> Large Lot<br/>
            <span style={{ color: '#fbbf24' }}>● R-2</span> Two Family<br/>
            <span style={{ color: '#f59e0b' }}>● R-3</span> Multi Family<br/>
            <span style={{ color: '#ef4444' }}>● C</span> Commercial<br/>
            <span style={{ color: '#8b5cf6' }}>● M</span> Manufacturing
          </div>

          <div style={{ color: 'white', fontSize: '0.9rem' }}>
            <strong>Flood Risk:</strong><br/>
            <span style={{ color: '#3b82f6' }}>■ AE</span> 100-year flood<br/>
            <span style={{ color: '#dc2626' }}>■ VE</span> Coastal hazard<br/>
            <span style={{ color: '#10b981' }}>■ X</span> Minimal risk
          </div>

          <div style={{ color: 'white', fontSize: '0.9rem' }}>
            <strong>Transit:</strong><br/>
            <span style={{ color: '#1f2937' }}>🚂</span> LIRR Stations<br/>
            <span style={{ color: '#1f2937' }}>━</span> Main Line<br/>
            <span style={{ color: '#dc2626' }}>━</span> Port Washington<br/>
            <span style={{ color: '#059669' }}>━</span> Hempstead<br/>
            <span style={{ color: '#7c3aed' }}>━</span> Babylon
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapViewer;