const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8082', 'http://localhost:8083'],
  credentials: true
}));

app.use(express.json());

// Generate realistic Nassau County coordinates
const nassauCenter = { lat: 40.7259, lng: -73.5143 };
const generateCoordinates = (count = 50) => {
  const coords = [];
  for (let i = 0; i < count; i++) {
    // Generate points within ~20km radius of Nassau County
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * 0.15; // ~16km in degrees
    coords.push({
      lat: nassauCenter.lat + Math.cos(angle) * radius,
      lng: nassauCenter.lng + Math.sin(angle) * radius
    });
  }
  return coords;
};

// Generate time series data for climate projections
const generateTimeSeries = (baseValue, years, trend = 0.1) => {
  const data = [];
  for (let year = 2020; year <= 2020 + years; year++) {
    const yearOffset = year - 2020;
    const trendValue = baseValue + (trend * yearOffset);
    const randomVariation = (Math.random() - 0.5) * 0.5;
    data.push({
      year,
      value: Math.max(0, trendValue + randomVariation),
      confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
    });
  }
  return data;
};

// **CLIMATE DATA ENDPOINTS**

// Temperature heat maps with time projections
app.get('/api/climate/temperature/heatmap', (req, res) => {
  const { year = 2030, scenario = 'moderate' } = req.query;

  const scenarios = {
    conservative: { baseTemp: 72, increase: 2.5 },
    moderate: { baseTemp: 72, increase: 4.2 },
    aggressive: { baseTemp: 72, increase: 6.8 }
  };

  const config = scenarios[scenario] || scenarios.moderate;
  const yearOffset = (parseInt(year) - 2020) / 10;
  const projectedIncrease = config.increase * yearOffset;

  const coords = generateCoordinates(100);
  const heatData = coords.map((coord, index) => ({
    ...coord,
    temperature: config.baseTemp + projectedIncrease + (Math.random() - 0.5) * 8,
    heatIslandEffect: Math.random() * 15, // Urban heat island 0-15°F increase
    intensity: Math.min(1, (projectedIncrease + Math.random() * 3) / 10)
  }));

  res.json({
    year: parseInt(year),
    scenario,
    baseTemperature: config.baseTemp,
    projectedIncrease,
    data: heatData,
    timeSeries: generateTimeSeries(config.baseTemp, 30, config.increase / 30),
    metadata: {
      units: 'fahrenheit',
      resolution: 'high',
      lastUpdated: new Date().toISOString(),
      source: 'Mock Climate API - Nassau County'
    }
  });
});

// Sea level rise projections
app.get('/api/climate/sea-level-rise/projection', (req, res) => {
  const { level = 3.5, timeframe = '2050' } = req.query;

  const riseLevel = parseFloat(level);
  const coords = generateCoordinates(80);

  // Generate flood risk areas based on elevation and proximity to water
  const floodRiskData = coords.map((coord, index) => {
    const distanceFromWater = Math.random();
    const elevation = Math.random() * 50 + 5; // 5-55 feet elevation
    const riskLevel = Math.max(0, (riseLevel - elevation + 10) / 15);

    return {
      ...coord,
      elevation,
      riskLevel: Math.min(1, riskLevel),
      floodDepth: Math.max(0, riseLevel - elevation),
      affectedStructures: Math.floor(Math.random() * 50),
      economicImpact: Math.floor(Math.random() * 10000000) // USD
    };
  });

  res.json({
    seaLevelRise: riseLevel,
    timeframe,
    affectedAreas: floodRiskData.filter(d => d.riskLevel > 0.3),
    allData: floodRiskData,
    projections: generateTimeSeries(0, 80, riseLevel / 80), // 80 year projection
    summary: {
      totalAffectedArea: Math.floor(Math.random() * 1000 + 500), // sq km
      populationAtRisk: Math.floor(Math.random() * 50000 + 10000),
      estimatedDamage: Math.floor(Math.random() * 5000000000) // $5B range
    },
    metadata: {
      units: 'feet',
      confidence: 0.85,
      lastUpdated: new Date().toISOString()
    }
  });
});

// Precipitation and drought data
app.get('/api/climate/precipitation/annual', (req, res) => {
  const { year = 2030 } = req.query;

  const coords = generateCoordinates(60);
  const precipitationData = coords.map(coord => ({
    ...coord,
    annualPrecipitation: Math.random() * 60 + 30, // 30-90 inches
    droughtRisk: Math.random(),
    floodRisk: Math.random(),
    seasonalVariation: {
      spring: Math.random() * 15 + 8,
      summer: Math.random() * 12 + 3,
      fall: Math.random() * 15 + 8,
      winter: Math.random() * 18 + 7
    }
  }));

  res.json({
    year: parseInt(year),
    data: precipitationData,
    timeSeries: generateTimeSeries(45, 50, -0.2), // Declining precipitation trend
    droughtProjections: generateTimeSeries(0.3, 30, 0.01),
    metadata: {
      units: 'inches',
      averageAnnual: 45.2,
      lastUpdated: new Date().toISOString()
    }
  });
});

// **ENVIRONMENTAL MONITORING ENDPOINTS**

