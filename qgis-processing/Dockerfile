FROM qgis/qgis:release-3_34

# Install Python packages
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --upgrade pip && \
    pip3 install --ignore-installed \
    flask \
    flask-cors

# Set up QGIS environment
ENV PYTHONPATH="${PYTHONPATH}:/usr/share/qgis/python"
ENV QT_QPA_PLATFORM=offscreen

# Copy application files
WORKDIR /app
COPY . .

# Expose port
EXPOSE 5000

# Start the Flask server
CMD ["python3", "minimal_server.py"]