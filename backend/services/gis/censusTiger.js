const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const cacheService = require('../cacheService');
const fileProcessor = require('../../utils/fileProcessor');
const { createProgressRecord, updateProgress } = require('../../utils/database');

class CensusTigerService {
  constructor() {
    this.tigerBaseUrl = 'https://www2.census.gov/geo/tiger';
    this.apiBaseUrl = 'https://api.census.gov/data';
    this.cacheDir = './downloads/census-tiger';

    // Available TIGER/Line datasets
    this.datasets = {
      // Administrative boundaries
      'states': {
        name: 'States',
        description: 'State and equivalent entities',
        path: 'GENZ{year}/shp/cb_{year}_us_state_20m.zip',
        category: 'administrative',
        geography: 'state'
      },
      'counties': {
        name: 'Counties',
        description: 'County and equivalent entities',
        path: 'GENZ{year}/shp/cb_{year}_us_county_20m.zip',
        category: 'administrative',
        geography: 'county'
      },
      'places': {
        name: 'Places',
        description: 'Incorporated places and census designated places',
        path: 'GENZ{year}/shp/cb_{year}_us_place_500k.zip',
        category: 'administrative',
        geography: 'place'
      },
      'zcta': {
        name: 'ZIP Code Tabulation Areas',
        description: 'ZIP Code Tabulation Areas',
        path: 'GENZ{year}/shp/cb_{year}_us_zcta520_500k.zip',
        category: 'administrative',
        geography: 'zcta'
      },
      // Census geography
      'tracts': {
        name: 'Census Tracts',
        description: 'Census tracts for demographic analysis',
        path: 'TIGER{year}/TRACT/tl_{year}_{fips}_tract.zip',
        category: 'census',
        geography: 'tract',
        requiresState: true
      },
      'block-groups': {
        name: 'Block Groups',
        description: 'Census block groups',
        path: 'TIGER{year}/BG/tl_{year}_{fips}_bg.zip',
        category: 'census',
        geography: 'block group',
        requiresState: true
      },
      'blocks': {
        name: 'Census Blocks',
        description: 'Census blocks (smallest census geography)',
        path: 'TIGER{year}/TABBLOCK20/tl_{year}_{fips}_tabblock20.zip',
        category: 'census',
        geography: 'block',
        requiresState: true
      },
      // Transportation
      'roads': {
        name: 'Primary Roads',
        description: 'Primary roads and highways',
        path: 'TIGER{year}/PRIMARYROADS/tl_{year}_us_primaryroads.zip',
        category: 'transportation',
        geography: 'national'
      },
      'rails': {
        name: 'Railroad Lines',
        description: 'Railroad feature database',
        path: 'TIGER{year}/RAILS/tl_{year}_us_rail.zip',
        category: 'transportation',
        geography: 'national'
      },
      // Water features
      'water': {
        name: 'Area Hydrography',
        description: 'Lakes, ponds, and other water bodies',
        path: 'TIGER{year}/AREAWATER/tl_{year}_{fips}_areawater.zip',
        category: 'hydrography',
        geography: 'water',
        requiresState: true
      }
    };

    // US State FIPS codes for geographic filtering
    this.stateFips = {
      'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09',
      'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
      'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25',
      'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32',
      'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
      'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
      'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55',
      'WY': '56', 'DC': '11', 'PR': '72'
    };

    // Ensure cache directory exists
    fs.ensureDirSync(this.cacheDir);
  }

  // Get available datasets
  getAvailableDatasets() {
    return Object.entries(this.datasets).map(([key, dataset]) => ({
      id: key,
      name: dataset.name,
      description: dataset.description,
      category: dataset.category,
      geography: dataset.geography,
      requiresState: dataset.requiresState || false,
      availableYears: this.getAvailableYears()
    }));
  }

  // Get datasets by category
  getDatasetsByCategory(category) {
    return this.getAvailableDatasets().filter(dataset => dataset.category === category);
  }

  // Get available years (typically current and previous years)
  getAvailableYears() {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
  }

