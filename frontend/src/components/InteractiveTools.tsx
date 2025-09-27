import React, { useState, useRef, useCallback, useEffect } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Map as MapboxMap } from 'mapbox-gl';
import * as turf from '@turf/turf';
import { calculateDistance, calculateArea, formatDistance, formatArea } from '../utils/mapboxHelpers';

interface InteractiveToolsProps {
  map: MapboxMap | null;
  onFeatureDrawn?: (feature: any) => void;
  onMeasurement?: (result: string) => void;
}

interface MeasurementState {
  type: 'distance' | 'area' | 'none';
  coordinates: [number, number][];
  result: string;
}

const InteractiveTools: React.FC<InteractiveToolsProps> = ({
  map,
  onFeatureDrawn,
  onMeasurement
}) => {
  const [activeToolMode, setActiveToolMode] = useState<string>('');
  const [measurementState, setMeasurementState] = useState<MeasurementState>({
    type: 'none',
    coordinates: [],
    result: ''
  });
  const [selectedFeatures, setSelectedFeatures] = useState<any[]>([]);
  const [bufferDistance, setBufferDistance] = useState<number>(500);

  const drawRef = useRef<MapboxDraw | null>(null);
  const measurementClickHandler = useRef<((e: any) => void) | null>(null);

  // Initialize drawing controls
  useEffect(() => {
    if (!map || drawRef.current) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        trash: true
      },
      defaultMode: 'draw_polygon',
      styles: [
        // Polygon fill
        {
          'id': 'gl-draw-polygon-fill-inactive',
          'type': 'fill',
          'filter': ['all',
            ['==', 'active', 'false'],
            ['==', '$type', 'Polygon'],
            ['!=', 'mode', 'static']
          ],
          'paint': {
            'fill-color': '#3b82f6',
            'fill-outline-color': '#3b82f6',
            'fill-opacity': 0.4
          }
        },
        // Polygon stroke
        {
          'id': 'gl-draw-polygon-stroke-inactive',
          'type': 'line',
          'filter': ['all',
            ['==', 'active', 'false'],
            ['==', '$type', 'Polygon'],
            ['!=', 'mode', 'static']
          ],
          'layout': {
            'line-cap': 'round',
            'line-join': 'round'
          },
          'paint': {
            'line-color': '#3b82f6',
            'line-width': 3
          }
        },
        // Line stroke
        {
          'id': 'gl-draw-line-inactive',
          'type': 'line',
          'filter': ['all',
            ['==', 'active', 'false'],
            ['==', '$type', 'LineString'],
            ['!=', 'mode', 'static']
          ],
          'layout': {
            'line-cap': 'round',
            'line-join': 'round'
          },
          'paint': {
            'line-color': '#ef4444',
            'line-width': 3
          }
        },
        // Points
        {
          'id': 'gl-draw-point-inactive',
          'type': 'circle',
          'filter': ['all',
            ['==', 'active', 'false'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
          ],
          'paint': {
            'circle-radius': 6,
            'circle-color': '#22c55e',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        }
      ]
    });

    map.addControl(draw as any, 'top-left');
    drawRef.current = draw;

    // Event handlers for drawing
    map.on('draw.create', handleDrawCreate);
    map.on('draw.update', handleDrawUpdate);
    map.on('draw.delete', handleDrawDelete);
    map.on('draw.selectionchange', handleSelectionChange);

    return () => {
      if (measurementClickHandler.current) {
        map.off('click', measurementClickHandler.current);
      }
      map.off('draw.create', handleDrawCreate);
      map.off('draw.update', handleDrawUpdate);
      map.off('draw.delete', handleDrawDelete);
      map.off('draw.selectionchange', handleSelectionChange);
    };
  }, [map]);

  // Drawing event handlers
  const handleDrawCreate = useCallback((e: any) => {
    const feature = e.features[0];
    console.log('Feature created:', feature);

    if (onFeatureDrawn) {
      onFeatureDrawn(feature);
    }

    // Calculate measurements for drawn features
    if (feature.geometry.type === 'LineString') {
      const distance = turf.length(feature, { units: 'meters' });
      const result = `Distance: ${formatDistance(distance)}`;
      onMeasurement?.(result);
    } else if (feature.geometry.type === 'Polygon') {
      const area = turf.area(feature);
      const result = `Area: ${formatArea(area)}`;
      onMeasurement?.(result);
    }
  }, [onFeatureDrawn, onMeasurement]);

  const handleDrawUpdate = useCallback((e: any) => {
    console.log('Feature updated:', e.features[0]);
  }, []);

  const handleDrawDelete = useCallback((e: any) => {
    console.log('Features deleted:', e.features);
    setSelectedFeatures([]);
  }, []);

  const handleSelectionChange = useCallback((e: any) => {
    setSelectedFeatures(e.features);
  }, []);

  // Tool activation methods
  const activateDrawingTool = (mode: 'draw_point' | 'draw_line_string' | 'draw_polygon') => {
    if (drawRef.current) {
      drawRef.current.changeMode(mode);
      setActiveToolMode(mode);
    }
  };

  const activateSelectionTool = () => {
    if (drawRef.current) {
      drawRef.current.changeMode('simple_select');
      setActiveToolMode('simple_select');
    }
  };

  const clearAllDrawings = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      setSelectedFeatures([]);
    }
  };

  // Measurement tools
  const startDistanceMeasurement = () => {
    if (!map) return;

    // Clean up previous measurement
    if (measurementClickHandler.current) {
      map.off('click', measurementClickHandler.current);
    }

    setMeasurementState({
      type: 'distance',
      coordinates: [],
      result: ''
    });

    let coordinates: [number, number][] = [];

    measurementClickHandler.current = (e: any) => {
      coordinates.push([e.lngLat.lng, e.lngLat.lat]);

      if (coordinates.length === 1) {
        // First click - add temporary source
        if (!map.getSource('measurement-line')) {
          map.addSource('measurement-line', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });

          map.addLayer({
            id: 'measurement-line-layer',
            type: 'line',
            source: 'measurement-line',
            paint: {
              'line-color': '#ef4444',
              'line-width': 3,
              'line-dasharray': [2, 2]
            }
          });
        }
      } else if (coordinates.length === 2) {
        // Second click - calculate distance
        const distance = calculateDistance(coordinates[0], coordinates[1]);
        const result = `Distance: ${formatDistance(distance)}`;

        // Update line on map
        const source = map.getSource('measurement-line') as any;
        source.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            },
            properties: {}
          }]
        });

        setMeasurementState({
          type: 'distance',
          coordinates,
          result
        });

        onMeasurement?.(result);

        // Clean up event listener
        map.off('click', measurementClickHandler.current!);
        measurementClickHandler.current = null;
      }
    };

    map.on('click', measurementClickHandler.current);
    setActiveToolMode('distance');
  };

  const startAreaMeasurement = () => {
    if (!map) return;

    // Clean up previous measurement
    if (measurementClickHandler.current) {
      map.off('click', measurementClickHandler.current);
    }

    setMeasurementState({
      type: 'area',
      coordinates: [],
      result: ''
    });

    let coordinates: [number, number][] = [];

    measurementClickHandler.current = (e: any) => {
      coordinates.push([e.lngLat.lng, e.lngLat.lat]);

      if (coordinates.length >= 3) {
        // Close the polygon
        const closedCoordinates = [...coordinates, coordinates[0]];
        const area = calculateArea(coordinates);
        const result = `Area: ${formatArea(area)}`;

        // Add/update polygon on map
        if (!map.getSource('measurement-polygon')) {
          map.addSource('measurement-polygon', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });

          map.addLayer({
            id: 'measurement-polygon-layer',
            type: 'fill',
            source: 'measurement-polygon',
            paint: {
              'fill-color': '#22c55e',
              'fill-opacity': 0.3,
              'fill-outline-color': '#22c55e'
            }
          });
        }

        const source = map.getSource('measurement-polygon') as any;
        source.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [closedCoordinates]
            },
            properties: {}
          }]
        });

        setMeasurementState({
          type: 'area',
          coordinates,
          result
        });

        onMeasurement?.(result);

        // Clean up event listener
        map.off('click', measurementClickHandler.current!);
        measurementClickHandler.current = null;
      }
    };

    map.on('click', measurementClickHandler.current);
    setActiveToolMode('area');
  };

  const clearMeasurements = () => {
    if (!map) return;

    // Remove measurement layers
    ['measurement-line-layer', 'measurement-polygon-layer'].forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });

    ['measurement-line', 'measurement-polygon'].forEach(sourceId => {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    // Clean up event listeners
    if (measurementClickHandler.current) {
      map.off('click', measurementClickHandler.current);
      measurementClickHandler.current = null;
    }

    setMeasurementState({
      type: 'none',
      coordinates: [],
      result: ''
    });

    setActiveToolMode('');
  };

  // Buffer zone creation
  const createBufferZone = () => {
    if (!selectedFeatures.length || !map) return;

    selectedFeatures.forEach((feature, index) => {
      const buffered = turf.buffer(feature, bufferDistance, { units: 'meters' });

      const sourceId = `buffer-zone-${index}`;

      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }

      map.addSource(sourceId, {
        type: 'geojson',
        data: buffered
      });

      if (!map.getLayer(`${sourceId}-layer`)) {
        map.addLayer({
          id: `${sourceId}-layer`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#8b5cf6',
            'fill-opacity': 0.3,
            'fill-outline-color': '#7c3aed'
          }
        });
      }
    });
  };

  // Spatial selection tools
  const performSpatialSelection = (selectionType: 'intersect' | 'within' | 'contains') => {
    if (!selectedFeatures.length || !map) return;

    // This would perform spatial queries against backend data
    console.log(`Performing ${selectionType} selection with:`, selectedFeatures);

    // Example: Find parcels within drawn polygon
    const results = [];
    // Backend API call would go here

    onFeatureDrawn?.({
      type: 'selection-result',
      features: results,
      selectionType
    });
  };

  return (
    <div className="interactive-tools-panel">
      <div className="tool-section">
        <h4>Drawing Tools</h4>
        <div className="tool-buttons">
          <button
            className={activeToolMode === 'draw_point' ? 'active' : ''}
            onClick={() => activateDrawingTool('draw_point')}
            title="Draw Point"
          >
            📍 Point
          </button>
          <button
            className={activeToolMode === 'draw_line_string' ? 'active' : ''}
            onClick={() => activateDrawingTool('draw_line_string')}
            title="Draw Line"
          >
            📏 Line
          </button>
          <button
            className={activeToolMode === 'draw_polygon' ? 'active' : ''}
            onClick={() => activateDrawingTool('draw_polygon')}
            title="Draw Polygon"
          >
            ⬜ Polygon
          </button>
          <button
            className={activeToolMode === 'simple_select' ? 'active' : ''}
            onClick={activateSelectionTool}
            title="Select Features"
          >
            👆 Select
          </button>
          <button
            onClick={clearAllDrawings}
            title="Clear All Drawings"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="tool-section">
        <h4>Measurement Tools</h4>
        <div className="tool-buttons">
          <button
            className={activeToolMode === 'distance' ? 'active' : ''}
            onClick={startDistanceMeasurement}
            title="Measure Distance"
          >
            📐 Distance
          </button>
          <button
            className={activeToolMode === 'area' ? 'active' : ''}
            onClick={startAreaMeasurement}
            title="Measure Area"
          >
            📊 Area
          </button>
          <button
            onClick={clearMeasurements}
            title="Clear Measurements"
          >
            🧹 Clear
          </button>
        </div>
        {measurementState.result && (
          <div className="measurement-result">
            {measurementState.result}
          </div>
        )}
      </div>

      <div className="tool-section">
        <h4>Analysis Tools</h4>
        <div className="buffer-controls">
          <label>
            Buffer Distance (m):
            <input
              type="number"
              value={bufferDistance}
              onChange={(e) => setBufferDistance(Number(e.target.value))}
              min="1"
              max="5000"
              step="10"
            />
          </label>
          <button
            onClick={createBufferZone}
            disabled={!selectedFeatures.length}
            title="Create Buffer Zone"
          >
            🎯 Buffer
          </button>
        </div>

        <div className="spatial-selection">
          <h5>Spatial Selection:</h5>
          <div className="tool-buttons">
            <button
              onClick={() => performSpatialSelection('intersect')}
              disabled={!selectedFeatures.length}
              title="Find Intersecting Features"
            >
              ⚡ Intersect
            </button>
            <button
              onClick={() => performSpatialSelection('within')}
              disabled={!selectedFeatures.length}
              title="Find Features Within"
            >
              📦 Within
            </button>
            <button
              onClick={() => performSpatialSelection('contains')}
              disabled={!selectedFeatures.length}
              title="Find Features That Contain"
            >
              🎭 Contains
            </button>
          </div>
        </div>
      </div>

      {selectedFeatures.length > 0 && (
        <div className="tool-section">
          <h4>Selected Features</h4>
          <p>{selectedFeatures.length} feature(s) selected</p>
          <div className="selected-features-info">
            {selectedFeatures.map((feature, index) => (
              <div key={index} className="feature-info">
                <strong>{feature.geometry.type}</strong>
                {feature.properties?.name && <span> - {feature.properties.name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .interactive-tools-panel {
          position: absolute;
          top: 60px;
          left: 10px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          z-index: 1;
          min-width: 250px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .tool-section {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .tool-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .tool-section h4 {
          margin: 0 0 12px 0;
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
        }

        .tool-section h5 {
          margin: 8px 0 6px 0;
          color: #374151;
          font-size: 12px;
          font-weight: 500;
        }

        .tool-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tool-buttons button {
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tool-buttons button:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .tool-buttons button.active {
          background: #3b82f6;
          color: white;
          border-color: #2563eb;
        }

        .tool-buttons button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .buffer-controls {
          margin-bottom: 12px;
        }

        .buffer-controls label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: #374151;
          margin-bottom: 8px;
        }

        .buffer-controls input {
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 12px;
        }

        .measurement-result {
          margin-top: 8px;
          padding: 8px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          font-size: 12px;
          color: #0c4a6e;
          font-weight: 500;
        }

        .selected-features-info {
          margin-top: 8px;
        }

        .feature-info {
          padding: 4px;
          background: #f9fafb;
          border-radius: 4px;
          margin-bottom: 4px;
          font-size: 12px;
          color: #374151;
        }

        .spatial-selection {
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
};

export default InteractiveTools;