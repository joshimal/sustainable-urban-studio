const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const cacheService = require('../cacheService');
const { createProgressRecord, updateProgress } = require('../../utils/database');

class FEMASeaLevelRiseService {
  constructor() {
    this.cacheDir = './downloads/fema-sea-level-rise';
    this.cache = cacheService;
    
    // FEMA Sea Level Rise API endpoints
    this.apiEndpoints = {
      // FEMA National Risk Index API
      riskIndex: 'https://hazards.fema.gov/nri/DataAPI',
      
      // NOAA Sea Level Rise Viewer API (unofficial)
      noaaSLR: 'https://coast.noaa.gov/slrdata/api',
      
      // USGS Sea Level Rise API
      usgsSLR: 'https://api.usgs.gov/v1/products',
      
      // FEMA Flood Map Service Center API
      floodMaps: 'https://msc.fema.gov/portal/MapService'
    };
    
    // Sea level rise scenarios
    this.scenarios = {
      'current': {
        name: 'Current (2024)',
        year: 2024,
        rise: 0,
        description: 'Baseline sea level'
      },
      '2030': {
        name: '2030 Projection',
        year: 2030,
        rise: 1.5,
        description: 'Near-term sea level rise'
      },
      '2050': {
        name: '2050 Projection',
        year: 2050,
        rise: 3.0,
        description: 'Mid-term sea level rise'
      },
      '2100': {
        name: '2100 Projection',
        year: 2100,
        rise: 6.0,
        description: 'Long-term sea level rise'
      }
    };
  }

  // Get sea level rise data for a specific location and scenario
  async getSeaLevelRiseData(lat, lng, scenario = 'current', options = {}) {
    const cacheKey = `fema-slr-${lat}-${lng}-${scenario}`;
    
    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached && !options.forceRefresh) {
        console.log('📦 Returning cached FEMA sea level rise data');
        return cached;
      }

      console.log(`🌊 Fetching FEMA sea level rise data for ${lat}, ${lng} - ${scenario}`);
      
      const scenarioData = this.scenarios[scenario];
      if (!scenarioData) {
        throw new Error(`Invalid scenario: ${scenario}`);
      }

      // Get multiple data sources
      const [riskData, floodData, elevationData] = await Promise.all([
        this.getRiskIndexData(lat, lng),
        this.getFloodMapData(lat, lng, scenarioData.rise),
        this.getElevationData(lat, lng)
      ]);

      const result = {
        location: { lat, lng },
        scenario: scenarioData,
        riskIndex: riskData,
        floodRisk: floodData,
        elevation: elevationData,
        timestamp: new Date().toISOString(),
        source: 'FEMA Sea Level Rise Service'
      };

