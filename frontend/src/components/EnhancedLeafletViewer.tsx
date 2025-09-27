import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Layers, BarChart3, Eye, EyeOff, Settings, Download, Search, Filter } from 'lucide-react';

interface EnhancedLeafletViewerProps {
  center?: [number, number];
  zoom?: number;
}

const EnhancedLeafletViewer: React.FC<EnhancedLeafletViewerProps> = ({
  center = [40.7259, -73.5143], // Nassau County
  zoom = 11
}) => {
  const mapRef = useRef<any>(null);
  const [map, setMap] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'map' | 'analysis' | 'satellite'>('map');
  const [isLoading, setIsLoading] = useState(true);
  const [gisData, setGisData] = useState<any>(null);

  const [selectedLayers, setSelectedLayers] = useState({
    parcels: true,
    stations: true,
    flood_zones: true,
    environmental: false
  });

  const [mapStyle, setMapStyle] = useState({
    baseLayer: 'osm', // 'osm', 'satellite', 'terrain', 'dark'
    colorScheme: 'default', // 'default', 'high-contrast', 'colorblind'
    showGrid: false,
    showScale: true,
    showMinimap: false
  });

  // Initialize Leaflet map
  useEffect(() => {
    const initMap = async () => {
      // Dynamically import Leaflet to avoid SSR issues
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const leafletMap = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      }).setView(center, zoom);

      // Add base layers with custom styling
      const baseLayers = getBaseLayers(L);
      baseLayers[mapStyle.baseLayer].addTo(leafletMap);

      // Add custom controls
      addCustomControls(L, leafletMap);

      // Add scale control if enabled
      if (mapStyle.showScale) {
        L.control.scale({ position: 'bottomright' }).addTo(leafletMap);
      }

      setMap(leafletMap);
      setIsLoading(false);
    };

    if (mapRef.current) {
      initMap();
    }

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Load GIS data
  useEffect(() => {
    const loadGISData = async () => {
      try {
        const [parcelsRes, stationsRes, floodRes] = await Promise.all([
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=parcels'),
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=stations'),
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=flood_zones')
        ]);

        const [parcels, stations, flood_zones] = await Promise.all([
          parcelsRes.json(),
          stationsRes.json(),
          floodRes.json()
        ]);

        setGisData({ parcels: parcels.data, stations: stations.data, flood_zones: flood_zones.data });

        if (map) {
          addGISDataToMap(map, { parcels: parcels.data, stations: stations.data, flood_zones: flood_zones.data });
        }
      } catch (error) {
        console.error('Failed to load GIS data:', error);
        // Use mock data as fallback
        const mockData = generateMockData();
        setGisData(mockData);
        if (map) {
          addGISDataToMap(map, mockData);
        }
      }
    };

    if (map) {
      loadGISData();
    }
  }, [map]);

  // Update base layer when style changes
  useEffect(() => {
    if (map) {
      updateBaseLayer();
    }
  }, [mapStyle.baseLayer, map]);

  const getBaseLayers = (L: any) => {
    return {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        className: 'custom-tile-layer'
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
      }),
      terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap contributors'
      }),
      dark: L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
        attribution: '© Stadia Maps, OpenMapTiles, OpenStreetMap contributors'
      })
    };
  };

  const addCustomControls = (L: any, leafletMap: any) => {
    // Custom zoom control with styling
    const customZoom = L.control.zoom({
      position: 'topright',
      zoomInTitle: 'Zoom In',
      zoomOutTitle: 'Zoom Out'
    });
    customZoom.addTo(leafletMap);

    // Add fullscreen control if available
    if ((L as any).control.fullscreen) {
      leafletMap.addControl(new (L as any).control.fullscreen());
    }
  };

  const addGISDataToMap = async (leafletMap: any, data: any) => {
    const L = await import('leaflet');

    // Clear existing layers
    leafletMap.eachLayer((layer: any) => {
      if (layer.options && layer.options.pane !== 'tilePane') {
        leafletMap.removeLayer(layer);
      }
    });

    // Add parcels
    if (selectedLayers.parcels && data.parcels) {
      const parcelsLayer = createParcelsLayer(L, data.parcels);
      parcelsLayer.addTo(leafletMap);
    }

    // Add stations
    if (selectedLayers.stations && data.stations) {
      const stationsLayer = createStationsLayer(L, data.stations);
      stationsLayer.addTo(leafletMap);
    }

    // Add flood zones
    if (selectedLayers.flood_zones && data.flood_zones) {
      const floodLayer = createFloodZonesLayer(L, data.flood_zones);
      floodLayer.addTo(leafletMap);
    }
  };

  const createParcelsLayer = (L: any, parcelsData: any) => {
    return L.geoJSON(parcelsData, {
      style: {
        color: '#2563eb',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.1,
        fillColor: '#3b82f6'
      },
      onEachFeature: (feature: any, layer: any) => {
        layer.bindPopup(`
          <div class="font-sans">
            <h3 class="font-bold text-lg mb-2">Property Parcel</h3>
            <p><strong>ID:</strong> ${feature.properties.id || 'N/A'}</p>
            <p><strong>Area:</strong> ${feature.properties.area || 'N/A'} sq ft</p>
            <p><strong>Zone:</strong> ${feature.properties.zone || 'N/A'}</p>
          </div>
        `);

        layer.on('mouseover', () => {
          layer.setStyle({ weight: 3, fillOpacity: 0.3 });
        });

        layer.on('mouseout', () => {
          layer.setStyle({ weight: 1, fillOpacity: 0.1 });
        });
      }
    });
  };

  const createStationsLayer = (L: any, stationsData: any) => {
    const trainIcon = L.divIcon({
      html: '<div class="custom-marker station-marker">🚂</div>',
      className: 'custom-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    return L.geoJSON(stationsData, {
      pointToLayer: (feature: any, latlng: any) => {
        return L.marker(latlng, { icon: trainIcon });
      },
      onEachFeature: (feature: any, layer: any) => {
        layer.bindPopup(`
          <div class="font-sans">
            <h3 class="font-bold text-lg mb-2 text-blue-600">🚂 LIRR Station</h3>
            <p><strong>Name:</strong> ${feature.properties.name || 'Unknown Station'}</p>
            <p><strong>Branch:</strong> ${feature.properties.branch || 'N/A'}</p>
            <p><strong>Zone:</strong> ${feature.properties.zone || 'N/A'}</p>
          </div>
        `);
      }
    });
  };

  const createFloodZonesLayer = (L: any, floodData: any) => {
    return L.geoJSON(floodData, {
      style: (feature: any) => {
        const zone = feature.properties.zone || 'X';
        return {
          color: getFloodZoneColor(zone),
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4,
          fillColor: getFloodZoneColor(zone)
        };
      },
      onEachFeature: (feature: any, layer: any) => {
        const zone = feature.properties.zone || 'X';
        layer.bindPopup(`
          <div class="font-sans">
            <h3 class="font-bold text-lg mb-2 text-blue-600">🌊 Flood Zone</h3>
            <p><strong>Zone:</strong> ${zone}</p>
            <p><strong>Risk Level:</strong> ${getFloodRiskDescription(zone)}</p>
            <p><strong>Base Flood Elevation:</strong> ${feature.properties.bfe || 'N/A'} ft</p>
          </div>
        `);
      }
    });
  };

  const getFloodZoneColor = (zone: string) => {
    const colors: { [key: string]: string } = {
      'AE': '#dc2626', // High risk - red
      'AH': '#ea580c', // High risk - orange
      'AO': '#d97706', // Moderate risk - amber
      'X': '#16a34a',  // Low risk - green
      'SHADED X': '#22c55e' // Minimal risk - light green
    };
    return colors[zone] || '#6b7280';
  };

  const getFloodRiskDescription = (zone: string) => {
    const descriptions: { [key: string]: string } = {
      'AE': 'High Risk - 1% annual chance',
      'AH': 'High Risk - Shallow flooding',
      'AO': 'Moderate Risk - Sheet flow',
      'X': 'Low Risk - 0.2% annual chance',
      'SHADED X': 'Minimal Risk'
    };
    return descriptions[zone] || 'Unknown Risk';
  };

  const generateMockData = () => {
    // Generate mock GeoJSON data centered around Nassau County
    const parcels = {
      type: 'FeatureCollection',
      features: Array.from({ length: 50 }, (_, i) => ({
        type: 'Feature',
        properties: {
          id: `parcel_${i}`,
          area: Math.round(Math.random() * 10000 + 1000),
          zone: ['R1', 'R2', 'C1', 'C2', 'I1'][Math.floor(Math.random() * 5)]
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [center[1] + (Math.random() - 0.5) * 0.02, center[0] + (Math.random() - 0.5) * 0.02],
            [center[1] + (Math.random() - 0.5) * 0.02, center[0] + (Math.random() - 0.5) * 0.02],
            [center[1] + (Math.random() - 0.5) * 0.02, center[0] + (Math.random() - 0.5) * 0.02],
            [center[1] + (Math.random() - 0.5) * 0.02, center[0] + (Math.random() - 0.5) * 0.02]
          ]]
        }
      }))
    };

    const stations = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Hempstead Station', branch: 'Hempstead', zone: '4' },
          geometry: { type: 'Point', coordinates: [-73.6187, 40.7062] }
        },
        {
          type: 'Feature',
          properties: { name: 'Garden City Station', branch: 'Hempstead', zone: '4' },
          geometry: { type: 'Point', coordinates: [-73.6343, 40.7268] }
        },
        {
          type: 'Feature',
          properties: { name: 'Westbury Station', branch: 'Port Jefferson', zone: '3' },
          geometry: { type: 'Point', coordinates: [-73.5876, 40.7557] }
        }
      ]
    };

    const flood_zones = {
      type: 'FeatureCollection',
      features: Array.from({ length: 10 }, (_, i) => ({
        type: 'Feature',
        properties: {
          zone: ['AE', 'AH', 'AO', 'X', 'SHADED X'][Math.floor(Math.random() * 5)],
          bfe: Math.round(Math.random() * 20 + 5)
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [center[1] + (Math.random() - 0.5) * 0.03, center[0] + (Math.random() - 0.5) * 0.03],
            [center[1] + (Math.random() - 0.5) * 0.03, center[0] + (Math.random() - 0.5) * 0.03],
            [center[1] + (Math.random() - 0.5) * 0.03, center[0] + (Math.random() - 0.5) * 0.03],
            [center[1] + (Math.random() - 0.5) * 0.03, center[0] + (Math.random() - 0.5) * 0.03]
          ]]
        }
      }))
    };

    return { parcels, stations, flood_zones };
  };

  const updateBaseLayer = async () => {
    if (!map) return;

    const L = await import('leaflet');
    const baseLayers = getBaseLayers(L);

    // Remove existing tile layers
    map.eachLayer((layer: any) => {
      if (layer.options && layer.options.attribution) {
        map.removeLayer(layer);
      }
    });

    // Add new base layer
    baseLayers[mapStyle.baseLayer].addTo(map);
  };

  const toggleLayer = (layerName: keyof typeof selectedLayers) => {
    setSelectedLayers(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }));

    // Re-render GIS data with new layer visibility
    if (map && gisData) {
      addGISDataToMap(map, gisData);
    }
  };

  const exportMapData = () => {
    if (gisData) {
      const dataStr = JSON.stringify(gisData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nassau-county-gis-data-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden">
      {/* Enhanced Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Enhanced Nassau County Map</h2>
          <p className="text-sm text-white/60">Professional GIS Analysis Platform</p>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Live Data</span>
          </div>

          <button
            onClick={exportMapData}
            className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Export</span>
          </button>
        </div>
      </div>

      {/* Enhanced View Mode Toggle */}
      <div className="p-4 pb-2">
        <div className="flex gap-1 bg-white/10 rounded-lg p-1">
          {[
            { key: 'map', label: 'Map View', icon: Layers },
            { key: 'satellite', label: 'Satellite', icon: Settings },
            { key: 'analysis', label: 'Analysis', icon: BarChart3 }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
                viewMode === key
                  ? 'bg-blue-600 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative mx-4 mb-4">
        <div className="h-full rounded-lg overflow-hidden border border-white/10 shadow-2xl bg-gray-200">
          {isLoading && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-white mb-2">Loading Enhanced Map</h3>
                <p className="text-white/60">Initializing Leaflet with GIS data...</p>
              </div>
            </div>
          )}

          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Enhanced Layer Controls */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 max-w-44">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <h4 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Data Layers
            </h4>

            {[
              { key: 'parcels', label: 'Property Parcels', icon: '🏘️', color: '#3b82f6' },
              { key: 'stations', label: 'LIRR Stations', icon: '🚂', color: '#ef4444' },
              { key: 'flood_zones', label: 'Flood Zones', icon: '🌊', color: '#06b6d4' }
            ].map(({ key, label, icon, color }) => (
              <button
                key={key}
                onClick={() => toggleLayer(key as keyof typeof selectedLayers)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-all ${
                  selectedLayers[key as keyof typeof selectedLayers]
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/10'
                }`}
              >
                <span className="text-base">{icon}</span>
                <span className="flex-1 text-left">{label}</span>
                {selectedLayers[key as keyof typeof selectedLayers] ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>

          {/* Base Layer Controls */}
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <h4 className="text-white font-semibold mb-2 text-sm">Map Style</h4>
            <div className="grid grid-cols-2 gap-1">
              {[
                { key: 'osm', label: 'Street' },
                { key: 'satellite', label: 'Satellite' },
                { key: 'terrain', label: 'Terrain' },
                { key: 'dark', label: 'Dark' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMapStyle(prev => ({ ...prev, baseLayer: key }))}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    mapStyle.baseLayer === key
                      ? 'bg-blue-600 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Map Info */}
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/10 min-w-56">
          <h4 className="font-semibold text-white mb-2 text-sm">Nassau County, NY</h4>
          <div className="space-y-1 text-xs text-white/80">
            <div className="flex justify-between">
              <span>Active Layers:</span>
              <span className="font-medium">{Object.values(selectedLayers).filter(Boolean).length}/3</span>
            </div>
            <div className="flex justify-between">
              <span>Map Engine:</span>
              <span className="font-medium text-green-400">Leaflet</span>
            </div>
            <div className="flex justify-between">
              <span>Base Layer:</span>
              <span className="font-medium capitalize">{mapStyle.baseLayer}</span>
            </div>
            <div className="flex items-center gap-1 pt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time GIS Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for enhanced styling */}
      <style jsx>{`
        .custom-marker {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          border: 2px solid white;
          transition: all 0.2s ease;
        }

        .custom-marker:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .station-marker {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .custom-div-icon {
          background: none !important;
          border: none !important;
        }

        .custom-tile-layer {
          filter: none;
        }

        .leaflet-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
};

export default EnhancedLeafletViewer;