FROM qgis/qgis:release-3_34

# Install Python packages
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install \
    flask \
    flask-cors \
    numpy \
    pandas \
    geopandas \
    rasterio \
    shapely \
    psycopg2-binary

# Set up QGIS environment
ENV PYTHONPATH="${PYTHONPATH}:/usr/share/qgis/python"
ENV QT_QPA_PLATFORM=offscreen

# Copy application files
WORKDIR /app
COPY . .

# Expose port
EXPOSE 5000

# Start the Flask server
CMD ["python3", "qgis_server.py"]