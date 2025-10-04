# Urban Heat Island Analysis - API Documentation

## Overview

This system provides automated urban heat island analysis using Landsat thermal imagery, tree canopy data, and impervious surface data. Results are served through QGIS Server as WMS/WFS services.

## Base URL

```
http://localhost:8081
```

## Endpoints

### 1. QGIS Server - WMS/WFS

#### WMS GetCapabilities
```
GET /qgis?SERVICE=WMS&REQUEST=GetCapabilities
```

Returns WMS service metadata and available layers.

#### WMS GetMap - Land Surface Temperature
```
GET /qgis?SERVICE=WMS&REQUEST=GetMap&LAYERS=Land%20Surface%20Temperature&WIDTH=800&HEIGHT=600&FORMAT=image/png&BBOX=-73.75,40.60,-73.40,40.85&CRS=EPSG:4326&VERSION=1.3.0
```

**Parameters:**
- `LAYERS`: `Land Surface Temperature`
- `WIDTH`: Image width in pixels
- `HEIGHT`: Image height in pixels
- `FORMAT`: `image/png`, `image/jpeg`, or `image/tiff`
- `BBOX`: Bounding box (west,south,east,north)
- `CRS`: Coordinate reference system (EPSG:4326 for WGS84)

**Response:** Image file

#### WFS GetFeature - Heat Islands
```
GET /qgis?SERVICE=WFS&REQUEST=GetFeature&TYPENAME=Heat%20Island%20Hotspots&OUTPUTFORMAT=GeoJSON
```

**Parameters:**
- `TYPENAME`: `Heat Island Hotspots`
- `OUTPUTFORMAT`: `GeoJSON`, `GML2`, `GML3`
- Optional: `BBOX=minx,miny,maxx,maxy` to filter by area

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {"type": "Point", "coordinates": [-73.6, 40.7]},
      "properties": {
        "id": 1,
        "mean_temp": 38.5,
        "max_temp": 42.3,
        "severity": "high"
      }
    }
  ]
}
```

### 2. Processing API

#### Get Capabilities
```
GET /api/heat-island/capabilities
```

Returns available WMS/WFS layers and example requests.

**Response:**
```json
{
  "wms": {
    "url": "http://localhost:8081/qgis?SERVICE=WMS&REQUEST=GetCapabilities",
    "layers": [
      {
        "name": "Land Surface Temperature",
        "type": "raster",
        "description": "Land surface temperature from Landsat thermal band",
        "example_request": "..."
      }
    ]
  },
  "wfs": {
    "url": "http://localhost:8081/qgis?SERVICE=WFS&REQUEST=GetCapabilities",
    "layers": [...]
  }
}
```

#### Trigger Processing Pipeline
```
POST /api/heat-island/process
```

Manually triggers the full processing pipeline:
1. Data acquisition
2. LST calculation
3. Spatial analysis
4. QGIS project generation

**Response:**
```json
{
  "status": "completed",
  "results": [
    {
      "script": "/app/scripts/01_data_acquisition.py",
      "success": true,
      "output": "..."
    }
  ]
}
```

#### Get Processing Status
```
GET /api/heat-island/status
```

Returns current status of processed data.

**Response:**
```json
{
  "lst_available": true,
  "heat_islands_available": true,
  "project_file": "/app/projects/urban_heat_island.qgs",
  "project_exists": true,
  "server_status": "running"
}
```

## Processing Scripts

### Manual Execution

Run individual processing steps:

```bash
# 1. Data acquisition
python3 /app/scripts/01_data_acquisition.py

# 2. LST processing
python3 /app/scripts/02_lst_processing.py

# 3. Spatial analysis
python3 /app/scripts/03_spatial_analysis.py

# 4. QGIS project generation
python3 /app/scripts/04_create_qgis_project.py

# OR run full pipeline
bash /app/scripts/run_pipeline.sh
```

### Automated Scheduling

The system includes automated data updates:

```bash
# Start scheduler (runs on container startup)
python3 /app/scripts/schedule_updates.py
```

**Schedule:**
- Daily data check: 2:00 AM
- Weekly full pipeline: Sunday 3:00 AM

## Data Layers

### 1. Land Surface Temperature (Raster)

**Source:** Landsat 8/9 Band 10 (thermal)
**Resolution:** 30m (resampled from 100m thermal)
**Format:** GeoTIFF
**Units:** Degrees Celsius
**Range:** Typically 20-50°C in urban areas

**Processing Steps:**
1. Digital Numbers → Top of Atmosphere Radiance
2. Radiance → Brightness Temperature
3. NDVI calculation for emissivity
4. Emissivity correction → Land Surface Temperature

### 2. Heat Island Hotspots (Vector)

**Geometry:** Points/Polygons
**Format:** Shapefile, served as GeoJSON
**Detection:** Areas above 75th percentile temperature

**Attributes:**
- `id`: Unique identifier
- `mean_temp`: Mean temperature (°C)
- `max_temp`: Maximum temperature (°C)
- `severity`: `moderate` or `high`
- `area_pixels`: Size in pixels

### 3. Tree Canopy Coverage (Raster)

**Source:** NLCD Tree Canopy or city open data
**Resolution:** 30m
**Format:** GeoTIFF
**Units:** Percentage (0-100%)

### 4. Impervious Surfaces (Raster)

**Source:** NLCD Impervious Surface
**Resolution:** 30m
**Format:** GeoTIFF
**Units:** Percentage (0-100%)

## Integration Examples

### JavaScript/Leaflet

```javascript
// Add WMS layer
const lstLayer = L.tileLayer.wms('http://localhost:8081/qgis', {
  layers: 'Land Surface Temperature',
  format: 'image/png',
  transparent: true,
  version: '1.3.0',
  crs: L.CRS.EPSG4326
});

