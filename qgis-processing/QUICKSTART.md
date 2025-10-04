# Urban Heat Island Analysis - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Start the System

```bash
cd /Users/joshuabutler/Documents/github-project/sustainable-urban-studio
docker-compose up -d urban-studio-qgis
```

### 2. Run the Processing Pipeline

```bash
# Run full automated pipeline
docker exec -it urban-studio-qgis bash /app/scripts/run_pipeline.sh
```

This will:
- ✅ Download Landsat thermal imagery
- ✅ Calculate Land Surface Temperature
- ✅ Detect urban heat islands
- ✅ Generate QGIS project
- ✅ Start WMS/WFS server

### 3. Access Your Data

#### View Temperature Map (WMS)
```
http://localhost:8081/qgis?SERVICE=WMS&REQUEST=GetMap&LAYERS=Land%20Surface%20Temperature&WIDTH=800&HEIGHT=600&FORMAT=image/png&BBOX=-73.75,40.60,-73.40,40.85&CRS=EPSG:4326&VERSION=1.3.0
```

#### Get Heat Island Features (WFS)
```bash
curl "http://localhost:8081/qgis?SERVICE=WFS&REQUEST=GetFeature&TYPENAME=Heat Island Hotspots&OUTPUTFORMAT=GeoJSON"
```

#### Check Status
```bash
curl http://localhost:8081/api/heat-island/status
```

## 📊 What You Get

### 1. Land Surface Temperature Layer
- High-resolution temperature map
- Derived from Landsat 8/9 thermal bands
- Color-coded: Blue (cool) → Red (hot)
- Units: Degrees Celsius

### 2. Heat Island Hotspots
- Automatically detected hot zones
- Severity classification (moderate/high)
- Temperature statistics per zone
- GeoJSON format for easy integration

### 3. Analysis Reports
- Tree cover vs. temperature correlation
- Zonal statistics by census tract
- Spatial analysis results
- JSON format for further processing

## 🔧 Common Commands

### View Logs
```bash
docker logs urban-studio-qgis
docker exec urban-studio-qgis tail -f /app/logs/pipeline_*.log
```

### List Processed Data
```bash
docker exec urban-studio-qgis ls -lh /app/data/processed/
```

### Restart Processing
```bash
docker exec urban-studio-qgis bash /app/scripts/run_pipeline.sh
```

### Access Container Shell
```bash
docker exec -it urban-studio-qgis bash
```

## 🗺️ Using in Your Application

### JavaScript/Leaflet

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <div id="map" style="height: 600px"></div>
  <script>
    const map = L.map('map').setView([40.725, -73.575], 11);

    // Add base map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Add temperature layer from QGIS Server
    L.tileLayer.wms('http://localhost:8081/qgis', {
      layers: 'Land Surface Temperature',
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
      opacity: 0.7
    }).addTo(map);

    // Add heat island features
    fetch('http://localhost:8081/qgis?SERVICE=WFS&REQUEST=GetFeature&TYPENAME=Heat Island Hotspots&OUTPUTFORMAT=GeoJSON')
      .then(res => res.json())
      .then(data => {
        L.geoJSON(data, {
          onEachFeature: (feature, layer) => {
            const props = feature.properties;
            layer.bindPopup(`
              <strong>Heat Island Zone</strong><br/>
              Mean Temp: ${props.mean_temp}°C<br/>
              Severity: ${props.severity}
            `);
          }
        }).addTo(map);
      });
  </script>
</body>
</html>
```

### Python Integration

```python
import requests
import geopandas as gpd
from PIL import Image
from io import BytesIO

# Get temperature map as image
wms_url = 'http://localhost:8081/qgis'
params = {
    'SERVICE': 'WMS',
    'REQUEST': 'GetMap',
    'LAYERS': 'Land Surface Temperature',
    'WIDTH': 1200,
    'HEIGHT': 800,
    'FORMAT': 'image/png',
    'BBOX': '-73.75,40.60,-73.40,40.85',
    'CRS': 'EPSG:4326',
    'VERSION': '1.3.0'
}

response = requests.get(wms_url, params=params)
img = Image.open(BytesIO(response.content))
img.save('temperature_map.png')

# Get heat island features as GeoDataFrame
wfs_url = 'http://localhost:8081/qgis'
wfs_params = {
    'SERVICE': 'WFS',
    'REQUEST': 'GetFeature',
    'TYPENAME': 'Heat Island Hotspots',
    'OUTPUTFORMAT': 'GeoJSON'
}

heat_islands = gpd.read_file(wms_url, params=wfs_params)
print(f"Found {len(heat_islands)} heat island zones")
print(heat_islands[['mean_temp', 'severity']].describe())
```

## 🎯 Next Steps

### Customize for Your City

1. **Edit city bounds** in processing scripts:
```python
# In scripts/01_data_acquisition.py
city_bounds = {
    'north': YOUR_NORTH_LAT,
    'south': YOUR_SOUTH_LAT,
    'east': YOUR_EAST_LON,
    'west': YOUR_WEST_LON
}
```

2. **Configure real data sources** (for production):
- Get USGS API credentials for Landsat
- Set up MRLC account for NLCD data
- Configure Census TIGER/Line downloads

3. **Set up automated updates**:
```bash
docker exec urban-studio-qgis python3 /app/scripts/schedule_updates.py
```

### Production Deployment

1. **Use real satellite data** instead of synthetic
2. **Set up nginx** for caching and load balancing
3. **Configure SSL/HTTPS** for secure access
4. **Enable authentication** for API endpoints
5. **Set up monitoring** (Prometheus/Grafana)

## 📖 Full Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [README](./README.md) - Detailed technical documentation
- [Processing Scripts](./scripts/) - Individual script documentation

## 🆘 Troubleshooting

### Issue: Container fails to start
```bash
docker logs urban-studio-qgis
docker-compose down -v
docker-compose up --build urban-studio-qgis
```

### Issue: WMS returns blank image
```bash
# Check if LST file exists
docker exec urban-studio-qgis ls -l /app/data/processed/land_surface_temperature.tif

# Run LST processing
docker exec urban-studio-qgis python3 /app/scripts/02_lst_processing.py
```

### Issue: Heat islands not showing
```bash
# Run spatial analysis
docker exec urban-studio-qgis python3 /app/scripts/03_spatial_analysis.py

# Check shapefile
docker exec urban-studio-qgis ls -l /app/data/processed/heat_islands.*
```

## 💡 Pro Tips

1. **Optimize performance**: Use Cloud Optimized GeoTIFF (COG) format
2. **Cache tiles**: Implement MapProxy or TileCache
3. **Batch processing**: Process multiple cities in parallel
4. **Data freshness**: Set up daily automated updates
5. **Validation**: Compare with ground-truth temperature data

---

**Ready to analyze urban heat islands?** Start with step 1 above! 🌡️
