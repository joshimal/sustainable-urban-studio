// GIS API Service for Backend Integration
import { MapboxFeatureCollection } from '../utils/mapboxHelpers';

// Types for API requests and responses
export interface GISDataRequest {
  type: 'parcels' | 'stations' | 'flood_zones' | 'buildings' | 'sustainability_metrics';
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  zoom?: number;
  filters?: Record<string, any>;
  projection?: string;
  simplify?: boolean;
  cluster?: boolean;
}

export interface GISDataResponse {
  success: boolean;
  data: MapboxFeatureCollection | null;
  metadata?: {
    totalFeatures: number;
    bbox: [number, number, number, number];
    crs: string;
    generatedAt: string;
  };
  error?: string;
}

export interface AnalysisRequest {
  type: 'buffer' | 'intersection' | 'union' | 'difference' | 'spatial_join';
  geometry: any; // GeoJSON geometry
  parameters: Record<string, any>;
  targetLayers: string[];
}

export interface AnalysisResponse {
  success: boolean;
  result: MapboxFeatureCollection | null;
  metadata?: {
    operation: string;
    processedFeatures: number;
    executionTime: number;
  };
  error?: string;
}

export interface ExportRequest {
  layers: string[];
  bbox?: [number, number, number, number];
  format: 'geojson' | 'shapefile' | 'kml' | 'gpx' | 'csv';
  crs?: string;
}

export interface LayerInfo {
  id: string;
  name: string;
  type: 'vector' | 'raster';
  geometry_type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  feature_count: number;
  bbox: [number, number, number, number];
  fields: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  last_updated: string;
  source: string;
}

export interface RealtimeDataStream {
  layerId: string;
  updateInterval: number; // milliseconds
  lastUpdate: string;
  isActive: boolean;
}

// Main GIS API Service Class
export class GISApiService {
  private baseUrl: string;
  private apiKey?: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  private realtimeStreams: Map<string, RealtimeDataStream> = new Map();

  constructor(baseUrl: string = 'http://localhost:3001/api', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Core data fetching methods
  public async fetchGISData(request: GISDataRequest): Promise<GISDataResponse> {
    try {
      const cacheKey = this.generateCacheKey('data', request);
      const cached = this.getFromCache(cacheKey);

      if (cached) {
        return cached;
      }

      const url = this.buildDataUrl(request);
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GISDataResponse = await response.json();

      // Validate and transform data
      if (data.success && data.data) {
        data.data = this.validateAndTransformGeoJSON(data.data);
      }

      this.setCache(cacheKey, data);
      return data;

    } catch (error) {
      console.error('Error fetching GIS data:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Fetch multiple layers in parallel
  public async fetchMultipleLayers(requests: GISDataRequest[]): Promise<Record<string, GISDataResponse>> {
    try {
      const promises = requests.map(async (request, index) => {
        const response = await this.fetchGISData(request);
        return [request.type || `layer_${index}`, response] as [string, GISDataResponse];
      });

      const results = await Promise.all(promises);
      return Object.fromEntries(results);

    } catch (error) {
      console.error('Error fetching multiple layers:', error);
      return {};
    }
  }

  // Real-time data streaming
  public async setupRealtimeStream(
    layerId: string,
    updateInterval: number,
    callback: (data: MapboxFeatureCollection) => void
  ): Promise<void> {
    const stream: RealtimeDataStream = {
      layerId,
      updateInterval,
      lastUpdate: new Date().toISOString(),
      isActive: true
    };

    this.realtimeStreams.set(layerId, stream);

    const pollData = async () => {
      if (!stream.isActive) return;

      try {
        const response = await this.fetchGISData({
          type: layerId as any,
          filters: { updated_since: stream.lastUpdate }
        });

        if (response.success && response.data && response.data.features.length > 0) {
          callback(response.data);
          stream.lastUpdate = new Date().toISOString();
        }

      } catch (error) {
        console.error(`Error in realtime stream for ${layerId}:`, error);
      }

      setTimeout(pollData, updateInterval);
    };

    pollData();
  }

  public stopRealtimeStream(layerId: string): void {
    const stream = this.realtimeStreams.get(layerId);
    if (stream) {
      stream.isActive = false;
      this.realtimeStreams.delete(layerId);
    }
  }

  // Spatial analysis operations
  public async performAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/analysis`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result: AnalysisResponse = await response.json();

      if (result.success && result.result) {
        result.result = this.validateAndTransformGeoJSON(result.result);
      }

      return result;

    } catch (error) {
      console.error('Error performing spatial analysis:', error);
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  }

  // Buffer analysis
  public async createBuffer(
    geometry: any,
    distance: number,
    units: 'meters' | 'kilometers' | 'feet' = 'meters'
  ): Promise<AnalysisResponse> {
    return this.performAnalysis({
      type: 'buffer',
      geometry,
      parameters: { distance, units },
      targetLayers: []
    });
  }

  // Spatial intersection
  public async findIntersections(
    geometry: any,
    targetLayers: string[]
  ): Promise<AnalysisResponse> {
    return this.performAnalysis({
      type: 'intersection',
      geometry,
      parameters: {},
      targetLayers
    });
  }

  // Layer management
  public async getLayerInfo(layerId: string): Promise<LayerInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/layers/${layerId}/info`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get layer info: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting layer info:', error);
      return null;
    }
  }

  public async getAllLayers(): Promise<LayerInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/layers`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get layers: ${response.status}`);
      }