// Fetch heat island features
fetch('http://localhost:8081/qgis?SERVICE=WFS&REQUEST=GetFeature&TYPENAME=Heat Island Hotspots&OUTPUTFORMAT=GeoJSON')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`Temp: ${feature.properties.mean_temp}°C`);
      }
    }).addTo(map);
  });
```

### Python

```python
import requests
from PIL import Image
from io import BytesIO

# Get temperature map
url = 'http://localhost:8081/qgis'
params = {
    'SERVICE': 'WMS',
    'REQUEST': 'GetMap',
    'LAYERS': 'Land Surface Temperature',
    'WIDTH': 800,
    'HEIGHT': 600,
    'FORMAT': 'image/png',
    'BBOX': '-73.75,40.60,-73.40,40.85',
    'CRS': 'EPSG:4326',
    'VERSION': '1.3.0'
}

response = requests.get(url, params=params)
img = Image.open(BytesIO(response.content))
img.show()

# Get heat island features
wfs_params = {
    'SERVICE': 'WFS',
    'REQUEST': 'GetFeature',
    'TYPENAME': 'Heat Island Hotspots',
    'OUTPUTFORMAT': 'GeoJSON'
}

features = requests.get(url, params=wfs_params).json()
print(f"Found {len(features['features'])} heat islands")
```

### QGIS Desktop

1. Open QGIS Desktop
2. Layer → Add Layer → Add WMS/WMTS Layer
3. Create new connection:
   - Name: `Urban Heat Island`
   - URL: `http://localhost:8081/qgis`
4. Connect and add layers

## Configuration

### Environment Variables

```bash
# QGIS Server
QGIS_SERVER_LOG_LEVEL=0
QGIS_SERVER_LOG_STDERR=1
QT_QPA_PLATFORM=offscreen

# Data directories
DATA_DIR=/app/data
PROJECT_DIR=/app/projects
LOG_DIR=/app/logs
```

### City Bounds Configuration

Edit processing scripts to set your city bounds:

```python
city_bounds = {
    'north': 40.85,   # Northern latitude
    'south': 40.60,   # Southern latitude
    'east': -73.40,   # Eastern longitude
    'west': -73.75    # Western longitude
}
```

## Troubleshooting

### Check Server Status
```bash
curl http://localhost:8081/health
```

### View Logs
```bash
docker logs urban-studio-qgis
tail -f /app/logs/qgis_server.log
tail -f /app/logs/spatial_analysis.log
```

### Rebuild Container
```bash
docker-compose down
docker-compose up --build urban-studio-qgis
```

### Test WMS Endpoint
```bash
curl "http://localhost:8081/qgis?SERVICE=WMS&REQUEST=GetCapabilities"
```

## Performance Optimization

### Raster Optimization
- Use Cloud Optimized GeoTIFF (COG) format
- Build overviews/pyramids: `gdaladdo -r average input.tif 2 4 8 16`
- Enable compression: `COMPRESS=LZW` or `COMPRESS=DEFLATE`
- Create tiles: `gdal_translate -co TILED=YES`

### Server Tuning
- Increase QGIS Server cache
- Use nginx reverse proxy for caching
- Enable parallel rendering in QGIS project

## Data Sources

### Production Setup

1. **USGS EarthExplorer** (Landsat)
   - API: https://m2m.cr.usgs.gov/api/docs/
   - Register for API access
   - Download L1TP scenes (processed, terrain corrected)

2. **NLCD Data** (Tree Canopy & Impervious)
   - https://www.mrlc.gov/data
   - Use WCS service for automated download

3. **Census TIGER** (Boundaries)
   - https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html

## License & Credits

- QGIS Server: GPL v2
- Landsat data: Public domain (USGS)
- NLCD data: Public domain

---

**Last Updated:** October 2024
**Version:** 1.0.0
