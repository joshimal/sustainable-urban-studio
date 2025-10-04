#!/usr/bin/env python3
"""
Automated scheduling for heat island data updates
Checks for new Landsat scenes and triggers processing
"""

import schedule
import time
import subprocess
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/scheduler.log'),
        logging.StreamHandler()
    ]
)

def run_pipeline():
    """Execute the full processing pipeline"""
    logging.info("🔄 Scheduled pipeline execution starting...")

    try:
        result = subprocess.run(
            ['/app/scripts/run_pipeline.sh'],
            capture_output=True,
            text=True,
            timeout=1800  # 30 minute timeout
        )

        if result.returncode == 0:
            logging.info("✅ Pipeline completed successfully")
            logging.info(result.stdout)
        else:
            logging.error(f"❌ Pipeline failed: {result.stderr}")

    except subprocess.TimeoutExpired:
        logging.error("❌ Pipeline execution timed out")
    except Exception as e:
        logging.error(f"❌ Error running pipeline: {str(e)}")

def check_new_landsat_data():
    """
    Check for new Landsat scenes
    In production: query USGS API for new scenes
    """
    logging.info("🛰️  Checking for new Landsat data...")

    # In production, implement:
    # 1. Query USGS EarthExplorer API
    # 2. Check for scenes newer than last processing date
    # 3. If new data available, trigger pipeline

    # For demo: check if data is older than 7 days
    processed_dir = Path('/app/data/processed')
    lst_file = processed_dir / 'land_surface_temperature.tif'

    if lst_file.exists():
        age_days = (datetime.now().timestamp() - lst_file.stat().st_mtime) / 86400
        if age_days > 7:
            logging.info(f"📅 Data is {age_days:.1f} days old, triggering update")
            run_pipeline()
        else:
            logging.info(f"✅ Data is current ({age_days:.1f} days old)")
    else:
        logging.info("📥 No existing data, running initial processing")
        run_pipeline()

if __name__ == "__main__":
    logging.info("=" * 60)
    logging.info("🕐 Urban Heat Island Data Scheduler Started")
    logging.info("=" * 60)

    # Schedule jobs
    # Check for new data every day at 2 AM
    schedule.every().day.at("02:00").do(check_new_landsat_data)

    # Weekly full pipeline run (Sundays at 3 AM)
    schedule.every().sunday.at("03:00").do(run_pipeline)

    # Run immediately on startup
    logging.info("🚀 Running initial pipeline...")
    run_pipeline()

    logging.info("⏰ Scheduler active. Waiting for scheduled tasks...")
    logging.info("   - Daily data check: 2:00 AM")
    logging.info("   - Weekly pipeline: Sunday 3:00 AM")

    # Keep running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute
