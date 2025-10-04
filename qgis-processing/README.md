# Urban Heat Island Analysis System

Automated urban heat island detection and analysis using Landsat thermal imagery, served through QGIS Server WMS/WFS endpoints.

## 🌡️ Features

- **Automated Data Acquisition**: Downloads Landsat imagery, tree canopy, and impervious surface data
- **Land Surface Temperature Calculation**: Processes Landsat Band 10 thermal data with emissivity corrections
- **Spatial Analysis**: Detects heat island hotspots and performs correlation analysis
- **QGIS Server Integration**: Serves results via WMS/WFS for easy integration
- **Automated Updates**: Scheduled pipeline execution for fresh data

## 📁 Project Structure

```
qgis-processing/
├── scripts/
│   ├── 01_data_acquisition.py      # Download Landsat, tree cover, impervious data
│   ├── 02_lst_processing.py        # Process thermal bands → LST
│   ├── 03_spatial_analysis.py      # Heat island detection & analysis
│   ├── 04_create_qgis_project.py   # Generate QGIS project with PyQGIS
│   ├── run_pipeline.sh             # Full automation script
│   └── schedule_updates.py         # Automated scheduler
├── data/
│   ├── raw/                        # Downloaded source data
│   └── processed/                  # LST, heat islands, analysis results
├── projects/
│   └── urban_heat_island.qgs       # QGIS project file
├── logs/                           # Processing logs
├── urban_heat_server.py            # Flask server for WMS/WFS
├── Dockerfile                      # Container configuration
└── API_DOCUMENTATION.md            # Full API docs

## 🚀 Quick Start

### 1. Build and Start Container

```bash
cd /Users/joshuabutler/Documents/github-project/sustainable-urban-studio
docker-compose up --build urban-studio-qgis
```

### 2. Run Processing Pipeline

```bash
# Access container
docker exec -it urban-studio-qgis bash

# Run full pipeline
bash /app/scripts/run_pipeline.sh
```

### 3. Access WMS/WFS Services

**WMS - View Temperature Map:**
```
http://localhost:8081/qgis?SERVICE=WMS&REQUEST=GetMap&LAYERS=Land%20Surface%20Temperature&WIDTH=800&HEIGHT=600&FORMAT=image/png&BBOX=-73.75,40.60,-73.40,40.85&CRS=EPSG:4326&VERSION=1.3.0
```

**WFS - Get Heat Island Features:**
```
http://localhost:8081/qgis?SERVICE=WFS&REQUEST=GetFeature&TYPENAME=Heat%20Island%20Hotspots&OUTPUTFORMAT=GeoJSON
```

## 📊 Processing Pipeline

### Step 1: Data Acquisition
```python
python3 /app/scripts/01_data_acquisition.py
```

Downloads:
- Landsat 8/9 thermal bands (B10, B11)
- Landsat red/NIR bands (B4, B5) for NDVI
- NLCD tree canopy coverage
- NLCD impervious surface data
- Census tract boundaries

### Step 2: Land Surface Temperature Processing
```python
python3 /app/scripts/02_lst_processing.py
```

Process:
1. Digital Numbers → Top of Atmosphere Radiance
2. Radiance → Brightness Temperature
3. Calculate NDVI from red/NIR bands
4. Derive emissivity from NDVI
5. Apply emissivity correction → LST

**Formula:**
```
LST = BT / (1 + (λ × BT / ρ) × ln(ε))
```

### Step 3: Spatial Analysis
```python
python3 /app/scripts/03_spatial_analysis.py
```

Analysis:
- Detect heat islands (>75th percentile temperature)
- Calculate zonal statistics by census tract
- Correlate temperature with tree cover
- Analyze impervious surface impact

### Step 4: QGIS Project Generation
```python
python3 /app/scripts/04_create_qgis_project.py
```

Creates:
- QGIS project with styled layers
- WMS/WFS service configuration
- Layer metadata and abstracts
- Optimized rendering settings

## 🗺️ Available Layers

### 1. Land Surface Temperature (Raster)
- **Source:** Landsat 8/9 thermal band
- **Resolution:** 30m
- **Units:** Degrees Celsius
- **Style:** Blue (cool) → Red (hot) gradient

### 2. Heat Island Hotspots (Vector)
- **Geometry:** Points/Polygons
- **Attributes:** mean_temp, max_temp, severity
- **Detection:** 75th percentile threshold
- **Style:** Graduated by severity

## 🔧 Configuration

### Set Your City Bounds

Edit scripts to use your target area:

```python
# In 01_data_acquisition.py, 02_lst_processing.py, etc.
city_bounds = {
    'north': 40.85,
    'south': 40.60,
    'east': -73.40,
    'west': -73.75
}
```

### Production Data Sources

For real data, configure API credentials:

**USGS EarthExplorer (Landsat):**
```python
# In 01_data_acquisition.py
USGS_USERNAME = os.getenv('USGS_USERNAME')
USGS_PASSWORD = os.getenv('USGS_PASSWORD')
```

**MRLC (NLCD Data):**
```python
NLCD_WCS_URL = "https://www.mrlc.gov/geoserver/mrlc_download/wcs"
```

## 📅 Automated Scheduling

The system includes automatic updates:

```bash
python3 /app/scripts/schedule_updates.py
```

**Schedule:**
- **Daily 2 AM:** Check for new Landsat scenes
- **Sunday 3 AM:** Full pipeline execution

## 🌐 API Integration

### JavaScript/Leaflet Example

```javascript
const map = L.map('map').setView([40.725, -73.575], 10);

