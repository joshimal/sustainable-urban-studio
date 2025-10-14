"""
Urban Heat Island Service

Provides simulated urban heat island intensity data using H3 hexagons.
"""

import h3
import numpy as np
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class UrbanHeatIslandService:
    """Service for generating urban heat island data"""

    def get_heat_island_data(self, bounds, date=None, resolution=8):
        """
        Generate urban heat island H3 hexagon data

        Args:
            bounds: Dict with 'north', 'south', 'east', 'west' keys
            date: ISO date string (YYYY-MM-DD), optional
            resolution: H3 resolution level (0-15), default 8

        Returns:
            GeoJSON FeatureCollection with hexagon features
        """
        # Clamp resolution to valid H3 range
        resolution = max(0, min(15, resolution))
        logger.info(f"Generating urban heat island data: resolution {resolution}")

        # Get hexagons covering the bounds
        hex_ids = self._get_hexagons_in_bounds(bounds, resolution)

        # Calculate center point (urban core)
        center_lat = (bounds['north'] + bounds['south']) / 2
        center_lon = (bounds['east'] + bounds['west']) / 2

        hexagons = []
        for hex_id in hex_ids:
            # Get hexagon center
            lat, lon = h3.cell_to_latlng(hex_id)

            # Get hexagon boundary
            boundary = h3.cell_to_boundary(hex_id)

            # Calculate distance from center (urban core)
            dist_from_center = np.sqrt((lat - center_lat)**2 + (lon - center_lon)**2)

            # Urban heat island intensity (hottest at center, cooler at edges)
            # Maximum intensity ~4.5°C at urban core
            max_intensity = 4.5
            urban_core_radius = 0.15  # degrees

            if dist_from_center < urban_core_radius:
                # Within urban core - high intensity
                intensity = max_intensity * (1 - (dist_from_center / urban_core_radius) ** 0.7)
            else:
                # Outside urban core - exponential decay
                decay_factor = np.exp(-(dist_from_center - urban_core_radius) / 0.1)
                intensity = max_intensity * 0.3 * decay_factor

            # Add spatial variation (simulating buildings, parks, water)
            # Use deterministic noise based on location
            seed = np.sin((lat * 23.14 + lon * 37.19) * 0.0174533) * 43758.5453
            noise = (seed - np.floor(seed)) * 2 - 1  # -1 to 1
            intensity += noise * 0.8

            # Clamp to reasonable range (0-6°C)
            intensity = max(0, min(6.0, intensity))

            hexagons.append({
                'hex_id': hex_id,
                'center': [lon, lat],
                'boundary': boundary,
                'intensity': round(intensity, 2),
                'level': self._classify_level(intensity)
            })

        logger.info(f"Generated {len(hexagons)} urban heat island hexagons")

        # Convert to GeoJSON
        return self._to_geojson(hexagons, date, resolution)

    def _get_hexagons_in_bounds(self, bounds, resolution):
        """Get H3 hexagon IDs that cover the bounding box"""
        # Build polygon in GeoJSON format (lon, lat order)
        polygon = [
            [bounds['west'], bounds['north']],
            [bounds['east'], bounds['north']],
            [bounds['east'], bounds['south']],
            [bounds['west'], bounds['south']],
            [bounds['west'], bounds['north']]
        ]

        polygon_geojson = {
            'type': 'Polygon',
            'coordinates': [polygon]
        }

        # Use h3 v4 API
        hex_ids = h3.geo_to_cells(polygon_geojson, resolution)
        return list(hex_ids)

    def _classify_level(self, intensity):
        """Classify heat island intensity level"""
        if intensity < 0.5:
            return 'none'
        elif intensity < 1.5:
            return 'low'
        elif intensity < 3.0:
            return 'moderate'
        elif intensity < 4.5:
            return 'high'
        else:
            return 'extreme'

    def _to_geojson(self, hexagons, date, resolution):
        """Convert hexagons to GeoJSON FeatureCollection"""
        features = []

        for hex_data in hexagons:
            # Convert boundary to proper GeoJSON coordinates format
            # h3.cell_to_boundary returns list of (lat, lon) tuples
            # GeoJSON needs [[lon, lat], ...] with first = last
            coordinates = [[lon, lat] for lat, lon in hex_data['boundary']]
            coordinates.append(coordinates[0])  # Close the polygon

            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [coordinates]
                },
                'properties': {
                    'hex_id': hex_data['hex_id'],
                    'heatIslandIntensity': hex_data['intensity'],
                    'level': hex_data['level'],
                    'center': hex_data['center'],
                    'resolution': resolution
                }
            }

            features.append(feature)

        return {
            'type': 'FeatureCollection',
            'features': features,
            'metadata': {
                'date': date or datetime.now().isoformat().split('T')[0],
                'resolution': resolution,
                'count': len(features),
                'source': 'Simulated Urban Heat Island',
                'description': 'Urban heat island intensity showing temperature differences between urban and rural areas'
            }
        }
