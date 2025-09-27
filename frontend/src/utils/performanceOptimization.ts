// Performance Optimization Utilities for Mapbox GL JS
import { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl';
import { MapboxFeatureCollection } from './mapboxHelpers';

// Types
export interface PerformanceConfig {
  maxFeatures: number;
  simplificationTolerance: number;
  clusterThreshold: number;
  renderBudget: number;
  memoryThreshold: number;
}

export interface LayerPerformanceMetrics {
  featureCount: number;
  renderTime: number;
  memoryUsage: number;
  lastUpdate: number;
}

export interface PerformanceMonitor {
  fps: number;
  frameDrops: number;
  memoryUsage: number;
  activeFeatures: number;
  renderingTime: number;
}

// Default performance configuration optimized for urban planning data
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxFeatures: 10000,
  simplificationTolerance: 0.375,
  clusterThreshold: 1000,
  renderBudget: 16, // milliseconds per frame (60fps)
  memoryThreshold: 100 * 1024 * 1024, // 100MB
};

// Performance optimization class
export class MapboxPerformanceOptimizer {
  private map: MapboxMap | null = null;
  private config: PerformanceConfig;
  private metrics: Map<string, LayerPerformanceMetrics> = new Map();
  private monitor: PerformanceMonitor = {
    fps: 60,
    frameDrops: 0,
    memoryUsage: 0,
    activeFeatures: 0,
    renderingTime: 0
  };
  private frameId: number | null = null;
  private observers: Map<string, ResizeObserver> = new Map();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  // Initialize performance monitoring
  public initialize(map: MapboxMap): void {
    this.map = map;
    this.startPerformanceMonitoring();
    this.setupMemoryManagement();
    this.optimizeMapSettings();
  }

  // Optimize map settings for performance
  private optimizeMapSettings(): void {
    if (!this.map) return;

    // Enable hardware acceleration
    this.map.getCanvas().style.imageRendering = 'optimizeSpeed';

    // Optimize tile loading
    this.map.setMaxTileCacheSize(50); // Limit tile cache
    this.map.setRenderWorldCopies(false); // Don't render world copies

    // Set performance-oriented options
    const style = this.map.getStyle();
    if (style) {
      // Reduce source update frequency for better performance
      style.sources = this.optimizeSources(style.sources);
    }
  }

  private optimizeSources(sources: any): any {
    Object.values(sources).forEach((source: any) => {
      if (source.type === 'vector') {
        source.maxzoom = Math.min(source.maxzoom || 14, 16);
        source.buffer = source.buffer || 64;
      }
      if (source.type === 'geojson') {
        source.buffer = source.buffer || 0;
        source.maxzoom = Math.min(source.maxzoom || 18, 18);
        source.tolerance = this.config.simplificationTolerance;
      }
    });
    return sources;
  }

  // Level-of-detail optimization
  public optimizeDataForZoom(
    data: MapboxFeatureCollection,
    zoom: number,
    layerId: string
  ): MapboxFeatureCollection {
    const startTime = performance.now();

    // Apply level-of-detail based on zoom
    let optimizedData = data;

    if (zoom < 10) {
      // Very low zoom - aggressive simplification and clustering
      optimizedData = this.clusterFeatures(data, 100);
      optimizedData = this.simplifyGeometry(optimizedData, 0.01);
    } else if (zoom < 13) {
      // Medium zoom - moderate simplification
      optimizedData = this.clusterFeatures(data, 50);
      optimizedData = this.simplifyGeometry(optimizedData, 0.005);
    } else if (zoom < 16) {
      // High zoom - minimal simplification
      optimizedData = this.limitFeatureCount(data, this.config.maxFeatures);
      optimizedData = this.simplifyGeometry(optimizedData, 0.001);
    }
    // Very high zoom - no optimization needed

    // Update metrics
    const renderTime = performance.now() - startTime;
    this.updateLayerMetrics(layerId, {
      featureCount: optimizedData.features.length,
      renderTime,
      memoryUsage: this.estimateMemoryUsage(optimizedData),
      lastUpdate: Date.now()
    });

    return optimizedData;
  }

  // Clustering for point features
  private clusterFeatures(
    data: MapboxFeatureCollection,
    radius: number
  ): MapboxFeatureCollection {
    // Simple spatial clustering implementation
    const clustered = { ...data, features: [] };
    const processed = new Set<number>();

    data.features.forEach((feature, index) => {
      if (processed.has(index) || feature.geometry.type !== 'Point') {
        if (feature.geometry.type !== 'Point') {
          clustered.features.push(feature);
        }
        return;
      }

      const cluster = [feature];
      const [lng, lat] = feature.geometry.coordinates;

      // Find nearby features to cluster
      data.features.forEach((otherFeature, otherIndex) => {
        if (
          otherIndex !== index &&
          !processed.has(otherIndex) &&
          otherFeature.geometry.type === 'Point'
        ) {
          const [otherLng, otherLat] = otherFeature.geometry.coordinates;
          const distance = this.calculateDistance(lng, lat, otherLng, otherLat);

          if (distance < radius) {
            cluster.push(otherFeature);
            processed.add(otherIndex);
          }
        }
      });

      processed.add(index);

      if (cluster.length > 1) {
        // Create cluster feature
        const clusterFeature = {
          type: 'Feature' as const,
          properties: {
            cluster: true,
            point_count: cluster.length,
            ...this.aggregateProperties(cluster)
          },
          geometry: {
            type: 'Point' as const,
            coordinates: this.calculateCentroid(cluster)
          }
        };
        clustered.features.push(clusterFeature);
      } else {
        clustered.features.push(feature);
      }
    });

    return clustered;
  }

