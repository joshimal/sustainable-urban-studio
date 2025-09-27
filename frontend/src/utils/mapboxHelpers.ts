// Mapbox GL JS Utility Functions
import { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';
import { MAPBOX_CONFIG, getColorExpression } from '../config/mapbox';

// Type definitions
export interface MapboxFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

export interface MapboxFeatureCollection {
  type: 'FeatureCollection';
  features: MapboxFeature[];
}

export interface LayerVisibility {
  [layerId: string]: boolean;
}

// Data transformation utilities
export const transformGeoJSONForMapbox = (
  data: any,
  sourceId: string
): MapboxFeatureCollection => {
  // Ensure data is in GeoJSON FeatureCollection format
  if (!data || typeof data !== 'object') {
    console.warn(`Invalid data for source ${sourceId}:`, data);
    return { type: 'FeatureCollection', features: [] };
  }

  if (data.type === 'FeatureCollection') {
    return data;
  }

  if (data.type === 'Feature') {
    return {
      type: 'FeatureCollection',
      features: [data]
    };
  }

  // Handle array of features
  if (Array.isArray(data)) {
    return {
      type: 'FeatureCollection',
      features: data.filter(item => item && item.type === 'Feature')
    };
  }

  // Handle raw coordinates (points)
  if (data.features && Array.isArray(data.features)) {
    return {
      type: 'FeatureCollection',
      features: data.features.map((feature: any) => ({
        type: 'Feature',
        properties: feature.properties || {},
        geometry: feature.geometry || {
          type: 'Point',
          coordinates: feature.coordinates || [0, 0]
        }
      }))
    };
  }

  console.warn(`Could not transform data for source ${sourceId}:`, data);
  return { type: 'FeatureCollection', features: [] };
};

// Layer management utilities
export const addSourceAndLayer = (
  map: MapboxMap,
  sourceId: string,
  data: MapboxFeatureCollection,
  layerConfig: any
) => {
  try {
    // Remove existing source/layer if it exists
    if (map.getSource(sourceId)) {
      if (map.getLayer(layerConfig.id)) {
        map.removeLayer(layerConfig.id);
      }
      map.removeSource(sourceId);
    }

    // Add new source
    map.addSource(sourceId, {
      type: 'geojson',
      data,
      cluster: layerConfig.cluster || false,
      clusterMaxZoom: MAPBOX_CONFIG.PERFORMANCE.cluster.maxZoom,
      clusterRadius: MAPBOX_CONFIG.PERFORMANCE.cluster.radius,
    });

    // Add layer
    map.addLayer({
      ...layerConfig,
      source: sourceId,
    });

    console.log(`Added layer ${layerConfig.id} with source ${sourceId}`);
  } catch (error) {
    console.error(`Error adding layer ${layerConfig.id}:`, error);
  }
};

export const updateLayerVisibility = (
  map: MapboxMap,
  layerId: string,
  visible: boolean
) => {
  try {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        'visibility',
        visible ? 'visible' : 'none'
      );
    }
  } catch (error) {
    console.error(`Error updating visibility for layer ${layerId}:`, error);
  }
};

export const updateSourceData = (
  map: MapboxMap,
  sourceId: string,
  data: MapboxFeatureCollection
) => {
  try {
    const source = map.getSource(sourceId) as GeoJSONSource;
    if (source && source.type === 'geojson') {
      source.setData(data);
    }
  } catch (error) {
    console.error(`Error updating source data for ${sourceId}:`, error);
  }
};

// Style utilities
export const createDynamicLayerStyle = (
  layerType: 'fill' | 'circle' | 'line' | 'symbol',
  property: string,
  colorScheme: Record<string, string>,
  additionalPaint?: Record<string, any>
) => {
  const baseStyle = { ...MAPBOX_CONFIG.LAYER_CONFIGS[layerType]?.paint };

  let colorProperty: string;
  switch (layerType) {
    case 'fill':
      colorProperty = 'fill-color';
      break;
    case 'circle':
      colorProperty = 'circle-color';
      break;
    case 'line':
      colorProperty = 'line-color';
      break;
    default:
      colorProperty = 'fill-color';
  }

  return {
    ...baseStyle,
    [colorProperty]: getColorExpression(property, colorScheme),
    ...additionalPaint,
  };
};

