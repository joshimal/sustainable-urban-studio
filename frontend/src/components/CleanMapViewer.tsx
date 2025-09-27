import React, { useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Layers, BarChart3, Eye, EyeOff } from 'lucide-react';

interface CleanMapViewerProps {
  center?: [number, number];
  zoom?: number;
}

const CleanMapViewer: React.FC<CleanMapViewerProps> = ({
  center = [-73.5143, 40.7259],
  zoom = 10
}) => {
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom: zoom,
    bearing: 0,
    pitch: 0
  });

  const [viewMode, setViewMode] = useState<'map' | 'analysis'>('map');
  const [selectedLayers, setSelectedLayers] = useState({
    environmental: true,
    transportation: true,
    development: false
  });

  const toggleLayer = (layer: keyof typeof selectedLayers) => {
    setSelectedLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  // Sample data points for Nassau County
  const sampleData = [
    { id: 1, lng: -73.6187, lat: 40.7062, type: 'environmental', name: 'Hempstead Park' },
    { id: 2, lng: -73.6343, lat: 40.7268, type: 'transportation', name: 'Garden City Station' },
    { id: 3, lng: -73.5876, lat: 40.7557, type: 'development', name: 'Westbury Development' },
    { id: 4, lng: -73.5251, lat: 40.7684, type: 'transportation', name: 'Hicksville Station' },
    { id: 5, lng: -73.6404, lat: 40.7490, type: 'environmental', name: 'Mineola Green Space' }
  ];

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'environmental': return '#22c55e';
      case 'transportation': return '#ef4444';
      case 'development': return '#fbbf24';
      default: return '#6b7280';
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'environmental': return '🌳';
      case 'transportation': return '🚂';
      case 'development': return '🏗️';
      default: return '📍';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">
          Nassau County Interactive Map
        </h2>

        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Live Data</span>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="p-4 pb-2">
        <div className="flex gap-1 bg-white/10 rounded-lg p-1">
          <button
            onClick={() => setViewMode('map')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
            Map View
          </button>
          <button
            onClick={() => setViewMode('analysis')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
              viewMode === 'analysis'
                ? 'bg-blue-600 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analysis
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative mx-4 mb-4">
        {viewMode === 'map' ? (
          <div className="h-full rounded-lg overflow-hidden border border-white/10 shadow-2xl">
            <Map
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              mapboxAccessToken="pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
            >
              {/* Sample Data Markers */}
              {sampleData
                .filter(point => selectedLayers[point.type as keyof typeof selectedLayers])
                .map((point) => (
                  <Marker
                    key={point.id}
                    longitude={point.lng}
                    latitude={point.lat}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl cursor-pointer shadow-lg border-2 border-white transition-all duration-200 hover:scale-110 hover:shadow-xl"
                      style={{
                        backgroundColor: getMarkerColor(point.type)
                      }}
                    >
                      {getMarkerIcon(point.type)}
                    </div>
                  </Marker>
                ))}
            </Map>
          </div>
        ) : (
          /* Analysis View */
          <div className="h-full bg-gradient-to-br from-green-500/10 via-blue-500/10 to-red-500/10 rounded-lg flex items-center justify-center relative border border-white/10">
            <h3 className="text-4xl text-white/80 font-semibold">
              Analysis View Coming Soon
            </h3>
          </div>
        )}

        {/* Layer Controls */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {[
            { key: 'environmental', color: '#22c55e', label: 'Environmental', icon: '🌳' },
            { key: 'transportation', color: '#ef4444', label: 'Transportation', icon: '🚂' },
            { key: 'development', color: '#fbbf24', label: 'Development', icon: '🏗️' }
          ].map((layer) => (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key as keyof typeof selectedLayers)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border transition-all min-w-36 ${
                selectedLayers[layer.key as keyof typeof selectedLayers]
                  ? 'bg-black/30 border-white/30 text-white'
                  : 'bg-black/20 border-white/20 text-white/70 opacity-75'
              }`}
              style={{
                borderColor: selectedLayers[layer.key as keyof typeof selectedLayers] ? layer.color : undefined
              }}
            >
              <span className="text-base">{layer.icon}</span>
              <span className="text-sm font-medium">{layer.label}</span>
              {selectedLayers[layer.key as keyof typeof selectedLayers] ? (
                <Eye className="w-4 h-4 ml-auto" />
              ) : (
                <EyeOff className="w-4 h-4 ml-auto" />
              )}
            </button>
          ))}
        </div>

        {/* Map Info */}
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/10 min-w-48">
          <h4 className="font-semibold text-white mb-2 text-sm">Nassau County</h4>
          <div className="space-y-1 text-xs text-white/80">
            <div>Active Layers: {Object.values(selectedLayers).filter(Boolean).length}/3</div>
            <div>Zoom Level: {Math.round(viewState.zoom)}</div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Real-time Data</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleanMapViewer;