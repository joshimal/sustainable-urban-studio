import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map as MapboxMap } from 'mapbox-gl';
import MapboxViewer from './MapboxViewer';
import AdvancedMapFeatures from './AdvancedMapFeatures';
import UrbanSustainabilityLayers from './UrbanSustainabilityLayers';
import InteractiveTools from './InteractiveTools';
import { gisApiService } from '../services/gisApiService';
import { MapboxPerformanceOptimizer, DEFAULT_PERFORMANCE_CONFIG } from '../utils/performanceOptimization';
import { MapboxFeatureCollection } from '../utils/mapboxHelpers';

interface AdvancedMapContainerProps {
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
}

interface MapData {
  parcels?: MapboxFeatureCollection | null;
  stations?: MapboxFeatureCollection | null;
  flood_zones?: MapboxFeatureCollection | null;
  buildings?: MapboxFeatureCollection | null;
  sustainability_metrics?: MapboxFeatureCollection | null;
  green_infrastructure?: MapboxFeatureCollection | null;
  transportation_network?: MapboxFeatureCollection | null;
  building_density?: MapboxFeatureCollection | null;
  environmental_indicators?: MapboxFeatureCollection | null;
  zoning_landuse?: MapboxFeatureCollection | null;
  energy_efficiency?: MapboxFeatureCollection | null;
  walkability_index?: MapboxFeatureCollection | null;
  transit_accessibility?: MapboxFeatureCollection | null;
  carbon_footprint?: MapboxFeatureCollection | null;
  density_data?: MapboxFeatureCollection | null;
}

export interface LayerVisibility {
  // Base layers
  parcels: boolean;
  'lirr-stations': boolean;
  'lirr-lines': boolean;
  'flood-zones': boolean;
  'building-3d': boolean;

  // Advanced features
  choropleth: boolean;
  heatmap: boolean;
  clustering: boolean;
  'time-series': boolean;
  'buffer-zones': boolean;
  'compare-mode': boolean;

  // Sustainability layers
  'green-infrastructure': boolean;
  'transportation-network': boolean;
  'building-density': boolean;
  'energy-efficiency': boolean;
  'environmental-indicators': boolean;
  'noise-pollution': boolean;
  'heat-island': boolean;
  walkability: boolean;
  'transit-accessibility': boolean;
  'carbon-footprint': boolean;
  'carbon-reduction': boolean;
  'renewable-energy': boolean;
  'zoning-current': boolean;
  'zoning-proposed': boolean;
  'development-opportunity': boolean;
}

