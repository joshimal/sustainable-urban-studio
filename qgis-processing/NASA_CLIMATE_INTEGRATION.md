# NASA NEX-GDDP-CMIP6 Climate Data Integration

This document describes the integration of real NASA climate projection data into the Sustainable Urban Studio platform.

## Overview

The climate service fetches temperature projection data from **NASA NEX-GDDP-CMIP6** hosted on AWS S3 Open Data Registry. The data is processed and returned as hexagonal GeoJSON polygons ready for visualization.

## Data Source

- **Dataset**: NASA NEX-GDDP-CMIP6
- **Location**: `s3://nasa-nex-gddp-cmip6/` (public read, no AWS credentials required)
- **Resolution**: 0.25° (~25 km) global grid
- **Time Range**: 2020-2100
- **Scenarios**: SSP1-2.6, SSP2-4.5, SSP5-8.5 (mapped from RCP scenarios)
- **Model**: ACCESS-CM2 (default)
- **Documentation**: https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6

## Architecture

```
Frontend (React)
    ↓
Node Backend (:3001)
    ↓ proxy
Python Climate Service (:5000)
    ↓ fetch
AWS S3: s3://nasa-nex-gddp-cmip6/
```

### Components

1. **`services/nasa_climate.py`**: Core service for fetching and processing NASA data
   - Downloads NetCDF files from S3
   - Processes with xarray
   - Generates H3 hexagonal grid
   - Calculates temperature anomalies

2. **`climate_server.py`**: Flask API server
   - Endpoint: `GET /api/climate/temperature-projection`
   - Validates parameters
   - Returns GeoJSON FeatureCollection

3. **`backend/server.js`**: Node proxy
   - Proxies `/api/nasa/temperature-projection` to Python service
   - Maintains backward compatibility with frontend

## API Usage

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `north` | float | Yes | - | Northern latitude bound (-90 to 90) |
| `south` | float | Yes | - | Southern latitude bound (-90 to 90) |
| `east` | float | Yes | - | Eastern longitude bound (-180 to 180) |
| `west` | float | Yes | - | Western longitude bound (-180 to 180) |
| `year` | int | No | 2050 | Projection year (2020-2100) |
| `scenario` | string | No | rcp45 | Climate scenario: `rcp26`, `rcp45`, `rcp85` |
| `resolution` | int | No | 7 | H3 hexagon resolution (0-15, 7 = ~5km diameter) |
| `use_real_data` | bool | No | false | Use real NASA data vs simulated |

### Example Request

```bash
curl "http://localhost:3001/api/nasa/temperature-projection?\
north=41&south=40&east=-73&west=-74&\
year=2050&scenario=rcp45&\
use_real_data=true"
```

### Response Format

```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[lon, lat], ...]]
        },
        "properties": {
          "tempAnomaly": 2.3,
          "tempAnomalyF": 4.14,
          "baseline": 14.5,
          "projected": 16.8,
          "center": [lon, lat],
          "hexId": "872a1072fffffff",
          "source": "NASA NEX-GDDP-CMIP6 (ACCESS-CM2)"
        }
      }
    ],
    "properties": {
      "source": "NASA NEX-GDDP-CMIP6",
      "model": "ACCESS-CM2",
      "scenario": "rcp45",
      "ssp_scenario": "ssp245",
      "year": 2050,
      "baselinePeriod": "1986-2005"
    }
  },
  "metadata": {
    "bounds": {...},
    "year": 2050,
    "scenario": "rcp45",
    "resolution": 7,
    "using_real_data": true,
    "feature_count": 156
  }
}
```

## Development Mode

By default, the service uses **simulated data** for faster development and testing. This data mimics the structure and behavior of real NASA data without requiring AWS S3 access.

To enable real NASA data:
- Set `use_real_data=true` query parameter
- Ensure Docker container has internet access to AWS S3

## Deployment

### Build and Start Services

```bash
# Rebuild climate service with new dependencies
docker-compose build urban-studio-qgis

# Start all services
docker-compose up -d

# View climate service logs
docker-compose logs -f urban-studio-qgis
```

### Test Climate Service Directly

```bash
# Health check
curl http://localhost:8081/health

# Get climate info
curl http://localhost:8081/api/climate/info

# Test with simulated data
curl "http://localhost:8081/api/climate/temperature-projection?\
north=41&south=40&east=-73&west=-74&year=2050&scenario=rcp45"

# Test with real NASA data (requires AWS S3 access)
curl "http://localhost:8081/api/climate/temperature-projection?\
north=41&south=40&east=-73&west=-74&year=2050&scenario=rcp45&\
use_real_data=true"
```

## Performance Considerations

### Caching
- NetCDF files are cached in `/tmp/climate_cache`
- Reduces repeated downloads
- Cleared on container restart

### Data Size
- Each 20-year NetCDF file is ~2-5 GB
- Only requested bounding box is loaded into memory
- Use appropriate H3 resolution for your use case:
  - Resolution 5: ~250 km (continental scale)
  - Resolution 7: ~5 km (city scale) **recommended**
  - Resolution 9: ~500 m (neighborhood scale)

### Optimization Tips
1. Start with `use_real_data=false` for development
2. Use smaller bounding boxes when testing real data
3. Cache responses in your backend when possible
4. Consider pre-processing common regions

## Scenario Mapping

| Frontend (RCP) | NASA Dataset (SSP) | Description |
|----------------|-------------------|-------------|
| rcp26 | ssp126 | Low emissions, +2°C by 2100 |
| rcp45 | ssp245 | Moderate emissions, +3.2°C by 2100 |
| rcp85 | ssp585 | High emissions, +4.8°C by 2100 |

## Troubleshooting

### "Error fetching NASA data"
- Check internet connectivity to AWS S3
- Verify the time range covers your requested year
- Falls back to simulated data automatically

### Slow response times
- First request downloads NetCDF (~2-5 GB)
- Subsequent requests use cache
- Consider using smaller bounding boxes
- Lower H3 resolution (e.g., 5 or 6)

### "Invalid latitude/longitude bounds"
- Ensure: `-90 <= south < north <= 90`
- Ensure: `-180 <= west < east <= 180`

## Future Enhancements

1. **Multiple Models**: Support ensemble averaging across multiple GCMs
2. **Additional Variables**: Precipitation, humidity, wind
3. **Pre-computed Tiles**: Cache common regions/scenarios
4. **Advanced Caching**: Redis/S3 for shared cache across instances
5. **Temporal Aggregation**: Seasonal/monthly averages
6. **Anomaly Baselines**: Configurable baseline periods

## References

- [NASA NEX-GDDP-CMIP6 Documentation](https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6)
- [AWS Open Data Registry](https://registry.opendata.aws/nex-gddp-cmip6/)
- [H3 Hexagonal Grid](https://h3geo.org/)
- [xarray Documentation](https://docs.xarray.dev/)
- [IPCC Climate Scenarios](https://www.ipcc.ch/report/ar6/wg1/)
