const fs = require('fs-extra');
const path = require('path');
const yauzl = require('yauzl');
const shapefile = require('shapefile');
const csv = require('csv-parser');
const turf = require('@turf/turf');
const proj4 = require('proj4');

class FileProcessor {
  constructor() {
    // Define common coordinate system transformations
    this.projections = {
      'EPSG:4326': '+proj=longlat +datum=WGS84 +no_defs',
      'EPSG:3857': '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs',
      'EPSG:4269': '+proj=longlat +datum=NAD83 +no_defs'
    };
  }

  // Extract ZIP files (common for shapefiles)
  async extractZip(zipPath, extractDir) {
    return new Promise((resolve, reject) => {
      const extractedFiles = [];

      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            zipfile.readEntry();
          } else {
            // File entry
            const outputPath = path.join(extractDir, entry.fileName);

            // Ensure directory exists
            fs.ensureDirSync(path.dirname(outputPath));

            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) return reject(err);

              const writeStream = fs.createWriteStream(outputPath);
              readStream.pipe(writeStream);

              writeStream.on('close', () => {
                extractedFiles.push(outputPath);
                zipfile.readEntry();
              });

              writeStream.on('error', reject);
            });
          }
        });

        zipfile.on('end', () => {
          resolve(extractedFiles);
        });

        zipfile.on('error', reject);
      });
    });
  }

  // Process shapefile and convert to GeoJSON
  async processShapefile(shpPath, options = {}) {
    try {
      const features = [];
      const source = await shapefile.open(shpPath);

      let result;
      while (!(result = await source.read()).done) {
        let feature = result.value;

        // Transform coordinates if needed
        if (options.targetCRS && options.sourceCRS) {
          feature = this.transformCoordinates(feature, options.sourceCRS, options.targetCRS);
        }

        // Add metadata
        if (options.addMetadata) {
          feature.properties = {
            ...feature.properties,
            processedAt: new Date().toISOString(),
            sourceCRS: options.sourceCRS || 'unknown',
            targetCRS: options.targetCRS || 'unknown'
          };
        }

        features.push(feature);
      }

      await source.close();

      return {
        type: 'FeatureCollection',
        features: features,
        metadata: {
          totalFeatures: features.length,
          processedAt: new Date().toISOString(),
          sourcePath: shpPath
        }
      };

    } catch (error) {
      throw new Error(`Shapefile processing failed: ${error.message}`);
    }
  }

  // Process CSV with geometry columns
  async processCSV(csvPath, options = {}) {
    return new Promise((resolve, reject) => {
      const features = [];
      const { latColumn = 'lat', lonColumn = 'lon', geometryColumn = null } = options;

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            let geometry;

            if (geometryColumn && row[geometryColumn]) {
              // Parse WKT or GeoJSON geometry
              geometry = this.parseGeometry(row[geometryColumn]);
            } else if (row[latColumn] && row[lonColumn]) {
              // Create point from lat/lon
              geometry = {
                type: 'Point',
                coordinates: [parseFloat(row[lonColumn]), parseFloat(row[latColumn])]
              };
            } else {
              return; // Skip rows without geometry
            }

            const feature = {
              type: 'Feature',
              geometry: geometry,
              properties: { ...row }
            };

            // Remove geometry columns from properties
            delete feature.properties[latColumn];
            delete feature.properties[lonColumn];
            if (geometryColumn) delete feature.properties[geometryColumn];

            features.push(feature);

          } catch (error) {
            console.warn(`Skipping invalid row: ${error.message}`);
          }
        })
        .on('end', () => {
          resolve({
            type: 'FeatureCollection',
            features: features,
            metadata: {
              totalFeatures: features.length,
              processedAt: new Date().toISOString(),
              sourcePath: csvPath
            }
          });
        })
        .on('error', reject);
    });
  }

  // Parse geometry from various formats
  parseGeometry(geometryString) {
    // Try parsing as GeoJSON
    try {
      const parsed = JSON.parse(geometryString);
      if (parsed.type && parsed.coordinates) {
        return parsed;
      }
    } catch (e) {
      // Not JSON, continue
    }

    // Try parsing as WKT (basic implementation)
    if (geometryString.startsWith('POINT')) {
      const coords = geometryString.match(/POINT\s*\(\s*([^)]+)\s*\)/i);
      if (coords) {
        const [lon, lat] = coords[1].split(/\s+/).map(Number);
        return { type: 'Point', coordinates: [lon, lat] };
      }
    }

    throw new Error('Unable to parse geometry');
  }

  // Transform coordinates between coordinate systems
  transformCoordinates(feature, sourceCRS, targetCRS) {
    if (sourceCRS === targetCRS) return feature;

    const sourceProj = this.projections[sourceCRS];
    const targetProj = this.projections[targetCRS];

    if (!sourceProj || !targetProj) {
      throw new Error(`Unsupported coordinate system: ${sourceCRS} or ${targetCRS}`);
    }

    const transform = proj4(sourceProj, targetProj);

    const transformCoords = (coords) => {
      if (typeof coords[0] === 'number') {
        // Single coordinate pair
        return transform.forward(coords);
      } else {
        // Array of coordinates
        return coords.map(transformCoords);
      }
    };

    const newFeature = { ...feature };
    newFeature.geometry = { ...feature.geometry };
    newFeature.geometry.coordinates = transformCoords(feature.geometry.coordinates);

    return newFeature;
  }

  // Validate GeoJSON structure
  validateGeoJSON(geojson) {
    const errors = [];

    if (!geojson.type) {
      errors.push('Missing type property');
    }

    if (geojson.type === 'FeatureCollection') {
      if (!Array.isArray(geojson.features)) {
        errors.push('features must be an array');
      } else {
        geojson.features.forEach((feature, index) => {
          if (!feature.type || feature.type !== 'Feature') {
            errors.push(`Feature ${index}: missing or invalid type`);
          }
          if (!feature.geometry) {
            errors.push(`Feature ${index}: missing geometry`);
          }
          if (!feature.properties) {
            errors.push(`Feature ${index}: missing properties`);
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // Calculate basic statistics for GeoJSON
  calculateStatistics(geojson) {
    if (geojson.type !== 'FeatureCollection') {
      return null;
    }

    const stats = {
      totalFeatures: geojson.features.length,
      geometryTypes: {},
      propertyKeys: new Set(),
      bbox: null
    };

    geojson.features.forEach(feature => {
      // Count geometry types
      const geomType = feature.geometry.type;
      stats.geometryTypes[geomType] = (stats.geometryTypes[geomType] || 0) + 1;

      // Collect property keys
      Object.keys(feature.properties || {}).forEach(key => {
        stats.propertyKeys.add(key);
      });
    });

    // Calculate bounding box
    try {
      const bbox = turf.bbox(geojson);
      stats.bbox = {
        minLon: bbox[0],
        minLat: bbox[1],
        maxLon: bbox[2],
        maxLat: bbox[3]
      };
    } catch (error) {
      console.warn('Could not calculate bounding box:', error.message);
    }

    stats.propertyKeys = Array.from(stats.propertyKeys);

    return stats;
  }

  // Clean up temporary files
  async cleanup(filePaths) {
    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        await fs.remove(filePath);
        console.log(`Cleaned up: ${filePath}`);
      } catch (error) {
        console.warn(`Failed to cleanup ${filePath}:`, error.message);
      }
    });

    await Promise.all(cleanupPromises);
  }
}

module.exports = new FileProcessor();