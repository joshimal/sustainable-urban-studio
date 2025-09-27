const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const cacheService = require('../cacheService');
const fileProcessor = require('../../utils/fileProcessor');
const { createProgressRecord, updateProgress } = require('../../utils/database');

class GeofabrikService {
  constructor() {
    this.baseUrl = 'https://download.geofabrik.de';
    this.cacheDir = './downloads/geofabrik';

    // Common Geofabrik regions and their data availability
    this.regions = {
      // North America
      'us': {
        name: 'United States',
        continent: 'north-america',
        formats: ['osm.pbf', 'shp.zip', 'osm.bz2']
      },
      'us/california': {
        name: 'California',
        continent: 'north-america',
        formats: ['osm.pbf', 'shp.zip', 'osm.bz2']
      },
      'us/new-york': {
        name: 'New York',
        continent: 'north-america',
        formats: ['osm.pbf', 'shp.zip', 'osm.bz2']
      },
      'canada': {
        name: 'Canada',
        continent: 'north-america',
        formats: ['osm.pbf', 'shp.zip', 'osm.bz2']
      },
      // Europe
      'europe': {
        name: 'Europe',
        continent: 'europe',
        formats: ['osm.pbf', 'shp.zip', 'osm.bz2']
      },
      'europe/germany': {
        name: 'Germany',
        continent: 'europe',
        formats: ['osm.pbf', 'shp.zip', 'osm.bz2']
      },
      'europe/united-kingdom': {
        name: 'United Kingdom',
        continent: 'europe',
        formats: ['osm.pbf', 'shp.zip', 'osm.bz2']
      },
      // Others
      'australia-oceania': {
        name: 'Australia and Oceania',
        continent: 'australia-oceania',
        formats: ['osm.pbf', 'shp.zip', 'osm.bz2']
      }
    };

    // OSM feature layers available in shapefile format
    this.layers = {
      'roads': {
        name: 'Roads',
        description: 'All road types from highways to residential streets',
        file: 'gis_osm_roads_free_1.shp',
        category: 'transportation'
      },
      'railways': {
        name: 'Railways',
        description: 'Railway lines and stations',
        file: 'gis_osm_railways_free_1.shp',
        category: 'transportation'
      },
      'waterways': {
        name: 'Waterways',
        description: 'Rivers, streams, and water features',
        file: 'gis_osm_waterways_free_1.shp',
        category: 'natural'
      },
      'buildings': {
        name: 'Buildings',
        description: 'Building footprints and structures',
        file: 'gis_osm_buildings_a_free_1.shp',
        category: 'buildings'
      },
      'landuse': {
        name: 'Land Use',
        description: 'Land use and land cover polygons',
        file: 'gis_osm_landuse_a_free_1.shp',
        category: 'landuse'
      },
      'natural': {
        name: 'Natural Features',
        description: 'Parks, forests, and natural areas',
        file: 'gis_osm_natural_free_1.shp',
        category: 'natural'
      },
      'places': {
        name: 'Places',
        description: 'Cities, towns, and named places',
        file: 'gis_osm_places_free_1.shp',
        category: 'places'
      },
      'pois': {
        name: 'Points of Interest',
        description: 'Amenities, shops, and other POIs',
        file: 'gis_osm_pois_free_1.shp',
        category: 'amenities'
      },
      'traffic': {
        name: 'Traffic Features',
        description: 'Traffic lights, signs, and control features',
        file: 'gis_osm_traffic_free_1.shp',
        category: 'transportation'
      },
      'transport': {
        name: 'Public Transport',
        description: 'Bus stops, train stations, airports',
        file: 'gis_osm_transport_free_1.shp',
        category: 'transportation'
      }
    };

    // Ensure cache directory exists
    fs.ensureDirSync(this.cacheDir);
  }

  // Get available regions
  getAvailableRegions() {
    return Object.entries(this.regions).map(([key, region]) => ({
      id: key,
      name: region.name,
      continent: region.continent,
      formats: region.formats,
      downloadUrl: `${this.baseUrl}/${key}-latest-free.shp.zip`
    }));
  }

