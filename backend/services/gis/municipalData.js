const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const cacheService = require('../cacheService');
const fileProcessor = require('../../utils/fileProcessor');
const { createProgressRecord, updateProgress } = require('../../utils/database');

class MunicipalDataService {
  constructor() {
    this.cacheDir = './downloads/municipal';

    // Municipal data sources configuration
    this.dataSources = {
      // New York City Open Data
      'nyc': {
        name: 'NYC Open Data',
        baseUrl: 'https://data.cityofnewyork.us/api/geospatial',
        apiFormat: 'geojson',
        datasets: {
          'zoning': {
            id: 'dcp-zoning-districts-wi8c-iz65',
            name: 'Zoning Districts',
            description: 'NYC zoning district boundaries',
            category: 'zoning'
          },
          'neighborhoods': {
            id: 'neighborhood-tabulation-areas-cpf4-rkhq',
            name: 'Neighborhood Tabulation Areas',
            description: 'NYC neighborhood boundaries',
            category: 'administrative'
          },
          'parks': {
            id: 'parks-properties-enfh-gkve',
            name: 'Parks Properties',
            description: 'NYC parks and recreational areas',
            category: 'recreation'
          },
          'bike-routes': {
            id: 'nyc-bike-routes-635c-94cu',
            name: 'Bike Routes',
            description: 'NYC bicycle route network',
            category: 'transportation'
          },
          'subway-stations': {
            id: 'subway-stations-he7q-3hwy',
            name: 'Subway Stations',
            description: 'NYC subway station locations',
            category: 'transportation'
          },
          'flood-zones': {
            id: 'preliminary-flood-insurance-rate-maps-pfirm-2g7z-3vky',
            name: 'Flood Zones',
            description: 'FEMA flood insurance rate maps',
            category: 'environmental'
          },
          'land-use': {
            id: 'primary-land-use-tax-lot-output-pluto-5rsr-3qd5',
            name: 'Land Use (PLUTO)',
            description: 'Primary land use tax lot output',
            category: 'landuse'
          }
        }
      },

      // California Open Data
      'california': {
        name: 'California Open Data',
        baseUrl: 'https://data.ca.gov/api/3/action/datastore_search',
        apiFormat: 'ckan',
        datasets: {
          'counties': {
            id: 'e212e397-1277-4df3-8c22-40721b095f33',
            name: 'California Counties',
            description: 'California county boundaries',
            category: 'administrative'
          },
          'cities': {
            id: 'ac853504-8b22-4c0e-848a-7f20cb29b0f0',
            name: 'California Cities',
            description: 'California incorporated cities',
            category: 'administrative'
          },
          'schools': {
            id: 'school-districts-2019-20',
            name: 'School Districts',
            description: 'California school district boundaries',
            category: 'education'
          },
          'protected-areas': {
            id: 'protected-areas-database',
            name: 'Protected Areas',
            description: 'Protected areas and conservation lands',
            category: 'environmental'
          }
        }
      },

      // San Francisco Open Data
      'sf': {
        name: 'San Francisco Open Data',
        baseUrl: 'https://data.sfgov.org/api/geospatial',
        apiFormat: 'geojson',
        datasets: {
          'neighborhoods': {
            id: 'pty2-tcw4',
            name: 'Neighborhoods',
            description: 'San Francisco neighborhood boundaries',
            category: 'administrative'
          },
          'zoning': {
            id: 'dnne-b6tx',
            name: 'Zoning Districts',
            description: 'SF zoning district boundaries',
            category: 'zoning'
          },
          'bike-network': {
            id: 'ygek-nuhs',
            name: 'Bike Network',
            description: 'San Francisco bike network',
            category: 'transportation'
          },
          'parks': {
            id: '94bb-6te8',
            name: 'Parks and Open Space',
            description: 'SF parks and recreational areas',
            category: 'recreation'
          },
          'affordable-housing': {
            id: '9rdx-httc',
            name: 'Affordable Housing',
            description: 'Affordable housing developments',
            category: 'housing'
          }
        }
      },

      // Los Angeles Open Data
      'la': {
        name: 'Los Angeles Open Data',
        baseUrl: 'https://data.lacity.org/api/geospatial',
        apiFormat: 'geojson',
        datasets: {
          'neighborhoods': {
            id: 'council-districts-2012',
            name: 'Council Districts',
            description: 'LA city council districts',
            category: 'administrative'
          },
          'zoning': {
            id: 'zoning-current-q8gd-hy8s',
            name: 'Zoning Districts',
            description: 'Current zoning districts',
            category: 'zoning'
          },
          'transit-stops': {
            id: 'metro-bus-stops-i6nb-cq2j',
            name: 'Metro Bus Stops',
            description: 'LA Metro bus stop locations',
            category: 'transportation'
          }
        }
      }
    };

    // Ensure cache directory exists
    fs.ensureDirSync(this.cacheDir);
  }

