import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Source, Layer } from 'react-map-gl';
import { MAPBOX_CONFIG } from '../config/mapbox';
import { MapboxFeatureCollection } from '../utils/mapboxHelpers';

interface AdvancedMapFeaturesProps {
  mapData: {
    parcels?: MapboxFeatureCollection | null;
    buildings?: MapboxFeatureCollection | null;
    sustainability_metrics?: MapboxFeatureCollection | null;
    density_data?: MapboxFeatureCollection | null;
  };
  layerVisibility: Record<string, boolean>;
  analysisMode: 'choropleth' | 'heatmap' | '3d' | 'time-series' | 'none';
  selectedMetric: string;
  timeSliderValue?: number;
}

const AdvancedMapFeatures: React.FC<AdvancedMapFeaturesProps> = ({
  mapData,
  layerVisibility,
  analysisMode,
  selectedMetric,
  timeSliderValue = 0
}) => {
  // Generate choropleth map based on sustainability metrics
  const createChoroplethLayer = useCallback(() => {
    if (!mapData.sustainability_metrics?.features?.length || analysisMode !== 'choropleth') {
      return null;
    }

    // Create color expression based on selected metric
    const colorExpression = [
      'interpolate',
      ['linear'],
      ['get', selectedMetric],
      0, '#f7fee7',    // Light green
      25, '#84cc16',   // Green
      50, '#eab308',   // Yellow
      75, '#f97316',   // Orange
      100, '#dc2626'   // Red
    ];

    return (
      <Source id="choropleth-source" type="geojson" data={mapData.sustainability_metrics}>
        <Layer
          id="choropleth-layer"
          type="fill"
          paint={{
            'fill-color': colorExpression,
            'fill-opacity': 0.7,
            'fill-outline-color': '#ffffff'
          }}
          layout={{
            visibility: layerVisibility['choropleth'] ? 'visible' : 'none'
          }}
        />
        <Layer
          id="choropleth-labels"
          type="symbol"
          layout={{
            'text-field': [
              'format',
              ['get', selectedMetric],
              { 'font-scale': 0.8 }
            ],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 10,
            'text-allow-overlap': false,
            visibility: layerVisibility['choropleth'] ? 'visible' : 'none'
          }}
          paint={{
            'text-color': '#1f2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1
          }}
        />
      </Source>
    );
  }, [mapData.sustainability_metrics, analysisMode, selectedMetric, layerVisibility]);

  // Generate heatmap for density analysis
  const createHeatmapLayer = useCallback(() => {
    if (!mapData.density_data?.features?.length || analysisMode !== 'heatmap') {
      return null;
    }

    return (
      <Source id="heatmap-source" type="geojson" data={mapData.density_data}>
        <Layer
          id="heatmap-layer"
          type="heatmap"
          maxzoom={15}
          paint={{
            // Increase the heatmap weight based on selected metric
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', selectedMetric],
              0, 0,
              100, 1
            ],
            // Increase the heatmap color weight weight by zoom level
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1,
              15, 3
            ],
            // Color ramp for heatmap
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(178,24,43)'
            ],
            // Adjust the heatmap radius by zoom level
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 2,
              15, 20
            ],
            // Transition from heatmap to circle layer by zoom level
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              7, 1,
              15, 0
            ]
          }}
          layout={{
            visibility: layerVisibility['heatmap'] ? 'visible' : 'none'
          }}
        />
        {/* Point layer for higher zoom levels */}
        <Layer
          id="heatmap-points"
          type="circle"
          minzoom={14}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', selectedMetric],
              0, 5,
              100, 20
            ],
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', selectedMetric],
              0, '#313695',
              25, '#74add1',
              50, '#fed976',
              75, '#feb24c',
              100, '#fd8d3c'
            ],
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              7, 0,
              15, 0.8
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
          }}
          layout={{
            visibility: layerVisibility['heatmap'] ? 'visible' : 'none'
          }}
        />
      </Source>
    );
  }, [mapData.density_data, analysisMode, selectedMetric, layerVisibility]);

  // Create 3D building extrusions
  const create3DBuildingLayer = useCallback(() => {
    if (!mapData.buildings?.features?.length || analysisMode !== '3d') {
      return null;
    }

    return (
      <Source id="buildings-3d-source" type="geojson" data={mapData.buildings}>
        <Layer
          id="buildings-3d-layer"
          type="fill-extrusion"
          paint={{
            'fill-extrusion-color': [
              'case',
              ['has', selectedMetric],
              [
                'interpolate',
                ['linear'],
                ['get', selectedMetric],
                0, '#e3f2fd',
                25, '#90caf9',
                50, '#42a5f5',
                75, '#1976d2',
                100, '#0d47a1'
              ],
              '#bdbdbd'
            ],
            'fill-extrusion-height': [
              'case',
              ['has', 'height'],
              ['get', 'height'],
              ['*', ['get', selectedMetric, 0], 0.5] // Default height based on metric
            ],
            'fill-extrusion-base': [
              'case',
              ['has', 'min_height'],
              ['get', 'min_height'],
              0
            ],
            'fill-extrusion-opacity': 0.8
          }}
          layout={{
            visibility: layerVisibility['3d-buildings'] ? 'visible' : 'none'
          }}
        />
      </Source>
    );
  }, [mapData.buildings, analysisMode, selectedMetric, layerVisibility]);

  // Create clustering layer for point data
  const createClusteringLayer = useCallback(() => {
    if (!mapData.parcels?.features?.length) return null;

    const clusterData = {
      ...mapData.parcels,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    };

    return (
      <Source id="cluster-source" type="geojson" data={clusterData}>
        {/* Clusters */}
        <Layer
          id="clusters"
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#51bbd6',
              100,
              '#f1c40f',
              750,
              '#f28cb1'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              100,
              30,
              750,
              40
            ]
          }}
          layout={{
            visibility: layerVisibility['clustering'] ? 'visible' : 'none'
          }}
        />

        {/* Cluster count labels */}
        <Layer
          id="cluster-count"
          type="symbol"
          filter={['has', 'point_count']}
          layout={{
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            visibility: layerVisibility['clustering'] ? 'visible' : 'none'
          }}
          paint={{
            'text-color': '#ffffff'
          }}
        />

        {/* Individual points */}
        <Layer
          id="unclustered-point"
          type="circle"
          filter={['!', ['has', 'point_count']]}
          paint={{
            'circle-color': [
              'case',
              ['has', selectedMetric],
              [
                'interpolate',
                ['linear'],
                ['get', selectedMetric],
                0, '#11b4da',
                50, '#f1c40f',
                100, '#e74c3c'
              ],
              '#11b4da'
            ],
            'circle-radius': 6,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }}
          layout={{
            visibility: layerVisibility['clustering'] ? 'visible' : 'none'
          }}
        />
      </Source>
    );
  }, [mapData.parcels, selectedMetric, layerVisibility]);

  // Create time-series animation layer
  const createTimeSeriesLayer = useCallback(() => {
    if (!mapData.sustainability_metrics?.features?.length || analysisMode !== 'time-series') {
      return null;
    }

    // Filter features based on time slider value
    const timeFilteredFeatures = mapData.sustainability_metrics.features.filter(feature => {
      const timeValue = feature.properties?.time_period || 0;
      return timeValue <= timeSliderValue;
    });

    const timeFilteredData: MapboxFeatureCollection = {
      type: 'FeatureCollection',
      features: timeFilteredFeatures
    };

    return (
      <Source id="time-series-source" type="geojson" data={timeFilteredData}>
        <Layer
          id="time-series-layer"
          type="fill"
          paint={{
            'fill-color': [
              'interpolate',
              ['linear'],
              ['get', selectedMetric],
              0, '#f0fdf4',
              25, '#86efac',
              50, '#fbbf24',
              75, '#fb7185',
              100, '#dc2626'
            ],
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'time_period'],
              0, 0.3,
              timeSliderValue, 0.8
            ]
          }}
          layout={{
            visibility: layerVisibility['time-series'] ? 'visible' : 'none'
          }}
        />

        {/* Animated points */}
        <Layer
          id="time-series-points"
          type="circle"
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'time_period'],
              0, 3,
              timeSliderValue, 8
            ],
            'circle-color': '#3b82f6',
            'circle-opacity': 0.8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }}
          layout={{
            visibility: layerVisibility['time-series'] ? 'visible' : 'none'
          }}
        />
      </Source>
    );
  }, [mapData.sustainability_metrics, analysisMode, selectedMetric, timeSliderValue, layerVisibility]);

  // Create buffer zones visualization
  const createBufferZonesLayer = useCallback(() => {
    // This would be generated dynamically based on user selections
    // For now, we'll create example buffer zones around transit stations
    if (!layerVisibility['buffer-zones']) return null;

    // Example: Create 500m buffer zones around stations
    const bufferZones: MapboxFeatureCollection = {
      type: 'FeatureCollection',
      features: [] // This would be populated by buffer calculation
    };

    return (
      <Source id="buffer-zones-source" type="geojson" data={bufferZones}>
        <Layer
          id="buffer-zones-layer"
          type="fill"
          paint={{
            'fill-color': '#3b82f6',
            'fill-opacity': 0.2,
            'fill-outline-color': '#1d4ed8'
          }}
          layout={{
            visibility: layerVisibility['buffer-zones'] ? 'visible' : 'none'
          }}
        />
      </Source>
    );
  }, [layerVisibility]);

  // Create compare mode visualization (before/after scenarios)
  const createCompareModeLayer = useCallback(() => {
    if (!layerVisibility['compare-mode']) return null;

    // This would show before/after scenarios side by side or with transparency
    return (
      <>
        {/* Before scenario */}
        <Source id="before-scenario-source" type="geojson" data={mapData.sustainability_metrics || { type: 'FeatureCollection', features: [] }}>
          <Layer
            id="before-scenario-layer"
            type="fill"
            paint={{
              'fill-color': '#ef4444',
              'fill-opacity': 0.5
            }}
          />
        </Source>

        {/* After scenario */}
        <Source id="after-scenario-source" type="geojson" data={mapData.sustainability_metrics || { type: 'FeatureCollection', features: [] }}>
          <Layer
            id="after-scenario-layer"
            type="fill"
            paint={{
              'fill-color': '#22c55e',
              'fill-opacity': 0.5
            }}
          />
        </Source>
      </>
    );
  }, [layerVisibility, mapData.sustainability_metrics]);

  return (
    <>
      {createChoroplethLayer()}
      {createHeatmapLayer()}
      {create3DBuildingLayer()}
      {createClusteringLayer()}
      {createTimeSeriesLayer()}
      {createBufferZonesLayer()}
      {createCompareModeLayer()}
    </>
  );
};

export default AdvancedMapFeatures;