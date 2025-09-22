import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, LayersControl, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Train station icon
const trainIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1f2937" width="24" height="24">
      <path d="M12 2C8 2 4 4 4 7v10c0 3 4 5 8 5s8-2 8-5V7c0-3-4-5-8-5zm-2 15c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4-7H6V7h12v3z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

interface MapViewerProps {
  center?: [number, number];
  zoom?: number;
}

const MapViewer: React.FC<MapViewerProps> = ({ 
  center = [40.7259, -73.5143],
  zoom = 10 
}) => {
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
  const lirrLines = [
    {
      name: "Main Line",
      color: "#1f2937",
      coordinates: [
        [40.7557, -73.5876], // Westbury
        [40.7684, -73.5251], // Hicksville
        [40.7490, -73.6404], // Mineola
        [40.7509, -73.6095], // Carle Place
      ]
    },
    {
      name: "Port Washington Branch", 
      color: "#dc2626",
      coordinates: [
        [40.7490, -73.6404], // Mineola
        [40.7865, -73.7279], // Great Neck
        [40.8257, -73.6982], // Port Washington
      ]
    },
    {
      name: "Hempstead Branch",
      color: "#059669", 
      coordinates: [
        [40.7490, -73.6404], // Mineola
        [40.7268, -73.6343], // Garden City
        [40.7062, -73.6187], // Hempstead
      ]
    },
    {
      name: "Babylon Branch",
      color: "#7c3aed",
      coordinates: [
        [40.7557, -73.5876], // Westbury
        [40.6793, -73.4735], // Massapequa
        [40.6576, -73.5832], // Freeport
      ]
    },
    {
      name: "Long Beach Branch",
      color: "#ea580c",
      coordinates: [
        [40.6576, -73.5832], // Freeport
        [40.5882, -73.6579], // Long Beach
      ]
    }
  ];

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

  // Styling functions
  const getParcelStyle = (feature: any) => {
    const zoning = feature.properties.zoning || '';
    const colors = {
      'R-1': '#22c55e',    // Single family - green
      'R-A': '#16a34a',    // Large lot residential - dark green  
      'R-2': '#fbbf24',    // Two family - yellow
      'R-3': '#f59e0b',    // Multi family - orange
      'C': '#ef4444',      // Commercial - red
      'M': '#8b5cf6',      // Manufacturing - purple
    };
    
    return {
      fillColor: colors[zoning as keyof typeof colors] || '#6b7280',
      weight: 1,
      opacity: 0.8,
      color: '#ffffff',
      fillOpacity: 0.7,
      radius: 6
    };
  };

  const getFloodZoneStyle = (feature: any) => {
    const zone = feature.properties.zone || '';
    const colors = {
      'AE': '#3b82f6',     // 100-year flood - blue
      'VE': '#dc2626',     // Coastal high hazard - red
      'X': '#10b981'       // Minimal flood risk - green
    };
    
    return {
      fillColor: colors[zone as keyof typeof colors] || '#6b7280',
      weight: 2,
      opacity: 0.8,
      color: '#ffffff',
      fillOpacity: 0.4
    };
  };

  // Point to layer function for parcels
  const pointToLayer = (feature: any, latlng: any) => {
    return L.circleMarker(latlng, getParcelStyle(feature));
  };

  // Popup functions
  const onEachParcel = (feature: any, layer: any) => {
    if (feature.properties) {
      const props = feature.properties;
      layer.bindPopup(`
        <div style="font-family: sans-serif; min-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: #1f2937;">Parcel ${props.gpin}</h4>
          <p style="margin: 4px 0;"><strong>Zoning:</strong> ${props.zoning}</p>
          <p style="margin: 4px 0;"><strong>Area:</strong> ${props.acreage} acres</p>
          <p style="margin: 4px 0;"><strong>Value:</strong> $${(props.market_value || 0).toLocaleString()}</p>
          <p style="margin: 4px 0;"><strong>Type:</strong> ${props.property_class}</p>
          <p style="margin: 4px 0;"><strong>Town:</strong> ${props.town}</p>
        </div>
      `);
    }
  };

  const onEachFloodZone = (feature: any, layer: any) => {
    if (feature.properties) {
      const props = feature.properties;
      layer.bindPopup(`
        <div style="font-family: sans-serif;">
          <h4 style="margin: 0 0 8px 0; color: #1f2937;">Flood Zone ${props.zone}</h4>
          <p style="margin: 4px 0;">${props.description}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
            ${props.zone === 'AE' ? 'Properties require flood insurance' : 
              props.zone === 'VE' ? 'High-risk coastal area - building restrictions apply' : 
              'Lower flood risk area'}
          </p>
        </div>
      `);
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
        <MapContainer 
          center={center} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%' }}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                attribution='&copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Property Parcels */}
          {selectedLayers.parcels && mapData.parcels && mapData.parcels.features && (
            <GeoJSON
              key={`parcels-${mapData.parcels.features.length}`}
              data={mapData.parcels}
              style={getParcelStyle}
              onEachFeature={onEachParcel}
              pointToLayer={pointToLayer}
            />
          )}

          {/* LIRR Lines */}
          {selectedLayers.lirr_lines && lirrLines.map((line, index) => (
            <Polyline
              key={`line-${index}`}
              positions={line.coordinates as [number, number][]}
              color={line.color}
              weight={4}
              opacity={0.8}
            >
              <Popup>
                <div>
                  <h4 style={{ margin: 0, color: line.color }}>{line.name}</h4>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>LIRR Rail Line</p>
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* LIRR Stations */}
          {selectedLayers.lirr_stations && mapData.stations && mapData.stations.features?.map((station: any, index: number) => (
            <Marker
              key={`station-${index}`}
              position={[
                station.geometry.coordinates[1],
                station.geometry.coordinates[0]
              ]}
              icon={trainIcon}
            >
              <Popup>
                <div style={{ fontFamily: 'sans-serif' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
                    {station.properties.name} Station
                  </h4>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Line:</strong> {station.properties.branch}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '12px', color: '#6b7280' }}>
                    Transit-oriented development opportunities
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Flood Zones */}
          {selectedLayers.flood_zones && mapData.flood_zones && mapData.flood_zones.features && (
            <GeoJSON
              key={`flood-${mapData.flood_zones.features.length}`}
              data={mapData.flood_zones}
              style={getFloodZoneStyle}
              onEachFeature={onEachFloodZone}
            />
          )}
        </MapContainer>
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