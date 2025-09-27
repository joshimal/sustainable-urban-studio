import React, { useState, useEffect, useRef } from 'react';
import { Settings, Eye, EyeOff, Download, RotateCcw, Maximize2 } from 'lucide-react';
import UltraMinimalViewer from './UltraMinimalViewer';

interface SliderConfig {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  category: 'climate' | 'urban' | 'environment';
  apiEndpoint: string;
  color: string;
}

const ProfessionalSliderViewer: React.FC = () => {
  const mapRef = useRef<any>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sliderConfig] = useState<SliderConfig[]>([
    // Climate Parameters
    { id: 'sea_level', label: 'Sea Level Rise', min: 0, max: 10, step: 0.5, value: 2.5, unit: 'ft',
      category: 'climate', apiEndpoint: '/api/climate/sea-level-rise/projection', color: '#0ea5e9' },
    { id: 'temperature', label: 'Temperature Change', min: -5, max: 15, step: 0.5, value: 3.2, unit: '°F',
      category: 'climate', apiEndpoint: '/api/climate/temperature/heatmap', color: '#ef4444' },
    { id: 'precipitation', label: 'Precipitation', min: 0, max: 200, step: 5, value: 85, unit: '% of normal',
      category: 'climate', apiEndpoint: '/api/climate/precipitation/annual', color: '#06b6d4' },

    // Urban Development
    { id: 'pop_density', label: 'Population Density', min: 0, max: 25000, step: 500, value: 8500, unit: '/km²',
      category: 'urban', apiEndpoint: '/api/urban/density/population', color: '#8b5cf6' },
    { id: 'dev_intensity', label: 'Development Intensity', min: 1, max: 10, step: 1, value: 6, unit: 'level',
      category: 'urban', apiEndpoint: '/api/urban/development/intensity', color: '#f59e0b' },
    { id: 'green_space', label: 'Green Space Coverage', min: 0, max: 100, step: 5, value: 35, unit: '%',
      category: 'urban', apiEndpoint: '/api/urban/green-space/coverage', color: '#22c55e' },

    // Environmental Quality
    { id: 'air_quality', label: 'Air Quality Index', min: 0, max: 300, step: 10, value: 85, unit: 'AQI',
      category: 'environment', apiEndpoint: '/api/environment/air-quality/index', color: '#f97316' },
    { id: 'water_quality', label: 'Water Quality', min: 0, max: 100, step: 5, value: 78, unit: 'score',
      category: 'environment', apiEndpoint: '/api/environment/water-quality/status', color: '#3b82f6' }
  ]);

  const [sliders, setSliders] = useState<{ [key: string]: number }>(() =>
    sliderConfig.reduce((acc, slider) => ({ ...acc, [slider.id]: slider.value }), {})
  );

  const [activeCategory, setActiveCategory] = useState<'climate' | 'urban' | 'environment' | 'all'>('all');
  const [visibleLayers, setVisibleLayers] = useState<{ [key: string]: boolean }>(() =>
    sliderConfig.reduce((acc, slider) => ({ ...acc, [slider.id]: true }), {})
  );

  // Initialize Leaflet
  useEffect(() => {
    const initMap = async () => {
      try {
        console.log('🗺️ Initializing Leaflet map...');
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        if (!mapRef.current) {
          console.error('❌ Map container not found');
          return;
        }

        const leafletMap = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([40.7259, -73.5143], 10);

        console.log('✅ Map initialized successfully');

        // Professional base map
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB'
        }).addTo(leafletMap);

        console.log('✅ Tile layer added');

        // Add custom zoom control
        L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

        setMap(leafletMap);
        setIsLoading(false);

        // Invalidate size after a short delay to ensure proper rendering
        setTimeout(() => {
          leafletMap.invalidateSize();
          console.log('✅ Map size invalidated');
        }, 100);

        console.log('✅ Map setup complete');
      } catch (error) {
        console.error('❌ Error initializing map:', error);
        setIsLoading(false);
      }
    };

    if (mapRef.current && !map) {
      // Small delay to ensure the DOM is ready
      const timer = setTimeout(() => {
        initMap();
      }, 50);
      return () => clearTimeout(timer);
    }

    return () => {
      if (map) {
        console.log('🧹 Cleaning up map');
        map.remove();
      }
    };
  }, [map]);

  // Update map when sliders change
  useEffect(() => {
    if (map) {
      updateMapVisualization();
    }
  }, [sliders, visibleLayers, map]);

  const updateMapVisualization = async () => {
    if (!map) return;

    const L = await import('leaflet');

    // Clear existing layers
    map.eachLayer((layer: any) => {
      if (layer.options && !layer.options.attribution) {
        map.removeLayer(layer);
      }
    });

    // Add heat map visualization based on slider values
    addHeatMapLayers(L);
  };

  const addHeatMapLayers = (L: any) => {
    // Generate heat map data based on slider values
    const heatData = generateHeatMapData();

    heatData.forEach((dataSet) => {
      if (visibleLayers[dataSet.id]) {
        const layer = L.geoJSON(dataSet.geoJSON, {
          style: {
            color: dataSet.color,
            weight: 1,
            fillOpacity: dataSet.intensity,
            fillColor: dataSet.color
          }
        });
        layer.addTo(map);
      }
    });
  };

  const generateHeatMapData = () => {
    // Generate synthetic heat map data based on slider values
    const center = [40.7259, -73.5143];
    const dataSet = [];

    sliderConfig.forEach((config) => {
      const intensity = (sliders[config.id] - config.min) / (config.max - config.min);
      const features = [];

      // Create grid of polygons with varying intensity
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          const lat = center[0] + (i - 10) * 0.005;
          const lng = center[1] + (j - 10) * 0.005;
          const size = 0.002;

          // Vary intensity based on distance from center and slider value
          const distance = Math.sqrt(Math.pow(i - 10, 2) + Math.pow(j - 10, 2));
          const localIntensity = Math.max(0, intensity * (1 - distance / 15) + Math.random() * 0.2);

          if (localIntensity > 0.1) {
            features.push({
              type: 'Feature',
              properties: { value: localIntensity, parameter: config.id },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [lng - size, lat - size],
                  [lng + size, lat - size],
                  [lng + size, lat + size],
                  [lng - size, lat + size],
                  [lng - size, lat - size]
                ]]
              }
            });
          }
        }
      }

      dataSet.push({
        id: config.id,
        color: config.color,
        intensity: Math.min(0.7, intensity),
        geoJSON: { type: 'FeatureCollection', features }
      });
    });

    return dataSet;
  };

  const handleSliderChange = (sliderId: string, value: number) => {
    setSliders(prev => ({ ...prev, [sliderId]: value }));
  };

  const toggleLayerVisibility = (layerId: string) => {
    setVisibleLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const resetAllSliders = () => {
    const resetValues = sliderConfig.reduce((acc, slider) => ({ ...acc, [slider.id]: slider.value }), {});
    setSliders(resetValues);
  };

  const exportConfiguration = () => {
    const config = {
      sliders: sliders,
      visibleLayers: visibleLayers,
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `urban-analysis-config-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredSliders = activeCategory === 'all'
    ? sliderConfig
    : sliderConfig.filter(s => s.category === activeCategory);

  return (
    <div className="h-full flex bg-gray-100">
      {/* Left Panel - Professional Sliders */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Environmental Parameters</h2>
            <div className="flex gap-2">
              <button
                onClick={resetAllSliders}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                title="Reset All"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={exportConfiguration}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                title="Export Configuration"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-1">
            {['all', 'climate', 'urban', 'environment'].map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category as any)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  activeCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredSliders.map((config) => (
            <div key={config.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <label className="text-sm font-medium text-gray-900">
                    {config.label}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 min-w-[60px] text-right">
                    {sliders[config.id]?.toFixed(1)} {config.unit}
                  </span>
                  <button
                    onClick={() => toggleLayerVisibility(config.id)}
                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {visibleLayers[config.id] ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  value={sliders[config.id]}
                  onChange={(e) => handleSliderChange(config.id, parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, ${config.color} 0%, ${config.color} ${
                      ((sliders[config.id] - config.min) / (config.max - config.min)) * 100
                    }%, #e5e7eb ${
                      ((sliders[config.id] - config.min) / (config.max - config.min)) * 100
                    }%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{config.min}{config.unit}</span>
                  <span>{config.max}{config.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {Object.values(visibleLayers).filter(Boolean).length}
              </div>
              <div className="text-xs text-gray-500">Active Layers</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {filteredSliders.length}
              </div>
              <div className="text-xs text-gray-500">Parameters</div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Environmental Model</h3>
              <p className="text-gray-600">Initializing data visualization...</p>
            </div>
          </div>
        )}

        <div className="w-full h-full">
          <UltraMinimalViewer center={[40.7259, -73.5143]} zoom={10} />
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">Map Controls</span>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <div>Active Parameters: {Object.values(visibleLayers).filter(Boolean).length}</div>
            <div>Data Resolution: High</div>
            <div>Update Mode: Real-time</div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200 max-w-xs">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Parameter Intensity</h4>
          <div className="space-y-2">
            {filteredSliders.filter(s => visibleLayers[s.id]).slice(0, 3).map((config) => (
              <div key={config.id} className="flex items-center gap-2">
                <div
                  className="w-4 h-2 rounded"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs text-gray-700">{config.label}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {sliders[config.id]?.toFixed(1)}{config.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom CSS for sliders */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default ProfessionalSliderViewer;