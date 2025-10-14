FROM qgis/qgis:release-3_34

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    python3-gdal \
    python3-numpy \
    python3-scipy \
    gdal-bin \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
# First upgrade numpy to avoid version conflicts
RUN pip3 install --upgrade pip && \
    pip3 install --upgrade numpy && \
    pip3 install --ignore-installed \
    flask \
    flask-cors \
    geopandas \
    rasterio \
    shapely \
    requests \
    schedule \
    xarray \
    netCDF4 \
    h5netcdf \
    h3 \
    s3fs \
    boto3 \
    dask

# Set up QGIS environment
ENV PYTHONPATH="${PYTHONPATH}:/usr/share/qgis/python:/usr/lib/python3/dist-packages"
ENV QT_QPA_PLATFORM=offscreen
ENV QGIS_SERVER_LOG_LEVEL=0
ENV QGIS_SERVER_LOG_STDERR=1
ENV QGIS_PROJECT_FILE=/app/projects/urban_heat_island.qgs

# Create necessary directories
RUN mkdir -p /app/data/raw/landsat \
    /app/data/raw/tree_canopy \
    /app/data/raw/impervious \
    /app/data/raw/census \
    /app/data/processed \
    /app/projects \
    /app/logs \
    /app/scripts

# Copy application files
WORKDIR /app
COPY . .

# Make scripts executable
RUN chmod +x /app/scripts/*.sh 2>/dev/null || true
RUN chmod +x /app/scripts/*.py 2>/dev/null || true

# Expose port
EXPOSE 5000

# Start the Climate Data server (includes NASA NEX-GDDP and other climate endpoints)
CMD ["python3", "climate_server.py"]