  // Download and process TIGER dataset
  async downloadDataset(datasetId, options = {}, jobId = null) {
    const dataset = this.datasets[datasetId];
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const year = options.year || new Date().getFullYear();
    const stateCode = options.stateCode;

    // Validate state requirement
    if (dataset.requiresState && !stateCode) {
      throw new Error(`Dataset ${datasetId} requires a state code`);
    }

    const fips = stateCode ? this.stateFips[stateCode.toUpperCase()] : null;
    if (dataset.requiresState && !fips) {
      throw new Error(`Invalid state code: ${stateCode}`);
    }

    // Build download URL
    const pathWithReplacements = dataset.path
      .replace(/{year}/g, year)
      .replace(/{fips}/g, fips || '');

    const downloadUrl = `${this.tigerBaseUrl}/${pathWithReplacements}`;
    const cacheKey = cacheService.generateCacheKey('census-tiger', datasetId, { year, stateCode, ...options });

    // Check cache first
    if (!options.forceRefresh) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const fileName = path.basename(pathWithReplacements);
    const filePath = path.join(this.cacheDir, fileName);
    const extractDir = path.join(this.cacheDir, `${datasetId}_${year}_${stateCode || 'us'}`);

    try {
      // Create progress record if jobId provided
      if (jobId) {
        await createProgressRecord(jobId, 'census-tiger', datasetId);
        await updateProgress(jobId, 10, 0, 'downloading');
      }

      console.log(`Downloading Census TIGER dataset: ${datasetId} for ${year}`);

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
        await updateProgress(jobId, 70, downloadedSize, 'extracting');
      }

      // Extract ZIP file
      await fs.ensureDir(extractDir);
      const extractedFiles = await fileProcessor.extractZip(filePath, extractDir);

      if (jobId) {
        await updateProgress(jobId, 85, downloadedSize, 'processing');
      }

      // Find and process shapefile
      const shpFile = extractedFiles.find(file => path.extname(file) === '.shp');
      if (!shpFile) {
        throw new Error('No shapefile found in the downloaded data');
      }

      const geojson = await fileProcessor.processShapefile(shpFile, {
        sourceCRS: 'EPSG:4269', // NAD83 - common for TIGER data
        targetCRS: options.targetCRS || 'EPSG:4326',
        addMetadata: true
      });

      // Add Census-specific metadata
      geojson.metadata = {
        ...geojson.metadata,
        source: 'U.S. Census Bureau TIGER/Line',
        dataset: dataset.name,
        description: dataset.description,
        year: year,
        stateCode: stateCode,
        geography: dataset.geography,
        downloadUrl: downloadUrl,
        downloadedAt: new Date().toISOString()
      };

      // Calculate statistics
      const stats = fileProcessor.calculateStatistics(geojson);
      geojson.statistics = stats;

      // Add demographic data if available and requested
      if (options.includeDemographics) {
        try {
          await this.attachDemographicData(geojson, dataset.geography, year, stateCode);
        } catch (error) {
          console.warn('Failed to attach demographic data:', error.message);
        }
      }

      // Cache the result
      await cacheService.set(cacheKey, geojson, 'census-tiger', datasetId, null, 48);

      // Cleanup temporary files
      await fileProcessor.cleanup([filePath, extractDir]);

      if (jobId) {
        await updateProgress(jobId, 100, downloadedSize, 'completed');
      }

      console.log(`✅ Census TIGER dataset processed: ${datasetId}`);
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

      console.error(`❌ Census TIGER download failed: ${datasetId}`, error.message);
      throw error;
    }
  }

  // Attach demographic data from Census API
  async attachDemographicData(geojson, geography, year, stateCode) {
    if (!['tract', 'block group', 'county'].includes(geography)) {
      return; // Demographics only available for certain geographies
    }

    const demographicVars = [
      'B01003_001E', // Total population
      'B19013_001E', // Median household income
      'B25003_001E', // Total housing units
      'B08301_010E', // Public transportation to work
    ];

    try {
      // Build Census API URL based on geography
      let apiUrl = `${this.apiBaseUrl}/${year}/acs/acs5`;
      let params = `get=${demographicVars.join(',')}&for=${geography}:*`;

      if (geography === 'tract' || geography === 'block group') {
        params += `&in=state:${this.stateFips[stateCode]}`;
      }

      const response = await axios.get(`${apiUrl}?${params}`);
      const [headers, ...rows] = response.data;

      // Create lookup map
      const demographicData = {};
      rows.forEach(row => {
        const geoid = this.buildGeoId(row, headers, geography);
        const data = {};

        headers.forEach((header, index) => {
          if (demographicVars.includes(header)) {
            data[this.getVariableName(header)] = parseFloat(row[index]) || 0;
          }
        });

        demographicData[geoid] = data;
      });

      // Attach to features
      geojson.features.forEach(feature => {
        const geoid = this.extractGeoId(feature, geography);
        if (geoid && demographicData[geoid]) {
          feature.properties = {
            ...feature.properties,
            demographics: demographicData[geoid]
          };
        }
      });

      geojson.metadata.demographicsAttached = true;
      geojson.metadata.demographicVariables = demographicVars;

    } catch (error) {
      console.error('Failed to attach demographic data:', error.message);
      throw error;
    }
  }

  // Build Census GeoID from API response
  buildGeoId(row, headers, geography) {
    const stateIndex = headers.indexOf('state');
    const countyIndex = headers.indexOf('county');
    const tractIndex = headers.indexOf('tract');
    const bgIndex = headers.indexOf('block group');

    if (geography === 'county') {
      return row[stateIndex] + row[countyIndex];
    } else if (geography === 'tract') {
      return row[stateIndex] + row[countyIndex] + row[tractIndex];
    } else if (geography === 'block group') {
      return row[stateIndex] + row[countyIndex] + row[tractIndex] + row[bgIndex];
    }

    return null;
  }

  // Extract GeoID from feature properties
  extractGeoId(feature, geography) {
    const props = feature.properties;

    // Common TIGER field names for GeoIDs
    const geoIdFields = ['GEOID', 'GEOID20', 'GEOID10', 'TRACTCE', 'BLKGRPCE', 'COUNTYFP'];

    for (const field of geoIdFields) {
      if (props[field]) {
        return props[field];
      }
    }

    return null;
  }

  // Get human-readable variable names
  getVariableName(varCode) {
    const varNames = {
      'B01003_001E': 'totalPopulation',
      'B19013_001E': 'medianHouseholdIncome',
      'B25003_001E': 'totalHousingUnits',
      'B08301_010E': 'publicTransportationToWork'
    };

    return varNames[varCode] || varCode;
  }

  // Get dataset info
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
      geography: dataset.geography,
      requiresState: dataset.requiresState || false,
      availableYears: this.getAvailableYears(),
      source: 'U.S. Census Bureau TIGER/Line',
      license: 'Public Domain',
      attribution: 'U.S. Census Bureau'
    };
  }

  // Get available states
  getAvailableStates() {
    return Object.entries(this.stateFips).map(([code, fips]) => ({
      code: code,
      fips: fips,
      name: this.getStateName(code)
    }));
  }

  // Get state name from code
  getStateName(code) {
    const stateNames = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
      'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
      'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
      'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
      'DC': 'District of Columbia', 'PR': 'Puerto Rico'
    };

    return stateNames[code] || code;
  }
}

module.exports = new CensusTigerService();