const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const cacheService = require('../cacheService');
const fileProcessor = require('../../utils/fileProcessor');
const { createProgressRecord, updateProgress } = require('../../utils/database');

class MicrosoftBuildingsService {
  constructor() {
    this.baseUrl = 'https://minedbuildings.blob.core.windows.net/global-buildings/2023-01-15';
    this.cacheDir = './downloads/microsoft-buildings';

    // Microsoft Building Footprints regions
    this.regions = {
      // United States
      'us': {
        name: 'United States',
        continent: 'north-america',
        totalBuildings: '132,000,000+',
        dataFormat: 'geojsonl',
        files: {
          'us-east': 'United States (East).zip',
          'us-west': 'United States (West).zip',
          'us-midwest': 'United States (Midwest).zip',
          'us-south': 'United States (South).zip'
        }
      },
      // By state examples
      'ca': {
        name: 'California',
        continent: 'north-america',
        totalBuildings: '11,000,000+',
        dataFormat: 'geojsonl',
        files: {
          'california': 'California.zip'
        }
      },
      'ny': {
        name: 'New York',
        continent: 'north-america',
        totalBuildings: '5,000,000+',
        dataFormat: 'geojsonl',
        files: {
          'newyork': 'New York.zip'
        }
      },
      'tx': {
        name: 'Texas',
        continent: 'north-america',
        totalBuildings: '8,000,000+',
        dataFormat: 'geojsonl',
        files: {
          'texas': 'Texas.zip'
        }
      },
      // International
      'africa': {
        name: 'Africa',
        continent: 'africa',
        totalBuildings: '500,000,000+',
        dataFormat: 'geojsonl',
        files: {
          'africa': 'Africa.zip'
        }
      },
      'asia': {
        name: 'Asia',
        continent: 'asia',
        totalBuildings: '800,000,000+',
        dataFormat: 'geojsonl',
        files: {
          'asia': 'Asia.zip'
        }
      },
      'europe': {
        name: 'Europe',
        continent: 'europe',
        totalBuildings: '200,000,000+',
        dataFormat: 'geojsonl',
        files: {
          'europe': 'Europe.zip'
        }
      },
      'oceania': {
        name: 'Oceania',
        continent: 'oceania',
        totalBuildings: '20,000,000+',
        dataFormat: 'geojsonl',
        files: {
          'oceania': 'Oceania.zip'
        }
      }
    };

    // Building analysis types
    this.analysisTypes = {
      'density': {
        name: 'Building Density Analysis',
        description: 'Calculate building density per grid cell',
        outputType: 'grid'
      },
      'footprint-area': {
        name: 'Building Footprint Area',
        description: 'Calculate total building footprint area',
        outputType: 'aggregate'
      },
      'urban-extent': {
        name: 'Urban Extent Mapping',
        description: 'Map urban areas based on building distribution',
        outputType: 'polygon'
      },
      'settlement-pattern': {
        name: 'Settlement Pattern Analysis',
        description: 'Analyze settlement patterns and clustering',
        outputType: 'classification'
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
      totalBuildings: region.totalBuildings,
      dataFormat: region.dataFormat,
      files: Object.keys(region.files)
    }));
  }

  // Get analysis types
  getAnalysisTypes() {
    return Object.entries(this.analysisTypes).map(([key, analysis]) => ({
      id: key,
      name: analysis.name,
      description: analysis.description,
      outputType: analysis.outputType
    }));
  }

  // Download building footprints by region
  async downloadBuildingFootprints(regionId, fileKey = null, jobId = null, options = {}) {
    const region = this.regions[regionId];
    if (!region) {
      throw new Error(`Region not found: ${regionId}`);
    }

    // If no specific file requested, use the first available
    const targetFile = fileKey || Object.keys(region.files)[0];
    const fileName = region.files[targetFile];

    if (!fileName) {
      throw new Error(`File not found: ${targetFile} for region ${regionId}`);
    }

    const cacheKey = cacheService.generateCacheKey('microsoft-buildings', regionId, { file: targetFile, ...options });

    // Check cache first
    if (!options.forceRefresh) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const downloadUrl = `${this.baseUrl}/${fileName}`;
    const filePath = path.join(this.cacheDir, fileName);
    const extractDir = path.join(this.cacheDir, `${regionId}_${targetFile}`);

    try {
      // Create progress record if jobId provided
      if (jobId) {
        await createProgressRecord(jobId, 'microsoft-buildings', regionId);
        await updateProgress(jobId, 5, 0, 'downloading');
      }

      console.log(`Downloading Microsoft Building Footprints: ${regionId}/${targetFile}`);

      // Download the ZIP file
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 1800000, // 30 minutes for very large files
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
          const progress = Math.floor((downloadedSize / totalSize) * 40); // 40% for download
          updateProgress(jobId, 5 + progress, downloadedSize).catch(console.error);
        }
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      if (jobId) {
        await updateProgress(jobId, 50, downloadedSize, 'extracting');
      }

      // Extract ZIP file
      await fs.ensureDir(extractDir);
      const extractedFiles = await fileProcessor.extractZip(filePath, extractDir);

      if (jobId) {
        await updateProgress(jobId, 70, downloadedSize, 'processing');
      }

      // Process GeoJSONL files (streaming JSON Lines format)
      const geojsonlFiles = extractedFiles.filter(file =>
        path.extname(file).toLowerCase() === '.geojsonl' ||
        path.extname(file).toLowerCase() === '.jsonl'
      );

      if (geojsonlFiles.length === 0) {
        throw new Error('No GeoJSONL files found in the downloaded data');
      }

      const results = {
        region: region.name,
        regionId: regionId,
        file: targetFile,
        totalFiles: geojsonlFiles.length,
        features: [],
        metadata: {
          source: 'Microsoft Building Footprints',
          downloadUrl: downloadUrl,
          downloadedAt: new Date().toISOString(),
          totalBuildings: region.totalBuildings,
          dataFormat: region.dataFormat
        }
      };

      // Process each GeoJSONL file
      for (let i = 0; i < geojsonlFiles.length; i++) {
        const geojsonlFile = geojsonlFiles[i];

        try {
          const features = await this.processGeoJSONL(geojsonlFile, options);
          results.features = results.features.concat(features);

          console.log(`✅ Processed file ${i + 1}/${geojsonlFiles.length}: ${features.length} buildings`);

          // Update progress
          if (jobId) {
            const fileProgress = Math.floor(((i + 1) / geojsonlFiles.length) * 25); // 25% for processing
            await updateProgress(jobId, 70 + fileProgress, downloadedSize, 'processing');
          }

        } catch (error) {
          console.error(`❌ Failed to process file ${geojsonlFile}:`, error.message);
        }
      }

      // Apply spatial filtering if bounds specified
      if (options.bounds) {
        const originalCount = results.features.length;
        results.features = this.filterByBounds(results.features, options.bounds);
        results.metadata.spatiallyFiltered = true;
        results.metadata.bounds = options.bounds;
        results.metadata.originalFeatureCount = originalCount;
        results.metadata.filteredFeatureCount = results.features.length;
      }

      // Apply sampling if requested (for performance)
      if (options.sampleSize && options.sampleSize < results.features.length) {
        results.features = this.sampleFeatures(results.features, options.sampleSize);
        results.metadata.sampled = true;
        results.metadata.sampleSize = options.sampleSize;
      }

      // Calculate building statistics
      results.statistics = this.calculateBuildingStatistics(results.features);

      // Convert to standard GeoJSON format
      const geojson = {
        type: 'FeatureCollection',
        features: results.features,
        metadata: results.metadata,
        statistics: results.statistics
      };

      // Cache the result (with shorter TTL due to size)
      await cacheService.set(cacheKey, geojson, 'microsoft-buildings', regionId, null, 72); // 72 hours cache

      // Cleanup temporary files
      await fileProcessor.cleanup([filePath, extractDir]);

      if (jobId) {
        await updateProgress(jobId, 100, downloadedSize, 'completed');
      }

      console.log(`✅ Microsoft Building Footprints processed: ${regionId}/${targetFile} (${results.features.length} buildings)`);
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

      console.error(`❌ Microsoft Building Footprints download failed: ${regionId}`, error.message);
      throw error;
    }
  }

  // Process GeoJSONL file (streaming format with one JSON object per line)
  async processGeoJSONL(filePath, options = {}) {
    const features = [];
    const maxFeatures = options.maxFeatures || 1000000; // Default limit to prevent memory issues

    const fileContent = await fs.readFile(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    for (let i = 0; i < Math.min(lines.length, maxFeatures); i++) {
      const line = lines[i];

      try {
        const feature = JSON.parse(line);

        // Validate feature structure
        if (feature.type === 'Feature' && feature.geometry && feature.geometry.type === 'Polygon') {
          // Add Microsoft-specific metadata
          feature.properties = {
            ...feature.properties,
            source: 'Microsoft Building Footprints',
            confidence: feature.properties.confidence || null,
            area_m2: this.calculatePolygonArea(feature.geometry)
          };

          features.push(feature);
        }
      } catch (error) {
        // Skip invalid JSON lines
        continue;
      }
    }

    return features;
  }

  // Filter features by bounding box
  filterByBounds(features, bounds) {
    const { minLon, minLat, maxLon, maxLat } = bounds;

    return features.filter(feature => {
      if (!feature.geometry || feature.geometry.type !== 'Polygon') {
        return false;
      }

      // Simple centroid-based filtering (could be improved)
      const coords = feature.geometry.coordinates[0];
      const centroid = this.calculateCentroid(coords);

      return centroid[0] >= minLon && centroid[0] <= maxLon &&
             centroid[1] >= minLat && centroid[1] <= maxLat;
    });
  }

  // Calculate polygon area (approximate)
  calculatePolygonArea(geometry) {
    try {
      // Simple approximation using shoelace formula
      const coords = geometry.coordinates[0];
      let area = 0;

      for (let i = 0; i < coords.length - 1; i++) {
        area += (coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1]);
      }

      return Math.abs(area) / 2;
    } catch (error) {
      return 0;
    }
  }

  // Calculate centroid of polygon
  calculateCentroid(coords) {
    let x = 0, y = 0;
    const n = coords.length - 1; // Exclude last point (same as first)

    for (let i = 0; i < n; i++) {
      x += coords[i][0];
      y += coords[i][1];
    }

    return [x / n, y / n];
  }

  // Sample features for performance
  sampleFeatures(features, sampleSize) {
    if (features.length <= sampleSize) {
      return features;
    }

    const step = Math.floor(features.length / sampleSize);
    const sampled = [];

    for (let i = 0; i < features.length; i += step) {
      if (sampled.length < sampleSize) {
        sampled.push(features[i]);
      }
    }

    return sampled;
  }

  // Calculate building statistics
  calculateBuildingStatistics(features) {
    if (!features || features.length === 0) {
      return {
        totalBuildings: 0,
        totalArea: 0,
        averageArea: 0,
        medianArea: 0
      };
    }

    const areas = features
      .map(f => f.properties.area_m2)
      .filter(area => area && area > 0)
      .sort((a, b) => a - b);

    const totalArea = areas.reduce((sum, area) => sum + area, 0);

    return {
      totalBuildings: features.length,
      totalArea: totalArea,
      averageArea: totalArea / areas.length,
      medianArea: areas[Math.floor(areas.length / 2)] || 0,
      minArea: areas[0] || 0,
      maxArea: areas[areas.length - 1] || 0,
      areasWithData: areas.length
    };
  }

  // Perform building density analysis
  async performDensityAnalysis(regionId, gridSize = 1000, options = {}) {
    const buildingData = await this.downloadBuildingFootprints(regionId, null, null, options);

    // Create density grid (simplified implementation)
    const densityGrid = this.createDensityGrid(buildingData.features, gridSize);

    return {
      type: 'FeatureCollection',
      features: densityGrid,
      metadata: {
        analysis: 'building-density',
        gridSize: gridSize,
        region: regionId,
        inputBuildings: buildingData.features.length,
        analysisDate: new Date().toISOString()
      }
    };
  }

  // Create density grid
  createDensityGrid(features, gridSize) {
    // This is a simplified implementation
    // In production, you'd use proper spatial indexing and more sophisticated grid creation

    if (!features.length) return [];

    // Calculate bounding box
    const bounds = this.calculateBounds(features);
    const gridFeatures = [];

    // Create grid cells
    const cellsX = Math.ceil((bounds.maxLon - bounds.minLon) * 111000 / gridSize); // Approx meters per degree
    const cellsY = Math.ceil((bounds.maxLat - bounds.minLat) * 111000 / gridSize);

    for (let x = 0; x < cellsX; x++) {
      for (let y = 0; y < cellsY; y++) {
        const cellBounds = {
          minLon: bounds.minLon + (x / cellsX) * (bounds.maxLon - bounds.minLon),
          maxLon: bounds.minLon + ((x + 1) / cellsX) * (bounds.maxLon - bounds.minLon),
          minLat: bounds.minLat + (y / cellsY) * (bounds.maxLat - bounds.minLat),
          maxLat: bounds.minLat + ((y + 1) / cellsY) * (bounds.maxLat - bounds.minLat)
        };

        const buildingsInCell = features.filter(feature => {
          const centroid = this.calculateCentroid(feature.geometry.coordinates[0]);
          return centroid[0] >= cellBounds.minLon && centroid[0] <= cellBounds.maxLon &&
                 centroid[1] >= cellBounds.minLat && centroid[1] <= cellBounds.maxLat;
        });

        const gridCell = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [cellBounds.minLon, cellBounds.minLat],
              [cellBounds.maxLon, cellBounds.minLat],
              [cellBounds.maxLon, cellBounds.maxLat],
              [cellBounds.minLon, cellBounds.maxLat],
              [cellBounds.minLon, cellBounds.minLat]
            ]]
          },
          properties: {
            gridX: x,
            gridY: y,
            buildingCount: buildingsInCell.length,
            buildingDensity: buildingsInCell.length / (gridSize * gridSize) * 1000000 // buildings per km²
          }
        };

        gridFeatures.push(gridCell);
      }
    }

    return gridFeatures;
  }

  // Calculate bounds for features
  calculateBounds(features) {
    let minLon = Infinity, minLat = Infinity;
    let maxLon = -Infinity, maxLat = -Infinity;

    features.forEach(feature => {
      const coords = feature.geometry.coordinates[0];
      coords.forEach(coord => {
        minLon = Math.min(minLon, coord[0]);
        maxLon = Math.max(maxLon, coord[0]);
        minLat = Math.min(minLat, coord[1]);
        maxLat = Math.max(maxLat, coord[1]);
      });
    });

    return { minLon, minLat, maxLon, maxLat };
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
      totalBuildings: region.totalBuildings,
      dataFormat: region.dataFormat,
      availableFiles: Object.keys(region.files),
      source: 'Microsoft Building Footprints',
      license: 'Open Use of Data Agreement (ODbL)',
      attribution: 'Microsoft',
      analysisTypes: this.getAnalysisTypes()
    };
  }
}

module.exports = new MicrosoftBuildingsService();