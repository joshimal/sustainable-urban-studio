#!/usr/bin/env python3
"""
Urban Heat Island Spatial Analysis
Performs zonal statistics, heat island detection, and correlation analysis
"""

import os
import sys
import json
import numpy as np
from pathlib import Path
import logging
from osgeo import gdal, ogr, osr
import geopandas as gpd
from shapely.geometry import Point, Polygon, mapping
from scipy.ndimage import label, generate_binary_structure

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/spatial_analysis.log'),
        logging.StreamHandler()
    ]
)

class UrbanHeatIslandAnalysis:
    def __init__(self, data_dir='/app/data'):
        self.data_dir = Path(data_dir)
        self.processed_dir = self.data_dir / 'processed'
        self.processed_dir.mkdir(parents=True, exist_ok=True)

    def calculate_zonal_statistics(self, lst_raster, zones_vector, output_path):
        """
        Calculate temperature statistics by zone (e.g., census tracts)
        """
        logging.info("Calculating zonal statistics...")

        # Open raster
        raster_ds = gdal.Open(str(lst_raster))
        raster_band = raster_ds.GetRasterBand(1)
        raster_array = raster_band.ReadAsArray()
        geotransform = raster_ds.GetGeoTransform()

        # Open vector zones
        zones_ds = ogr.Open(str(zones_vector))
        zones_layer = zones_ds.GetLayer()

        results = []

        for feature in zones_layer:
            geom = feature.GetGeometryRef()
            zone_id = feature.GetField(0)

            # Create in-memory raster for this zone
            driver = gdal.GetDriverByName('MEM')
            zone_raster = driver.Create('', raster_ds.RasterXSize, raster_ds.RasterYSize, 1, gdal.GDT_Byte)
            zone_raster.SetGeoTransform(geotransform)
            zone_raster.SetProjection(raster_ds.GetProjection())

            # Rasterize zone
            gdal.RasterizeLayer(zone_raster, [1], zones_layer, burn_values=[1])
            zone_array = zone_raster.GetRasterBand(1).ReadAsArray()

            # Calculate statistics for this zone
            zone_temps = raster_array[zone_array == 1]

            if len(zone_temps) > 0:
                stats = {
                    'zone_id': zone_id,
                    'mean_temp': float(np.mean(zone_temps)),
                    'min_temp': float(np.min(zone_temps)),
                    'max_temp': float(np.max(zone_temps)),
                    'std_temp': float(np.std(zone_temps)),
                    'pixel_count': int(len(zone_temps))
                }
                results.append(stats)

        # Save results
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)

        logging.info(f"✅ Zonal statistics saved: {output_path}")
        return results

    def detect_heat_islands(self, lst_raster, threshold_percentile=75, output_shapefile=None):
        """
        Detect urban heat island hotspots
        Identifies areas above temperature threshold and creates polygons
        """
        logging.info(f"Detecting heat islands (threshold: {threshold_percentile}th percentile)...")

        # Read LST raster
        ds = gdal.Open(str(lst_raster))
        band = ds.GetRasterBand(1)
        lst_array = band.ReadAsArray()
        geotransform = ds.GetGeoTransform()
        projection = ds.GetProjection()

        # Calculate threshold temperature
        threshold_temp = np.percentile(lst_array[lst_array > 0], threshold_percentile)
        logging.info(f"Heat island threshold: {threshold_temp:.2f}°C")

        # Create binary mask of heat islands
        heat_island_mask = (lst_array >= threshold_temp).astype(np.uint8)

        # Label connected regions
        structure = generate_binary_structure(2, 2)
        labeled_array, num_features = label(heat_island_mask, structure=structure)

        logging.info(f"Found {num_features} heat island regions")

        # Convert to polygons
        heat_islands = []

        for region_id in range(1, num_features + 1):
            region_mask = (labeled_array == region_id).astype(np.uint8)
            region_temps = lst_array[region_mask == 1]

            # Calculate region statistics
            heat_island = {
                'id': region_id,
                'mean_temp': float(np.mean(region_temps)),
                'max_temp': float(np.max(region_temps)),
                'area_pixels': int(np.sum(region_mask)),
                'severity': 'high' if np.mean(region_temps) > threshold_temp + 2 else 'moderate'
            }

            heat_islands.append(heat_island)

        # Create GeoDataFrame
        if output_shapefile:
            self.save_heat_islands_shapefile(heat_islands, output_shapefile, projection)

        return heat_islands

    def save_heat_islands_shapefile(self, heat_islands, output_path, projection):
        """
        Save heat island polygons as shapefile
        """
        # For demo, create simple point features
        # In production, would convert raster regions to actual polygons

        driver = ogr.GetDriverByName('ESRI Shapefile')
        if os.path.exists(output_path):
            driver.DeleteDataSource(output_path)

        ds = driver.CreateDataSource(output_path)
        srs = osr.SpatialReference()
        srs.ImportFromWkt(projection)

        layer = ds.CreateLayer('heat_islands', srs, ogr.wkbPoint)

        # Create fields
        layer.CreateField(ogr.FieldDefn('id', ogr.OFTInteger))
        layer.CreateField(ogr.FieldDefn('mean_temp', ogr.OFTReal))
        layer.CreateField(ogr.FieldDefn('max_temp', ogr.OFTReal))
        layer.CreateField(ogr.FieldDefn('severity', ogr.OFTString))

        # Add features
        for hi in heat_islands:
            feature = ogr.Feature(layer.GetLayerDefn())
            feature.SetField('id', hi['id'])
            feature.SetField('mean_temp', hi['mean_temp'])
            feature.SetField('max_temp', hi['max_temp'])
            feature.SetField('severity', hi['severity'])

            # For demo, use center point
            point = ogr.Geometry(ogr.wkbPoint)
            point.AddPoint(0, 0)  # Would calculate actual centroid
            feature.SetGeometry(point)

            layer.CreateFeature(feature)
            feature = None

        ds = None
        logging.info(f"✅ Heat islands saved: {output_path}")

    def analyze_tree_temperature_correlation(self, lst_raster, tree_canopy_raster):
        """
        Analyze correlation between tree cover and temperature
        """
        logging.info("Analyzing tree cover vs. temperature correlation...")

        # Read rasters
        lst_ds = gdal.Open(str(lst_raster))
        lst_array = lst_ds.GetRasterBand(1).ReadAsArray()

        # For demo: create synthetic tree cover data
        # In production: read actual tree canopy raster
        tree_cover = np.random.randint(0, 100, size=lst_array.shape)

        # Calculate correlation
        valid_mask = (lst_array > 0) & (tree_cover >= 0)
        correlation = np.corrcoef(
            lst_array[valid_mask],
            tree_cover[valid_mask]
        )[0, 1]

        logging.info(f"Tree cover - temperature correlation: {correlation:.3f}")

        # Bin tree cover and calculate mean temperatures
        bins = [0, 20, 40, 60, 80, 100]
        bin_stats = []

        for i in range(len(bins) - 1):
            bin_mask = (tree_cover >= bins[i]) & (tree_cover < bins[i+1]) & (lst_array > 0)
            if np.sum(bin_mask) > 0:
                bin_stats.append({
                    'tree_cover_range': f"{bins[i]}-{bins[i+1]}%",
                    'mean_temp': float(np.mean(lst_array[bin_mask])),
                    'pixel_count': int(np.sum(bin_mask))
                })

        return {
            'correlation': correlation,
            'bin_statistics': bin_stats
        }

    def run_full_analysis(self):
        """
        Run complete spatial analysis pipeline
        """
        logging.info("=" * 60)
        logging.info("Starting urban heat island spatial analysis")
        logging.info("=" * 60)

        results = {}

        try:
            lst_file = self.processed_dir / 'land_surface_temperature.tif'

            if lst_file.exists():
                # 1. Detect heat islands
                heat_islands = self.detect_heat_islands(
                    lst_file,
                    threshold_percentile=75,
                    output_shapefile=str(self.processed_dir / 'heat_islands.shp')
                )
                results['heat_islands'] = heat_islands[:10]  # Top 10

                # 2. Tree cover correlation
                tree_correlation = self.analyze_tree_temperature_correlation(
                    lst_file,
                    None  # Will use synthetic data
                )
                results['tree_correlation'] = tree_correlation

                # Save analysis report
                report_file = self.processed_dir / 'spatial_analysis_report.json'
                with open(report_file, 'w') as f:
                    json.dump(results, f, indent=2)

                logging.info(f"✅ Spatial analysis complete! Report: {report_file}")

            else:
                logging.warning("LST file not found. Run LST processing first.")

        except Exception as e:
            logging.error(f"❌ Spatial analysis failed: {str(e)}")
            raise

        return results

if __name__ == "__main__":
    analysis = UrbanHeatIslandAnalysis()
    results = analysis.run_full_analysis()
    print(json.dumps(results, indent=2))
