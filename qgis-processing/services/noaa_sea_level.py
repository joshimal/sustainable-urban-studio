"""
NOAA Sea Level Rise Service

Converts NOAA sea level rise data into hexagonal grids using H3.
"""

import h3
import numpy as np
import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class NOAASeaLevelService:
    """Service for fetching and processing NOAA sea level rise data"""

    def __init__(self):
        self.base_url = "https://coast.noaa.gov/arcgis/rest/services/dc_slr"

    def get_sea_level_hexagons(self, bounds, feet=3, resolution=9, use_depth_data=True):
        """
        Get sea level rise data as hexagonal grid

        Args:
            bounds: Dict with keys 'north', 'south', 'east', 'west' (degrees)
            feet: Sea level rise in feet (0-10)
            resolution: H3 hexagon resolution (9-10 for small hexagons)
            use_depth_data: If True, fetch depth grid data. If False, use extent only.

        Returns:
            Dict with GeoJSON FeatureCollection of hexagons
        """
        logger.info(f"Generating sea level hexagons: {feet}ft, resolution {resolution}")

        try:
            # For now, generate simulated sea level data based on elevation
            # In production, this would query NOAA's actual depth grid
            hexagons = self._generate_hexagons_with_depth(bounds, feet, resolution)

            return self._to_geojson(hexagons, feet)

        except Exception as e:
            logger.error(f"Error generating sea level hexagons: {e}")
            raise

    def _generate_hexagons_with_depth(self, bounds, feet, resolution):
        """
        Generate hexagons with simulated depth values

        In production, this would query NOAA's depth raster service
        """
        hexagons = []

        # Get all hexagons covering the bounding box
        hex_ids = self._get_hexagons_in_bounds(bounds, resolution)

        logger.info(f"Generated {len(hex_ids)} hexagons for sea level analysis")

        for hex_id in hex_ids:
            # Get hexagon center
            lat, lon = h3.cell_to_latlng(hex_id)

            # Get hexagon boundary
            boundary = h3.cell_to_boundary(hex_id)

            # Simulate depth based on proximity to coast and elevation
            # This is a placeholder - in production would query NOAA raster
            depth = self._simulate_flood_depth(lat, lon, feet)

            if depth > 0:  # Only include hexagons with flooding
                hexagons.append({
                    'hex_id': hex_id,
                    'center': [lon, lat],
                    'boundary': boundary,
                    'depth_ft': round(depth, 2),
                    'depth_m': round(depth * 0.3048, 2)
                })

        return hexagons

    def _get_hexagons_in_bounds(self, bounds, resolution):
        """Get all H3 hexagons covering a bounding box"""
        # Create polygon from bounds (lon, lat order for GeoJSON)
        polygon = [
            [bounds['west'], bounds['south']],
            [bounds['east'], bounds['south']],
            [bounds['east'], bounds['north']],
            [bounds['west'], bounds['north']],
            [bounds['west'], bounds['south']]
        ]

        polygon_geojson = {
            'type': 'Polygon',
            'coordinates': [polygon]
        }

        # Use h3 v4 API
        hex_ids = h3.geo_to_cells(polygon_geojson, resolution)

        return list(hex_ids)

    def _simulate_flood_depth(self, lat, lon, max_feet):
        """
        Simulate flood depth based on location - COASTAL AREAS ONLY

        This is a placeholder for actual NOAA depth data.
        In production, would query NOAA's depth grid raster service.

        For now, only simulate flooding in known coastal regions:
        - NYC area: Near coastlines, harbors, low-lying areas
        - Should return 0 for inland areas
        """
        # Define coastal bounding areas (approximate)
        # NYC/Long Island coastal zone: 40.4-40.9 N, -74.3 to -73.7 W
        is_nyc_coastal = (40.4 <= lat <= 40.9 and -74.3 <= lon <= -73.7)

        # Miami area: 25.6-25.9 N, -80.3 to -80.1 W
        is_miami_coastal = (25.6 <= lat <= 25.9 and -80.3 <= lon <= -80.1)

        # SF Bay area: 37.4-37.9 N, -122.6 to -122.2 W
        is_sf_coastal = (37.4 <= lat <= 37.9 and -122.6 <= lon <= -122.2)

        # If not in a coastal zone, no flooding
        if not (is_nyc_coastal or is_miami_coastal or is_sf_coastal):
            return 0

        # For coastal areas, create realistic flooding patterns
        # Simulate distance from coastline using coordinate gradients
        if is_nyc_coastal:
            # Flood increases closer to -74.0 (Hudson River/harbor)
            distance_factor = abs(lon + 74.0) / 0.3
        elif is_miami_coastal:
            # Flood increases closer to -80.2 (Atlantic coast)
            distance_factor = abs(lon + 80.2) / 0.1
        elif is_sf_coastal:
            # Flood increases closer to -122.4 (Bay)
            distance_factor = abs(lon + 122.4) / 0.2
        else:
            distance_factor = 1.0

        # Only flood very close to coast (within ~0.1 degrees)
        if distance_factor > 0.1:
            return 0

        # Calculate depth based on distance and sea level rise
        # Closer to coast = more flooding
        normalized_distance = distance_factor / 0.1  # 0 at coast, 1 at 0.1° away
        depth = max_feet * (1 - normalized_distance * 0.8)  # 80% reduction inland

        # Add small variation for realism
        seed = np.sin((lat * 17.23 + lon * 41.17) * 0.0174533) * 43758.5453
        noise = (seed - np.floor(seed) - 0.5) * 0.5  # Small noise ±0.25 feet
        depth += noise

        # Clamp to valid range
        depth = max(0, min(max_feet, depth))

        return depth

    def _to_geojson(self, hexagons, feet):
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
                    'depth_ft': hex_data['depth_ft'],
                    'depth_m': hex_data['depth_m'],
                    'center': hex_data['center'],
                    'hexId': hex_data['hex_id'],
                    'source': 'NOAA Sea Level Rise (simulated)'
                }
            }
            features.append(feature)

        return {
            'type': 'FeatureCollection',
            'features': features,
            'properties': {
                'source': 'NOAA Sea Level Rise Viewer',
                'sea_level_feet': feet,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        }
