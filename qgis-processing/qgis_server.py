import os
import sys
import json
import tempfile
import uuid
import requests
import zipfile
import shutil
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from datetime import datetime

# Initialize QGIS
sys.path.append('/usr/share/qgis/python')
os.environ['QT_QPA_PLATFORM'] = 'offscreen'

from qgis.core import *
from qgis.analysis import *
import processing

# Initialize QGIS Application
QgsApplication.setPrefixPath('/usr', True)
qgs = QgsApplication([], False)
qgs.initQgis()

# Initialize processing
from processing.core.Processing import Processing
Processing.initialize()

# Import specific QGIS classes for better error handling
try:
    from qgis.core import QgsVectorLayer, QgsWkbTypes, QgsApplication
    from qgis import Qgis
except ImportError:
    # Fallback for development
    QgsVectorLayer = None
    QgsWkbTypes = None
    Qgis = None

app = Flask(__name__)
CORS(app)

class NassauCountyDataProcessor:
    def __init__(self):
        self.temp_dir = Path('/tmp/qgis-results')
        self.temp_dir.mkdir(exist_ok=True)
    
    def create_sample_nassau_data(self):
        """Create realistic sample data for Nassau County with better distribution"""
        sample_data = {
            "type": "FeatureCollection",
            "features": []
        }
        
        # Nassau County towns with varied zoning
        locations = [
            {"name": "Hempstead", "lat": 40.7062, "lon": -73.6187, "zone": "R-1"},
            {"name": "Garden City", "lat": 40.7268, "lon": -73.6343, "zone": "R-A"},
            {"name": "Freeport", "lat": 40.6576, "lon": -73.5832, "zone": "R-2"},
            {"name": "Great Neck", "lat": 40.7865, "lon": -73.7279, "zone": "R-1"},
            {"name": "Levittown", "lat": 40.7259, "lon": -73.5143, "zone": "R-1"},
            {"name": "Long Beach", "lat": 40.5882, "lon": -73.6579, "zone": "R-3"},
            {"name": "Massapequa", "lat": 40.6793, "lon": -73.4735, "zone": "R-1"},
            {"name": "Oyster Bay", "lat": 40.8662, "lon": -73.5321, "zone": "R-A"},
            {"name": "Hicksville", "lat": 40.7684, "lon": -73.5251, "zone": "R-2"},
            {"name": "Mineola", "lat": 40.7490, "lon": -73.6404, "zone": "R-1"},
        ]
        
        # Create varied zoning types for realistic distribution
        zoning_types = ["R-1", "R-A", "R-2", "R-3", "C", "M"]
        
        for i, loc in enumerate(locations):
            # Create 5x5 grid of parcels around each location
            for row in range(5):
                for col in range(5):
                    parcel_index = row * 5 + col
                    
                    # Vary zoning based on distance from center
                    if row <= 1 and col <= 1:  # Center parcels
                        zoning = "C" if parcel_index % 8 == 0 else loc["zone"]
                    elif row >= 3 or col >= 3:  # Edge parcels
                        zoning = "R-A" if loc["zone"] == "R-1" else loc["zone"]
                    else:
                        zoning = loc["zone"]
                    
                sample_data["features"].append({
                    "type": "Feature",
                    "properties": {
                            "gpin": f"064-{i:03d}-{parcel_index:03d}",
                            "zoning": zoning,
                            "acreage": round(0.15 + (parcel_index * 0.03), 2),
                            "market_value": 350000 + (parcel_index * 35000) + (i * 50000),
                            "property_class": self.get_property_class(zoning),
                        "town": loc["name"]
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                                loc["lon"] + (col * 0.008),  # 8/1000 degree spacing
                                loc["lat"] + (row * 0.008)
                        ]
                    }
                })
        
        return sample_data
    
    def get_property_class(self, zoning):
        """Get property class based on zoning"""
        zoning_map = {
            "R-1": "Single Family",
            "R-A": "Large Lot Residential", 
            "R-2": "Two Family",
            "R-3": "Multi Family",
            "C": "Commercial",
            "M": "Manufacturing"
        }
        return zoning_map.get(zoning, "Residential")
    
    def get_lirr_stations(self):
        """Get LIRR station locations in Nassau County"""
        stations = [
                {"name": "Hempstead", "lat": 40.7062, "lon": -73.6187, "branch": "Hempstead Branch"},
                {"name": "Garden City", "lat": 40.7268, "lon": -73.6343, "branch": "Hempstead Branch"},
                {"name": "Freeport", "lat": 40.6576, "lon": -73.5832, "branch": "Babylon Branch"},
                {"name": "Great Neck", "lat": 40.7865, "lon": -73.7279, "branch": "Port Washington Branch"},
                {"name": "Hicksville", "lat": 40.7684, "lon": -73.5251, "branch": "Main Line"},
                {"name": "Long Beach", "lat": 40.5882, "lon": -73.6579, "branch": "Long Beach Branch"},
                {"name": "Massapequa", "lat": 40.6793, "lon": -73.4735, "branch": "Babylon Branch"},
                {"name": "Oyster Bay", "lat": 40.8662, "lon": -73.5321, "branch": "Oyster Bay Branch"},
                {"name": "Port Washington", "lat": 40.8257, "lon": -73.6982, "branch": "Port Washington Branch"},
            {"name": "Westbury", "lat": 40.7557, "lon": -73.5876, "branch": "Main Line"},
            {"name": "Mineola", "lat": 40.7490, "lon": -73.6404, "branch": "Main Line"},
            {"name": "Carle Place", "lat": 40.7509, "lon": -73.6095, "branch": "Main Line"}
        ]
        
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": station,
                    "geometry": {
                        "type": "Point",
                        "coordinates": [station["lon"], station["lat"]]
                    }
                } for station in stations
            ]
        }
    
    def get_flood_zones_nassau(self):
        """Get flood zones for Nassau County - larger, more visible polygons"""
        flood_zones = [
                {
                    "zone": "AE",
                    "description": "100-year flood zone",
                # South shore flood zone
                "coordinates": [
                    [
                        [-73.75, 40.55],
                        [-73.45, 40.55], 
                        [-73.45, 40.67],
                        [-73.75, 40.67],
                        [-73.75, 40.55]
                    ]
                ]
                },
                {
                    "zone": "VE", 
                    "description": "Coastal high hazard area",
                # Immediate coastal strip
                "coordinates": [
                    [
                        [-73.75, 40.50],
                        [-73.45, 40.50],
                        [-73.45, 40.58],
                        [-73.75, 40.58],
                        [-73.75, 40.50]
                    ]
                ]
            },
            {
                "zone": "X",
                "description": "Minimal flood risk",
                # Northern Nassau County
                "coordinates": [
                    [
                        [-73.80, 40.75],
                        [-73.40, 40.75],
                        [-73.40, 40.90],
                        [-73.80, 40.90],
                        [-73.80, 40.75]
                    ]
                ]
                }
            ]
            
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "zone": zone["zone"],
                        "description": zone["description"]
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": zone["coordinates"]
                    }
                } for zone in flood_zones
            ]
        }
    
    def analyze_housing_near_transit(self, buffer_miles=0.5):
        """Analyze housing opportunities near LIRR stations"""
        try:
            parcels = self.create_sample_nassau_data()
            stations = self.get_lirr_stations()
            
            # Convert miles to degrees (rough approximation)
            buffer_deg = buffer_miles / 69.0
            
            transit_adjacent_parcels = []
            single_family_count = 0
            multi_family_potential = 0
            
            for parcel in parcels.get('features', []):
                parcel_coords = parcel['geometry']['coordinates']
                parcel_props = parcel['properties']
                
                # Check if parcel is near any station
                near_station = False
                for station in stations.get('features', []):
                    station_coords = station['geometry']['coordinates']
                    distance = ((parcel_coords[0] - station_coords[0])**2 + 
                              (parcel_coords[1] - station_coords[1])**2)**0.5
                    
                    if distance <= buffer_deg:
                        near_station = True
                        break
                
                if near_station:
                    transit_adjacent_parcels.append(parcel)
                    
                    # Check zoning for multi-family potential
                    zoning = parcel_props.get('zoning', '')
                    if zoning in ['R-1', 'R-A']:  # Single family zones
                        single_family_count += 1
                        # Conservative estimate: 25% could be rezoned
                        if single_family_count % 4 == 0:
                            multi_family_potential += 1
            
            recommendations = []
            if single_family_count > 10:
                recommendations.append(
                    f"Consider allowing accessory dwelling units (ADUs) in {single_family_count} single-family parcels near transit"
                )
            if multi_family_potential > 5:
                recommendations.append(
                    f"Potential for {multi_family_potential} gentle density developments near LIRR stations"
                )
            if single_family_count > 20:
                recommendations.append(
                    "Implement inclusionary zoning requiring affordable units in new developments"
                )
            
            return {
                "stations_analyzed": len(stations.get('features', [])),
                "parcels_near_transit": len(transit_adjacent_parcels),
                "current_single_family": single_family_count,
                "multi_family_potential": multi_family_potential,
                "buffer_miles": buffer_miles,
                "recommendations": recommendations
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def analyze_flood_vulnerability(self):
        """Analyze properties in flood zones"""
        try:
            parcels = self.create_sample_nassau_data()
            flood_zones = self.get_flood_zones_nassau()
            
            vulnerable_properties = 0
            total_value_at_risk = 0
            properties_by_zone = {"AE": 0, "VE": 0, "X": 0}
            
            # Simple spatial analysis based on coordinates
            for parcel in parcels.get('features', []):
                parcel_coords = parcel['geometry']['coordinates']
                parcel_props = parcel['properties']
                lat = parcel_coords[1]
                
                # Determine flood zone based on latitude (simplified)
                if lat < 0.58:  # VE zone
                    vulnerable_properties += 1
                    total_value_at_risk += parcel_props.get('market_value', 0)
                    properties_by_zone["VE"] += 1
                elif lat < 0.67:  # AE zone  
                    vulnerable_properties += 1
                    total_value_at_risk += parcel_props.get('market_value', 0) * 0.7  # Less risk
                    properties_by_zone["AE"] += 1
                else:  # X zone (minimal risk)
                    properties_by_zone["X"] += 1
            
            recommendations = []
            if properties_by_zone["VE"] > 0:
                recommendations.append(
                    f"Consider managed retreat for {properties_by_zone['VE']} properties in highest-risk VE zones"
                )
            if properties_by_zone["AE"] > 0:
                recommendations.append(
                    f"Implement flood-proofing requirements for {properties_by_zone['AE']} properties in AE zones"
                )
            if vulnerable_properties > 50:
                recommendations.append(
                    "Develop comprehensive coastal resilience plan with green infrastructure"
                )
            
            return {
                "properties_in_flood_zones": vulnerable_properties,
                "total_value_at_risk": int(total_value_at_risk),
                "average_property_value": int(total_value_at_risk / max(vulnerable_properties, 1)),
                "properties_by_zone": properties_by_zone,
                "recommendations": recommendations
            }
            
        except Exception as e:
            return {"error": str(e)}

# Initialize processor
processor = NassauCountyDataProcessor()

@app.route('/health', methods=['GET'])
def health_check():
    try:
        qgis_version = Qgis.version() if Qgis else "Not available"
    except:
        qgis_version = "Not available"
    
    return jsonify({
        'status': 'healthy',
        'service': 'Nassau County Urban Planning Server',
        'qgis_version': qgis_version,
        'focus': 'Housing equity and climate resilience'
    })

@app.route('/nassau/get-data', methods=['GET'])
def get_nassau_data():
    """Get Nassau County datasets"""
    try:
        data_type = request.args.get('type', 'parcels')
        
        if data_type == 'parcels':
            data = processor.create_sample_nassau_data()
        elif data_type == 'stations':
            data = processor.get_lirr_stations()
        elif data_type == 'flood_zones':
            data = processor.get_flood_zones_nassau()
        else:
            return jsonify({'success': False, 'error': 'Unknown data type'})
        
        return jsonify({
            'success': True,
            'data_type': data_type,
            'data': data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/nassau/analyze-housing-transit', methods=['POST'])
def analyze_nassau_housing():
    """Analyze housing opportunities near LIRR stations"""
    try:
        data = request.json or {}
        buffer_miles = data.get('buffer_miles', 0.5)
        
        analysis = processor.analyze_housing_near_transit(buffer_miles)
        
        return jsonify({
            'success': True,
            'analysis_type': 'housing_transit_accessibility',
            'location': 'Nassau County, NY',
            'results': analysis
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/nassau/analyze-flood-risk', methods=['POST'])
def analyze_nassau_flood():
    """Analyze flood vulnerability in Nassau County"""
    try:
        analysis = processor.analyze_flood_vulnerability()
        
        return jsonify({
            'success': True,
            'analysis_type': 'flood_vulnerability_assessment', 
            'location': 'Nassau County, NY',
            'results': analysis
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# Legacy endpoint for backward compatibility
@app.route('/analyze/tree-canopy', methods=['POST'])
def analyze_tree_canopy():
    """Legacy endpoint - redirects to Nassau analysis"""
    return analyze_nassau_housing()

@app.route('/upload-shapefile', methods=['POST'])
def upload_shapefile():
    """Process uploaded shapefile and convert to GeoJSON"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'})
        
        file = request.files['file']
        if not file.filename.endswith('.zip'):
            return jsonify({'success': False, 'error': 'Please upload a ZIP file containing .shp, .shx, .dbf files'})
        
        # Create temp directory for extraction
        temp_id = str(uuid.uuid4())
        temp_extract_dir = processor.temp_dir / f"extract_{temp_id}"
        temp_extract_dir.mkdir()
        
        # Save and extract ZIP file
        zip_path = temp_extract_dir / file.filename
        file.save(zip_path)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_extract_dir)
        
        # Find the .shp file
        shp_files = list(temp_extract_dir.glob("*.shp"))
        if not shp_files:
            return jsonify({'success': False, 'error': 'No .shp file found in ZIP'})
        
        shp_file = shp_files[0]
        
        # Load shapefile with QGIS
        if not QgsVectorLayer:
            return jsonify({'success': False, 'error': 'QGIS not available for shapefile processing'})
            
        layer = QgsVectorLayer(str(shp_file), "uploaded_layer", "ogr")
        if not layer.isValid():
            return jsonify({'success': False, 'error': 'Invalid shapefile'})
        
        # Convert to GeoJSON
        geojson_path = processor.temp_dir / f"converted_{temp_id}.geojson"
        
        # Use QGIS processing to convert
        processing.run("native:savefeatures", {
            'INPUT': layer,
            'OUTPUT': str(geojson_path),
            'LAYER_NAME': 'converted_layer',
            'DATASOURCE_OPTIONS': '',
            'LAYER_OPTIONS': ''
        })
        
        # Read the GeoJSON
        with open(geojson_path, 'r') as f:
            geojson_data = json.load(f)
        
        # Clean up temp files
        shutil.rmtree(temp_extract_dir)
        
        # Get layer info safely
        layer_info = {
            'name': shp_file.stem,
            'feature_count': layer.featureCount(),
            'geometry_type': 'Unknown',
            'fields': [field.name() for field in layer.fields()]
        }
        
        if QgsWkbTypes:
            layer_info['geometry_type'] = QgsWkbTypes.displayString(layer.wkbType())
        
        return jsonify({
            'success': True,
            'layer_info': layer_info,
            'geojson': geojson_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/get-real-nassau-zoning', methods=['GET'])
def get_real_nassau_zoning():
    """Get more detailed zoning data (you would replace this with actual shapefile data)"""
    # This would be replaced with actual Nassau County zoning shapefile
    detailed_zoning = {
        "type": "FeatureCollection",
        "features": []
    }
    
    # More realistic zoning polygons based on actual Nassau patterns
    zoning_areas = [
        {
            "zone": "R-1", "town": "Garden City",
            "coords": [[-73.640, 40.720], [-73.635, 40.720], [-73.635, 40.725], [-73.640, 40.725], [-73.640, 40.720]]
        },
        {
            "zone": "R-3", "town": "Hempstead", 
            "coords": [[-73.625, 40.700], [-73.620, 40.700], [-73.620, 40.705], [-73.625, 40.705], [-73.625, 40.700]]
        },
        {
            "zone": "C-2", "town": "Mineola",
            "coords": [[-73.645, 40.748], [-73.640, 40.748], [-73.640, 40.751], [-73.645, 40.751], [-73.645, 40.748]]
        }
    ]
    
    for area in zoning_areas:
        detailed_zoning["features"].append({
            "type": "Feature",
            "properties": {
                "zoning": area["zone"],
                "town": area["town"],
                "description": f"{area['zone']} zoning in {area['town']}"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [area["coords"]]
            }
        })
    
    return jsonify({
        'success': True,
        'data_type': 'detailed_zoning',
        'data': detailed_zoning
    })

if __name__ == '__main__':
    print("🏡 Starting Nassau County Urban Planning Server...")
    try:
        if Qgis:
            qgis_version = Qgis.version()
            print(f"QGIS Version: {qgis_version}")
        else:
            print("QGIS Version: Not available")
    except Exception as e:
        print(f"QGIS Version: Error - {e}")
    
    print("Available endpoints:")
    print("  GET  /health")
    print("  GET  /nassau/get-data?type=[parcels|stations|flood_zones]")
    print("  GET  /get-real-nassau-zoning")
    print("  POST /upload-shapefile")
    print("  POST /nassau/analyze-housing-transit")
    print("  POST /nassau/analyze-flood-risk")
    print("Focus: Housing equity and climate resilience in Nassau County")
    
    app.run(host='0.0.0.0', port=5000, debug=True)