// Air quality with pollutant breakdown
app.get('/api/environment/air-quality/index', (req, res) => {
  const { pollutant = 'pm25' } = req.query;

  const coords = generateCoordinates(40);
  const aqiData = coords.map(coord => {
    const baseAQI = Math.random() * 150 + 20;
    return {
      ...coord,
      aqi: Math.floor(baseAQI),
      category: baseAQI < 50 ? 'Good' : baseAQI < 100 ? 'Moderate' : baseAQI < 150 ? 'Unhealthy for Sensitive' : 'Unhealthy',
      pollutants: {
        pm25: Math.random() * 35 + 5,
        pm10: Math.random() * 50 + 10,
        ozone: Math.random() * 0.1 + 0.02,
        no2: Math.random() * 80 + 10,
        so2: Math.random() * 30 + 5,
        co: Math.random() * 5 + 1
      },
      healthRisk: Math.random()
    };
  });

  res.json({
    pollutant,
    data: aqiData,
    timeSeries: generateTimeSeries(75, 20, 2), // Slight increase in AQI over time
    healthAdvisory: {
      sensitiveGroups: ['children', 'elderly', 'asthma sufferers'],
      recommendations: ['Limit outdoor activities', 'Use air purifiers', 'Wear N95 masks outdoors']
    },
    metadata: {
      units: 'AQI',
      lastUpdated: new Date().toISOString(),
      source: 'EPA AirNow Mock API'
    }
  });
});

// Water quality monitoring
app.get('/api/environment/water-quality/status', (req, res) => {
  const { source = 'groundwater' } = req.query;

  const coords = generateCoordinates(30);
  const waterData = coords.map(coord => ({
    ...coord,
    qualityScore: Math.random() * 40 + 60, // 60-100 score
    pH: Math.random() * 2 + 6.5, // 6.5-8.5
    dissolvedOxygen: Math.random() * 8 + 4, // 4-12 mg/L
    turbidity: Math.random() * 10, // 0-10 NTU
    contaminants: {
      bacteria: Math.random() * 1000,
      nitrates: Math.random() * 10,
      phosphates: Math.random() * 2,
      heavyMetals: Math.random() * 0.1
    },
    safeForDrinking: Math.random() > 0.2
  }));

  res.json({
    source,
    data: waterData,
    timeSeries: generateTimeSeries(78, 15, -1), // Slight decline in water quality
    summary: {
      averageQuality: 78.2,
      safeWaterPercentage: 85.3,
      majorConcerns: ['bacterial contamination', 'agricultural runoff']
    },
    metadata: {
      units: 'quality_score',
      maxScore: 100,
      lastUpdated: new Date().toISOString()
    }
  });
});

// **URBAN DEVELOPMENT ENDPOINTS**

// Population density analysis
app.get('/api/urban/density/population', (req, res) => {
  const { threshold = 5000 } = req.query;

  const coords = generateCoordinates(70);
  const densityData = coords.map(coord => ({
    ...coord,
    populationDensity: Math.random() * 15000 + 1000, // 1K-16K per sq km
    housingUnits: Math.floor(Math.random() * 2000 + 100),
    averageIncome: Math.floor(Math.random() * 80000 + 40000),
    growthRate: (Math.random() - 0.5) * 0.1, // -5% to +5% annually
    infrastructure: {
      schoolsPerCapita: Math.random() * 0.01,
      parksPerCapita: Math.random() * 0.05,
      publicTransitAccess: Math.random()
    }
  }));

  res.json({
    threshold: parseInt(threshold),
    data: densityData,
    projections: generateTimeSeries(8500, 25, 150), // Growing population density
    summary: {
      averageDensity: 8234,
      highDensityAreas: densityData.filter(d => d.populationDensity > threshold).length,
      totalPopulation: 1395000 // Nassau County approx
    },
    metadata: {
      units: 'people_per_sq_km',
      lastCensus: '2020',
      lastUpdated: new Date().toISOString()
    }
  });
});

// Green space coverage
app.get('/api/urban/green-space/coverage', (req, res) => {
  const { percentage = 35 } = req.query;

  const coords = generateCoordinates(50);
  const greenSpaceData = coords.map(coord => ({
    ...coord,
    greenSpaceCoverage: Math.random() * 60 + 10, // 10-70%
    parkArea: Math.random() * 100, // acres
    treeCanopy: Math.random() * 50 + 20, // 20-70%
    biodiversityIndex: Math.random(),
    carbonSequestration: Math.random() * 50 + 10, // tons CO2/year
    airPurification: Math.random() * 1000 + 200 // lbs pollutants/year
  }));

  res.json({
    targetPercentage: parseFloat(percentage),
    data: greenSpaceData,
    timeSeries: generateTimeSeries(35, 20, -0.5), // Declining green space
    benefits: {
      estimatedCO2Removal: 125000, // tons/year
      airPollutionReduction: 580000, // lbs/year
      stormwaterManagement: 2400000, // gallons/year
      temperatureReduction: 3.2 // degrees F
    },
    metadata: {
      units: 'percentage',
      targetGoal: 40,
      lastUpdated: new Date().toISOString()
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      climate: 'operational',
      environment: 'operational',
      urban: 'operational'
    },
    version: '1.0.0',
    endpoints: {
      climate: [
        '/api/climate/temperature/heatmap',
        '/api/climate/sea-level-rise/projection',
        '/api/climate/precipitation/annual'
      ],
      environment: [
        '/api/environment/air-quality/index',
        '/api/environment/water-quality/status'
      ],
      urban: [
        '/api/urban/density/population',
        '/api/urban/green-space/coverage'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🌍 Climate & Environmental API Server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   🌡️  Climate: /api/climate/temperature/heatmap`);
  console.log(`   🌊  Sea Level: /api/climate/sea-level-rise/projection`);
  console.log(`   🌧️  Precipitation: /api/climate/precipitation/annual`);
  console.log(`   💨  Air Quality: /api/environment/air-quality/index`);
  console.log(`   💧  Water Quality: /api/environment/water-quality/status`);
  console.log(`   🏘️  Population: /api/urban/density/population`);
  console.log(`   🌳  Green Space: /api/urban/green-space/coverage`);
  console.log(`   ✅  Health: /api/health`);
});