  // Get available data sources and their datasets
  getAvailableDataSources() {
    return Object.entries(this.dataSources).map(([key, source]) => ({
      id: key,
      name: source.name,
      baseUrl: source.baseUrl,
      datasets: Object.entries(source.datasets).map(([datasetKey, dataset]) => ({
        id: datasetKey,
        name: dataset.name,
        description: dataset.description,
        category: dataset.category
      }))
    }));
  }

  // Get datasets by municipality
  getMunicipalDatasets(municipalityId) {
    const source = this.dataSources[municipalityId];
    if (!source) {
      throw new Error(`Municipality not found: ${municipalityId}`);
    }

    return {
      municipality: source.name,
      datasets: Object.entries(source.datasets).map(([key, dataset]) => ({
        id: key,
        name: dataset.name,
        description: dataset.description,
        category: dataset.category
      }))
    };
  }

  // Download municipal dataset
  async downloadMunicipalDataset(municipalityId, datasetId, jobId = null, options = {}) {
    const source = this.dataSources[municipalityId];
    if (!source) {
      throw new Error(`Municipality not found: ${municipalityId}`);
    }

    const dataset = source.datasets[datasetId];
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId} for ${municipalityId}`);
    }

    const cacheKey = cacheService.generateCacheKey('municipal', `${municipalityId}-${datasetId}`, options);

    // Check cache first
    if (!options.forceRefresh) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Create progress record if jobId provided
      if (jobId) {
        await createProgressRecord(jobId, 'municipal', `${municipalityId}-${datasetId}`);
        await updateProgress(jobId, 10, 0, 'downloading');
      }

      console.log(`Downloading municipal dataset: ${municipalityId}/${datasetId}`);

      let geojson;

      if (source.apiFormat === 'geojson') {
        geojson = await this.downloadGeoJSONDataset(source, dataset, jobId);
      } else if (source.apiFormat === 'ckan') {
        geojson = await this.downloadCKANDataset(source, dataset, jobId);
      } else {
        throw new Error(`Unsupported API format: ${source.apiFormat}`);
      }

      // Add municipal-specific metadata
      geojson.metadata = {
        ...geojson.metadata,
        source: source.name,
        municipality: municipalityId,
        dataset: dataset.name,
        description: dataset.description,
        category: dataset.category,
        downloadedAt: new Date().toISOString()
      };

      // Apply coordinate transformation if requested
      if (options.targetCRS && options.targetCRS !== 'EPSG:4326') {
        geojson.features = geojson.features.map(feature =>
          fileProcessor.transformCoordinates(feature, 'EPSG:4326', options.targetCRS)
        );
        geojson.metadata.targetCRS = options.targetCRS;
      }

      // Calculate statistics
      const stats = fileProcessor.calculateStatistics(geojson);
      geojson.statistics = stats;

      // Apply filters if specified
      if (options.filters) {
        geojson.features = this.applyFilters(geojson.features, options.filters);
        geojson.metadata.filtered = true;
        geojson.metadata.filters = options.filters;
      }

      // Cache the result
      await cacheService.set(cacheKey, geojson, 'municipal', `${municipalityId}-${datasetId}`, null, 12); // 12 hours cache

      if (jobId) {
        await updateProgress(jobId, 100, 0, 'completed');
      }

      console.log(`✅ Municipal dataset processed: ${municipalityId}/${datasetId}`);
      return geojson;

    } catch (error) {
      if (jobId) {
        await updateProgress(jobId, 0, 0, 'failed', error.message);
      }

      console.error(`❌ Municipal dataset download failed: ${municipalityId}/${datasetId}`, error.message);
      throw error;
    }
  }

  // Download GeoJSON dataset (NYC, SF, LA format)
  async downloadGeoJSONDataset(source, dataset, jobId = null) {
    const url = `${source.baseUrl}/${dataset.id}.geojson`;

    const response = await axios({
      method: 'GET',
      url: url,
      timeout: 120000, // 2 minutes
      headers: {
        'Accept': 'application/json'
      }
    });

    if (jobId) {
      await updateProgress(jobId, 80, 0, 'processing');
    }

    // Validate GeoJSON
    const validation = fileProcessor.validateGeoJSON(response.data);
    if (!validation.valid) {
      throw new Error(`Invalid GeoJSON: ${validation.errors.join(', ')}`);
    }

    return response.data;
  }

  // Download CKAN dataset (California format)
  async downloadCKANDataset(source, dataset, jobId = null) {
    // First, get dataset metadata
    const metadataUrl = `https://data.ca.gov/api/3/action/package_show?id=${dataset.id}`;
    const metadataResponse = await axios.get(metadataUrl);

