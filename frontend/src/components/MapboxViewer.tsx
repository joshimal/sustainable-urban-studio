import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Source, Layer, Popup, NavigationControl, ScaleControl, FullscreenControl } from 'react-map-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Map as MapboxMap, MapMouseEvent, MapboxGeoJSONFeature } from 'mapbox-gl';
import { MAPBOX_CONFIG, POPUP_CONFIG } from '../config/mapbox';
import {
  transformGeoJSONForMapbox,
  addSourceAndLayer,
  updateLayerVisibility,
  createPopupContent,
  animateToFeature,
  createDynamicLayerStyle,
  MapboxFeatureCollection,
  LayerVisibility
} from '../utils/mapboxHelpers';
import '../styles/mapbox.css';

// Import Mapbox GL CSS
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface MapboxViewerProps {
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
}

interface PopupInfo {
  longitude: number;
  latitude: number;
  content: string;
}

interface MapData {
  parcels: MapboxFeatureCollection | null;
  stations: MapboxFeatureCollection | null;
  flood_zones: MapboxFeatureCollection | null;
  [key: string]: MapboxFeatureCollection | null;
}

const MapboxViewer: React.FC<MapboxViewerProps> = ({
  center = [-73.5143, 40.7259],
  zoom = 10,
  pitch = 0,
  bearing = 0
}) => {
  // State management
  const [viewport, setViewport] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom,
    pitch,
    bearing,
  });

  const [mapStyle, setMapStyle] = useState(MAPBOX_CONFIG.STYLES.streets);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    parcels: true,
    'parcel-points': false,
    'lirr-stations': true,
    'lirr-lines': true,
    'flood-zones': true,
    'building-3d': false,
    'heatmap': false,
  });

  const [mapData, setMapData] = useState<MapData>({
    parcels: null,
    stations: null,
    flood_zones: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [drawingMode, setDrawingMode] = useState<string>('');
  const [measurementResult, setMeasurementResult] = useState<string>('');

  // Refs
  const mapRef = useRef<MapboxMap | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  // Load map data
  useEffect(() => {
    const loadMapData = async () => {
      console.log('🔄 Loading Nassau County data for Mapbox...');
      setLoading(true);
      setError(null);

      try {
        // Test server connectivity
        const healthResponse = await fetch('http://localhost:3001/api/qgis/health');
        if (!healthResponse.ok) {
          throw new Error(`Server not healthy: ${healthResponse.status}`);
        }

        // Load all data sources
        const [parcelsResponse, stationsResponse, floodResponse] = await Promise.all([
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=parcels'),
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=stations'),
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=flood_zones')
        ]);

        const [parcelsResult, stationsResult, floodResult] = await Promise.all([
          parcelsResponse.json(),
          stationsResponse.json(),
          floodResponse.json()
        ]);

        // Validate responses
        if (!parcelsResult.success || !stationsResult.success || !floodResult.success) {
          throw new Error('One or more data requests failed');
        }

        // Transform data for Mapbox
        const transformedData: MapData = {
          parcels: transformGeoJSONForMapbox(parcelsResult.data, 'parcels'),
          stations: transformGeoJSONForMapbox(stationsResult.data, 'stations'),
          flood_zones: transformGeoJSONForMapbox(floodResult.data, 'flood_zones'),
        };

        setMapData(transformedData);
        console.log('✅ All data loaded and transformed for Mapbox');

      } catch (error) {
        console.error('❌ Error loading map data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }

      setLoading(false);
    };

    loadMapData();
  }, []);

  // Initialize drawing tools
  const initializeDrawTools = useCallback((map: MapboxMap) => {
    if (!drawRef.current) {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          point: true,
          line_string: true,
          polygon: true,
          trash: true,
        },
        defaultMode: 'draw_polygon'
      });

      map.addControl(draw as any, 'top-left');
      drawRef.current = draw;

      // Drawing event handlers
      map.on('draw.create', (e) => {
        console.log('Created feature:', e.features[0]);
      });

      map.on('draw.update', (e) => {
        console.log('Updated feature:', e.features[0]);
      });

      map.on('draw.delete', (e) => {
        console.log('Deleted features:', e.features);
      });
    }
  }, []);

  // Map load handler
  const handleMapLoad = useCallback((event: any) => {
    const map = event.target;
    mapRef.current = map;

    // Initialize drawing tools
    initializeDrawTools(map);

    // Add custom icons
    const trainIconImage = new Image(32, 32);
    trainIconImage.onload = () => {
      if (map.hasImage('train-icon')) return;
      map.addImage('train-icon', trainIconImage);
    };
    trainIconImage.src = 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1f2937" width="32" height="32">
        <path d="M12 2C8 2 4 4 4 7v10c0 3 4 5 8 5s8-2 8-5V7c0-3-4-5-8-5zm-2 15c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4-7H6V7h12v3z"/>
      </svg>
    `);

    console.log('🗺️ Mapbox GL JS map loaded');
  }, [initializeDrawTools]);

  // Click handler for popups
  const handleMapClick = useCallback((event: MapMouseEvent) => {
    const features = event.features;
    if (features && features.length > 0) {
      const feature = features[0] as MapboxGeoJSONFeature;

      // Determine feature type based on layer
      let featureType: 'parcel' | 'station' | 'flood_zone' | 'custom' = 'custom';
      if (feature.layer?.id?.includes('parcel')) featureType = 'parcel';
      else if (feature.layer?.id?.includes('station')) featureType = 'station';
      else if (feature.layer?.id?.includes('flood')) featureType = 'flood_zone';

      setPopupInfo({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        content: createPopupContent(feature as any, featureType)
      });
    } else {
      setPopupInfo(null);
    }
  }, []);

  // Layer visibility toggle
  const toggleLayerVisibility = (layerId: string) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  };

  // Create layer configurations
  const createParcelLayers = () => {
    if (!mapData.parcels?.features?.length) return null;

    const parcelsStyle = createDynamicLayerStyle(
      'circle',
      'zoning',
      MAPBOX_CONFIG.COLOR_SCHEMES.zoning
    );

    return (
      <Source id="parcels-source" type="geojson" data={mapData.parcels}>
        <Layer
          id="parcels-layer"
          type="circle"
          paint={parcelsStyle}
          layout={{ visibility: layerVisibility['parcels'] ? 'visible' : 'none' }}
        />
      </Source>
    );
  };

  const createStationLayers = () => {
    if (!mapData.stations?.features?.length) return null;

    return (
      <Source id="stations-source" type="geojson" data={mapData.stations}>
        <Layer
          id="stations-layer"
          type="symbol"
          layout={{
            'icon-image': 'train-icon',
            'icon-size': 1,
            'icon-allow-overlap': true,
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-offset': [0, 2],
            'text-anchor': 'top',
            visibility: layerVisibility['lirr-stations'] ? 'visible' : 'none'
          }}
          paint={{
            'text-color': '#1f2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1,
          }}
        />
      </Source>
    );
  };

  const createFloodZoneLayers = () => {
    if (!mapData.flood_zones?.features?.length) return null;

    const floodStyle = createDynamicLayerStyle(
      'fill',
      'zone',
      MAPBOX_CONFIG.COLOR_SCHEMES.flood_zones
    );

    return (
      <Source id="flood-zones-source" type="geojson" data={mapData.flood_zones}>
        <Layer
          id="flood-zones-layer"
          type="fill"
          paint={floodStyle}
          layout={{ visibility: layerVisibility['flood-zones'] ? 'visible' : 'none' }}
        />
      </Source>
    );
  };

  // LIRR lines data (static for now)
  const lirrLinesData: MapboxFeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Main Line', color: '#1f2937' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-73.5876, 40.7557], [-73.5251, 40.7684],
            [-73.6404, 40.7490], [-73.6095, 40.7509]
          ]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Port Washington Branch', color: '#dc2626' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-73.6404, 40.7490], [-73.7279, 40.7865], [-73.6982, 40.8257]
          ]
        }
      }
      // Add more lines as needed
    ]
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '1.5rem',
      border: '1px solid rgba(255,255,255,0.2)',
      position: 'relative'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0' }}>
        Nassau County Interactive Map (Mapbox GL JS)
      </h3>

      {/* Status and Controls */}
      <div style={{ marginBottom: '1rem' }}>
        {loading && (
          <div className="map-loading">
            <div className="loading-spinner"></div>
            <span>Loading Nassau County data...</span>
          </div>
        )}
        {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}
      </div>

      {/* Map Container */}
      <div style={{
        borderRadius: '15px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        height: '600px',
        position: 'relative'
      }}>
        <Map
          {...viewport}
          onMove={(evt) => setViewport(evt.viewState)}
          mapboxAccessToken={MAPBOX_CONFIG.ACCESS_TOKEN}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          onLoad={handleMapLoad}
          onClick={handleMapClick}
          interactiveLayerIds={['parcels-layer', 'stations-layer', 'flood-zones-layer']}
        >
          {/* Controls */}
          <NavigationControl position="top-right" />
          <ScaleControl position="bottom-left" />
          <FullscreenControl position="top-right" />

          {/* Data Layers */}
          {createParcelLayers()}
          {createStationLayers()}
          {createFloodZoneLayers()}

          {/* LIRR Lines */}
          <Source id="lirr-lines-source" type="geojson" data={lirrLinesData}>
            <Layer
              id="lirr-lines-layer"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 4,
                'line-opacity': 0.8,
              }}
              layout={{ visibility: layerVisibility['lirr-lines'] ? 'visible' : 'none' }}
            />
          </Source>

          {/* 3D Buildings Layer */}
          <Layer
            id="3d-buildings"
            source="composite"
            source-layer="building"
            filter={['==', 'extrude', 'true']}
            type="fill-extrusion"
            minzoom={14}
            paint={{
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }}
            layout={{ visibility: layerVisibility['building-3d'] ? 'visible' : 'none' }}
          />

          {/* Popup */}
          {popupInfo && (
            <Popup
              longitude={popupInfo.longitude}
              latitude={popupInfo.latitude}
              anchor="bottom"
              onClose={() => setPopupInfo(null)}
              closeButton={true}
              closeOnClick={false}
            >
              <div dangerouslySetInnerHTML={{ __html: popupInfo.content }} />
            </Popup>
          )}
        </Map>

        {/* Layer Control Panel */}
        <div className="layer-control">
          <h4>Map Layers</h4>
          {Object.entries(layerVisibility).map(([layerId, visible]) => (
            <div key={layerId} className="layer-control-item">
              <input
                type="checkbox"
                id={layerId}
                checked={visible}
                onChange={() => toggleLayerVisibility(layerId)}
              />
              <label htmlFor={layerId}>
                {layerId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
            </div>
          ))}
        </div>

        {/* Style Selector */}
        <div className="style-selector">
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
          >
            <option value={MAPBOX_CONFIG.STYLES.streets}>Streets</option>
            <option value={MAPBOX_CONFIG.STYLES.satellite}>Satellite</option>
            <option value={MAPBOX_CONFIG.STYLES.light}>Light</option>
            <option value={MAPBOX_CONFIG.STYLES.dark}>Dark</option>
            <option value={MAPBOX_CONFIG.STYLES.outdoors}>Outdoors</option>
          </select>
        </div>

        {/* Map Legend */}
        <div className="map-legend">
          <div className="legend-section">
            <div className="legend-title">Zoning</div>
            {Object.entries(MAPBOX_CONFIG.COLOR_SCHEMES.zoning).map(([zone, color]) =>
              zone !== 'default' && (
                <div key={zone} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: color }}></div>
                  <span>{zone} - {getZoningDescription(zone)}</span>
                </div>
              )
            )}
          </div>

          <div className="legend-section">
            <div className="legend-title">Flood Risk</div>
            {Object.entries(MAPBOX_CONFIG.COLOR_SCHEMES.flood_zones).map(([zone, color]) =>
              zone !== 'default' && (
                <div key={zone} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: color }}></div>
                  <span>{zone} - {getFloodZoneDescription(zone)}</span>
                </div>
              )
            )}
          </div>

          <div className="legend-section">
            <div className="legend-title">Transportation</div>
            <div className="legend-item">
              <span className="legend-symbol">🚂</span>
              <span>LIRR Stations</span>
            </div>
            <div className="legend-item">
              <div className="legend-line" style={{ backgroundColor: '#1f2937' }}></div>
              <span>Rail Lines</span>
            </div>
          </div>
        </div>
      </div>

      {/* Measurement Result */}
      {measurementResult && (
        <div className="measurement-result">
          {measurementResult}
        </div>
      )}
    </div>
  );
};

// Helper functions
const getZoningDescription = (zone: string): string => {
  const descriptions: Record<string, string> = {
    'R-1': 'Single Family',
    'R-A': 'Large Lot Residential',
    'R-2': 'Two Family',
    'R-3': 'Multi Family',
    'C': 'Commercial',
    'M': 'Manufacturing'
  };
  return descriptions[zone] || 'Mixed Use';
};

const getFloodZoneDescription = (zone: string): string => {
  const descriptions: Record<string, string> = {
    'AE': '100-year flood zone',
    'VE': 'Coastal high hazard',
    'X': 'Minimal flood risk'
  };
  return descriptions[zone] || 'See FEMA maps';
};

export default MapboxViewer;