  private calculateDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private calculateCentroid(features: any[]): [number, number] {
    let totalLng = 0;
    let totalLat = 0;

    features.forEach(feature => {
      if (feature.geometry.type === 'Point') {
        totalLng += feature.geometry.coordinates[0];
        totalLat += feature.geometry.coordinates[1];
      }
    });

    return [totalLng / features.length, totalLat / features.length];
  }

  private aggregateProperties(features: any[]): Record<string, any> {
    const aggregated: Record<string, any> = {};
    const numericProps: Set<string> = new Set();

    // Identify numeric properties
    features.forEach(feature => {
      if (feature.properties) {
        Object.entries(feature.properties).forEach(([key, value]) => {
          if (typeof value === 'number') {
            numericProps.add(key);
          }
        });
      }
    });

    // Aggregate numeric properties
    numericProps.forEach(prop => {
      const values = features
        .map(f => f.properties?.[prop])
        .filter(v => typeof v === 'number');

      if (values.length > 0) {
        aggregated[`${prop}_sum`] = values.reduce((sum, val) => sum + val, 0);
        aggregated[`${prop}_avg`] = aggregated[`${prop}_sum`] / values.length;
        aggregated[`${prop}_min`] = Math.min(...values);
        aggregated[`${prop}_max`] = Math.max(...values);
      }
    });

    return aggregated;
  }

  // Geometry simplification
  private simplifyGeometry(
    data: MapboxFeatureCollection,
    tolerance: number
  ): MapboxFeatureCollection {
    return {
      ...data,
      features: data.features.map(feature => ({
        ...feature,
        geometry: this.simplifyFeatureGeometry(feature.geometry, tolerance)
      }))
    };
  }