    if (jobId) {
      await updateProgress(jobId, 30, 0, 'processing');
    }

    // Find GeoJSON or shapefile resource
    const resources = metadataResponse.data.result.resources || [];
    const geoResource = resources.find(r =>
      r.format.toLowerCase().includes('geojson') ||
      r.format.toLowerCase().includes('json') ||
      r.format.toLowerCase().includes('shp')
    );

    if (!geoResource) {
      throw new Error('No geographic data resource found in dataset');
    }

    if (jobId) {
      await updateProgress(jobId, 50, 0, 'downloading');
    }

    // Download the resource
    const dataResponse = await axios({
      method: 'GET',
      url: geoResource.url,
      timeout: 180000 // 3 minutes
    });

    if (jobId) {
      await updateProgress(jobId, 80, 0, 'processing');
    }

    // Handle different formats
    if (geoResource.format.toLowerCase().includes('json')) {
      return dataResponse.data;
    } else {
      // For shapefile, would need to download and process
      // This is a simplified implementation
      throw new Error('Shapefile processing for CKAN datasets not yet implemented');
    }
  }

  // Apply filters to features
  applyFilters(features, filters) {
    return features.filter(feature => {
      const properties = feature.properties || {};

      return Object.entries(filters).every(([key, value]) => {
        const propValue = properties[key];

        if (Array.isArray(value)) {
          return value.includes(propValue);
        }

        if (typeof value === 'string' && value.includes('*')) {
          const regex = new RegExp(value.replace(/\*/g, '.*'), 'i');
          return regex.test(String(propValue));
        }

        return String(propValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }

  // Search across municipal datasets
  async searchMunicipalData(municipalityId, searchParams, datasets = [], options = {}) {
    const source = this.dataSources[municipalityId];
    if (!source) {
      throw new Error(`Municipality not found: ${municipalityId}`);
    }

    const datasetIds = datasets.length > 0 ? datasets : Object.keys(source.datasets);
    const results = {
      municipality: source.name,
      searchParams: searchParams,
      datasets: {}
    };

    for (const datasetId of datasetIds) {
      try {
        const data = await this.downloadMunicipalDataset(municipalityId, datasetId, null, options);

        const filteredFeatures = data.features.filter(feature => {
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

        results.datasets[datasetId] = {
          ...data,
          features: filteredFeatures,
          metadata: {
            ...data.metadata,
            filteredBy: 'search',
            searchParams: searchParams,
            originalFeatureCount: data.features.length,
            filteredFeatureCount: filteredFeatures.length
          }
        };

      } catch (error) {
        console.error(`Failed to search dataset ${datasetId}:`, error.message);
        results.datasets[datasetId] = { error: error.message };
      }
    }

    return results;
  }

  // Get dataset information
  async getDatasetInfo(municipalityId, datasetId) {
    const source = this.dataSources[municipalityId];
    if (!source) {
      throw new Error(`Municipality not found: ${municipalityId}`);
    }

    const dataset = source.datasets[datasetId];
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    return {
      municipality: source.name,
      municipalityId: municipalityId,
      id: datasetId,
      name: dataset.name,
      description: dataset.description,
      category: dataset.category,
      source: source.name,
      baseUrl: source.baseUrl,
      apiFormat: source.apiFormat
    };
  }

  // Get datasets by category across all municipalities
  getDatasetsByCategory(category) {
    const results = [];

    Object.entries(this.dataSources).forEach(([municipalityId, source]) => {
      Object.entries(source.datasets).forEach(([datasetId, dataset]) => {
        if (dataset.category === category) {
          results.push({
            municipalityId: municipalityId,
            municipality: source.name,
            datasetId: datasetId,
            name: dataset.name,
            description: dataset.description,
            category: dataset.category
          });
        }
      });
    });

    return results;
  }
}

module.exports = new MunicipalDataService();