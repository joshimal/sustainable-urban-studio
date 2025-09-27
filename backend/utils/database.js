const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:your_password_here@localhost:5432/urban_studio',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize PostGIS extensions
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();

    // Enable PostGIS extension
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis_topology;');

    // Create tables for caching GIS data
    await client.query(`
      CREATE TABLE IF NOT EXISTS gis_data_cache (
        id SERIAL PRIMARY KEY,
        source_name VARCHAR(100) NOT NULL,
        data_type VARCHAR(100) NOT NULL,
        cache_key VARCHAR(255) UNIQUE NOT NULL,
        data JSONB NOT NULL,
        geometry GEOMETRY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      );
    `);

    // Create indexes separately
    await client.query('CREATE INDEX IF NOT EXISTS idx_gis_cache_source_type ON gis_data_cache (source_name, data_type);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_gis_cache_key ON gis_data_cache (cache_key);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_gis_cache_geometry ON gis_data_cache USING GIST (geometry);');

    // Create table for download progress tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS download_progress (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(255) UNIQUE NOT NULL,
        source_name VARCHAR(100) NOT NULL,
        data_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        total_size BIGINT,
        downloaded_size BIGINT DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create table for API rate limiting
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_rate_limits (
        id SERIAL PRIMARY KEY,
        api_name VARCHAR(100) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        requests_made INTEGER DEFAULT 0,
        window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index for rate limits
    await client.query('CREATE INDEX IF NOT EXISTS idx_api_rate_limits ON api_rate_limits (api_name, endpoint);');

    client.release();
    console.log('✅ Database initialized with PostGIS support');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
};

// Generic query function with error handling
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50) + '...', duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

// Cache management functions
const cacheData = async (sourceId, dataType, cacheKey, data, geometry = null, ttlHours = 24) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);

  const queryText = `
    INSERT INTO gis_data_cache (source_name, data_type, cache_key, data, geometry, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (cache_key)
    DO UPDATE SET data = $4, geometry = $5, expires_at = $6, created_at = CURRENT_TIMESTAMP
  `;

  return await query(queryText, [sourceId, dataType, cacheKey, JSON.stringify(data), geometry, expiresAt]);
};

const getCachedData = async (cacheKey) => {
  const queryText = `
    SELECT data, geometry, created_at, expires_at
    FROM gis_data_cache
    WHERE cache_key = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  `;

  const result = await query(queryText, [cacheKey]);
  return result.rows[0] || null;
};

const clearExpiredCache = async () => {
  const queryText = 'DELETE FROM gis_data_cache WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP';
  return await query(queryText);
};

// Progress tracking functions
const createProgressRecord = async (jobId, sourceName, dataType, totalSize = null) => {
  const queryText = `
    INSERT INTO download_progress (job_id, source_name, data_type, total_size, status)
    VALUES ($1, $2, $3, $4, 'pending')
    ON CONFLICT (job_id) DO UPDATE SET
      status = 'pending', progress = 0, downloaded_size = 0, updated_at = CURRENT_TIMESTAMP
  `;

  return await query(queryText, [jobId, sourceName, dataType, totalSize]);
};

const updateProgress = async (jobId, progress, downloadedSize = null, status = 'in_progress', errorMessage = null) => {
  const queryText = `
    UPDATE download_progress
    SET progress = $2, downloaded_size = $3, status = $4, error_message = $5, updated_at = CURRENT_TIMESTAMP
    WHERE job_id = $1
  `;

  return await query(queryText, [jobId, progress, downloadedSize, status, errorMessage]);
};

const getProgressStatus = async (jobId) => {
  const queryText = 'SELECT * FROM download_progress WHERE job_id = $1';
  const result = await query(queryText, [jobId]);
  return result.rows[0] || null;
};

module.exports = {
  pool,
  query,
  initializeDatabase,
  cacheData,
  getCachedData,
  clearExpiredCache,
  createProgressRecord,
  updateProgress,
  getProgressStatus
};