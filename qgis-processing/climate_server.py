"""
Climate Data Server

Flask API for serving NASA NEX-GDDP-CMIP6 temperature projections
and other climate data layers.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import sys
import os

# Add services directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services'))

from nasa_climate import NASAClimateService
from noaa_sea_level import NOAASeaLevelService
from urban_heat_island import UrbanHeatIslandService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize climate services
climate_service = NASAClimateService()
sea_level_service = NOAASeaLevelService()
heat_island_service = UrbanHeatIslandService()

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'climate-data-server',
        'version': '1.0.0'
    })


@app.route('/api/climate/temperature-projection', methods=['GET'])
def temperature_projection():
    """
    Get temperature projection data for a bounding box

    Query Parameters:
        north (float): Northern latitude bound
        south (float): Southern latitude bound
        east (float): Eastern longitude bound
        west (float): Western longitude bound
        year (int): Projection year (2020-2100), default 2050
        scenario (str): Climate scenario (rcp26, rcp45, rcp85), default rcp45
        resolution (int): H3 hexagon resolution (0-15), default 7
        use_real_data (bool): Use real NASA data vs simulated, default false

    Returns:
        GeoJSON FeatureCollection with hexagonal temperature anomalies
    """
    try:
        # Parse query parameters
        north = request.args.get('north', type=float)
        south = request.args.get('south', type=float)
        east = request.args.get('east', type=float)
        west = request.args.get('west', type=float)
        year = request.args.get('year', default=2050, type=int)
        scenario = request.args.get('scenario', default='rcp45', type=str)
        resolution = request.args.get('resolution', default=7, type=int)
        use_real_data = request.args.get('use_real_data', default='false', type=str).lower() == 'true'

        # Validate required parameters
        if None in [north, south, east, west]:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: north, south, east, west'
            }), 400

        # Validate bounds
        if not (-90 <= south < north <= 90):
            return jsonify({
                'success': False,
                'error': 'Invalid latitude bounds'
            }), 400

        if not (-180 <= west < east <= 180):
            return jsonify({
                'success': False,
                'error': 'Invalid longitude bounds'
            }), 400

        # Validate year range
        if not (2020 <= year <= 2100):
            return jsonify({
                'success': False,
                'error': 'Year must be between 2020 and 2100'
            }), 400

        # Validate scenario
        if scenario not in ['rcp26', 'rcp45', 'rcp85']:
            return jsonify({
                'success': False,
                'error': 'Scenario must be one of: rcp26, rcp45, rcp85'
            }), 400

        # Validate resolution
        if not (4 <= resolution <= 10):
            return jsonify({
                'success': False,
                'error': 'Resolution must be between 4 and 10'
            }), 400

        logger.info(f"Temperature projection request: bounds=[{south},{north}]x[{west},{east}], "
                   f"year={year}, scenario={scenario}, resolution={resolution}, "
                   f"use_real_data={use_real_data}")

        # Build bounds dict
        bounds = {
            'north': north,
            'south': south,
            'east': east,
            'west': west
        }

        # Get temperature projection
        data = climate_service.get_temperature_projection(
            bounds=bounds,
            year=year,
            scenario=scenario,
            resolution=resolution,
            use_simulated=not use_real_data
        )

        return jsonify({
            'success': True,
            'data': data,
            'metadata': {
                'bounds': bounds,
                'year': year,
                'scenario': scenario,
                'resolution': resolution,
                'using_real_data': use_real_data,
                'feature_count': len(data.get('features', []))
            }
        })

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Invalid parameter: {str(e)}'
        }), 400

    except Exception as e:
        logger.error(f"Error processing temperature projection: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/climate/sea-level-rise', methods=['GET'])
def sea_level_rise():
    """
    Get sea level rise data as hexagonal grid

    Query Parameters:
        north (float): Northern latitude bound
        south (float): Southern latitude bound
        east (float): Eastern longitude bound
        west (float): Western longitude bound
        feet (int): Sea level rise in feet (0-10), default 3
        resolution (int): H3 hexagon resolution (8-10), default 9

    Returns:
        GeoJSON FeatureCollection with hexagonal sea level data
    """
    try:
        # Parse query parameters
        north = request.args.get('north', type=float)
        south = request.args.get('south', type=float)
        east = request.args.get('east', type=float)
        west = request.args.get('west', type=float)
        feet = request.args.get('feet', default=3, type=int)
        resolution = request.args.get('resolution', default=9, type=int)

        # Validate required parameters
        if None in [north, south, east, west]:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: north, south, east, west'
            }), 400

        # Validate bounds
        if not (-90 <= south <= north <= 90):
            return jsonify({
                'success': False,
                'error': 'Invalid latitude bounds'
            }), 400

        if not (-180 <= west <= 180 and -180 <= east <= 180):
            return jsonify({
                'success': False,
                'error': 'Invalid longitude bounds'
            }), 400

        # Validate feet range
        if not (0 <= feet <= 10):
            return jsonify({
                'success': False,
                'error': 'Feet must be between 0 and 10'
            }), 400

        # Validate resolution
        if not (6 <= resolution <= 10):
            return jsonify({
                'success': False,
                'error': 'Resolution must be between 6 and 10'
            }), 400

        logger.info(f"Sea level rise request: bounds=[{south},{north}]x[{west},{east}], "
                   f"feet={feet}, resolution={resolution}")

        # Build bounds dict
        bounds = {
            'north': north,
            'south': south,
            'east': east,
            'west': west
        }

        # Get sea level hexagons
        data = sea_level_service.get_sea_level_hexagons(
            bounds=bounds,
            feet=feet,
            resolution=resolution
        )

        return jsonify({
            'success': True,
            'data': data,
            'metadata': {
                'bounds': bounds,
                'feet': feet,
                'resolution': resolution,
                'feature_count': len(data.get('features', []))
            }
        })

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Invalid parameter: {str(e)}'
        }), 400

    except Exception as e:
        logger.error(f"Error processing sea level rise: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/climate/urban-heat-island', methods=['GET'])
def urban_heat_island():
    """
    Get urban heat island data as hexagonal grid

    Query Parameters:
        north (float): Northern latitude bound
        south (float): Southern latitude bound
        east (float): Eastern longitude bound
        west (float): Western longitude bound
        date (str): Analysis date (YYYY-MM-DD), optional
        resolution (int): H3 hexagon resolution (4-10), default 8

    Returns:
        GeoJSON FeatureCollection with hexagonal heat island intensity
    """
    try:
        # Parse query parameters
        north = request.args.get('north', type=float)
        south = request.args.get('south', type=float)
        east = request.args.get('east', type=float)
        west = request.args.get('west', type=float)
        date = request.args.get('date', type=str)
        resolution = request.args.get('resolution', default=8, type=int)

        # Validate required parameters
        if None in [north, south, east, west]:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: north, south, east, west'
            }), 400

        # Validate bounds
        if not (-90 <= south < north <= 90):
            return jsonify({
                'success': False,
                'error': 'Invalid latitude bounds'
            }), 400

        if not (-180 <= west < east <= 180):
            return jsonify({
                'success': False,
                'error': 'Invalid longitude bounds'
            }), 400

        # Validate resolution
        if not (4 <= resolution <= 10):
            return jsonify({
                'success': False,
                'error': 'Resolution must be between 4 and 10'
            }), 400

        logger.info(f"Urban heat island request: bounds=[{south},{north}]x[{west},{east}], "
                   f"date={date}, resolution={resolution}")

        # Build bounds dict
        bounds = {
            'north': north,
            'south': south,
            'east': east,
            'west': west
        }

        # Get urban heat island data
        data = heat_island_service.get_heat_island_data(
            bounds=bounds,
            date=date,
            resolution=resolution
        )

        return jsonify({
            'success': True,
            'data': data,
            'metadata': {
                'bounds': bounds,
                'date': date,
                'resolution': resolution,
                'feature_count': len(data.get('features', []))
            }
        })

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Invalid parameter: {str(e)}'
        }), 400

    except Exception as e:
        logger.error(f"Error processing urban heat island: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/climate/info', methods=['GET'])
def climate_info():
    """
    Get information about available climate data and parameters

    Returns:
        JSON with available scenarios, models, and parameter ranges
    """
    return jsonify({
        'success': True,
        'data': {
            'scenarios': {
                'rcp26': {
                    'name': 'RCP 2.6 (SSP1-2.6)',
                    'description': 'Low emissions scenario',
                    'temp_increase_2050': 1.5,
                    'temp_increase_2100': 2.0
                },
                'rcp45': {
                    'name': 'RCP 4.5 (SSP2-4.5)',
                    'description': 'Moderate emissions scenario',
                    'temp_increase_2050': 2.0,
                    'temp_increase_2100': 3.2
                },
                'rcp85': {
                    'name': 'RCP 8.5 (SSP5-8.5)',
                    'description': 'High emissions scenario',
                    'temp_increase_2050': 2.5,
                    'temp_increase_2100': 4.8
                }
            },
            'models': ['ACCESS-CM2'],
            'year_range': {
                'min': 2020,
                'max': 2100
            },
            'resolution_range': {
                'min': 0,
                'max': 15,
                'recommended': 7,
                'description': 'H3 hexagon resolution (7 = ~5km diameter)'
            },
            'data_source': {
                'name': 'NASA NEX-GDDP-CMIP6',
                'url': 'https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6',
                's3_bucket': 's3://nasa-nex-gddp-cmip6'
            },
            'baseline_period': '1986-2005'
        }
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"🌍 Starting Climate Data Server on port {port}")
    logger.info(f"📊 Endpoints:")
    logger.info(f"   GET  /health")
    logger.info(f"   GET  /api/climate/temperature-projection")
    logger.info(f"   GET  /api/climate/sea-level-rise")
    logger.info(f"   GET  /api/climate/urban-heat-island")
    logger.info(f"   GET  /api/climate/info")

    app.run(
        host='0.0.0.0',
        port=port,
        debug=os.environ.get('FLASK_ENV') == 'development'
    )