  // Get available layers
  getAvailableLayers() {
    return Object.entries(this.layers).map(([key, layer]) => ({
      id: key,
      name: layer.name,
      description: layer.description,
      category: layer.category,
      filename: layer.file
    }));
  }

  // Get layers by category
  getLayersByCategory(category) {
    return this.getAvailableLayers().filter(layer => layer.category === category);
  }

  // Download and process regional data
  async downloadRegionalData(regionId, layers = [], jobId = null, options = {}) {
    const region = this.regions[regionId];
    if (!region) {
      throw new Error(`Region not found: ${regionId}`);
    }

    const cacheKey = cacheService.generateCacheKey('geofabrik', regionId, { layers, ...options });

    // Check cache first
    if (!options.forceRefresh) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const downloadUrl = `${this.baseUrl}/${regionId}-latest-free.shp.zip`;
    const fileName = `${regionId.replace('/', '_')}-latest-free.shp.zip`;
    const filePath = path.join(this.cacheDir, fileName);
    const extractDir = path.join(this.cacheDir, regionId.replace('/', '_'));

    try {
      // Create progress record if jobId provided
      if (jobId) {
        await createProgressRecord(jobId, 'geofabrik', regionId);
        await updateProgress(jobId, 5, 0, 'downloading');
      }

      console.log(`Downloading Geofabrik data for region: ${regionId}`);

      // Download shapefile package
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 600000, // 10 minutes for large files
        headers: {
          'User-Agent': 'Sustainable-Urban-Studio/1.0'
        }
      });

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      await fs.ensureDir(path.dirname(filePath));
      const writer = fs.createWriteStream(filePath);

      response.data.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (jobId && totalSize) {
          const progress = Math.floor((downloadedSize / totalSize) * 30); // 30% for download
          updateProgress(jobId, 5 + progress, downloadedSize).catch(console.error);
        }
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      if (jobId) {
        await updateProgress(jobId, 40, downloadedSize, 'extracting');
      }

      // Extract ZIP file
      await fs.ensureDir(extractDir);
      const extractedFiles = await fileProcessor.extractZip(filePath, extractDir);

      if (jobId) {
        await updateProgress(jobId, 60, downloadedSize, 'processing');
      }

      // Process requested layers or all available layers
      const layersToProcess = layers.length > 0 ? layers : Object.keys(this.layers);
      const results = {
        region: region.name,
        regionId: regionId,
        layers: {},
        metadata: {
          downloadUrl: downloadUrl,
          downloadedAt: new Date().toISOString(),
          totalLayers: layersToProcess.length,
          processedLayers: 0
        }
      };

      for (let i = 0; i < layersToProcess.length; i++) {
        const layerId = layersToProcess[i];
        const layer = this.layers[layerId];

        if (!layer) {
          console.warn(`Unknown layer: ${layerId}`);
          continue;
        }

        const shpFile = extractedFiles.find(file => path.basename(file) === layer.file);

        if (shpFile) {
          try {
            const geojson = await fileProcessor.processShapefile(shpFile, {
              sourceCRS: 'EPSG:4326',
              targetCRS: options.targetCRS || 'EPSG:4326',
              addMetadata: true
            });

            // Add layer-specific metadata
            geojson.metadata = {
              ...geojson.metadata,
              source: 'OpenStreetMap via Geofabrik',
              layer: layer.name,
              description: layer.description,
              category: layer.category,
              region: region.name
            };

            // Apply filters if specified
            if (options.filters && options.filters[layerId]) {
              geojson.features = this.applyFilters(geojson.features, options.filters[layerId]);
            }

            // Calculate statistics
            const stats = fileProcessor.calculateStatistics(geojson);
            geojson.statistics = stats;

            results.layers[layerId] = geojson;
            results.metadata.processedLayers++;

            console.log(`✅ Processed layer: ${layerId} (${geojson.features.length} features)`);

          } catch (error) {
            console.error(`❌ Failed to process layer ${layerId}:`, error.message);
            results.layers[layerId] = { error: error.message };
          }
        } else {
          console.warn(`Shapefile not found for layer: ${layerId} (${layer.file})`);
          results.layers[layerId] = { error: 'Shapefile not found' };
        }

        // Update progress
        if (jobId) {
          const layerProgress = Math.floor(((i + 1) / layersToProcess.length) * 35); // 35% for processing
          await updateProgress(jobId, 60 + layerProgress, downloadedSize, 'processing');
        }
      }