const AdvancedMapContainer: React.FC<AdvancedMapContainerProps> = ({
  center = [-73.5143, 40.7259],
  zoom = 10,
  pitch = 0,
  bearing = 0
}) => {
  // State management
  const [mapData, setMapData] = useState<MapData>({});
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    // Base layers - enabled by default
    parcels: true,
    'lirr-stations': true,
    'lirr-lines': true,
    'flood-zones': true,
    'building-3d': false,

    // Advanced features - disabled by default
    choropleth: false,
    heatmap: false,
    clustering: false,
    'time-series': false,
    'buffer-zones': false,
    'compare-mode': false,

    // Sustainability layers - disabled by default
    'green-infrastructure': false,
    'transportation-network': false,
    'building-density': false,
    'energy-efficiency': false,
    'environmental-indicators': false,
    'noise-pollution': false,
    'heat-island': false,
    walkability: false,
    'transit-accessibility': false,
    'carbon-footprint': false,
    'carbon-reduction': false,
    'renewable-energy': false,
    'zoning-current': false,
    'zoning-proposed': false,
    'development-opportunity': false,
  });

  const [analysisMode, setAnalysisMode] = useState<'choropleth' | 'heatmap' | '3d' | 'time-series' | 'none'>('none');
  const [selectedMetric, setSelectedMetric] = useState<string>('sustainability_score');
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<'current' | 'projected_2030' | 'projected_2050'>('current');
  const [timeSliderValue, setTimeSliderValue] = useState<number>(2024);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showInteractiveTools, setShowInteractiveTools] = useState<boolean>(false);

  // Refs
  const mapRef = useRef<MapboxMap | null>(null);
  const performanceOptimizerRef = useRef<MapboxPerformanceOptimizer | null>(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check server health first
        const isHealthy = await gisApiService.checkHealth();
        if (!isHealthy) {
          throw new Error('GIS server is not available');
        }

        // Load basic Nassau County data
        console.log('Loading Nassau County data...');
        const basicData = await gisApiService.fetchMultipleLayers([
          { type: 'parcels' },
          { type: 'stations' },
          { type: 'flood_zones' }
        ]);

        const newMapData: MapData = {};
        Object.entries(basicData).forEach(([key, response]) => {
          if (response.success && response.data) {
            newMapData[key as keyof MapData] = response.data;
          }
        });

        setMapData(newMapData);
        console.log('Initial data loaded successfully');

      } catch (error) {
        console.error('Error loading initial data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load map data');
      }

      setLoading(false);
    };

    loadInitialData();
  }, []);

  // Load additional sustainability data when needed
  useEffect(() => {
    const loadSustainabilityData = async () => {
      if (!layerVisibility['green-infrastructure'] &&
          !layerVisibility['carbon-footprint'] &&
          !layerVisibility['building-density']) {
        return;
      }

      try {
        console.log('Loading sustainability data...');

        // This would be replaced with actual API calls when backend is ready
        const mockSustainabilityData: Partial<MapData> = {
          green_infrastructure: {
            type: 'FeatureCollection',
            features: [] // Mock data - would be loaded from API
          },
          carbon_footprint: {
            type: 'FeatureCollection',
            features: [] // Mock data
          },
          building_density: {
            type: 'FeatureCollection',
            features: [] // Mock data
          }
        };

        setMapData(prev => ({ ...prev, ...mockSustainabilityData }));

      } catch (error) {
        console.error('Error loading sustainability data:', error);
      }
    };

    loadSustainabilityData();
  }, [layerVisibility]);

  // Initialize performance optimizer
  useEffect(() => {
    if (mapRef.current && !performanceOptimizerRef.current) {
      performanceOptimizerRef.current = new MapboxPerformanceOptimizer(DEFAULT_PERFORMANCE_CONFIG);
      performanceOptimizerRef.current.initialize(mapRef.current);
    }

    return () => {
      if (performanceOptimizerRef.current) {
        performanceOptimizerRef.current.destroy();
        performanceOptimizerRef.current = null;
      }
    };
  }, [mapRef.current]);

  // Event handlers
  const handleMapRef = useCallback((map: MapboxMap | null) => {
    mapRef.current = map;
  }, []);

  const handleFeatureDrawn = useCallback((feature: any) => {
    console.log('Feature drawn:', feature);

    // Handle different types of drawn features
    if (feature.type === 'selection-result') {
      // Update map with selection results
      setMapData(prev => ({
        ...prev,
        selection_results: {
          type: 'FeatureCollection',
          features: feature.features
        }
      }));
    }
  }, []);

  const handleMeasurement = useCallback((result: string) => {
    console.log('Measurement result:', result);
    // Could display in a tooltip or status bar
  }, []);

  const toggleLayerVisibility = (layerId: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  };

  const handleAnalysisModeChange = (mode: typeof analysisMode) => {
    setAnalysisMode(mode);

    // Update layer visibility based on analysis mode
    const updates: Partial<LayerVisibility> = {};

    // Reset all analysis layers
    updates.choropleth = false;
    updates.heatmap = false;
    updates['building-3d'] = false;
    updates['time-series'] = false;

    // Enable the selected analysis mode
    if (mode !== 'none') {
      updates[mode === '3d' ? 'building-3d' : mode] = true;
    }

    setLayerVisibility(prev => ({ ...prev, ...updates }));
  };

  const handleMetricChange = (metric: string) => {
    setSelectedMetric(metric);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '1.5rem',
      border: '1px solid rgba(255,255,255,0.2)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div>
          <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>
            Nassau County Advanced GIS Platform
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>
            Powered by Mapbox GL JS • PostGIS • Real-time Analytics
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Analysis Mode Selector */}
          <select
            value={analysisMode}
            onChange={(e) => handleAnalysisModeChange(e.target.value as typeof analysisMode)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.9)',
              fontSize: '12px'
            }}
          >
            <option value="none">Standard View</option>
            <option value="choropleth">Choropleth Analysis</option>
            <option value="heatmap">Density Heatmap</option>
            <option value="3d">3D Buildings</option>
            <option value="time-series">Time Series</option>
          </select>

          {/* Metric Selector */}
          {analysisMode !== 'none' && (
            <select
              value={selectedMetric}
              onChange={(e) => handleMetricChange(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.9)',
                fontSize: '12px'
              }}
            >
              <option value="sustainability_score">Sustainability Score</option>
              <option value="population_density">Population Density</option>
              <option value="building_height">Building Height</option>
              <option value="carbon_emissions">Carbon Emissions</option>
              <option value="walkability_score">Walkability Score</option>
              <option value="transit_accessibility">Transit Access</option>
            </select>
          )}

          {/* Interactive Tools Toggle */}
          <button
            onClick={() => setShowInteractiveTools(!showInteractiveTools)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: showInteractiveTools ? '#3b82f6' : 'rgba(255,255,255,0.9)',
              color: showInteractiveTools ? 'white' : '#374151',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🛠️ Tools
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {(loading || error) && (
        <div style={{
          padding: '8px 16px',
          borderRadius: '8px',
          marginBottom: '1rem',
          background: loading ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${loading ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: loading ? '#3b82f6' : '#ef4444'
        }}>
          {loading ? '🔄 Loading advanced GIS data...' : `❌ ${error}`}
        </div>
      )}

      {/* Time Controls for Time Series */}
      {analysisMode === 'time-series' && (
        <div style={{
          padding: '12px',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <label style={{ fontSize: '12px', fontWeight: '500' }}>
            Time Period:
          </label>
          <input
            type="range"
            min="2020"
            max="2030"
            value={timeSliderValue}
            onChange={(e) => setTimeSliderValue(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '12px', fontWeight: '500', minWidth: '40px' }}>
            {timeSliderValue}
          </span>
        </div>
      )}

      {/* Map Container */}
      <div style={{
        borderRadius: '15px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        height: '700px',
        position: 'relative'
      }}>
        <MapboxViewer
          center={center}
          zoom={zoom}
          pitch={pitch}
          bearing={bearing}
        />

        {/* Advanced Map Features Overlay */}
        <AdvancedMapFeatures
          mapData={mapData}
          layerVisibility={layerVisibility}
          analysisMode={analysisMode}
          selectedMetric={selectedMetric}
          timeSliderValue={timeSliderValue}
        />

        {/* Urban Sustainability Layers Overlay */}
        <UrbanSustainabilityLayers
          sustainabilityData={mapData}
          layerVisibility={layerVisibility}
          selectedIndicator={selectedMetric}
          comparisonMode={comparisonMode}
          timeframe={timeframe}
        />

        {/* Interactive Tools Panel */}
        {showInteractiveTools && (
          <InteractiveTools
            map={mapRef.current}
            onFeatureDrawn={handleFeatureDrawn}
            onMeasurement={handleMeasurement}
          />
        )}
      </div>

      {/* Advanced Layer Controls */}
      <div style={{
        marginTop: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem'
      }}>
        {/* Base Layers */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '1rem',
          borderRadius: '12px'
        }}>
          <h4 style={{ color: 'white', margin: '0 0 0.75rem 0', fontSize: '14px' }}>
            Base Layers
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(['parcels', 'lirr-stations', 'lirr-lines', 'flood-zones', 'building-3d'] as const).map(layerId => (
              <label key={layerId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={layerVisibility[layerId]}
                  onChange={() => toggleLayerVisibility(layerId)}
                />
                {layerId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
            ))}
          </div>
        </div>

        {/* Analysis Layers */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '1rem',
          borderRadius: '12px'
        }}>
          <h4 style={{ color: 'white', margin: '0 0 0.75rem 0', fontSize: '14px' }}>
            Analysis Features
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(['choropleth', 'heatmap', 'clustering', 'time-series', 'buffer-zones'] as const).map(layerId => (
              <label key={layerId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={layerVisibility[layerId]}
                  onChange={() => toggleLayerVisibility(layerId)}
                />
                {layerId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
            ))}
          </div>
        </div>

        {/* Sustainability Layers */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '1rem',
          borderRadius: '12px'
        }}>
          <h4 style={{ color: 'white', margin: '0 0 0.75rem 0', fontSize: '14px' }}>
            Sustainability & Environment
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(['green-infrastructure', 'carbon-footprint', 'walkability', 'transit-accessibility', 'environmental-indicators'] as const).map(layerId => (
              <label key={layerId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={layerVisibility[layerId]}
                  onChange={() => toggleLayerVisibility(layerId)}
                />
                {layerId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Monitor */}
      {performanceOptimizerRef.current && (
        <div style={{
          marginTop: '1rem',
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '11px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>FPS: {performanceOptimizerRef.current.getPerformanceMetrics().fps}</span>
          <span>Features: {Object.values(mapData).reduce((count, data) => count + (data?.features?.length || 0), 0)}</span>
          <span>Mode: {analysisMode}</span>
        </div>
      )}
    </div>
  );
};

export default AdvancedMapContainer;