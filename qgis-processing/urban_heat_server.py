#!/usr/bin/env python3
"""
Urban Heat Island QGIS Server Integration
Serves WMS/WFS for heat island analysis layers
"""

import os
import sys
from pathlib import Path
from flask import Flask, request, Response
from flask_cors import CORS
import subprocess
import logging

# QGIS Server setup
sys.path.append('/usr/share/qgis/python')
sys.path.append('/usr/share/qgis/python/plugins')

from qgis.core import QgsApplication
from qgis.server import QgsServer, QgsServerRequest, QgsBufferServerResponse

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)
CORS(app)

# Initialize QGIS
QgsApplication.setPrefixPath('/usr', True)
qgs = QgsApplication([], False)
qgs.initQgis()

# Create QGIS Server
server = QgsServer()

# Project file path
PROJECT_FILE = '/app/projects/urban_heat_island.qgs'

@app.route('/qgis', methods=['GET', 'POST'])
def qgis_server():
    """
    Main QGIS Server endpoint for WMS/WFS requests
    """
    try:
        # Get query parameters
        query_string = request.query_string.decode('utf-8')

        # Always use the project file
        if 'MAP=' in query_string.upper():
            # Remove existing MAP parameter and add ours
            import re
            query_string = re.sub(r'[&?]MAP=[^&]*', '', query_string, flags=re.IGNORECASE)

        # Ensure we have the MAP parameter
        separator = '&' if query_string else ''
        query_string = f'MAP={PROJECT_FILE}{separator}{query_string}'

        logging.info(f"QGIS Request: {query_string}")

        # Create QGIS server request
        headers = {key: value for key, value in request.headers}
        qgs_request = QgsServerRequest(
            query_string,
            QgsServerRequest.GetMethod if request.method == 'GET' else QgsServerRequest.PostMethod,
            headers
        )

        # Create response buffer
        qgs_response = QgsBufferServerResponse()

        # Handle request
        server.handleRequest(qgs_request, qgs_response)

        # Get response
        body = bytes(qgs_response.body())
        headers = qgs_response.headers()
        status_code = qgs_response.statusCode()

        # Create Flask response
        response = Response(body, status=status_code)
        for header_key, header_value in headers.items():
            response.headers[header_key] = header_value

        return response

    except Exception as e:
        logging.error(f"Error handling QGIS request: {str(e)}")
        return {"error": str(e)}, 500

@app.route('/api/heat-island/capabilities', methods=['GET'])
def get_capabilities():
    """
    Return WMS/WFS capabilities information
    """
    return {
        'wms': {
            'url': 'http://localhost:8081/qgis?SERVICE=WMS&REQUEST=GetCapabilities',
            'layers': [
                {
                    'name': 'Land Surface Temperature',
                    'type': 'raster',
                    'description': 'Land surface temperature from Landsat thermal band',
                    'example_request': 'http://localhost:8081/qgis?SERVICE=WMS&REQUEST=GetMap&LAYERS=Land Surface Temperature&WIDTH=800&HEIGHT=600&FORMAT=image/png&BBOX=-73.75,40.60,-73.40,40.85&CRS=EPSG:4326&VERSION=1.3.0'
                }
            ]
        },
        'wfs': {
            'url': 'http://localhost:8081/qgis?SERVICE=WFS&REQUEST=GetCapabilities',
            'layers': [
                {
                    'name': 'Heat Island Hotspots',
                    'type': 'vector',
                    'description': 'Detected urban heat island polygons',
                    'example_request': 'http://localhost:8081/qgis?SERVICE=WFS&REQUEST=GetFeature&TYPENAME=Heat Island Hotspots&OUTPUTFORMAT=GeoJSON'
                }
            ]
        }
    }

@app.route('/api/heat-island/process', methods=['POST'])
def process_heat_island():
    """
    Trigger heat island processing pipeline
    """
    try:
        logging.info("Starting heat island processing pipeline...")

        # Run processing scripts
        scripts = [
            '/app/scripts/01_data_acquisition.py',
            '/app/scripts/02_lst_processing.py',
            '/app/scripts/03_spatial_analysis.py',
            '/app/scripts/04_create_qgis_project.py'
        ]

        results = []
        for script in scripts:
            if Path(script).exists():
                logging.info(f"Running {script}...")
                result = subprocess.run(
                    ['python3', script],
                    capture_output=True,
                    text=True,
                    timeout=300
                )

                results.append({
                    'script': script,
                    'success': result.returncode == 0,
                    'output': result.stdout,
                    'error': result.stderr if result.returncode != 0 else None
                })

        return {
            'status': 'completed',
            'results': results
        }

    except Exception as e:
        logging.error(f"Processing failed: {str(e)}")
        return {"error": str(e)}, 500

@app.route('/api/heat-island/status', methods=['GET'])
def get_status():
    """
    Get processing status and available data
    """
    data_dir = Path('/app/data/processed')

    return {
        'lst_available': (data_dir / 'land_surface_temperature.tif').exists(),
        'heat_islands_available': (data_dir / 'heat_islands.shp').exists(),
        'project_file': PROJECT_FILE,
        'project_exists': Path(PROJECT_FILE).exists(),
        'server_status': 'running'
    }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return {'status': 'healthy', 'service': 'Urban Heat Island QGIS Server'}

if __name__ == '__main__':
    logging.info("🌡️ Starting Urban Heat Island QGIS Server on port 5000")
    logging.info(f"📁 Project file: {PROJECT_FILE}")
    logging.info("🗺️  WMS/WFS endpoints ready at /qgis")
    app.run(host='0.0.0.0', port=5000, debug=True)