      // Cache the result
      await cacheService.set(cacheKey, results, 'geofabrik', regionId, null, 48); // 48 hours cache

      // Cleanup temporary files
      await fileProcessor.cleanup([filePath, extractDir]);

      if (jobId) {
        await updateProgress(jobId, 100, downloadedSize, 'completed');
      }

      console.log(`✅ Geofabrik data processed for region: ${regionId}`);
      return results;

    } catch (error) {
      if (jobId) {
        await updateProgress(jobId, 0, 0, 'failed', error.message);
      }

      // Cleanup on error
      try {
        await fileProcessor.cleanup([filePath, extractDir]);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError.message);
      }

      console.error(`❌ Geofabrik download failed for region: ${regionId}`, error.message);
      throw error;
    }
  }

  // Get specific layer for a region
  async getRegionLayer(regionId, layerId, options = {}) {
    const layers = [layerId];
    const result = await this.downloadRegionalData(regionId, layers, null, options);

    if (result.layers[layerId] && !result.layers[layerId].error) {
      return result.layers[layerId];
    }

    throw new Error(`Failed to get layer ${layerId} for region ${regionId}: ${result.layers[layerId]?.error || 'Unknown error'}`);
  }

  // Apply filters to features
  applyFilters(features, filters) {
    return features.filter(feature => {
      const properties = feature.properties || {};

      return Object.entries(filters).every(([key, value]) => {
        const propValue = properties[key];

        if (Array.isArray(value)) {
          // Multiple allowed values
          return value.includes(propValue);
        }

        if (typeof value === 'string' && value.includes('*')) {
          // Wildcard search
          const regex = new RegExp(value.replace(/\*/g, '.*'), 'i');
          return regex.test(String(propValue));
        }

        return String(propValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }

  // Search for features across layers
  async searchRegion(regionId, searchParams, layers = [], options = {}) {
    const data = await this.downloadRegionalData(regionId, layers, null, options);
    const results = {
      region: data.region,
      searchParams: searchParams,
      results: {}
    };

    Object.entries(data.layers).forEach(([layerId, layerData]) => {
      if (layerData.error) {
        results.results[layerId] = { error: layerData.error };
        return;
      }

      const filteredFeatures = layerData.features.filter(feature => {
        const properties = feature.properties || {};

        return Object.entries(searchParams).some(([key, value]) => {
          const propValue = properties[key];

          if (typeof value === 'string' && value.includes('*')) {
            const regex = new RegExp(value.replace(/\*/g, '.*'), 'i');
            return regex.test(String(propValue));
          }

          return String(propValue).toLowerCase().includes(String(value).toLowerCase());
        });
      });

      results.results[layerId] = {
        ...layerData,
        features: filteredFeatures,
        metadata: {
          ...layerData.metadata,
          filteredBy: 'search',
          searchParams: searchParams,
          originalFeatureCount: layerData.features.length,
          filteredFeatureCount: filteredFeatures.length
        }
      };
    });

    return results;
  }

  // Get region information
  async getRegionInfo(regionId) {
    const region = this.regions[regionId];
    if (!region) {
      throw new Error(`Region not found: ${regionId}`);
    }

    return {
      id: regionId,
      name: region.name,
      continent: region.continent,
      availableFormats: region.formats,
      downloadUrl: `${this.baseUrl}/${regionId}-latest-free.shp.zip`,
      availableLayers: this.getAvailableLayers(),
      source: 'OpenStreetMap via Geofabrik',
      license: 'Open Database License (ODbL)',
      attribution: '© OpenStreetMap contributors'
    };
  }
}

module.exports = new GeofabrikService();