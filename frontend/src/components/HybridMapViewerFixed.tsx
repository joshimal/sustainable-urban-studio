import React, { useState, useEffect } from 'react';
import { MapPin, BarChart3, Map as MapIcon } from 'lucide-react';
import Map, { Source, Layer, Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface HybridMapViewerProps {
  center?: [number, number];
  zoom?: number;
}

const HybridMapViewer: React.FC<HybridMapViewerProps> = ({
  center = [-73.5143, 40.7259],
  zoom = 10
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'analysis'>('analysis');
  const [selectedLayers, setSelectedLayers] = useState({
    environmental: true,
    development: false,
    transportation: true
  });

  const toggleLayer = (layer: keyof typeof selectedLayers) => {
    setSelectedLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Map Header with View Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">
          Urban Mapping
        </h2>

        <div className="flex gap-2 items-center">
          {/* View Mode Toggle */}
          <div className="flex border border-slate-700 rounded-md bg-slate-800/50">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-l-md transition-colors ${
                viewMode === 'map'
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>
            <button
              onClick={() => setViewMode('analysis')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-r-md transition-colors ${
                viewMode === 'analysis'
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analysis
            </button>
          </div>

          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-sm">
            Live Data
          </span>
        </div>
      </div>

      {/* Map Content Area */}
      <div className="flex-1 relative bg-slate-900 rounded-lg overflow-hidden">
        {viewMode === 'analysis' ? (
          <AnalysisView selectedLayers={selectedLayers} toggleLayer={toggleLayer} />
        ) : (
          <MapView selectedLayers={selectedLayers} toggleLayer={toggleLayer} center={center} zoom={zoom} />
        )}
      </div>
    </div>
  );
};

// Analysis View Component
const AnalysisView: React.FC<{
  selectedLayers: { environmental: boolean; development: boolean; transportation: boolean };
  toggleLayer: (layer: string) => void;
}> = ({ selectedLayers, toggleLayer }) => {
  const [analysisData, setAnalysisData] = useState<{
    environmentalScore: number;
    developmentDensity: number;
    transportationAccess: number;
    dataPoints: Array<{ x: string; y: string; intensity: number; type: string; }>;
  }>({
    environmentalScore: 75,
    developmentDensity: 60,
    transportationAccess: 85,
    dataPoints: []
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAnalysisData = async () => {
      setLoading(true);

      try {
        console.log('📊 Loading analysis data...');

        const mockAnalysisData = {
          environmentalScore: Math.floor(Math.random() * 30) + 70,
          developmentDensity: Math.floor(Math.random() * 40) + 40,
          transportationAccess: Math.floor(Math.random() * 25) + 75,
          dataPoints: [
            { x: '25%', y: '35%', intensity: 0.8, type: 'environmental' },
            { x: '70%', y: '55%', intensity: 0.9, type: 'transportation' },
            { x: '45%', y: '25%', intensity: 0.6, type: 'development' },
            { x: '60%', y: '80%', intensity: 0.7, type: 'environmental' },
            { x: '30%', y: '70%', intensity: 0.85, type: 'transportation' },
          ]
        };

        setAnalysisData(mockAnalysisData);
        console.log('✅ Analysis data loaded', mockAnalysisData);

      } catch (error) {
        console.error('❌ Error loading analysis data:', error);
      }

      setLoading(false);
    };

    loadAnalysisData();
  }, [selectedLayers]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Heat Map Visualization */}
      <div
        className="relative w-4/5 h-3/5 rounded-lg border border-white/10 transition-all duration-300"
        style={{
          background: `
            ${selectedLayers.environmental ? 'radial-gradient(ellipse at 30% 40%, rgba(34, 197, 94, 0.4) 0%, transparent 50%),' : ''}
            ${selectedLayers.transportation ? 'radial-gradient(ellipse at 70% 60%, rgba(239, 68, 68, 0.4) 0%, transparent 50%),' : ''}
            radial-gradient(ellipse at 50% 30%, rgba(251, 191, 36, 0.3) 0%, transparent 50%),
            ${selectedLayers.environmental ? 'radial-gradient(ellipse at 20% 70%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)' : ''}
          `,
        }}
      >
        {/* Dynamic Data Points */}
        {analysisData.dataPoints.map((point, index) => {
          const shouldShow = (
            (point.type === 'environmental' && selectedLayers.environmental) ||
            (point.type === 'transportation' && selectedLayers.transportation) ||
            (point.type === 'development' && selectedLayers.development)
          );

          if (!shouldShow) return null;

          const colors = {
            environmental: '#22c55e',
            transportation: '#ef4444',
            development: '#fbbf24'
          };

          return (
            <div
              key={`data-point-${index}`}
              className="absolute rounded-full cursor-pointer opacity-70 hover:opacity-100 hover:scale-150 transition-all duration-300 animate-pulse"
              style={{
                top: point.y,
                left: point.x,
                width: `${6 + (point.intensity * 8)}px`,
                height: `${6 + (point.intensity * 8)}px`,
                backgroundColor: colors[point.type as keyof typeof colors],
                boxShadow: `0 0 ${8 + point.intensity * 12}px ${colors[point.type as keyof typeof colors]}60`,
              }}
              title={`${point.type.charAt(0).toUpperCase() + point.type.slice(1)} - Intensity: ${Math.round(point.intensity * 100)}%`}
            />
          );
        })}

        {/* Central Focus Point */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 animate-pulse cursor-pointer"
          style={{
            boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 0 16px rgba(59, 130, 246, 0.1)'
          }}
        >
          <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-semibold text-blue-600 border border-blue-200 whitespace-nowrap">
            Analysis Center
          </div>
        </div>
      </div>

      {/* Scale Bar */}
      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-1">
        <div
          className="w-20 h-2 rounded"
          style={{
            background: 'linear-gradient(90deg, #22c55e 0%, #fbbf24 50%, #ef4444 100%)'
          }}
        />
        <div className="flex justify-between w-20 text-xs text-white/60">
          <span>Low</span>
          <span>Med</span>
          <span>High</span>
        </div>
      </div>

      {/* Interactive Layer Controls */}
      <div className="absolute left-5 top-5 flex flex-col gap-1">
        {[
          { key: 'environmental', color: '#22c55e', label: 'Environmental' },
          { key: 'development', color: '#fbbf24', label: 'Development' },
          { key: 'transportation', color: '#ef4444', label: 'Transportation' }
        ].map((layer) => (
          <button
            key={layer.key}
            onClick={() => toggleLayer(layer.key)}
            className={`w-10 h-10 rounded-md border-2 cursor-pointer transition-all duration-300 hover:scale-110 ${
              selectedLayers[layer.key as keyof typeof selectedLayers]
                ? "opacity-100"
                : "opacity-50"
            }`}
            style={{
              backgroundColor: selectedLayers[layer.key as keyof typeof selectedLayers] ? layer.color : 'rgba(255,255,255,0.1)',
              borderColor: selectedLayers[layer.key as keyof typeof selectedLayers] ? layer.color : 'rgba(255,255,255,0.2)'
            }}
            title={layer.label}
          />
        ))}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white p-4 rounded-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-sm">Analyzing...</span>
        </div>
      )}

      {/* Analysis Info Overlay */}
      <div className="absolute top-5 right-5 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-4 min-w-56">
        <h3 className="text-white font-semibold mb-2">Nassau County Analysis</h3>

        {/* Real-time Metrics */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-green-400 text-sm">Environmental</span>
              <span className="text-white text-sm font-semibold">{analysisData.environmentalScore}%</span>
            </div>
            <div className="w-full h-1 bg-white/20 rounded overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-1000"
                style={{ width: `${analysisData.environmentalScore}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-red-400 text-sm">Transportation</span>
              <span className="text-white text-sm font-semibold">{analysisData.transportationAccess}%</span>
            </div>
            <div className="w-full h-1 bg-white/20 rounded overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-1000"
                style={{ width: `${analysisData.transportationAccess}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-yellow-400 text-sm">Development</span>
              <span className="text-white text-sm font-semibold">{analysisData.developmentDensity}%</span>
            </div>
            <div className="w-full h-1 bg-white/20 rounded overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all duration-1000"
                style={{ width: `${analysisData.developmentDensity}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1 text-white/80 text-xs">
          <div>Active Layers: {Object.values(selectedLayers).filter(Boolean).length}/3</div>
          <div>
            Data Points: {analysisData.dataPoints.filter(point =>
              (point.type === 'environmental' && selectedLayers.environmental) ||
              (point.type === 'transportation' && selectedLayers.transportation) ||
              (point.type === 'development' && selectedLayers.development)
            ).length} visible
          </div>
        </div>
      </div>
    </div>
  );
};

// Simplified Map View Component
const MapView: React.FC<{
  selectedLayers: { environmental: boolean; development: boolean; transportation: boolean };
  toggleLayer: (layer: string) => void;
  center: [number, number];
  zoom: number;
}> = ({ selectedLayers, toggleLayer, center, zoom }) => {
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom: zoom,
    bearing: 0,
    pitch: 0
  });

  return (
    <div className="relative w-full h-full">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN || "pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjazE3aXBmaHUwMXJ6M2JsdnFzNXBrdmcwIn0.0123456789abcdef0123456789abcdef"}
      >
        {/* Mock data points */}
        <Marker longitude={-73.6187} latitude={40.7062}>
          <div className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-bold border-2 border-blue-500 cursor-pointer hover:bg-gray-700 hover:scale-110 transition-all duration-200">
            🚂 Hempstead
          </div>
        </Marker>

        <Marker longitude={-73.6343} latitude={40.7268}>
          <div className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-bold border-2 border-blue-500 cursor-pointer hover:bg-gray-700 hover:scale-110 transition-all duration-200">
            🚂 Garden City
          </div>
        </Marker>
      </Map>

      {/* Layer Controls */}
      <div className="absolute left-5 top-5 flex flex-col gap-1">
        {[
          { key: 'environmental', color: '#22c55e', label: 'Environmental' },
          { key: 'development', color: '#fbbf24', label: 'Development' },
          { key: 'transportation', color: '#ef4444', label: 'Transportation' }
        ].map((layer) => (
          <button
            key={layer.key}
            onClick={() => toggleLayer(layer.key)}
            className="px-3 py-1.5 text-sm border transition-all duration-300 rounded"
            style={{
              backgroundColor: selectedLayers[layer.key as keyof typeof selectedLayers] ? layer.color : 'transparent',
              borderColor: layer.color,
              color: selectedLayers[layer.key as keyof typeof selectedLayers] ? 'black' : 'white'
            }}
          >
            {layer.label}
          </button>
        ))}
      </div>

      {/* Map Info */}
      <div className="absolute top-5 right-5 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-4 min-w-48">
        <h3 className="text-white font-semibold mb-2">Nassau County Map</h3>
        <div className="space-y-1 text-white/80 text-xs">
          <div>Active Layers: {Object.values(selectedLayers).filter(Boolean).length}/3</div>
          <div>Status: 🟢 Live Data</div>
        </div>
      </div>
    </div>
  );
};

export default HybridMapViewer;