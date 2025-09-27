// Mapbox GL JS Configuration
export const MAPBOX_CONFIG = {
  // Using a demo token for development - replace with your own token in production
  ACCESS_TOKEN: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',

  // Default map settings
  DEFAULT_VIEWPORT: {
    longitude: -73.5143,
    latitude: 40.7259,
    zoom: 10,
    pitch: 0,
    bearing: 0,
  },

  // Map style configurations for different use cases
  STYLES: {
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    light: 'mapbox://styles/mapbox/light-v11',
    dark: 'mapbox://styles/mapbox/dark-v11',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    navigation: 'mapbox://styles/mapbox/navigation-day-v1',
  },

  // Layer configurations
  LAYER_CONFIGS: {
    parcels: {
      id: 'parcels-layer',
      type: 'fill' as const,
      paint: {
        'fill-opacity': 0.7,
        'fill-outline-color': '#ffffff',
      },
    },
    parcel_points: {
      id: 'parcel-points-layer',
      type: 'circle' as const,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2, 15, 8],
        'circle-opacity': 0.8,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
      },
    },
    flood_zones: {
      id: 'flood-zones-layer',
      type: 'fill' as const,
      paint: {
        'fill-opacity': 0.4,
        'fill-outline-color': '#ffffff',
      },
    },
    lirr_lines: {
      id: 'lirr-lines-layer',
      type: 'line' as const,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-width': 4,
        'line-opacity': 0.8,
      },
    },
    stations: {
      id: 'stations-layer',
      type: 'symbol' as const,
      layout: {
        'icon-image': 'train-icon',
        'icon-size': 1.2,
        'icon-allow-overlap': true,
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': [0, 2],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1,
      },
    },
  },

  // Color schemes for different data types
  COLOR_SCHEMES: {
    zoning: {
      'R-1': '#22c55e',    // Single family - green
      'R-A': '#16a34a',    // Large lot residential - dark green
      'R-2': '#fbbf24',    // Two family - yellow
      'R-3': '#f59e0b',    // Multi family - orange
      'C': '#ef4444',      // Commercial - red
      'M': '#8b5cf6',      // Manufacturing - purple
      'default': '#6b7280'
    },
    flood_zones: {
      'AE': '#3b82f6',     // 100-year flood - blue
      'VE': '#dc2626',     // Coastal high hazard - red
      'X': '#10b981',      // Minimal flood risk - green
      'default': '#6b7280'
    },
    lirr_lines: {
      'Main Line': '#1f2937',
      'Port Washington Branch': '#dc2626',
      'Hempstead Branch': '#059669',
      'Babylon Branch': '#7c3aed',
      'Long Beach Branch': '#ea580c',
      'default': '#1f2937'
    }
  },

  // Performance settings
  PERFORMANCE: {
    maxzoom: 18,
    minzoom: 8,
    cluster: {
      enabled: true,
      maxZoom: 14,
      radius: 50,
    },
    simplification: {
      tolerance: 0.375,
      highQuality: false,
    },
  },

  // Animation settings
  ANIMATION: {
    duration: 1000,
    easing: 'ease-in-out',
  },
};

// Utility functions for Mapbox configuration
export const getColorExpression = (
  property: string,
  colorScheme: Record<string, string>
) => {
  const expression = ['case'];

  Object.entries(colorScheme).forEach(([key, color]) => {
    if (key !== 'default') {
      expression.push(['==', ['get', property], key], color);
    }
  });

  expression.push(colorScheme.default || '#6b7280');
  return expression;
};

export const createClusterExpression = (property: string) => ({
  cluster: true,
  clusterMaxZoom: MAPBOX_CONFIG.PERFORMANCE.cluster.maxZoom,
  clusterRadius: MAPBOX_CONFIG.PERFORMANCE.cluster.radius,
  clusterProperties: {
    sum: ['+', ['get', property]],
    max: ['max', ['get', property]],
  },
});

// Map event handlers
export const MAP_EVENTS = {
  onClick: 'click',
  onHover: 'mouseenter',
  onLeave: 'mouseleave',
  onLoad: 'load',
  onStyleLoad: 'styledata',
  onSourceLoad: 'sourcedata',
};

// Default popup configuration
export const POPUP_CONFIG = {
  closeButton: true,
  closeOnClick: false,
  anchor: 'bottom' as const,
  offset: [0, -10] as [number, number],
  className: 'mapbox-popup',
};