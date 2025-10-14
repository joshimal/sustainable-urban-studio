import { LatLngBoundsLiteral } from '../types/geography';

export type ClimateLayerId =
  | 'sea_level_rise'
  | 'temperature_projection'
  | 'temperature_current'
  | 'urban_heat_island'
  | 'elevation';

export type ClimateControl =
  | 'seaLevelFeet'
  | 'scenario'
  | 'projectionYear'
  | 'analysisDate'
  | 'displayStyle'
  | 'resolution'
  | 'projectionOpacity'
  | 'seaLevelOpacity';

export interface ClimateFetchContext {
  bounds: LatLngBoundsLiteral | null;
  scenario: string;
  projectionYear: number;
  seaLevelFeet: number;
  analysisDate: string;
  displayStyle: 'depth' | 'confidence';
  resolution: number;
  projectionOpacity: number;
  useRealData: boolean;
}

export interface ClimateLayerDefinition {
  id: ClimateLayerId;
  title: string;
  description: string;
  category: 'coastal' | 'temperature' | 'topography';
  source: {
    name: string;
    url?: string;
  };
  defaultActive?: boolean;
  controls: ClimateControl[];
  fetch: {
    method: 'GET' | 'POST';
    route: string;
    /**
     * Build query parameters using the current climate control context.
     */
    query: (context: ClimateFetchContext) => Record<string, string | number | boolean>;
  };
  style: {
    color: string;
    opacity: number;
    layerType: 'point' | 'polygon' | 'heat' | 'raster';
    blendMode?: string;
    valueProperty?: string;
  };
}

export const climateLayers: ClimateLayerDefinition[] = [
  {
    id: 'sea_level_rise',
    title: 'Sea Level Rise',
    description: 'NOAA sea level rise depth grid with simulated fallback where data is unavailable.',
    category: 'coastal',
    source: {
      name: 'NOAA Sea Level Rise Viewer',
      url: 'https://coast.noaa.gov/slr/'
    },
    defaultActive: false,
    controls: ['seaLevelFeet', 'seaLevelOpacity', 'displayStyle'],
    fetch: {
      method: 'GET',
      route: '/api/noaa/sea-level-rise',
      query: ({ bounds, seaLevelFeet, displayStyle }) => {
        const { north, south, east, west } = bounds ?? {
          north: 41,
          south: 40,
          east: -73,
          west: -74
        };
        return {
          feet: seaLevelFeet,
          layer: displayStyle === 'confidence' ? '0' : '1',
          north,
          south,
          east,
          west
        };
      }
    },
    style: {
      color: '#38bdf8',
      opacity: 0.6,
      layerType: 'polygon',
      blendMode: 'normal',
      valueProperty: 'depth'
    }
  },
  {
    id: 'temperature_projection',
    title: 'Future Temperature Anomaly',
    description: 'Projected temperature anomalies from NASA NEX-GDDP (simulated values in development).',
    category: 'temperature',
    source: {
      name: 'NASA NEX-GDDP-CMIP6',
      url: 'https://www.nccs.nasa.gov/services/data-collections'
    },
    defaultActive: false,
    controls: ['scenario', 'projectionYear', 'projectionOpacity'],
    fetch: {
      method: 'GET',
      route: '/api/nasa/temperature-projection',
      query: ({ bounds, projectionYear, scenario, useRealData }) => {
        const { north, south, east, west, zoom } = bounds ?? {
          north: 41,
          south: 40,
          east: -73,
          west: -74,
          zoom: 10
        };
        return {
          north,
          south,
          east,
          west,
          year: projectionYear,
          scenario,
          use_real_data: useRealData,
          zoom
        };
      }
    },
    style: {
      color: '#fb923c',
      opacity: 0.6,
      layerType: 'point',
      blendMode: 'screen',
      valueProperty: 'tempAnomaly'
    }
  },
  // Hidden layer - Current Surface Temperature
  // {
  //   id: 'temperature_current',
  //   title: 'Current Surface Temperature',
  //   description: 'NASA GISTEMP climatology derived from NASA POWER.',
  //   category: 'temperature',
  //   source: {
  //     name: 'NASA GISTEMP',
  //     url: 'https://data.giss.nasa.gov/gistemp/'
  //   },
  //   controls: ['resolution'],
  //   fetch: {
  //     method: 'GET',
  //     route: '/api/nasa/temperature',
  //     query: ({ bounds, resolution }) => {
  //       const { north, south, east, west } = bounds ?? {
  //         north: 90,
  //         south: -90,
  //         east: 180,
  //         west: -180
  //       };
  //       return {
  //         north,
  //         south,
  //         east,
  //         west,
  //         resolution
  //       };
  //     }
  //   },
  //   style: {
  //     color: '#ef4444',
  //     opacity: 0.5,
  //     layerType: 'point',
  //     blendMode: 'screen',
  //     valueProperty: 'temperature'
  //   }
  // },
  {
    id: 'urban_heat_island',
    title: 'Urban Heat Island',
    description: 'Urban heat island intensity showing temperature differences between urban and rural areas.',
    category: 'temperature',
    source: {
      name: 'NASA MODIS LST',
      url: 'https://power.larc.nasa.gov/'
    },
    controls: ['analysisDate'],
    fetch: {
      method: 'GET',
      route: '/api/modis/lst',
      query: ({ bounds, analysisDate }) => {
        const { north, south, east, west } = bounds ?? {
          north: 41,
          south: 40,
          east: -73,
          west: -74
        };
        return {
          north,
          south,
          east,
          west,
          date: analysisDate.replace(/-/g, '')
        };
      }
    },
    style: {
      color: '#facc15',
      opacity: 0.7,
      layerType: 'point',
      blendMode: 'normal',
      valueProperty: 'heatIslandIntensity'
    }
  },
  {
    id: 'elevation',
    title: 'Elevation',
    description: 'USGS 3DEP elevation grid (simulated sample data).',
    category: 'topography',
    source: {
      name: 'USGS 3DEP',
      url: 'https://www.usgs.gov/3dep'
    },
    controls: [],
    fetch: {
      method: 'GET',
      route: '/api/usgs/elevation',
      query: ({ bounds }) => {
        const { north, south, east, west } = bounds ?? {
          north: 41,
          south: 40,
          east: -73,
          west: -74
        };
        return {
          north,
          south,
          east,
          west,
          resolution: 20
        };
      }
    },
    style: {
      color: '#22d3ee',
      opacity: 0.5,
      layerType: 'point',
      blendMode: 'multiply',
      valueProperty: 'elevation'
    }
  }
];

export const getClimateLayer = (id: ClimateLayerId) =>
  climateLayers.find(layer => layer.id === id);