// Add LST layer
L.tileLayer.wms('http://localhost:8081/qgis', {
  layers: 'Land Surface Temperature',
  format: 'image/png',
  transparent: true
}).addTo(map);

// Load heat islands
fetch('http://localhost:8081/qgis?SERVICE=WFS&REQUEST=GetFeature&TYPENAME=Heat Island Hotspots&OUTPUTFORMAT=GeoJSON')
  .then(res => res.json())
  .then(data => L.geoJSON(data).addTo(map));
```

### Python Example

```python
import requests

# Trigger processing
requests.post('http://localhost:8081/api/heat-island/process')

# Check status
status = requests.get('http://localhost:8081/api/heat-island/status').json()
print(status)
```

## 📈 Performance Optimization

### Raster Optimization
```bash
# Create Cloud Optimized GeoTIFF
gdal_translate -of COG -co COMPRESS=LZW input.tif output_cog.tif

# Build pyramids
gdaladdo -r average input.tif 2 4 8 16
```

### Server Optimization
- Enable QGIS Server caching
- Use nginx reverse proxy
- Implement tile caching (MapProxy)

## 🔍 Monitoring & Logs

### View Logs
```bash
# Pipeline execution logs
tail -f /app/logs/pipeline_*.log

# LST processing
tail -f /app/logs/lst_processing.log

# Spatial analysis
tail -f /app/logs/spatial_analysis.log

# QGIS project generation
tail -f /app/logs/qgis_project.log
```

### Check Data Status
```bash
# List processed data
ls -lh /app/data/processed/

# Check QGIS project
ls -l /app/projects/

# View project info
cat /app/projects/project_info.json
```

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
docker logs urban-studio-qgis

# Rebuild from scratch
docker-compose down -v
docker-compose up --build urban-studio-qgis
```

### WMS returns blank image
- Check LST file exists: `ls /app/data/processed/land_surface_temperature.tif`
- Verify BBOX matches data extent
- Check QGIS Server logs

### Processing pipeline fails
```bash
# Run steps individually to isolate issue
docker exec -it urban-studio-qgis python3 /app/scripts/01_data_acquisition.py
docker exec -it urban-studio-qgis python3 /app/scripts/02_lst_processing.py
```

## 📚 Additional Resources

- [QGIS Server Documentation](https://docs.qgis.org/latest/en/docs/server_manual/)
- [Landsat 8/9 Data Users Handbook](https://www.usgs.gov/landsat-missions/landsat-8-data-users-handbook)
- [NLCD Data Products](https://www.mrlc.gov/data)
- [Urban Heat Island NASA Guide](https://earthobservatory.nasa.gov/features/UrbanHeat)

## 🤝 Contributing

To extend this system:

1. **Add new data sources**: Modify `01_data_acquisition.py`
2. **Add analysis methods**: Extend `03_spatial_analysis.py`
3. **Customize styling**: Edit `04_create_qgis_project.py`
4. **Add API endpoints**: Modify `urban_heat_server.py`

## 📄 License

This project uses:
- QGIS (GPL v2)
- Landsat data (Public domain - USGS)
- NLCD data (Public domain)

## 🙏 Acknowledgments

- NASA/USGS Landsat Program
- Multi-Resolution Land Characteristics (MRLC) Consortium
- QGIS Development Team

---

**Version:** 1.0.0
**Last Updated:** October 2024
**Maintainer:** Urban Sustainability Studio
