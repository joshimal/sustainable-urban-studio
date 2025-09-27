const NodeCache = require('node-cache');
const { cacheData, getCachedData, clearExpiredCache } = require('../utils/database');

// In-memory cache for frequently accessed data (TTL in seconds)
const memoryCache = new NodeCache({
  stdTTL: 600, // 10 minutes
  checkperiod: 120 // Check for expired keys every 2 minutes
});

class CacheService {
  constructor() {
    // Clear expired database cache every hour
    setInterval(() => {
      this.cleanExpiredCache();
    }, 3600000);
  }

  // Generate cache key from parameters
  generateCacheKey(source, endpoint, params = {}) {
    const sortedParams = Object.keys(params).sort().reduce(
      (result, key) => {
        result[key] = params[key];
        return result;
      }, {}
    );
    return `${source}:${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  // Get from memory cache first, then database cache
  async get(cacheKey) {
    // Try memory cache first
    const memoryData = memoryCache.get(cacheKey);
    if (memoryData) {
      console.log(`✅ Cache hit (memory): ${cacheKey}`);
      return memoryData;
    }

    // Try database cache
    try {
      const dbData = await getCachedData(cacheKey);
      if (dbData) {
        console.log(`✅ Cache hit (database): ${cacheKey}`);
        // Store in memory cache for faster future access
        memoryCache.set(cacheKey, dbData.data);
        return dbData.data;
      }
    } catch (error) {
      console.error('Database cache error:', error.message);
    }

    console.log(`❌ Cache miss: ${cacheKey}`);
    return null;
  }

  // Store in both memory and database cache
  async set(cacheKey, data, source, dataType, geometry = null, ttlHours = 24) {
    try {
      // Store in memory cache
      memoryCache.set(cacheKey, data);

      // Store in database cache
      await cacheData(source, dataType, cacheKey, data, geometry, ttlHours);

      console.log(`✅ Data cached: ${cacheKey}`);
    } catch (error) {
      console.error('Cache storage error:', error.message);
    }
  }

  // Clear specific cache entry
  async clear(cacheKey) {
    memoryCache.del(cacheKey);
    // Note: Database cache will be cleared by expiration or manual cleanup
  }

  // Clear all cache
  async clearAll() {
    memoryCache.flushAll();
    console.log('✅ Memory cache cleared');
  }

  // Clean expired database cache entries
  async cleanExpiredCache() {
    try {
      await clearExpiredCache();
      console.log('✅ Expired database cache entries cleared');
    } catch (error) {
      console.error('Cache cleanup error:', error.message);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      memory: {
        keys: memoryCache.keys().length,
        stats: memoryCache.getStats()
      }
    };
  }
}

module.exports = new CacheService();