  private simplifyFeatureGeometry(geometry: any, tolerance: number): any {
    // Douglas-Peucker algorithm implementation for line simplification
    if (geometry.type === 'LineString') {
      return {
        ...geometry,
        coordinates: this.douglasPeucker(geometry.coordinates, tolerance)
      };
    } else if (geometry.type === 'Polygon') {
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((ring: number[][]) =>
          this.douglasPeucker(ring, tolerance)
        )
      };
    }
    return geometry;
  }

  private douglasPeucker(points: number[][], tolerance: number): number[][] {
    if (points.length <= 2) return points;

    // Find the point with the maximum distance
    let maxDistance = 0;
    let index = 0;

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(
        points[i],
        points[0],
        points[points.length - 1]
      );
      if (distance > maxDistance) {
        index = i;
        maxDistance = distance;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const recResults1 = this.douglasPeucker(points.slice(0, index + 1), tolerance);
      const recResults2 = this.douglasPeucker(points.slice(index), tolerance);

      return [...recResults1.slice(0, -1), ...recResults2];
    } else {
      return [points[0], points[points.length - 1]];
    }
  }

  private perpendicularDistance(
    point: number[],
    lineStart: number[],
    lineEnd: number[]
  ): number {
    const [x, y] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx: number, yy: number;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  // Feature count limiting
  private limitFeatureCount(
    data: MapboxFeatureCollection,
    maxFeatures: number
  ): MapboxFeatureCollection {
    if (data.features.length <= maxFeatures) {
      return data;
    }

    // Use spatial sampling to maintain geographic distribution
    const step = Math.ceil(data.features.length / maxFeatures);
    const sampled = data.features.filter((_, index) => index % step === 0);

    return {
      ...data,
      features: sampled.slice(0, maxFeatures)
    };
  }

  // Progressive loading implementation
  public progressiveLoad(
    data: MapboxFeatureCollection,
    layerId: string,
    batchSize: number = 1000
  ): Promise<void> {
    return new Promise((resolve) => {
      const source = this.map?.getSource(layerId) as GeoJSONSource;
      if (!source) {
        resolve();
        return;
      }

      let currentIndex = 0;
      const totalFeatures = data.features.length;

      const loadBatch = () => {
        const endIndex = Math.min(currentIndex + batchSize, totalFeatures);
        const batchData: MapboxFeatureCollection = {
          type: 'FeatureCollection',
          features: data.features.slice(0, endIndex)
        };

        source.setData(batchData);
        currentIndex = endIndex;

        if (currentIndex < totalFeatures) {
          // Use requestIdleCallback for better performance
          if (window.requestIdleCallback) {
            window.requestIdleCallback(loadBatch, { timeout: 16 });
          } else {
            setTimeout(loadBatch, 0);
          }
        } else {
          resolve();
        }
      };

      loadBatch();
    });
  }

  // Memory management
  private setupMemoryManagement(): void {
    // Monitor memory usage
    setInterval(() => {
      if ('memory' in performance) {
        this.monitor.memoryUsage = (performance as any).memory.usedJSHeapSize;

        // Trigger cleanup if memory usage is too high
        if (this.monitor.memoryUsage > this.config.memoryThreshold) {
          this.performMemoryCleanup();
        }
      }
    }, 5000);

    // Listen for visibility change to pause/resume
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseRendering();
      } else {
        this.resumeRendering();
      }
    });
  }

  private performMemoryCleanup(): void {
    if (!this.map) return;

    // Remove unused sources
    const style = this.map.getStyle();
    const usedSources = new Set();

    style.layers.forEach((layer: any) => {
      if (layer.source) {
        usedSources.add(layer.source);
      }
    });

    Object.keys(style.sources).forEach(sourceId => {
      if (!usedSources.has(sourceId)) {
        this.map!.removeSource(sourceId);
      }
    });

    // Clear tile cache
    this.map.getStyle().sources = {};

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  private pauseRendering(): void {
    if (this.map) {
      this.map.stop();
    }
  }

  private resumeRendering(): void {
    if (this.map) {
      this.map.resume();
    }
  }

  // Performance monitoring
  private startPerformanceMonitoring(): void {
    let lastTime = performance.now();
    let frames = 0;

    const measurePerformance = (currentTime: number) => {
      frames++;

      if (currentTime - lastTime >= 1000) {
        this.monitor.fps = Math.round((frames * 1000) / (currentTime - lastTime));
        this.monitor.frameDrops = Math.max(0, 60 - this.monitor.fps);

        frames = 0;
        lastTime = currentTime;
      }

      this.frameId = requestAnimationFrame(measurePerformance);
    };

    this.frameId = requestAnimationFrame(measurePerformance);
  }

  // Update layer metrics
  private updateLayerMetrics(layerId: string, metrics: LayerPerformanceMetrics): void {
    this.metrics.set(layerId, metrics);
    this.monitor.activeFeatures += metrics.featureCount;
  }

  // Estimate memory usage for a feature collection
  private estimateMemoryUsage(data: MapboxFeatureCollection): number {
    // Rough estimation based on JSON string length
    const jsonString = JSON.stringify(data);
    return jsonString.length * 2; // Approximate bytes (UTF-16)
  }

  // Get current performance metrics
  public getPerformanceMetrics(): PerformanceMonitor & { layers: Record<string, LayerPerformanceMetrics> } {
    return {
      ...this.monitor,
      layers: Object.fromEntries(this.metrics)
    };
  }

  // Cleanup resources
  public destroy(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics.clear();
  }
}

// Utility functions for performance optimization
export const optimizeGeoJSON = (
  data: MapboxFeatureCollection,
  options: {
    maxFeatures?: number;
    simplificationTolerance?: number;
    removeEmptyGeometries?: boolean;
  } = {}
): MapboxFeatureCollection => {
  const {
    maxFeatures = 10000,
    simplificationTolerance = 0.001,
    removeEmptyGeometries = true
  } = options;

  let optimized = data;

  // Remove empty geometries
  if (removeEmptyGeometries) {
    optimized = {
      ...optimized,
      features: optimized.features.filter(feature =>
        feature.geometry &&
        feature.geometry.coordinates &&
        feature.geometry.coordinates.length > 0
      )
    };
  }

  // Limit feature count
  if (optimized.features.length > maxFeatures) {
    optimized = {
      ...optimized,
      features: optimized.features.slice(0, maxFeatures)
    };
  }

  return optimized;
};

// Debounced viewport change handler
export const createViewportChangeHandler = (
  callback: (viewport: any) => void,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;

  return (viewport: any) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(viewport), delay);
  };
};

// Performance-optimized layer visibility manager
export class LayerVisibilityManager {
  private map: MapboxMap | null = null;
  private visibilityState: Map<string, boolean> = new Map();

  constructor(map: MapboxMap) {
    this.map = map;
  }

  public setLayerVisibility(layerId: string, visible: boolean): void {
    if (this.visibilityState.get(layerId) === visible) return;

    this.visibilityState.set(layerId, visible);

    if (this.map && this.map.getLayer(layerId)) {
      this.map.setLayoutProperty(
        layerId,
        'visibility',
        visible ? 'visible' : 'none'
      );
    }
  }

  public batchSetVisibility(updates: Record<string, boolean>): void {
    // Batch multiple visibility updates for better performance
    Object.entries(updates).forEach(([layerId, visible]) => {
      this.setLayerVisibility(layerId, visible);
    });
  }

  public getVisibilityState(): Record<string, boolean> {
    return Object.fromEntries(this.visibilityState);
  }
}