const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const cacheService = require('../cacheService');
const fileProcessor = require('../../utils/fileProcessor');
const { createProgressRecord, updateProgress } = require('../../utils/database');

class NaturalEarthService {
  constructor() {
    this.baseUrl = 'https://naturalearth.s3.amazonaws.com';
    this.cacheDir = './downloads/naturalearth';
    this.datasets = {
      // Administrative boundaries
      'admin-0-countries': {
        url: '110m_cultural/ne_110m_admin_0_countries.zip',
        name: 'Countries (1:110m)',
        description: 'World country boundaries at 1:110 million scale',
        category: 'administrative'
      },
      'admin-0-countries-50m': {
        url: '50m_cultural/ne_50m_admin_0_countries.zip',
        name: 'Countries (1:50m)',
        description: 'World country boundaries at 1:50 million scale',
        category: 'administrative'
      },
      'admin-1-states-provinces': {
        url: '110m_cultural/ne_110m_admin_1_states_provinces.zip',
        name: 'States and Provinces (1:110m)',
        description: 'First-level administrative divisions',
        category: 'administrative'
      },
      'admin-1-states-provinces-50m': {
        url: '50m_cultural/ne_50m_admin_1_states_provinces.zip',
        name: 'States and Provinces (1:50m)',
        description: 'First-level administrative divisions at higher resolution',
        category: 'administrative'
      },
      'populated-places': {
        url: '110m_cultural/ne_110m_populated_places.zip',
        name: 'Populated Places (1:110m)',
        description: 'Cities and towns worldwide',
        category: 'cultural'
      },
      // Physical features
      'coastline': {
        url: '110m_physical/ne_110m_coastline.zip',
        name: 'Coastline (1:110m)',
        description: 'World coastline boundaries',
        category: 'physical'
      },
      'land': {
        url: '110m_physical/ne_110m_land.zip',
        name: 'Land Areas (1:110m)',
        description: 'Land polygon features',
        category: 'physical'
      },
      'ocean': {
        url: '110m_physical/ne_110m_ocean.zip',
        name: 'Ocean Areas (1:110m)',
        description: 'Ocean polygon features',
        category: 'physical'
      },
      'rivers-lakes': {
        url: '110m_physical/ne_110m_rivers_lake_centerlines.zip',
        name: 'Rivers and Lakes (1:110m)',
        description: 'Major rivers and lake centerlines',
        category: 'physical'
      },
      // Transportation
      'roads': {
        url: '10m_cultural/ne_10m_roads.zip',
        name: 'Roads (1:10m)',
        description: 'Major roads and highways',
        category: 'transportation'
      },
      'railroads': {
        url: '10m_cultural/ne_10m_railroads.zip',
        name: 'Railroads (1:10m)',
        description: 'Railroad networks',
        category: 'transportation'
      },
      'airports': {
        url: '10m_cultural/ne_10m_airports.zip',
        name: 'Airports (1:10m)',
        description: 'Major airports worldwide',
        category: 'transportation'
      }
    };

    // Ensure cache directory exists
    fs.ensureDirSync(this.cacheDir);
  }

  // Get list of available datasets
  getAvailableDatasets() {
    return Object.entries(this.datasets).map(([key, dataset]) => ({
      id: key,
      name: dataset.name,
      description: dataset.description,
      category: dataset.category,
      url: `${this.baseUrl}/${dataset.url}`
    }));
  }

  // Get datasets by category
  getDatasetsByCategory(category) {
    return this.getAvailableDatasets().filter(dataset => dataset.category === category);
  }

  // Download and process dataset
  async downloadDataset(datasetId, jobId = null, options = {}) {
    const dataset = this.datasets[datasetId];
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const cacheKey = cacheService.generateCacheKey('naturalearth', datasetId, options);

    // Check cache first
    if (!options.forceRefresh) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const downloadUrl = `${this.baseUrl}/${dataset.url}`;
    const fileName = path.basename(dataset.url);
    const filePath = path.join(this.cacheDir, fileName);
    const extractDir = path.join(this.cacheDir, datasetId);

    try {
      // Create progress record if jobId provided
      if (jobId) {
        await createProgressRecord(jobId, 'naturalearth', datasetId);
        await updateProgress(jobId, 10, 0, 'downloading');
      }

      console.log(`Downloading Natural Earth dataset: ${datasetId}`);

      // Download file
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 300000 // 5 minutes
      });

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      await fs.ensureDir(path.dirname(filePath));
      const writer = fs.createWriteStream(filePath);

