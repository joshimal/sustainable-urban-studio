const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const helmet = require('helmet');
const compression = require('compression');

// Import GIS services
const naturalEarthService = require('./services/gis/naturalEarth');
const geofabrikService = require('./services/gis/geofabrik');
const censusTigerService = require('./services/gis/censusTiger');
const municipalDataService = require('./services/gis/municipalData');
const microsoftBuildingsService = require('./services/gis/microsoftBuildings');
const femaSeaLevelRiseService = require('./services/gis/femaSeaLevelRise');
const nasaGistempService = require('./services/gis/nasaGistemp');
const modisLSTService = require('./services/gis/modisLST');
const cacheService = require('./services/cacheService');

// Import middleware and utilities
const { generalLimiter, dataDownloadLimiter, externalAPILimiter } = require('./middleware/rateLimiter');
const { initializeDatabase, getProgressStatus } = require('./utils/database');

const app = express();
const PORT = process.env.PORT || 3001;
const NOAA_CDO_TOKEN = process.env.NOAA_CDO_TOKEN || process.env.NOAA_TOKEN || '';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply rate limiting
app.use('/api/gis', generalLimiter);
app.use('/api/gis/download', dataDownloadLimiter);

// Configure multer for file uploads (store in ./uploads which is mapped to host ./data via docker-compose)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.shp', '.geojson', '.json', '.tiff', '.tif', '.gpkg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: .shp, .geojson, .tiff, .gpkg'));
    }
  }
});

// Create uploads directory
const createUploadsDir = async () => {
  try {
    await fs.mkdir('./uploads', { recursive: true });
  } catch (error) {
    console.log('Uploads directory already exists');
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Urban Studio Backend',
    timestamp: new Date().toISOString()
  });
});