// Popup utilities
export const createPopupContent = (
  feature: MapboxFeature,
  type: 'parcel' | 'station' | 'flood_zone' | 'custom'
): string => {
  const props = feature.properties || {};

  switch (type) {
    case 'parcel':
      return `
        <div class="popup-content">
          <h4>Parcel ${props.gpin || 'Unknown'}</h4>
          <p><strong>Zoning:</strong> ${props.zoning || 'N/A'}</p>
          <p><strong>Area:</strong> ${props.acreage || 'N/A'} acres</p>
          <p><strong>Value:</strong> $${(props.market_value || 0).toLocaleString()}</p>
          <p><strong>Type:</strong> ${props.property_class || 'N/A'}</p>
          <p><strong>Town:</strong> ${props.town || 'N/A'}</p>
        </div>
      `;

    case 'station':
      return `
        <div class="popup-content">
          <h4>${props.name || 'Unknown'} Station</h4>
          <p><strong>Line:</strong> ${props.branch || props.line || 'N/A'}</p>
          <p><strong>Type:</strong> LIRR Station</p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
            Transit-oriented development opportunities
          </p>
        </div>
      `;

    case 'flood_zone':
      return `
        <div class="popup-content">
          <h4>Flood Zone ${props.zone || 'Unknown'}</h4>
          <p>${props.description || 'No description available'}</p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
            ${getFloodZoneDescription(props.zone)}
          </p>
        </div>
      `;

    default:
      return `
        <div class="popup-content">
          <h4>Feature Information</h4>
          ${Object.entries(props).map(([key, value]) =>
            `<p><strong>${key}:</strong> ${value}</p>`
          ).join('')}
        </div>
      `;
  }
};

const getFloodZoneDescription = (zone: string): string => {
  switch (zone) {
    case 'AE':
      return 'Properties require flood insurance';
    case 'VE':
      return 'High-risk coastal area - building restrictions apply';
    case 'X':
      return 'Lower flood risk area';
    default:
      return 'Flood risk information available upon request';
  }
};

// Animation utilities
export const animateToFeature = (
  map: MapboxMap,
  feature: MapboxFeature,
  options: {
    zoom?: number;
    pitch?: number;
    bearing?: number;
    padding?: number;
  } = {}
) => {
  const geometry = feature.geometry;

  if (geometry.type === 'Point') {
    map.flyTo({
      center: geometry.coordinates as [number, number],
      zoom: options.zoom || 15,
      pitch: options.pitch || 0,
      bearing: options.bearing || 0,
      duration: MAPBOX_CONFIG.ANIMATION.duration,
    });
  } else {
    // For polygons and lines, fit to bounds
    const coordinates = getAllCoordinates(geometry);
    const bounds = getBounds(coordinates);

    map.fitBounds(bounds, {
      padding: options.padding || 50,
      duration: MAPBOX_CONFIG.ANIMATION.duration,
    });
  }
};

const getAllCoordinates = (geometry: any): number[][] => {
  switch (geometry.type) {
    case 'LineString':
      return geometry.coordinates;
    case 'Polygon':
      return geometry.coordinates[0];
    case 'MultiPolygon':
      return geometry.coordinates.flat(2);
    default:
      return [];
  }
};

const getBounds = (coordinates: number[][]): [[number, number], [number, number]] => {
  const lngs = coordinates.map(coord => coord[0]);
  const lats = coordinates.map(coord => coord[1]);

  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)]
  ];
};

// Measurement utilities
export const calculateDistance = (
  coord1: [number, number],
  coord2: [number, number]
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1[1] * Math.PI / 180;
  const φ2 = coord2[1] * Math.PI / 180;
  const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
  const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

export const calculateArea = (coordinates: number[][]): number => {
  if (coordinates.length < 3) return 0;

  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }

  return Math.abs(area / 2);
};

export const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  } else {
    return `${(distance / 1000).toFixed(2)} km`;
  }
};

export const formatArea = (area: number): string => {
  if (area < 10000) {
    return `${Math.round(area)} m²`;
  } else {
    return `${(area / 10000).toFixed(2)} ha`;
  }
};

// Clustering utilities
export const createClusterLayer = (sourceId: string) => [
  {
    id: `${sourceId}-clusters`,
    type: 'circle' as const,
    source: sourceId,
    filter: ['has', 'point_count'],
    paint: {
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
    }
  },
  {
    id: `${sourceId}-cluster-count`,
    type: 'symbol' as const,
    source: sourceId,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12
    }
  },
  {
    id: `${sourceId}-unclustered-point`,
    type: 'circle' as const,
    source: sourceId,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#11b4da',
      'circle-radius': 4,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff'
    }
  }
];

// Performance optimization utilities
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};