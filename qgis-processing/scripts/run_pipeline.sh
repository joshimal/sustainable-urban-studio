#!/bin/bash
# Urban Heat Island Processing Pipeline Automation
# Runs complete data acquisition, processing, and QGIS project generation

set -e  # Exit on error

SCRIPT_DIR="/app/scripts"
LOG_DIR="/app/logs"
DATA_DIR="/app/data"

# Create log directory
mkdir -p "$LOG_DIR"

# Log file with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/pipeline_$TIMESTAMP.log"

echo "========================================" | tee -a "$LOG_FILE"
echo "Urban Heat Island Processing Pipeline" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Step 1: Data Acquisition
echo "" | tee -a "$LOG_FILE"
echo "Step 1/4: Data Acquisition" | tee -a "$LOG_FILE"
python3 "$SCRIPT_DIR/01_data_acquisition.py" 2>&1 | tee -a "$LOG_FILE"

# Step 2: LST Processing
echo "" | tee -a "$LOG_FILE"
echo "Step 2/4: Land Surface Temperature Processing" | tee -a "$LOG_FILE"
python3 "$SCRIPT_DIR/02_lst_processing.py" 2>&1 | tee -a "$LOG_FILE"

# Step 3: Spatial Analysis
echo "" | tee -a "$LOG_FILE"
echo "Step 3/4: Spatial Analysis" | tee -a "$LOG_FILE"
python3 "$SCRIPT_DIR/03_spatial_analysis.py" 2>&1 | tee -a "$LOG_FILE"

# Step 4: QGIS Project Generation
echo "" | tee -a "$LOG_FILE"
echo "Step 4/4: QGIS Project Generation" | tee -a "$LOG_FILE"
python3 "$SCRIPT_DIR/04_create_qgis_project.py" 2>&1 | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "✅ Pipeline completed successfully!" | tee -a "$LOG_FILE"
echo "Finished: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Output results summary
echo "" | tee -a "$LOG_FILE"
echo "Results:" | tee -a "$LOG_FILE"
ls -lh "$DATA_DIR/processed/" 2>/dev/null | tee -a "$LOG_FILE" || echo "No processed files yet"

# QGIS Project info
if [ -f "/app/projects/project_info.json" ]; then
    echo "" | tee -a "$LOG_FILE"
    echo "QGIS Project Info:" | tee -a "$LOG_FILE"
    cat /app/projects/project_info.json | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "📋 Full log: $LOG_FILE" | tee -a "$LOG_FILE"