// Upload GIS files
app.post('/api/upload', upload.single('gisFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadTime: new Date().toISOString()
    };

    // Note: Remove broken call to non-existent QGIS endpoint (/process-file)
    // If needed, implement multipart forward to http://qgis-server:5000/upload-shapefile for ZIP shapefiles
    fileInfo.qgisProcessing = { note: 'No auto-processing performed' };

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get uploaded files list
app.get('/api/files', async (req, res) => {
  try {
    const files = await fs.readdir('./uploads');
    const fileList = await Promise.all(
      files.map(async (filename) => {
        const stats = await fs.stat(`./uploads/${filename}`);
        return {
          filename,
          size: stats.size,
          uploadTime: stats.ctime
        };
      })
    );

    res.json({
      success: true,
      files: fileList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Proxy requests to QGIS server
app.post('/api/qgis/*', async (req, res) => {
  try {
    const qgisPath = req.params[0];
    const qgisResponse = await axios.post(
      `http://urban-studio-qgis:5000/${qgisPath}`,
      req.body
    );
    res.json(qgisResponse.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'QGIS server unavailable'
    });
  }
});

// Support GET proxy to QGIS (e.g., /health and /nassau/get-data)
app.get('/api/qgis/*', async (req, res) => {
  try {
    const qgisPath = req.params[0];
    const qgisUrl = `http://urban-studio-qgis:5000/${qgisPath}`;
    const qgisResponse = await axios.get(qgisUrl, { params: req.query });
    res.json(qgisResponse.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'QGIS server unavailable'
    });
  }
});

// GIS DATA INTEGRATION API ENDPOINTS

// ===== NATURAL EARTH DATA ENDPOINTS =====

// Get available Natural Earth datasets
app.get('/api/gis/naturalearth/datasets', async (req, res) => {
  try {
    const { category } = req.query;
    let datasets;

    if (category) {
      datasets = naturalEarthService.getDatasetsByCategory(category);
    } else {
      datasets = naturalEarthService.getAvailableDatasets();
    }

    res.json({
      success: true,
      data: datasets,
      source: 'Natural Earth'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download Natural Earth dataset
app.post('/api/gis/download/naturalearth/:datasetId', externalAPILimiter.createMiddleware('naturalearth'), async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { jobId, forceRefresh, targetCRS } = req.body;

    const options = {
      forceRefresh: forceRefresh || false,
      targetCRS: targetCRS || 'EPSG:4326'
    };

    const data = await naturalEarthService.downloadDataset(datasetId, jobId, options);

    res.json({
      success: true,
      data: data,
      cached: !options.forceRefresh
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Natural Earth dataset by bounds
app.get('/api/gis/naturalearth/:datasetId/bounds', externalAPILimiter.createMiddleware('naturalearth'), async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { minLon, minLat, maxLon, maxLat, targetCRS } = req.query;

    const bounds = minLon && minLat && maxLon && maxLat ? {
      minLon: parseFloat(minLon),
      minLat: parseFloat(minLat),
      maxLon: parseFloat(maxLon),
      maxLat: parseFloat(maxLat)
    } : null;

    const options = { targetCRS: targetCRS || 'EPSG:4326' };
    const data = await naturalEarthService.getDatasetByBounds(datasetId, bounds, options);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search Natural Earth dataset
app.post('/api/gis/naturalearth/:datasetId/search', externalAPILimiter.createMiddleware('naturalearth'), async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { searchParams, targetCRS } = req.body;

    const options = { targetCRS: targetCRS || 'EPSG:4326' };
    const data = await naturalEarthService.searchDataset(datasetId, searchParams, options);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== OPENSTREETMAP/GEOFABRIK ENDPOINTS =====

// Get available Geofabrik regions
app.get('/api/gis/geofabrik/regions', async (req, res) => {
  try {
    const regions = geofabrikService.getAvailableRegions();

    res.json({
      success: true,
      data: regions,
      source: 'OpenStreetMap via Geofabrik'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available OSM layers
app.get('/api/gis/geofabrik/layers', async (req, res) => {
  try {
    const { category } = req.query;
    let layers;

    if (category) {
      layers = geofabrikService.getLayersByCategory(category);
    } else {
      layers = geofabrikService.getAvailableLayers();
    }

    res.json({
      success: true,
      data: layers,
      source: 'OpenStreetMap'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download Geofabrik regional data
app.post('/api/gis/download/geofabrik/:regionId', externalAPILimiter.createMiddleware('openstreetmap'), async (req, res) => {
  try {
    const { regionId } = req.params;
    const { layers, jobId, forceRefresh, targetCRS, filters } = req.body;

    const options = {
      forceRefresh: forceRefresh || false,
      targetCRS: targetCRS || 'EPSG:4326',
      filters: filters || {}
    };

    const data = await geofabrikService.downloadRegionalData(regionId, layers || [], jobId, options);

    res.json({
      success: true,
      data: data,
      cached: !options.forceRefresh
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific layer for region
app.get('/api/gis/geofabrik/:regionId/:layerId', externalAPILimiter.createMiddleware('openstreetmap'), async (req, res) => {
  try {
    const { regionId, layerId } = req.params;
    const { targetCRS } = req.query;

    const options = { targetCRS: targetCRS || 'EPSG:4326' };
    const data = await geofabrikService.getRegionLayer(regionId, layerId, options);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search Geofabrik region
app.post('/api/gis/geofabrik/:regionId/search', externalAPILimiter.createMiddleware('openstreetmap'), async (req, res) => {
  try {
    const { regionId } = req.params;
    const { searchParams, layers, targetCRS } = req.body;

    const options = { targetCRS: targetCRS || 'EPSG:4326' };
    const data = await geofabrikService.searchRegion(regionId, searchParams, layers || [], options);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== CENSUS TIGER ENDPOINTS =====

// Get available Census TIGER datasets
app.get('/api/gis/census/datasets', async (req, res) => {
  try {
    const { category } = req.query;
    let datasets;

    if (category) {
      datasets = censusTigerService.getDatasetsByCategory(category);
    } else {
      datasets = censusTigerService.getAvailableDatasets();
    }

    res.json({
      success: true,
      data: datasets,
      availableStates: censusTigerService.getAvailableStates(),
      availableYears: censusTigerService.getAvailableYears(),
      source: 'U.S. Census Bureau TIGER/Line'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download Census TIGER dataset
app.post('/api/gis/download/census/:datasetId', externalAPILimiter.createMiddleware('census'), async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { year, stateCode, jobId, forceRefresh, targetCRS, includeDemographics } = req.body;

    const options = {
      year: year || new Date().getFullYear(),
      stateCode: stateCode,
      forceRefresh: forceRefresh || false,
      targetCRS: targetCRS || 'EPSG:4326',
      includeDemographics: includeDemographics || false
    };

    const data = await censusTigerService.downloadDataset(datasetId, options, jobId);

    res.json({
      success: true,
      data: data,
      cached: !options.forceRefresh
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== MUNICIPAL DATA ENDPOINTS =====

// Get available municipal data sources
app.get('/api/gis/municipal/sources', async (req, res) => {
  try {
    const sources = municipalDataService.getAvailableDataSources();

    res.json({
      success: true,
      data: sources,
      source: 'Municipal Open Data'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get datasets for specific municipality
app.get('/api/gis/municipal/:municipalityId/datasets', async (req, res) => {
  try {
    const { municipalityId } = req.params;
    const datasets = municipalDataService.getMunicipalDatasets(municipalityId);

    res.json({
      success: true,
      data: datasets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download municipal dataset
app.post('/api/gis/download/municipal/:municipalityId/:datasetId', externalAPILimiter.createMiddleware('municipal'), async (req, res) => {
  try {
    const { municipalityId, datasetId } = req.params;
    const { jobId, forceRefresh, targetCRS, filters } = req.body;

    const options = {
      forceRefresh: forceRefresh || false,
      targetCRS: targetCRS || 'EPSG:4326',
      filters: filters || {}
    };

    const data = await municipalDataService.downloadMunicipalDataset(municipalityId, datasetId, jobId, options);

    res.json({
      success: true,
      data: data,
      cached: !options.forceRefresh
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search municipal data
app.post('/api/gis/municipal/:municipalityId/search', externalAPILimiter.createMiddleware('municipal'), async (req, res) => {
  try {
    const { municipalityId } = req.params;
    const { searchParams, datasets, targetCRS } = req.body;

    const options = { targetCRS: targetCRS || 'EPSG:4326' };
    const data = await municipalDataService.searchMunicipalData(municipalityId, searchParams, datasets || [], options);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get datasets by category across municipalities
app.get('/api/gis/municipal/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const datasets = municipalDataService.getDatasetsByCategory(category);

    res.json({
      success: true,
      data: datasets,
      category: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== MICROSOFT BUILDINGS ENDPOINTS =====

// Get available Microsoft Building regions
app.get('/api/gis/microsoft-buildings/regions', async (req, res) => {
  try {
    const regions = microsoftBuildingsService.getAvailableRegions();

    res.json({
      success: true,
      data: regions,
      source: 'Microsoft Building Footprints'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available analysis types
app.get('/api/gis/microsoft-buildings/analysis-types', async (req, res) => {
  try {
    const analysisTypes = microsoftBuildingsService.getAnalysisTypes();

    res.json({
      success: true,
      data: analysisTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download Microsoft Building Footprints
app.post('/api/gis/download/microsoft-buildings/:regionId', externalAPILimiter.createMiddleware('microsoft'), async (req, res) => {
  try {
    const { regionId } = req.params;
    const { fileKey, jobId, forceRefresh, bounds, sampleSize, maxFeatures } = req.body;

    const options = {
      forceRefresh: forceRefresh || false,
      bounds: bounds,
      sampleSize: sampleSize,
      maxFeatures: maxFeatures || 100000 // Default limit for performance
    };

    const data = await microsoftBuildingsService.downloadBuildingFootprints(regionId, fileKey, jobId, options);

    res.json({
      success: true,
      data: data,
      cached: !options.forceRefresh
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Perform building density analysis
app.post('/api/gis/microsoft-buildings/:regionId/density-analysis', externalAPILimiter.createMiddleware('microsoft'), async (req, res) => {
  try {
    const { regionId } = req.params;
    const { gridSize, bounds, sampleSize } = req.body;

    const options = {
      bounds: bounds,
      sampleSize: sampleSize
    };

    const data = await microsoftBuildingsService.performDensityAnalysis(regionId, gridSize || 1000, options);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== PROGRESS TRACKING ENDPOINTS =====

// Get download progress status
app.get('/api/gis/progress/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const progress = await getProgressStatus(jobId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Progress record not found'
      });
    }

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== UTILITY ENDPOINTS =====

// Get dataset information
app.get('/api/gis/:source/:datasetId/info', async (req, res) => {
  try {
    const { source, datasetId } = req.params;
    let info;

    switch (source) {
      case 'naturalearth':
        info = await naturalEarthService.getDatasetInfo(datasetId);
        break;
      case 'geofabrik':
        info = await geofabrikService.getRegionInfo(datasetId);
        break;
      case 'census':
        info = await censusTigerService.getDatasetInfo(datasetId);
        break;
      case 'microsoft-buildings':
        info = await microsoftBuildingsService.getRegionInfo(datasetId);
        break;
      default:
        throw new Error(`Unsupported data source: ${source}`);
    }

    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get municipal dataset information
app.get('/api/gis/municipal/:municipalityId/:datasetId/info', async (req, res) => {
  try {
    const { municipalityId, datasetId } = req.params;
    const info = await municipalDataService.getDatasetInfo(municipalityId, datasetId);

    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cache statistics
app.get('/api/gis/cache/stats', async (req, res) => {
  try {
    const stats = cacheService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache
app.post('/api/gis/cache/clear', async (req, res) => {
  try {
    await cacheService.clearAll();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get rate limiting status
app.get('/api/gis/rate-limit/status', async (req, res) => {
  try {
    const status = externalAPILimiter.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== FEMA SEA LEVEL RISE API ENDPOINTS =====

// Get available sea level rise scenarios
app.get('/api/gis/fema-sea-level-rise/scenarios', async (req, res) => {
  try {
    const scenarios = femaSeaLevelRiseService.getAvailableScenarios();

    res.json({
      success: true,
      data: scenarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sea level rise data for specific location and scenario
app.get('/api/gis/fema-sea-level-rise/data', async (req, res) => {
  try {
    const { lat, lng, scenario = 'current', forceRefresh = false } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const data = await femaSeaLevelRiseService.getSeaLevelRiseData(
      parseFloat(lat),
      parseFloat(lng),
      scenario,
      { forceRefresh: forceRefresh === 'true' }
    );

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sea level rise projections for all scenarios
app.get('/api/gis/fema-sea-level-rise/projections', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const projections = await femaSeaLevelRiseService.getSeaLevelRiseProjections(
      parseFloat(lat),
      parseFloat(lng)
    );

    res.json({
      success: true,
      data: projections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get impact analysis for a specific area
app.get('/api/gis/fema-sea-level-rise/impact-analysis', async (req, res) => {
  try {
    const { 
      north, 
      south, 
      east, 
      west, 
      scenario = 'current' 
    } = req.query;

    if (!north || !south || !east || !west) {
      return res.status(400).json({
        success: false,
        error: 'Bounding box coordinates (north, south, east, west) are required'
      });
    }

    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };

    const analysis = await femaSeaLevelRiseService.getImpactAnalysis(bounds, scenario);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== NOAA CLIMATE DATA PROXY ENDPOINTS =====

// Proxy to NOAA CDO API (requires token)
// Example: /api/climate/noaa/cdo/datasets?limit=25
app.get('/api/climate/noaa/cdo/*', async (req, res) => {
  try {
    if (!NOAA_CDO_TOKEN) {
      return res.status(400).json({ success: false, error: 'NOAA_CDO_TOKEN is not configured' });
    }

    const cdoPath = req.params[0] || '';
    const url = `https://www.ncei.noaa.gov/cdo-web/api/v2/${cdoPath}`;

    const response = await axios.get(url, {
      headers: { token: NOAA_CDO_TOKEN },
      params: req.query,
      timeout: 15000
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// Lightweight helpers for common CDO resources
app.get('/api/climate/noaa/datasets', async (req, res) => {
  req.url = '/api/climate/noaa/cdo/datasets';
  return app._router.handle(req, res, () => {});
});

app.get('/api/climate/noaa/stations', async (req, res) => {
  req.url = '/api/climate/noaa/cdo/stations';
  return app._router.handle(req, res, () => {});
});

app.get('/api/climate/noaa/data', async (req, res) => {
  req.url = '/api/climate/noaa/cdo/data';
  return app._router.handle(req, res, () => {});
});

// NOAA Sea Level Rise Viewer (unofficial) proxy
// Passes through to coast.noaa.gov SLR API where available
app.get('/api/climate/noaa/slr/*', async (req, res) => {
  try {
    const slrPath = req.params[0] || '';
    const url = `https://coast.noaa.gov/slrdata/api/${slrPath}`;
    const response = await axios.get(url, { params: req.query, timeout: 15000 });
    res.json({ success: true, data: response.data });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// Computed series: Temperature anomaly (monthly) using GSOM
// Defaults: station JFK (USW00094789), last 5 years (NOAA limit is 10 years)
app.get('/api/climate/noaa/temperature/anomaly', async (req, res) => {
  try {
    if (!NOAA_CDO_TOKEN) {
      return res.status(400).json({ success: false, error: 'NOAA_CDO_TOKEN is not configured' });
    }

    const stationid = req.query.stationid || 'GHCND:USW00094789';
    const years = Math.min(parseInt(req.query.years || '5', 10), 9); // NOAA limit is 10 years, use 9 max
    const now = new Date();
    const enddate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const startdate = `${now.getFullYear() - years}-01-01`;

    // Fetch monthly mean temperature (GSOM dataset, TAVG)
    const url = 'https://www.ncei.noaa.gov/cdo-web/api/v2/data';
    const params = {
      datasetid: 'GSOM',
      datatypeid: 'TAVG',
      stationid,
      startdate,
      enddate,
      limit: 1000,
      units: 'metric'
    };
    const resp = await axios.get(url, { headers: { token: NOAA_CDO_TOKEN }, params, timeout: 20000 });
    const results = resp.data?.results || [];

    // TAVG is in tenths °C for GSOM; normalize to °C
    const series = results
      .map(r => ({ date: r.date, valueC: (typeof r.value === 'number' ? r.value : Number(r.value)) / 10 }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (series.length === 0) {
      return res.json({ success: true, data: { stationid, timeseries: [], baselineMeanC: null, anomaliesC: [], trendCPerDecade: null } });
    }

    const mean = series.reduce((s, p) => s + p.valueC, 0) / series.length;
    const anomalies = series.map(p => ({ date: p.date, valueC: p.valueC - mean }));

    // Simple linear regression for anomaly trend
    const xs = anomalies.map((p, i) => i);
    const ys = anomalies.map(p => p.valueC);
    const n = xs.length;
    const sumX = xs.reduce((s, x) => s + x, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumXX = xs.reduce((s, x) => s + x * x, 0);
    const slopePerStep = (n * sumXY - sumX * sumY) / Math.max(1, (n * sumXX - sumX * sumX));
    // steps are months; convert to per decade
    const slopePerDecade = slopePerStep * 12 * 10;

    res.json({
      success: true,
      data: {
        stationid,
        startdate,
        enddate,
        baselineMeanC: Number(mean.toFixed(3)),
        timeseries: series.map(p => ({ date: p.date, valueC: Number(p.valueC.toFixed(3)) })),
        anomaliesC: anomalies.map(p => ({ date: p.date, valueC: Number(p.valueC.toFixed(3)) })),
        trendCPerDecade: Number(slopePerDecade.toFixed(3))
      }
    });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// Computed series: Precipitation trend (monthly) using GSOM PRCP
app.get('/api/climate/noaa/precipitation/trend', async (req, res) => {
  try {
    if (!NOAA_CDO_TOKEN) {
      return res.status(400).json({ success: false, error: 'NOAA_CDO_TOKEN is not configured' });
    }

    const stationid = req.query.stationid || 'GHCND:USW00094789';
    const years = Math.min(parseInt(req.query.years || '5', 10), 9); // NOAA limit is 10 years, use 9 max
    const now = new Date();
    const enddate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const startdate = `${now.getFullYear() - years}-01-01`;

    const url = 'https://www.ncei.noaa.gov/cdo-web/api/v2/data';
    const params = {
      datasetid: 'GSOM',
      datatypeid: 'PRCP',
      stationid,
      startdate,
      enddate,
      limit: 1000,
      units: 'metric'
    };
    const resp = await axios.get(url, { headers: { token: NOAA_CDO_TOKEN }, params, timeout: 20000 });
    const results = resp.data?.results || [];

    // PRCP unit from GSOM is tenths of mm; convert to mm
    const series = results
      .map(r => ({ date: r.date, valueMm: (typeof r.value === 'number' ? r.value : Number(r.value)) / 10 }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (series.length === 0) {
      return res.json({ success: true, data: { stationid, timeseries: [], trendMmPerDecade: null } });
    }

    // Linear trend
    const xs = series.map((p, i) => i);
    const ys = series.map(p => p.valueMm);
    const n = xs.length;
    const sumX = xs.reduce((s, x) => s + x, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumXX = xs.reduce((s, x) => s + x * x, 0);
    const slopePerStep = (n * sumXY - sumX * sumY) / Math.max(1, (n * sumXX - sumX * sumX));
    const slopePerDecade = slopePerStep * 12 * 10;

    res.json({
      success: true,
      data: {
        stationid,
        startdate,
        enddate,
        timeseries: series.map(p => ({ date: p.date, valueMm: Number(p.valueMm.toFixed(2)) })),
        trendMmPerDecade: Number(slopePerDecade.toFixed(2))
      }
    });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// NASA GISTEMP Temperature endpoint
app.get('/api/nasa/temperature', async (req, res) => {
  try {
    const { north, south, east, west, year, resolution = 2 } = req.query;

    console.log('🌡️ Fetching NASA GISTEMP temperature data...');

    const bounds = {
      north: parseFloat(north) || 90,
      south: parseFloat(south) || -90,
      east: parseFloat(east) || 180,
      west: parseFloat(west) || -180
    };

    const data = await nasaGistempService.getRegionalTemperatureData(bounds, {
      year: year ? parseInt(year) : undefined,
      resolution: parseFloat(resolution)
    });

    res.json({
      success: true,
      data: data,
      metadata: {
        bounds: bounds,
        year: year || new Date().getFullYear(),
        resolution: `${resolution}° × ${resolution}°`
      }
    });
  } catch (error) {
    console.error('Error fetching NASA temperature data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NASA MODIS Land Surface Temperature endpoint (REAL satellite data)
app.get('/api/modis/lst', async (req, res) => {
  try {
    const { north, south, east, west, date, resolution = 0.05 } = req.query;

    console.log('🛰️ Fetching REAL NASA MODIS LST data...');

    const bounds = {
      north: parseFloat(north) || 41,
      south: parseFloat(south) || 40,
      east: parseFloat(east) || -73,
      west: parseFloat(west) || -74
    };

    const data = await modisLSTService.getRegionalLSTData(bounds, {
      date: date,
      resolution: parseFloat(resolution)
    });

    res.json({
      success: true,
      data: data,
      metadata: {
        bounds: bounds,
        date: date || new Date().toISOString().split('T')[0],
        resolution: `${resolution}° × ${resolution}°`,
        source: 'NASA MODIS/POWER',
        data_type: 'real satellite data'
      }
    });
  } catch (error) {
    console.error('Error fetching MODIS LST data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get NASA GIBS tile info for direct WMS integration
app.get('/api/modis/gibs-tiles', async (req, res) => {
  try {
    const { date, layer } = req.query;

    const tileInfo = modisLSTService.getGIBSTileUrl({
      date: date,
      layer: layer
    });

    res.json({
      success: true,
      data: tileInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NOAA Sea Level Rise endpoint
app.get('/api/noaa/sea-level-rise', async (req, res) => {
  try {
    const { feet = 3, north, south, east, west } = req.query;

    // Validate parameters
    if (!north || !south || !east || !west) {
      return res.status(400).json({
        success: false,
        error: 'Bounding box coordinates required (north, south, east, west)'
      });
    }

    // Map feet to NOAA service
    const feetValue = parseInt(feet);
    const serviceUrl = `https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_${feetValue}ft/MapServer/0/query`;

    console.log(`🌊 Fetching NOAA ${feetValue}ft sea level rise data...`);

    // Build query parameters for NOAA ArcGIS
    const params = {
      f: 'geojson',
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      spatialRel: 'esriSpatialRelIntersects',
      geometry: JSON.stringify({
        xmin: parseFloat(west),
        ymin: parseFloat(south),
        xmax: parseFloat(east),
        ymax: parseFloat(north),
        spatialReference: { wkid: 4326 }
      }),
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      outSR: '4326'
    };

    const noaaResponse = await axios.get(serviceUrl, {
      params,
      timeout: 15000
    });

    console.log(`✅ NOAA returned ${noaaResponse.data.features?.length || 0} features`);

    res.json({
      success: true,
      data: noaaResponse.data,
      metadata: {
        feet: feetValue,
        bounds: { north, south, east, west },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ NOAA fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
const startServer = async () => {
  await createUploadsDir();
  await initializeDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📊 GIS Data Integration endpoints available at /api/gis`);
    console.log(`🗺️  Supported data sources:`);
    console.log(`   - Natural Earth Data: /api/gis/naturalearth`);
    console.log(`   - OpenStreetMap/Geofabrik: /api/gis/geofabrik`);
    console.log(`   - Census TIGER: /api/gis/census`);
    console.log(`   - Municipal Open Data: /api/gis/municipal`);
    console.log(`   - Microsoft Buildings: /api/gis/microsoft-buildings`);
    console.log(`   - FEMA Sea Level Rise: /api/gis/fema-sea-level-rise`);
    console.log(`🌊 NOAA Sea Level Rise endpoint: /api/noaa/sea-level-rise`);
  });
};

startServer();