      const result = await response.json();
      return result.layers || [];

    } catch (error) {
      console.error('Error getting all layers:', error);
      return [];
    }
  }

  // Data export
  public async exportData(request: ExportRequest): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const result = await response.json();
      return result.downloadUrl;

    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Upload GIS data
  public async uploadGISData(
    file: File,
    layerName: string,
    options: {
      crs?: string;
      encoding?: string;
      overwrite?: boolean;
    } = {}
  ): Promise<{ success: boolean; layerId?: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('layerName', layerName);
      formData.append('options', JSON.stringify(options));

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: this.getUploadHeaders(),
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error uploading GIS data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // PostGIS specific operations
  public async executePostGISQuery(
    sql: string,
    parameters: Record<string, any> = {}
  ): Promise<GISDataResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/postgis/query`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, parameters })
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status}`);
      }

      const result: GISDataResponse = await response.json();

      if (result.success && result.data) {
        result.data = this.validateAndTransformGeoJSON(result.data);
      }

      return result;

    } catch (error) {
      console.error('Error executing PostGIS query:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Query failed'
      };
    }
  }

  // Utility methods
  private buildDataUrl(request: GISDataRequest): string {
    let url = `${this.baseUrl}/qgis/nassau/get-data?type=${request.type}`;

    if (request.bbox) {
      url += `&bbox=${request.bbox.join(',')}`;
    }

    if (request.zoom) {
      url += `&zoom=${request.zoom}`;
    }

    if (request.filters) {
      const filtersParam = encodeURIComponent(JSON.stringify(request.filters));
      url += `&filters=${filtersParam}`;
    }

    if (request.simplify) {
      url += '&simplify=true';
    }

    if (request.cluster) {
      url += '&cluster=true';
    }

    return url;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private getUploadHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private validateAndTransformGeoJSON(data: any): MapboxFeatureCollection {
    // Ensure proper GeoJSON structure
    if (!data || data.type !== 'FeatureCollection') {
      console.warn('Invalid GeoJSON structure, attempting to fix');

      if (Array.isArray(data)) {
        return {
          type: 'FeatureCollection',
          features: data.filter(item => item && item.type === 'Feature')
        };
      }

      if (data.type === 'Feature') {
        return {
          type: 'FeatureCollection',
          features: [data]
        };
      }

      return { type: 'FeatureCollection', features: [] };
    }

    // Validate and clean features
    const validFeatures = (data.features || []).filter(feature => {
      return (
        feature &&
        feature.type === 'Feature' &&
        feature.geometry &&
        feature.geometry.type &&
        feature.geometry.coordinates
      );
    });

    return {
      type: 'FeatureCollection',
      features: validFeatures
    };
  }

  private generateCacheKey(prefix: string, data: any): string {
    return `${prefix}_${JSON.stringify(data)}`;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (this.cache.size > 100) {
      const oldestKeys = Array.from(this.cache.keys()).slice(0, 20);
      oldestKeys.forEach(k => this.cache.delete(k));
    }
  }

  // Health check
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/qgis/health`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return response.ok;

    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Cleanup resources
  public destroy(): void {
    // Stop all realtime streams
    this.realtimeStreams.forEach((_, layerId) => {
      this.stopRealtimeStream(layerId);
    });

    // Clear cache
    this.cache.clear();
  }
}

// Singleton instance for global use
export const gisApiService = new GISApiService();

// Utility functions for common operations
export const fetchNassauCountyData = async (): Promise<Record<string, MapboxFeatureCollection>> => {
  const requests: GISDataRequest[] = [
    { type: 'parcels' },
    { type: 'stations' },
    { type: 'flood_zones' },
    { type: 'buildings' }
  ];

  const responses = await gisApiService.fetchMultipleLayers(requests);
  const result: Record<string, MapboxFeatureCollection> = {};

  Object.entries(responses).forEach(([key, response]) => {
    if (response.success && response.data) {
      result[key] = response.data;
    }
  });

  return result;
};

export const performBufferAnalysis = async (
  geometry: any,
  distance: number,
  units: 'meters' | 'kilometers' | 'feet' = 'meters'
): Promise<MapboxFeatureCollection | null> => {
  const result = await gisApiService.createBuffer(geometry, distance, units);
  return result.success ? result.result : null;
};

export const findSpatialIntersections = async (
  geometry: any,
  targetLayers: string[]
): Promise<MapboxFeatureCollection | null> => {
  const result = await gisApiService.findIntersections(geometry, targetLayers);
  return result.success ? result.result : null;
};

// Error handling wrapper
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  fallbackValue: any = null
) => {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('GIS API operation failed:', error);
      return fallbackValue;
    }
  };
};