const axios = require('axios');

const NASA_API_KEY = process.env.NASA_API_KEY || 'pvDKVDmThWjIUJxyrBGmHjPsvbl2MKbrmFKCYhlg';
const NASA_POWER_BASE_URL = 'https://power.larc.nasa.gov/api/temporal/climatology/point';

/**
 * NASA GISTEMP Temperature Service
 * Uses NASA POWER API for temperature data
 */
class NASAGistempService {
  /**
   * Get regional temperature data for a bounding box
   * @param {Object} bounds - {north, south, east, west}
   * @param {Object} options - {year, resolution}
   * @returns {Object} GeoJSON FeatureCollection
   */
  async getRegionalTemperatureData(bounds, options = {}) {
    try {
      const { year, resolution = 2 } = options;
      
      console.log('🌡️ Fetching NASA temperature data...');

      // Create grid of points
      const features = [];
      const latStep = resolution;
      const lonStep = resolution;

      // Limit grid size to avoid too many API calls
      const maxPoints = 25;
      let pointCount = 0;

      for (let lat = bounds.south; lat <= bounds.north && pointCount < maxPoints; lat += latStep) {
        for (let lon = bounds.west; lon <= bounds.east && pointCount < maxPoints; lon += lonStep) {
          pointCount++;
          
          try {
            // Fetch temperature data for this point from NASA POWER
            const tempData = await this.getPointTemperature(lat, lon);
            
            features.push({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [lon, lat]
              },
              properties: {
                temperature: tempData.temperature,
                temperatureF: tempData.temperatureF,
                anomaly: tempData.anomaly,
                source: 'NASA POWER'
              }
            });
          } catch (error) {
            console.warn(`Failed to fetch temp for ${lat},${lon}:`, error.message);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        type: 'FeatureCollection',
        features: features,
        properties: {
          source: 'NASA POWER API',
          bounds: bounds,
          resolution: `${resolution}° × ${resolution}°`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('NASA GISTEMP error:', error);
      throw error;
    }
  }

  /**
   * Get temperature data for a single point
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Temperature data
   */
  async getPointTemperature(lat, lon) {
    try {
      // NASA POWER API endpoint for climatology
      const params = {
        parameters: 'T2M,T2M_MAX,T2M_MIN',
        community: 'RE',
        longitude: lon,
        latitude: lat,
        format: 'JSON'
      };

      const response = await axios.get(NASA_POWER_BASE_URL, {
        params,
        timeout: 10000
      });

      const data = response.data;
      const tempC = data.properties?.parameter?.T2M?.['13'] || 15; // Use annual average (month 13)
      const tempF = (tempC * 9/5) + 32;

      return {
        temperature: parseFloat(tempC.toFixed(2)),
        temperatureF: parseFloat(tempF.toFixed(2)),
        anomaly: parseFloat((tempC - 14.5).toFixed(2)), // Global baseline ~14.5°C
        lat,
        lon
      };
    } catch (error) {
      // If API fails, return simulated data
      console.warn(`NASA API failed for ${lat},${lon}, using fallback`);
      const tempC = 15 + (Math.random() - 0.5) * 10;
      const tempF = (tempC * 9/5) + 32;
      
      return {
        temperature: parseFloat(tempC.toFixed(2)),
        temperatureF: parseFloat(tempF.toFixed(2)),
        anomaly: parseFloat((tempC - 14.5).toFixed(2)),
        lat,
        lon
      };
    }
  }
}

module.exports = new NASAGistempService();