import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

class NassauDataProvider:
    """Minimal data provider for Nassau County GIS data"""
    
    def get_parcels_data(self):
        """Get Nassau County parcels data"""
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "id": 1,
                        "address": "123 Main St, Hempstead, NY",
                        "zoning": "R-1",
                        "area": 5000
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-73.65, 40.75], [-73.64, 40.75], [-73.64, 40.76], [-73.65, 40.76], [-73.65, 40.75]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "id": 2,
                        "address": "456 Oak Ave, Garden City, NY",
                        "zoning": "R-2",
                        "area": 7500
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-73.63, 40.72], [-73.62, 40.72], [-73.62, 40.73], [-73.63, 40.73], [-73.63, 40.72]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "id": 3,
                        "address": "789 Pine St, Mineola, NY",
                        "zoning": "C-1",
                        "area": 3000
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-73.58, 40.78], [-73.57, 40.78], [-73.57, 40.79], [-73.58, 40.79], [-73.58, 40.78]]]
                    }
                }
            ]
        }
    
    def get_stations_data(self):
        """Get LIRR stations data"""
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "id": 1,
                        "name": "Hempstead Station",
                        "line": "Hempstead Branch",
                        "zone": 3
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-73.6187, 40.7062]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "id": 2,
                        "name": "Hicksville Station",
                        "line": "Main Line",
                        "zone": 4
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-73.5251, 40.7684]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "id": 3,
                        "name": "Mineola Station",
                        "line": "Main Line",
                        "zone": 4
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-73.58, 40.78]
                    }
                }
            ]
        }
    
    def get_flood_zones_data(self):
        """Get flood zones data"""
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "id": 1,
                        "zone": "AE",
                        "description": "100-year flood zone"
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-73.66, 40.74], [-73.65, 40.74], [-73.65, 40.75], [-73.66, 40.75], [-73.66, 40.74]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "id": 2,
                        "zone": "VE",
                        "description": "Coastal high hazard area"
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-73.67, 40.73], [-73.66, 40.73], [-73.66, 40.74], [-73.67, 40.74], [-73.67, 40.73]]]
                    }
                }
            ]
        }

# Initialize data provider
data_provider = NassauDataProvider()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Nassau County Data Server",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/nassau/get-data', methods=['GET'])
def get_nassau_data():
    """Get Nassau County data by type"""
    try:
        data_type = request.args.get('type', 'parcels')
        
        if data_type == 'parcels':
            data = data_provider.get_parcels_data()
        elif data_type == 'stations':
            data = data_provider.get_stations_data()
        elif data_type == 'flood_zones':
            data = data_provider.get_flood_zones_data()
        else:
            return jsonify({
                "success": False,
                "error": f"Unknown data type: {data_type}"
            }), 400
        
        return jsonify({
            "success": True,
            "data": data,
            "type": data_type,
            "count": len(data.get('features', []))
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/nassau/analyze', methods=['POST'])
def analyze_nassau_data():
    """Analyze Nassau County data"""
    try:
        data = request.get_json()
        analysis_type = data.get('type', 'basic')
        
        # Simple analysis - just return summary stats
        result = {
            "analysis_type": analysis_type,
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_parcels": 3,
                "total_stations": 3,
                "flood_risk_areas": 2
            }
        }
        
        return jsonify({
            "success": True,
            "result": result
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting Nassau County Data Server...")
    print("📍 Data endpoints available at /nassau/")
    print("🔍 Health check at /health")
    
    app.run(host='0.0.0.0', port=5000, debug=True)










