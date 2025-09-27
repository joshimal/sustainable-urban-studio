const rateLimit = require('express-rate-limit');
const { query } = require('../utils/database');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for data-intensive operations
const dataDownloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 download requests per hour
  message: {
    error: 'Download limit exceeded. Please wait before requesting more data.',
    retryAfter: 3600 // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// External API rate limiter (tracks requests to specific external APIs)
class ExternalAPILimiter {
  constructor() {
    this.limits = {
      'census': { requests: 0, windowStart: Date.now(), maxRequests: 500, windowMs: 60 * 60 * 1000 }, // 500/hour
      'naturalearth': { requests: 0, windowStart: Date.now(), maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100/hour
      'openstreetmap': { requests: 0, windowStart: Date.now(), maxRequests: 10, windowMs: 60 * 1000 }, // 10/minute
      'municipal': { requests: 0, windowStart: Date.now(), maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200/hour
      'microsoft': { requests: 0, windowStart: Date.now(), maxRequests: 1000, windowMs: 60 * 60 * 1000 } // 1000/hour
    };
  }

  async checkLimit(apiName, endpoint = 'default') {
    const now = Date.now();
    const limit = this.limits[apiName];

    if (!limit) {
      console.warn(`No rate limit configured for API: ${apiName}`);
      return { allowed: true };
    }

    // Reset window if expired
    if (now - limit.windowStart > limit.windowMs) {
      limit.requests = 0;
      limit.windowStart = now;
      await this.updateDatabaseLimit(apiName, endpoint, 0, new Date(now));
    }

    // Check if limit exceeded
    if (limit.requests >= limit.maxRequests) {
      const resetTime = new Date(limit.windowStart + limit.windowMs);
      return {
        allowed: false,
        error: `Rate limit exceeded for ${apiName}. Reset at ${resetTime.toISOString()}`,
        resetTime
      };
    }

    // Increment counter
    limit.requests++;
    await this.updateDatabaseLimit(apiName, endpoint, limit.requests, new Date(limit.windowStart));

    return {
      allowed: true,
      remaining: limit.maxRequests - limit.requests,
      resetTime: new Date(limit.windowStart + limit.windowMs)
    };
  }

  async updateDatabaseLimit(apiName, endpoint, requestsMade, windowStart) {
    try {
      const queryText = `
        INSERT INTO api_rate_limits (api_name, endpoint, requests_made, window_start)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (api_name, endpoint)
        DO UPDATE SET requests_made = $3, window_start = $4
      `;

      await query(queryText, [apiName, endpoint, requestsMade, windowStart]);
    } catch (error) {
      console.error('Failed to update rate limit in database:', error.message);
    }
  }

  // Middleware factory for external API rate limiting
  createMiddleware(apiName) {
    return async (req, res, next) => {
      try {
        const result = await this.checkLimit(apiName, req.path);

        if (!result.allowed) {
          return res.status(429).json({
            error: result.error,
            resetTime: result.resetTime
          });
        }

        // Add rate limit info to response headers
        res.set({
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000)
        });

        next();
      } catch (error) {
        console.error('Rate limiter error:', error.message);
        next(); // Continue on error to avoid breaking the request
      }
    };
  }

  // Get current limits status
  getStatus() {
    const now = Date.now();
    const status = {};

    for (const [apiName, limit] of Object.entries(this.limits)) {
      // Reset if window expired
      if (now - limit.windowStart > limit.windowMs) {
        limit.requests = 0;
        limit.windowStart = now;
      }

      status[apiName] = {
        requests: limit.requests,
        maxRequests: limit.maxRequests,
        remaining: limit.maxRequests - limit.requests,
        windowStart: new Date(limit.windowStart),
        resetTime: new Date(limit.windowStart + limit.windowMs)
      };
    }

    return status;
  }
}

const externalAPILimiter = new ExternalAPILimiter();

module.exports = {
  generalLimiter,
  dataDownloadLimiter,
  externalAPILimiter
};