      response.data.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (jobId && totalSize) {
          const progress = Math.floor((downloadedSize / totalSize) * 50); // 50% for download
          updateProgress(jobId, 10 + progress, downloadedSize).catch(console.error);
        }
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      if (jobId) {
        await updateProgress(jobId, 60, downloadedSize, 'extracting');
      }

      // Extract ZIP file
      await fs.ensureDir(extractDir);
      const extractedFiles = await fileProcessor.extractZip(filePath, extractDir);

      if (jobId) {
        await updateProgress(jobId, 80, downloadedSize, 'processing');
      }

      // Find and process shapefile
      const shpFile = extractedFiles.find(file => path.extname(file) === '.shp');
      if (!shpFile) {
        throw new Error('No shapefile found in the downloaded data');
      }

      const geojson = await fileProcessor.processShapefile(shpFile, {
        sourceCRS: 'EPSG:4326',
        targetCRS: options.targetCRS || 'EPSG:4326',
        addMetadata: true
      });

      // Add dataset metadata
      geojson.metadata = {
        ...geojson.metadata,
        source: 'Natural Earth',
        dataset: dataset.name,
        description: dataset.description,
        downloadUrl: downloadUrl,
        downloadedAt: new Date().toISOString()
      };

      // Calculate statistics
      const stats = fileProcessor.calculateStatistics(geojson);
      geojson.statistics = stats;

      // Cache the result
      await cacheService.set(cacheKey, geojson, 'naturalearth', datasetId, null, 24);

      // Cleanup temporary files
      await fileProcessor.cleanup([filePath, extractDir]);

      if (jobId) {
        await updateProgress(jobId, 100, downloadedSize, 'completed');
      }

      console.log(`✅ Natural Earth dataset processed: ${datasetId}`);
      return geojson;

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

      console.error(`❌ Natural Earth download failed: ${datasetId}`, error.message);
      throw error;
    }
  }

  // Get specific features by bounding box
  async getDatasetByBounds(datasetId, bounds, options = {}) {
    const geojson = await this.downloadDataset(datasetId, null, options);

    if (!bounds) {
      return geojson;
    }

    // Filter features by bounding box
    const { minLon, minLat, maxLon, maxLat } = bounds;

    const filteredFeatures = geojson.features.filter(feature => {
      if (!feature.geometry) return false;

      // Simple bounding box check (could be improved with more sophisticated spatial operations)
      const bbox = turf.bbox(feature);
      return bbox[0] <= maxLon && bbox[2] >= minLon && bbox[1] <= maxLat && bbox[3] >= minLat;
    });

    return {
      ...geojson,
      features: filteredFeatures,
      metadata: {
        ...geojson.metadata,
        filteredBy: 'boundingBox',
        bounds: bounds,
        originalFeatureCount: geojson.features.length,
        filteredFeatureCount: filteredFeatures.length
      }
    };
  }

  // Search for features by properties
  async searchDataset(datasetId, searchParams, options = {}) {
    const geojson = await this.downloadDataset(datasetId, null, options);

    if (!searchParams || Object.keys(searchParams).length === 0) {
      return geojson;
    }

    const filteredFeatures = geojson.features.filter(feature => {
      const properties = feature.properties || {};

      return Object.entries(searchParams).every(([key, value]) => {
        const propValue = properties[key];

        if (typeof value === 'string' && value.includes('*')) {
          // Wildcard search
          const regex = new RegExp(value.replace(/\*/g, '.*'), 'i');
          return regex.test(String(propValue));
        }

        return String(propValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });

    return {
      ...geojson,
      features: filteredFeatures,
      metadata: {
        ...geojson.metadata,
        filteredBy: 'properties',
        searchParams: searchParams,
        originalFeatureCount: geojson.features.length,
        filteredFeatureCount: filteredFeatures.length
      }
    };
  }

  // Get data summary without downloading full dataset
  async getDatasetInfo(datasetId) {
    const dataset = this.datasets[datasetId];
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    return {
      id: datasetId,
      name: dataset.name,
      description: dataset.description,
      category: dataset.category,
      downloadUrl: `${this.baseUrl}/${dataset.url}`,
      source: 'Natural Earth',
      license: 'Public Domain',
      attribution: 'Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.'
    };
  }
}

module.exports = new NaturalEarthService();