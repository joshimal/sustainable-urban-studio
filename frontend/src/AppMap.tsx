import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl';
// import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from './ui/button';
import { MapPin, Layers, Train, Building2, Droplets, Eye, EyeOff } from 'lucide-react';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

function AppMap() {
  const [gisData, setGisData] = useState({
    parcels: null,
    stations: null,
    flood_zones: null,
    loading: true,
    error: null
  });

  const [viewState, setViewState] = useState({
    longitude: -73.5143,
    latitude: 40.7259,
    zoom: 10,
    bearing: 0,
    pitch: 0
  });

  const [selectedLayers, setSelectedLayers] = useState({
    parcels: true,
    stations: true,
    flood_zones: true
  });

  const [selectedFeature, setSelectedFeature] = useState(null);

  useEffect(() => {
    const loadGISData = async () => {
      try {
        console.log('🔄 Loading GIS data...');
        
        const [parcelsRes, stationsRes, floodRes] = await Promise.all([
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=parcels'),
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=stations'),
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=flood_zones')
        ]);
        
        const parcels = await parcelsRes.json();
        const stations = await stationsRes.json();
        const flood_zones = await floodRes.json();
        
        console.log('✅ GIS data loaded successfully');
        
        setGisData({
          parcels: parcels.data,
          stations: stations.data,
          flood_zones: flood_zones.data,
          loading: false,
          error: null
        });
        
      } catch (error) {
        console.error('❌ Error loading GIS data:', error);
        setGisData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };
    
    loadGISData();
  }, []);

  const toggleLayer = (layer) => {
    setSelectedLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">UrbanSync</h1>
              <p className="text-sm text-slate-600">Sustainable Urban Planning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Big Map (75% width) */}
        <div className="flex-1 relative">
          <div className="h-full m-4 rounded-xl shadow-xl overflow-hidden bg-white">
            {gisData.loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4">⏳</div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading GIS Data...</h3>
                  <p className="text-slate-600">Fetching Nassau County data from the server</p>
                </div>
              </div>
            ) : gisData.error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Data</h3>
                  <p className="text-slate-600 mb-4">{gisData.error}</p>
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative h-full">
                <Map
                  {...viewState}
                  onMove={evt => setViewState(evt.viewState)}
                  style={{ width: '100%', height: '100%' }}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                  mapboxAccessToken={MAPBOX_TOKEN}
                >
                  {/* Parcels Layer */}
                  {selectedLayers.parcels && gisData.parcels && (
                    <Source id="parcels" type="geojson" data={gisData.parcels}>
                      <Layer
                        id="parcels-fill"
                        type="fill"
                        paint={{
                          'fill-color': [
                            'case',
                            ['==', ['get', 'zoning'], 'R-1'], '#22c55e',
                            ['==', ['get', 'zoning'], 'R-2'], '#fbbf24',
                            ['==', ['get', 'zoning'], 'C-1'], '#ef4444',
                            '#6b7280'
                          ],
                          'fill-opacity': 0.6
                        }}
                      />
                      <Layer
                        id="parcels-outline"
                        type="line"
                        paint={{
                          'line-color': '#ffffff',
                          'line-width': 1
                        }}
                      />
                    </Source>
                  )}

                  {/* Stations Layer */}
                  {selectedLayers.stations && gisData.stations && (
                    <Source id="stations" type="geojson" data={gisData.stations}>
                      <Layer
                        id="stations-symbol"
                        type="symbol"
                        layout={{
                          'icon-image': 'railway-15',
                          'icon-size': 1.5,
                          'text-field': ['get', 'name'],
                          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                          'text-offset': [0, 2],
                          'text-anchor': 'top'
                        }}
                        paint={{
                          'text-color': '#1f2937',
                          'text-halo-color': '#ffffff',
                          'text-halo-width': 1
                        }}
                      />
                    </Source>
                  )}

                  {/* Flood Zones Layer */}
                  {selectedLayers.flood_zones && gisData.flood_zones && (
                    <Source id="flood-zones" type="geojson" data={gisData.flood_zones}>
                      <Layer
                        id="flood-zones-fill"
                        type="fill"
                        paint={{
                          'fill-color': [
                            'case',
                            ['==', ['get', 'zone'], 'AE'], '#3b82f6',
                            ['==', ['get', 'zone'], 'VE'], '#dc2626',
                            '#6b7280'
                          ],
                          'fill-opacity': 0.4
                        }}
                      />
                    </Source>
                  )}

                  {/* Interactive Markers */}
                  {gisData.parcels?.features?.map((feature, index) => {
                    const coords = feature.geometry.coordinates[0];
                    const centroid = coords.reduce((acc, coord) => {
                      return [acc[0] + coord[0], acc[1] + coord[1]];
                    }, [0, 0]).map(sum => sum / coords.length);
                    
                    return (
                      <Marker
                        key={`parcel-${index}`}
                        longitude={centroid[0]}
                        latitude={centroid[1]}
                        anchor="center"
                      >
                        <div
                          className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform"
                          onClick={() => setSelectedFeature(feature)}
                        />
                      </Marker>
                    );
                  })}

                  {gisData.stations?.features?.map((feature, index) => (
                    <Marker
                      key={`station-${index}`}
                      longitude={feature.geometry.coordinates[0]}
                      latitude={feature.geometry.coordinates[1]}
                      anchor="center"
                    >
                      <div
                        className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform flex items-center justify-center"
                        onClick={() => setSelectedFeature(feature)}
                      >
                        <Train className="w-3 h-3 text-white" />
                      </div>
                    </Marker>
                  ))}

                  {/* Popup for selected feature */}
                  {selectedFeature && (
                    <Popup
                      longitude={selectedFeature.geometry.type === 'Point' 
                        ? selectedFeature.geometry.coordinates[0] 
                        : selectedFeature.geometry.coordinates[0][0][0]}
                      latitude={selectedFeature.geometry.type === 'Point' 
                        ? selectedFeature.geometry.coordinates[1] 
                        : selectedFeature.geometry.coordinates[0][0][1]}
                      onClose={() => setSelectedFeature(null)}
                      closeButton={true}
                    >
                      <div className="p-2 min-w-[200px]">
                        <h4 className="font-bold text-slate-900 mb-2">Feature Details</h4>
                        {Object.entries(selectedFeature.properties).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-slate-600">{key}:</span>
                            <span className="ml-2 text-slate-900">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </Popup>
                  )}
                </Map>

                {/* Layer Controls */}
                <div className="absolute top-4 left-4 z-10 w-64 bg-white rounded-lg shadow-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Map Layers
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Parcels</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLayer('parcels')}
                      >
                        {selectedLayers.parcels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Train className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">LIRR Stations</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLayer('stations')}
                      >
                        {selectedLayers.stations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Flood Zones</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLayer('flood_zones')}
                      >
                        {selectedLayers.flood_zones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Map Info */}
                <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-slate-900 mb-2">Nassau County</h3>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>Active Layers: {Object.values(selectedLayers).filter(Boolean).length}/3</p>
                      <p>Zoom: {viewState.zoom.toFixed(1)}</p>
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        Live Data
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Panel (25% width) */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Data Overview</h2>
            <p className="text-sm text-slate-600">Real-time Nassau County GIS data</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Data Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                <Building2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">
                  {gisData.parcels?.features?.length || 0}
                </div>
                <div className="text-sm text-slate-600">Parcels</div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                <Train className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">
                  {gisData.stations?.features?.length || 0}
                </div>
                <div className="text-sm text-slate-600">Stations</div>
              </div>
            </div>

            {/* Selected Feature Details */}
            {selectedFeature && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Selected Feature</h3>
                <div className="space-y-2">
                  {selectedFeature.properties.address && (
                    <div>
                      <span className="text-sm font-medium text-slate-600">Address:</span>
                      <p className="text-sm">{selectedFeature.properties.address}</p>
                    </div>
                  )}
                  {selectedFeature.properties.name && (
                    <div>
                      <span className="text-sm font-medium text-slate-600">Name:</span>
                      <p className="text-sm">{selectedFeature.properties.name}</p>
                    </div>
                  )}
                  {selectedFeature.properties.zoning && (
                    <div>
                      <span className="text-sm font-medium text-slate-600">Zoning:</span>
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {selectedFeature.properties.zoning}
                      </div>
                    </div>
                  )}
                  {selectedFeature.properties.line && (
                    <div>
                      <span className="text-sm font-medium text-slate-600">Line:</span>
                      <p className="text-sm">{selectedFeature.properties.line}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppMap;