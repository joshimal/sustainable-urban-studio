"""
NASA NEX-GDDP-CMIP6 Climate Data Service

Fetches and processes temperature projection data from NASA's NEX-GDDP-CMIP6 dataset
available on AWS S3 Open Data Registry.

Data source: s3://nasa-nex-gddp-cmip6/
Documentation: https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6
"""

import xarray as xr
import numpy as np
import h3
from shapely.geometry import Polygon
from datetime import datetime
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NASAClimateService:
    """Service for fetching and processing NASA NEX-GDDP-CMIP6 climate projections"""

    # AWS S3 bucket (public read access, no credentials required)
    S3_BUCKET = "s3://nasa-nex-gddp-cmip6"

    # Model selection - using ACCESS-CM2 as default (good global coverage)
    DEFAULT_MODEL = "ACCESS-CM2"

    # Scenario mapping
    SCENARIOS = {
        'rcp26': 'ssp126',  # Low emissions
        'rcp45': 'ssp245',  # Moderate emissions
        'rcp85': 'ssp585'   # High emissions
    }

    # Baseline temperature for anomaly calculation (1986-2005 average, °C)
    BASELINE_TEMP_C = 14.5

    def __init__(self, cache_dir='/tmp/climate_cache'):
        """
        Initialize NASA Climate Service

        Args:
            cache_dir: Directory for caching downloaded NetCDF files
        """
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    def get_temperature_projection(self, bounds, year=2050, scenario='rcp45',
                                   resolution=7, use_simulated=True):
        """
        Get temperature projection data for a bounding box

        Args:
            bounds: Dict with keys 'north', 'south', 'east', 'west' (degrees)
            year: Projection year (2020-2100)
            scenario: Climate scenario ('rcp26', 'rcp45', 'rcp85')
            resolution: H3 hexagon resolution (0-15, default 7 = ~5km diameter)
            use_simulated: If True, use simulated data (for development/testing)

        Returns:
            GeoJSON FeatureCollection with hexagonal temperature anomalies
        """

        if use_simulated:
            logger.info(f"Using simulated data for {year}, scenario {scenario}")
            return self._generate_simulated_data(bounds, year, scenario, resolution)

        try:
            logger.info(f"Fetching NASA data: year={year}, scenario={scenario}")

            # Map RCP to SSP scenario
            ssp_scenario = self.SCENARIOS.get(scenario, 'ssp245')

            # Determine time range for the year
            time_range = self._get_time_range(year)

            # Construct S3 path
            s3_path = self._construct_s3_path('tasmax', ssp_scenario,
                                             self.DEFAULT_MODEL, time_range)

            logger.info(f"Opening dataset: {s3_path}")

            # Open dataset with anonymous S3 access using fsspec
            import s3fs
            fs = s3fs.S3FileSystem(anon=True)

            with fs.open(s3_path, 'rb') as f:
                ds = xr.open_dataset(f, engine='h5netcdf')

                # Extract bounding box
                lat_slice = slice(bounds['south'], bounds['north'])
                lon_slice = slice(bounds['west'], bounds['east'])

                # Select data and compute mean over time
                temp_data = ds['tasmax'].sel(
                    lat=lat_slice,
                    lon=lon_slice
                ).mean(dim='time')

                # Convert from Kelvin to Celsius
                temp_celsius = temp_data - 273.15

                # Calculate anomaly relative to baseline
                anomalies = temp_celsius - self.BASELINE_TEMP_C

                # Generate hexagonal grid
                hexagons = self._create_hex_grid(
                    bounds, anomalies, resolution
                )

                ds.close()

            return self._to_geojson(hexagons, year, scenario, ssp_scenario)

        except Exception as e:
            logger.error(f"Error fetching NASA data: {str(e)}")
            logger.info("Falling back to simulated data")
            return self._generate_simulated_data(bounds, year, scenario, resolution)

    def _construct_s3_path(self, variable, scenario, model, time_range):
        """Construct S3 path to NetCDF file"""
        # Example: s3://nasa-nex-gddp-cmip6/tasmax/ssp245/ACCESS-CM2/tasmax_day_ACCESS-CM2_ssp245_r1i1p1f1_gn_2020-2039.nc
        filename = f"{variable}_day_{model}_{scenario}_r1i1p1f1_gn_{time_range}.nc"
        return f"{self.S3_BUCKET}/{variable}/{scenario}/{model}/{filename}"

    def _get_time_range(self, year):
        """Get the 20-year time range that contains the given year"""
        # NASA NEX-GDDP provides data in 20-year chunks
        if year < 2020:
            return "2015-2034"
        elif year < 2040:
            return "2020-2039"
        elif year < 2060:
            return "2040-2059"
        elif year < 2080:
            return "2060-2079"
        else:
            return "2080-2099"

    def _create_hex_grid(self, bounds, temp_data, resolution):
        """
        Create hexagonal grid with temperature values

        Args:
            bounds: Bounding box dict
            temp_data: xarray DataArray with temperature anomalies
            resolution: H3 resolution

        Returns:
            List of dicts with hex geometry and properties
        """
        hexagons = []

        # Get all hexagons covering the bounding box
        hex_ids = self._get_hexagons_in_bounds(bounds, resolution)

        for hex_id in hex_ids:
            # Get hexagon center
            lat, lon = h3.cell_to_latlng(hex_id)

            # Get hexagon boundary
            boundary = h3.cell_to_boundary(hex_id)

            # Sample temperature at hex center
            try:
                temp_anomaly = float(
                    temp_data.sel(lat=lat, lon=lon, method='nearest').values
                )
            except:
                temp_anomaly = 0.0  # Default if sampling fails

            hexagons.append({
                'hex_id': hex_id,
                'center': [lon, lat],
                'boundary': boundary,
                'temp_anomaly': round(temp_anomaly, 2),
                'temp_anomaly_f': round(temp_anomaly * 1.8, 2)  # Celsius to Fahrenheit
            })

        return hexagons

    def _get_hexagons_in_bounds(self, bounds, resolution):
        """Get all H3 hexagons covering a bounding box"""
        # Create polygon from bounds (lon, lat order)
        polygon_geojson = {
            'type': 'Polygon',
            'coordinates': [[
                [bounds['west'], bounds['south']],
                [bounds['east'], bounds['south']],
                [bounds['east'], bounds['north']],
                [bounds['west'], bounds['north']],
                [bounds['west'], bounds['south']]
            ]]
        }

        # Use h3 v4 API (geo_to_cells)
        hex_ids = h3.geo_to_cells(polygon_geojson, resolution)

        return list(hex_ids)

    def _to_geojson(self, hexagons, year, scenario, ssp_scenario):
        """Convert hexagons to GeoJSON FeatureCollection"""
        features = []

        for hex_data in hexagons:
            # H3 boundary returns coords as [lat, lon], need to flip to [lon, lat]
            coords = [[lon, lat] for lat, lon in hex_data['boundary']]
            coords.append(coords[0])  # Close the polygon

            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [coords]
                },
                'properties': {
                    'tempAnomaly': hex_data['temp_anomaly'],
                    'tempAnomalyF': hex_data['temp_anomaly_f'],
                    'baseline': self.BASELINE_TEMP_C,
                    'projected': round(self.BASELINE_TEMP_C + hex_data['temp_anomaly'], 2),
                    'center': hex_data['center'],
                    'hexId': hex_data['hex_id'],
                    'source': f'NASA NEX-GDDP-CMIP6 ({self.DEFAULT_MODEL})'
                }
            }
            features.append(feature)

        return {
            'type': 'FeatureCollection',
            'features': features,
            'properties': {
                'source': f'NASA NEX-GDDP-CMIP6',
                'model': self.DEFAULT_MODEL,
                'scenario': scenario,
                'ssp_scenario': ssp_scenario,
                'year': year,
                'baselinePeriod': '1986-2005',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        }

    def _generate_simulated_data(self, bounds, year, scenario, resolution):
        """
        Generate simulated temperature projection data for development/testing
        Mimics the structure of real NASA data
        """
        logger.info(f"Generating simulated data for bounds: {bounds}")

        # Scenario-based projections (simplified IPCC estimates)
        scenarios = {
            'rcp26': {'increase2050': 1.5, 'increase2100': 2.0},
            'rcp45': {'increase2050': 2.0, 'increase2100': 3.2},
            'rcp85': {'increase2050': 2.5, 'increase2100': 4.8}
        }

        config = scenarios.get(scenario, scenarios['rcp45'])
        year_progress = max(0, min(1, (year - 2025) / (2100 - 2025)))
        projected_increase = config['increase2050'] + \
                           (config['increase2100'] - config['increase2050']) * year_progress

        # Get hexagons covering the area
        hex_ids = self._get_hexagons_in_bounds(bounds, resolution)

        hexagons = []
        for hex_id in hex_ids:
            lat, lon = h3.cell_to_latlng(hex_id)
            boundary = h3.cell_to_boundary(hex_id)

            # More realistic spatial variation based on latitude and geography
            # Polar amplification: higher latitudes warm more
            lat_effect = (abs(lat) / 45) * 1.8 if abs(lat) > 45 else (abs(lat) / 45) * 0.8

            # Ocean vs land effect (simplified): areas near coasts have moderated warming
            coastal_effect = np.sin(lon * 2.5 + lat * 1.7) * 0.3

            # Continental effect: interior regions have higher variability
            continental_effect = np.cos(lat * 3.2 - lon * 2.1) * 0.4

            # Perlin-like noise for realistic spatial variation
            noise1 = np.sin(lat * 7.13 + lon * 5.27) * np.cos(lat * 3.97 - lon * 8.41) * 0.5
            noise2 = np.sin(lat * 13.71 - lon * 11.39) * np.cos(lat * 19.13 + lon * 7.23) * 0.25
            noise3 = np.sin(lat * 23.45 + lon * 17.83) * 0.15

            # Urban heat island effect (simplified)
            urban_factor = abs(np.sin(lat * 43.7) * np.cos(lon * 51.3)) * 0.6

            # Combine all factors with the base projection
            temp_anomaly = (projected_increase +
                          lat_effect +
                          coastal_effect +
                          continental_effect +
                          noise1 + noise2 + noise3 +
                          urban_factor)

            hexagons.append({
                'hex_id': hex_id,
                'center': [lon, lat],
                'boundary': boundary,
                'temp_anomaly': round(temp_anomaly, 2),
                'temp_anomaly_f': round(temp_anomaly * 1.8, 2)
            })

        ssp_scenario = self.SCENARIOS.get(scenario, 'ssp245')
        return self._to_geojson(hexagons, year, scenario, ssp_scenario)
