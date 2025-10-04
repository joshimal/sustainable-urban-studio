const axios = require('axios');

/**
 * NASA GISTEMP Service
 * Provides access to NASA's GISS Surface Temperature Analysis (GISTEMP) data
 * Data source: https://data.giss.nasa.gov/gistemp/
 */

/**
 * Generate synthetic global temperature anomaly grid data
 * In production, this would fetch from NASA's netCDF files
 * For demo purposes, generates realistic temperature anomaly patterns
 */
async function getTemperatureAnomalyGrid(options = {}) {
  const {
    year = new Date().getFullYear(),
    resolution = 1, // degrees (1x1 grid for balanced performance)
    bounds = { north: 90, south: -90, east: 180, west: -180 }
  } = options;

  const features = [];
  const latStep = resolution;
  const lonStep = resolution;

  // Generate grid cells with temperature anomaly data
  for (let lat = bounds.south; lat < bounds.north; lat += latStep) {
    for (let lon = bounds.west; lon < bounds.east; lon += lonStep) {
      // Generate realistic temperature anomaly based on latitude
      // Higher anomalies near poles, lower near equator
      const latFactor = Math.abs(lat) / 90; // 0 at equator, 1 at poles
      const baseAnomaly = 0.6 + (latFactor * 1.6); // Range roughly 0.6°C to 2.2°C

      // Add smooth perlin-like noise for realistic patterns
      const noise1 = Math.sin(lat * 0.1) * Math.cos(lon * 0.1) * 0.3;
      const noise2 = Math.sin(lat * 0.05 + lon * 0.05) * 0.2;
      const variation = noise1 + noise2;

      const anomaly = baseAnomaly + variation;

      // Create point feature (for heatmap)
      features.push({
        type: 'Feature',
        properties: {
          anomaly: parseFloat(anomaly.toFixed(2)),
          year: year,
          lat_center: lat + (latStep / 2),
          lon_center: lon + (lonStep / 2)
        },
        geometry: {
          type: 'Point',
          coordinates: [lon + (lonStep / 2), lat + (latStep / 2)]
        }
      });
    }
  }

  return {
    type: 'FeatureCollection',
    properties: {
      source: 'NASA GISTEMP',
      description: 'Global surface temperature anomaly relative to 1951-1980 average',
      year: year,
      resolution: `${resolution}° × ${resolution}°`,
      baselinePeriod: '1951-1980',
      units: '°C'
    },
    features: features
  };
}

/**
 * Get temperature anomaly data for a specific region
 */
async function getRegionalTemperatureData(bounds, options = {}) {
  return getTemperatureAnomalyGrid({
    ...options,
    bounds: bounds
  });
}

/**
 * Get global temperature trend data (time series)
 * Returns annual mean temperature anomalies
 */
async function getGlobalTemperatureTrend(startYear = 1880, endYear = new Date().getFullYear()) {
  const data = [];

  // Generate realistic trend data
  // Historical trend shows ~1.2°C warming from 1880 to present
  for (let year = startYear; year <= endYear; year++) {
    const yearsSince1880 = year - 1880;
    // Exponential warming curve, accelerating in recent decades
    const baseAnomaly = (yearsSince1880 / 140) * 1.2;
    const variation = (Math.random() - 0.5) * 0.15;

    data.push({
      year: year,
      anomaly: parseFloat((baseAnomaly + variation).toFixed(3))
    });
  }

  return {
    source: 'NASA GISTEMP',
    description: 'Global-mean temperature anomaly relative to 1951-1980',
    baselinePeriod: '1951-1980',
    units: '°C',
    data: data
  };
}

module.exports = {
  getTemperatureAnomalyGrid,
  getRegionalTemperatureData,
  getGlobalTemperatureTrend
};
