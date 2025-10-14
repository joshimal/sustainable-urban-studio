# NASA Climate Data Integration - Quick Start

## What Changed

Your application now connects to **real NASA NEX-GDDP-CMIP6 climate data** from AWS S3 instead of simulated data.

## Quick Start

### 1. Rebuild the Climate Service

```bash
# Stop existing services
docker-compose down

# Rebuild the climate service container with new dependencies
docker-compose build urban-studio-qgis

# Start all services
docker-compose up -d
```

### 2. Verify Services Are Running

```bash
# Check all containers
docker-compose ps

# Check climate service logs
docker-compose logs urban-studio-qgis

# Should see: "🌍 Starting Climate Data Server on port 5000"
```

### 3. Test the Integration

#### Test with Simulated Data (default, fast)
```bash
curl "http://localhost:3001/api/nasa/temperature-projection?\
north=41&south=40&east=-73&west=-74&\
year=2050&scenario=rcp45"
```

#### Test with Real NASA Data (requires internet, slower on first load)
```bash
curl "http://localhost:3001/api/nasa/temperature-projection?\
north=41&south=40&east=-73&west=-74&\
year=2050&scenario=rcp45&\
use_real_data=true"
```

### 4. Use in Your Frontend

Your frontend code **doesn't need to change**. It already uses the correct endpoint:

```typescript
// frontend/src/config/climateLayers.ts
// This endpoint now proxies to the Python climate service
route: '/api/nasa/temperature-projection'
```

To switch between simulated and real data, you can:

**Option A**: Toggle in frontend code
```typescript
// In climateLayers.ts, modify the query function:
query: ({ bounds, projectionYear, scenario }) => {
  return {
    // ... existing params
    use_real_data: true  // Add this line
  }
}
```

**Option B**: Add UI toggle (recommended)
Add a switch in your climate controls to let users choose real vs simulated data.

## File Structure

```
qgis-processing/
├── climate_server.py           # Flask API server (new)
├── services/
│   └── nasa_climate.py        # NASA data service (new)
├── Dockerfile                  # Updated with new dependencies
└── NASA_CLIMATE_INTEGRATION.md # Detailed docs

backend/
└── server.js                   # Updated to proxy to Python service

docker-compose.yml              # Updated with CLIMATE_SERVICE_URL
```

## Key Features

### Simulated Mode (default)
- ✅ Fast response times
- ✅ No external dependencies
- ✅ Good for development/testing
- ✅ Accurate scenario modeling

### Real Data Mode (`use_real_data=true`)
- ✅ Actual NASA NEX-GDDP-CMIP6 data
- ✅ ACCESS-CM2 climate model
- ✅ Pulled directly from AWS S3
- ⚠️ First request may be slow (downloads ~2-5 GB NetCDF)
- ⚠️ Requires internet access

## API Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `year` | Projection year | 2050 |
| `scenario` | rcp26, rcp45, rcp85 | rcp45 |
| `resolution` | H3 hexagon size (0-15) | 7 (~5km) |
| `use_real_data` | Use real NASA data | false |

## Climate Scenarios

- **rcp26** (SSP1-2.6): Low emissions, +1.5-2°C by 2100
- **rcp45** (SSP2-4.5): Moderate emissions, +2-3.2°C by 2100
- **rcp85** (SSP5-8.5): High emissions, +2.5-4.8°C by 2100

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs urban-studio-qgis

# Common issues:
# - Missing Python dependencies: rebuild the image
# - Port conflict: check if 8081 is in use
```

### Slow performance with real data
```bash
# First request downloads NetCDF file (~2-5 GB)
# Subsequent requests use cache

# Tips:
# 1. Use smaller bounding boxes
# 2. Lower resolution (e.g., resolution=6)
# 3. Stick with simulated data for development
```

### Backend can't reach climate service
```bash
# Check if services are on same network
docker-compose ps

# Verify CLIMATE_SERVICE_URL
docker-compose exec urban-studio-backend env | grep CLIMATE

# Should show: CLIMATE_SERVICE_URL=http://urban-studio-qgis:5000
```

## Development Workflow

### Recommended Approach
1. **Develop with simulated data** (fast iteration)
2. **Test with real data** periodically (verify accuracy)
3. **Deploy with user choice** (toggle in UI)

### Testing Real Data
```bash
# Direct test of Python service
curl "http://localhost:8081/api/climate/temperature-projection?\
north=41&south=40&east=-73&west=-74&\
year=2050&scenario=rcp45&use_real_data=true"

# Through Node proxy (what frontend uses)
curl "http://localhost:3001/api/nasa/temperature-projection?\
north=41&south=40&east=-73&west=-74&\
year=2050&scenario=rcp45&use_real_data=true"
```

## Next Steps

1. **Test the integration** with your existing frontend
2. **Add UI toggle** to switch between simulated/real data
3. **Optimize caching** for frequently accessed regions
4. **Monitor performance** and adjust resolution as needed

## Need Help?

- **Detailed docs**: See `qgis-processing/NASA_CLIMATE_INTEGRATION.md`
- **API reference**: `GET http://localhost:8081/api/climate/info`
- **Health check**: `GET http://localhost:8081/health`

## Example: Add UI Toggle

```typescript
// In your climate controls component
const [useRealData, setUseRealData] = useState(false);

// In climateLayers.ts
query: ({ bounds, projectionYear, scenario }) => {
  const { north, south, east, west } = bounds ?? {
    north: 41, south: 40, east: -73, west: -74
  };
  return {
    north, south, east, west,
    year: projectionYear,
    scenario,
    use_real_data: useRealData  // Pass toggle state
  };
}
```
