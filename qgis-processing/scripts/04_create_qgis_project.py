#!/usr/bin/env python3
"""
QGIS Project Generator for Urban Heat Island Analysis
Creates styled QGIS projects programmatically using PyQGIS
"""

import os
import sys
from pathlib import Path
import logging
import json

# Add QGIS Python path
sys.path.append('/usr/share/qgis/python')
sys.path.append('/usr/share/qgis/python/plugins')

from qgis.core import (
    QgsApplication,
    QgsProject,
    QgsRasterLayer,
    QgsVectorLayer,
    QgsColorRampShader,
    QgsRasterShader,
    QgsSingleBandPseudoColorRenderer,
    QgsGraduatedSymbolRenderer,
    QgsRendererRange,
    QgsSymbol,
    QgsStyle,
    QgsMapLayerStyleManager,
    QgsLayerTreeLayer
)
from qgis.PyQt.QtGui import QColor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/qgis_project.log'),
        logging.StreamHandler()
    ]
)

class QGISProjectGenerator:
    def __init__(self, project_dir='/app/projects', data_dir='/app/data'):
        self.project_dir = Path(project_dir)
        self.data_dir = Path(data_dir)
        self.project_dir.mkdir(parents=True, exist_ok=True)

        # Initialize QGIS Application
        QgsApplication.setPrefixPath('/usr', True)
        self.qgs = QgsApplication([], False)
        self.qgs.initQgis()

        self.project = QgsProject.instance()

    def create_temperature_layer_style(self, layer):
        """
        Create heat map style for LST raster
        """
        logging.info("Creating temperature layer style...")

        # Define color ramp for temperature
        shader = QgsRasterShader()
        color_ramp = QgsColorRampShader()
        color_ramp.setColorRampType(QgsColorRampShader.Interpolated)

        # Temperature gradient: blue (cool) -> red (hot)
        color_ramp_items = [
            QgsColorRampShader.ColorRampItem(20, QColor('#2166ac'), '20°C'),
            QgsColorRampShader.ColorRampItem(25, QColor('#4393c3'), '25°C'),
            QgsColorRampShader.ColorRampItem(30, QColor('#92c5de'), '30°C'),
            QgsColorRampShader.ColorRampItem(35, QColor('#fddbc7'), '35°C'),
            QgsColorRampShader.ColorRampItem(40, QColor('#f4a582'), '40°C'),
            QgsColorRampShader.ColorRampItem(45, QColor('#d6604d'), '45°C'),
            QgsColorRampShader.ColorRampItem(50, QColor('#b2182b'), '50°C'),
        ]

        color_ramp.setColorRampItemList(color_ramp_items)
        shader.setRasterShaderFunction(color_ramp)

        # Create renderer
        renderer = QgsSingleBandPseudoColorRenderer(layer.dataProvider(), 1, shader)
        layer.setRenderer(renderer)

        logging.info("✅ Temperature style applied")

    def create_heat_island_style(self, layer):
        """
        Create graduated symbol style for heat island polygons
        """
        logging.info("Creating heat island style...")

        # Create graduated renderer based on severity
        field_name = 'severity'

        # Define ranges
        ranges = [
            QgsRendererRange(
                0, 1,
                QgsSymbol.defaultSymbol(layer.geometryType()),
                'Moderate',
                True
            ),
            QgsRendererRange(
                1, 2,
                QgsSymbol.defaultSymbol(layer.geometryType()),
                'High',
                True
            )
        ]

        # Set colors
        ranges[0].symbol().setColor(QColor('#fdae61'))  # Orange
        ranges[1].symbol().setColor(QColor('#d73027'))  # Red

        # Create renderer
        renderer = QgsGraduatedSymbolRenderer(field_name, ranges)
        layer.setRenderer(renderer)

        logging.info("✅ Heat island style applied")

    def add_raster_layer(self, raster_path, layer_name, apply_style=True):
        """
        Add raster layer to project with styling
        """
        logging.info(f"Adding raster layer: {layer_name}")

        layer = QgsRasterLayer(str(raster_path), layer_name)

        if not layer.isValid():
            logging.error(f"❌ Failed to load raster: {raster_path}")
            return None

        # Apply style
        if apply_style and layer_name == 'Land Surface Temperature':
            self.create_temperature_layer_style(layer)

        # Add to project
        self.project.addMapLayer(layer)

        # Set layer metadata
        layer.setAbstract(f"Urban heat island analysis - {layer_name}")
        layer.setTitle(layer_name)

        logging.info(f"✅ Added {layer_name}")
        return layer

    def add_vector_layer(self, vector_path, layer_name, apply_style=True):
        """
        Add vector layer to project with styling
        """
        logging.info(f"Adding vector layer: {layer_name}")

        layer = QgsVectorLayer(str(vector_path), layer_name, 'ogr')

        if not layer.isValid():
            logging.error(f"❌ Failed to load vector: {vector_path}")
            return None

        # Apply style
        if apply_style and 'heat' in layer_name.lower():
            self.create_heat_island_style(layer)

        # Add to project
        self.project.addMapLayer(layer)

        # Enable WFS for this layer
        layer.setTitle(layer_name)
        layer.setAbstract(f"Urban heat island analysis - {layer_name}")

        logging.info(f"✅ Added {layer_name}")
        return layer

    def configure_wms_settings(self):
        """
        Configure WMS/WFS server capabilities
        """
        logging.info("Configuring WMS/WFS settings...")

        # Set project metadata
        self.project.setTitle("Urban Heat Island Analysis")

        # WMS settings
        self.project.writeEntry('WMSServiceTitle', '/', 'Urban Heat Island WMS')
        self.project.writeEntry('WMSServiceAbstract', '/',
            'Web Map Service for urban heat island analysis layers')
        self.project.writeEntry('WMSKeywordList', '/',
            'heat island,temperature,urban climate,landsat')

        # WFS settings
        self.project.writeEntry('WFSServiceTitle', '/', 'Urban Heat Island WFS')
        self.project.writeEntry('WFSServiceAbstract', '/',
            'Web Feature Service for heat island vector data')

        # Enable specific layers for WMS/WFS
        self.project.writeEntry('WMSRestrictedLayers', '/', [])
        self.project.writeEntry('WFSLayers', '/', [])

        # Set capabilities
        self.project.writeEntry('WMSUseLayerIDs', '/', False)
        self.project.writeEntry('WMSAddWktGeometry', '/', True)
        self.project.writeEntry('WFSLayers', '/', 'ALL')

        logging.info("✅ WMS/WFS configured")

    def create_project(self, output_path):
        """
        Create complete QGIS project with all layers
        """
        logging.info("=" * 60)
        logging.info("Creating QGIS project for urban heat island analysis")
        logging.info("=" * 60)

        # Clear existing project
        self.project.clear()

        # Add layers
        lst_file = self.data_dir / 'processed' / 'land_surface_temperature.tif'
        if lst_file.exists():
            self.add_raster_layer(lst_file, 'Land Surface Temperature', apply_style=True)

        heat_islands_file = self.data_dir / 'processed' / 'heat_islands.shp'
        if heat_islands_file.exists():
            self.add_vector_layer(heat_islands_file, 'Heat Island Hotspots', apply_style=True)

        # Configure WMS/WFS
        self.configure_wms_settings()

        # Set project CRS
        from qgis.core import QgsCoordinateReferenceSystem
        crs = QgsCoordinateReferenceSystem('EPSG:4326')
        self.project.setCrs(crs)

        # Save project
        output_file = self.project_dir / output_path
        success = self.project.write(str(output_file))

        if success:
            logging.info(f"✅ QGIS project saved: {output_file}")

            # Create project info file
            info = {
                'project_file': str(output_file),
                'layers': [layer.name() for layer in self.project.mapLayers().values()],
                'crs': 'EPSG:4326',
                'wms_enabled': True,
                'wfs_enabled': True,
                'wms_url': 'http://localhost:8081/qgis?SERVICE=WMS&REQUEST=GetCapabilities',
                'wfs_url': 'http://localhost:8081/qgis?SERVICE=WFS&REQUEST=GetCapabilities'
            }

            info_file = self.project_dir / 'project_info.json'
            with open(info_file, 'w') as f:
                json.dump(info, f, indent=2)

            logging.info(f"✅ Project info saved: {info_file}")

            return str(output_file)
        else:
            logging.error("❌ Failed to save QGIS project")
            return None

    def cleanup(self):
        """
        Clean up QGIS application
        """
        self.qgs.exitQgis()

if __name__ == "__main__":
    generator = QGISProjectGenerator()

    try:
        project_file = generator.create_project('urban_heat_island.qgs')
        print(f"Project created: {project_file}")
    finally:
        generator.cleanup()
