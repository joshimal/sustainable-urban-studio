import React, { useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MapPin, Layers, BarChart3, TreePine, Train, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ShadcnMapViewerProps {
  center?: [number, number];
  zoom?: number;
}

const ShadcnMapViewer: React.FC<ShadcnMapViewerProps> = ({
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
      case 'environmental': return 'bg-green-500';
      case 'transportation': return 'bg-red-500';
      case 'development': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'environmental': return <TreePine className="w-4 h-4" />;
      case 'transportation': return <Train className="w-4 h-4" />;
      case 'development': return <Building2 className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">
          Nassau County Interactive Map
        </h3>
        
        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
          <MapPin className="w-3 h-3 mr-1" />
          Live Data
        </Badge>
      </div>

      {/* View Mode Toggle */}
      <div className="p-4 pb-2">
        <div className="flex gap-1 bg-slate-700/50 rounded-lg p-1">
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            className={cn(
              "flex-1",
              viewMode === 'map' 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "text-slate-300 hover:text-white hover:bg-slate-600"
            )}
          >
            <Layers className="w-4 h-4 mr-2" />
            Map View
          </Button>
          <Button
            variant={viewMode === 'analysis' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('analysis')}
            className={cn(
              "flex-1",
              viewMode === 'analysis' 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "text-slate-300 hover:text-white hover:bg-slate-600"
            )}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analysis
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative mx-4 mb-4">
        {viewMode === 'map' ? (
          <div className="h-full rounded-lg overflow-hidden border border-slate-600 shadow-2xl">
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
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg border-2 border-white transition-all duration-200 hover:scale-110 hover:shadow-xl",
                        getMarkerColor(point.type)
                      )}
                    >
                      {getMarkerIcon(point.type)}
                    </div>
                  </Marker>
                ))}
            </Map>
          </div>
        ) : (
          /* Analysis View */
          <div className="h-full bg-gradient-to-br from-green-500/10 via-blue-500/10 to-red-500/10 rounded-lg flex items-center justify-center border border-slate-600">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-white mb-2">Analysis View</h3>
              <p className="text-slate-400">Coming Soon</p>
            </div>
          </div>
        )}

        {/* Layer Controls */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {[
            { key: 'environmental', color: 'bg-green-500', label: 'Environmental', icon: TreePine },
            { key: 'transportation', color: 'bg-red-500', label: 'Transportation', icon: Train },
            { key: 'development', color: 'bg-yellow-500', label: 'Development', icon: Building2 }
          ].map((layer) => {
            const Icon = layer.icon;
            return (
              <Button
                key={layer.key}
                variant="outline"
                size="sm"
                onClick={() => toggleLayer(layer.key as keyof typeof selectedLayers)}
                className={cn(
                  "w-36 justify-start backdrop-blur-sm",
                  selectedLayers[layer.key as keyof typeof selectedLayers]
                    ? "bg-slate-800/80 text-white border-slate-600"
                    : "bg-slate-900/50 text-slate-300 border-slate-700 hover:bg-slate-800/50"
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {layer.label}
              </Button>
            );
          })}
        </div>

        {/* Map Info */}
        <Card className="absolute bottom-4 right-4 w-48 bg-slate-900/80 backdrop-blur-sm border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Nassau County</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            <p className="text-xs text-slate-300">
              Active Layers: {Object.values(selectedLayers).filter(Boolean).length}/3
            </p>
            <p className="text-xs text-slate-300">
              Zoom Level: {Math.round(viewState.zoom)}
            </p>
            <p className="text-xs text-slate-300">
              Real-time Data
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShadcnMapViewer;