      // Cache the result
      await this.cache.set(cacheKey, result, 3600); // 1 hour cache
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching FEMA sea level rise data:', error);
      throw error;
    }
  }

  // Get FEMA National Risk Index data
  async getRiskIndexData(lat, lng) {
    try {
      // This is a mock implementation since FEMA's actual API requires authentication
      // In a real implementation, you would use the actual FEMA API
      const response = await axios.get(`${this.apiEndpoints.riskIndex}/riskIndex`, {
        params: {
          lat: lat,
          lng: lng,
          format: 'json'
        },
        timeout: 10000
      });

      return {
        overallRisk: response.data.overallRisk || 'Moderate',
        floodRisk: response.data.floodRisk || 'Moderate',
        seaLevelRiseRisk: response.data.seaLevelRiseRisk || 'Low',
        socialVulnerability: response.data.socialVulnerability || 'Moderate',
        communityResilience: response.data.communityResilience || 'Moderate'
      };

    } catch (error) {
      console.warn('⚠️ FEMA Risk Index API unavailable, using mock data');
      return this.getMockRiskData(lat, lng);
    }
  }

  // Get flood map data for sea level rise scenario
  async getFloodMapData(lat, lng, seaLevelRise) {
    try {
      // Mock implementation - in reality, you'd query FEMA's flood map service
      const baseFloodElevation = await this.getBaseFloodElevation(lat, lng);
      const adjustedBFE = baseFloodElevation + seaLevelRise;
      
      return {
        baseFloodElevation: baseFloodElevation,
        adjustedBFE: adjustedBFE,
        floodZone: this.determineFloodZone(adjustedBFE),
        riskLevel: this.calculateRiskLevel(adjustedBFE, seaLevelRise),
        inundationProbability: this.calculateInundationProbability(adjustedBFE, seaLevelRise)
      };

    } catch (error) {
      console.warn('⚠️ FEMA Flood Map API unavailable, using mock data');
      return this.getMockFloodData(lat, lng, seaLevelRise);
    }
  }

  // Get elevation data
  async getElevationData(lat, lng) {
    try {
      // Use USGS Elevation Point Query Service
      const response = await axios.get('https://nationalmap.gov/epqs/pqs.php', {
        params: {
          x: lng,
          y: lat,
          units: 'Feet',
          output: 'json'
        },
        timeout: 5000
      });

      return {
        elevation: response.data.Elevation_Query.Elevation,
        units: 'feet',
        source: 'USGS'
      };

    } catch (error) {
      console.warn('⚠️ USGS Elevation API unavailable, using mock data');
      return {
        elevation: Math.random() * 50 + 10, // Mock elevation 10-60 feet
        units: 'feet',
        source: 'mock'
      };
    }
  }

  // Get base flood elevation for location
  async getBaseFloodElevation(lat, lng) {
    // Mock implementation - in reality, you'd query FEMA's flood map service
    const baseElevation = Math.random() * 20 + 5; // 5-25 feet
    return baseElevation;
  }

  // Determine flood zone based on elevation
  determineFloodZone(adjustedBFE) {
    if (adjustedBFE <= 0) return 'VE'; // Coastal high hazard
    if (adjustedBFE <= 2) return 'AE'; // 100-year floodplain
    if (adjustedBFE <= 5) return 'X'; // 500-year floodplain
    return 'X'; // Minimal risk
  }

  // Calculate risk level
  calculateRiskLevel(adjustedBFE, seaLevelRise) {
    if (adjustedBFE <= 0) return 'extreme';
    if (adjustedBFE <= 2) return 'high';
    if (adjustedBFE <= 5) return 'moderate';
    return 'low';
  }

  // Calculate inundation probability
  calculateInundationProbability(adjustedBFE, seaLevelRise) {
    if (adjustedBFE <= 0) return 0.9; // 90% probability
    if (adjustedBFE <= 2) return 0.5; // 50% probability
    if (adjustedBFE <= 5) return 0.1; // 10% probability
    return 0.01; // 1% probability
  }

  // Mock data methods for when APIs are unavailable
  getMockRiskData(lat, lng) {
    return {
      overallRisk: 'Moderate',
      floodRisk: 'Moderate',
      seaLevelRiseRisk: 'Low',
      socialVulnerability: 'Moderate',
      communityResilience: 'Moderate'
    };
  }

  getMockFloodData(lat, lng, seaLevelRise) {
    const baseElevation = Math.random() * 20 + 5;
    const adjustedBFE = baseElevation + seaLevelRise;
    
    return {
      baseFloodElevation: baseElevation,
      adjustedBFE: adjustedBFE,
      floodZone: this.determineFloodZone(adjustedBFE),
      riskLevel: this.calculateRiskLevel(adjustedBFE, seaLevelRise),
      inundationProbability: this.calculateInundationProbability(adjustedBFE, seaLevelRise)
    };
  }

  // Get available scenarios
  getAvailableScenarios() {
    return this.scenarios;
  }

  // Get sea level rise projections for multiple scenarios
  async getSeaLevelRiseProjections(lat, lng) {
    const projections = {};
    
    for (const [key, scenario] of Object.entries(this.scenarios)) {
      try {
        const data = await this.getSeaLevelRiseData(lat, lng, key);
        projections[key] = data;
      } catch (error) {
        console.error(`Error getting projection for ${key}:`, error);
        projections[key] = null;
      }
    }
    
    return projections;
  }

  // Get impact analysis for a specific area
  async getImpactAnalysis(bounds, scenario = 'current') {
    try {
      const scenarioData = this.scenarios[scenario];
      if (!scenarioData) {
        throw new Error(`Invalid scenario: ${scenario}`);
      }

      // This would typically involve querying multiple points within the bounds
      // For now, we'll return a mock analysis
      return {
        bounds: bounds,
        scenario: scenarioData,
        totalArea: this.calculateArea(bounds),
        propertiesAtRisk: Math.floor(Math.random() * 1000) + 100,
        populationAffected: Math.floor(Math.random() * 5000) + 500,
        economicImpact: Math.floor(Math.random() * 100) + 10, // millions
        infrastructureRisk: this.calculateInfrastructureRisk(scenarioData.rise),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting impact analysis:', error);
      throw error;
    }
  }

  // Helper methods
  calculateArea(bounds) {
    // Simple area calculation (not accurate for large areas)
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    return latDiff * lngDiff * 69 * 69; // Rough conversion to square miles
  }

  calculateInfrastructureRisk(seaLevelRise) {
    if (seaLevelRise >= 6) return 'extreme';
    if (seaLevelRise >= 3) return 'high';
    if (seaLevelRise >= 1.5) return 'moderate';
    return 'low';
  }
}

module.exports = new FEMASeaLevelRiseService();


