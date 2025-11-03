/**
 * Express Rate Limiting Middleware
 * Converts the Next.js rate limit middleware to work with Express
 */

import { getUserUsage } from '../utils/database.js';

const RATE_LIMITS = {
  free: {
    imagesPerDay: 2,
    enhancementsPerDay: 5,
    bypassModeration: false
  },
  premium: {
    imagesPerDay: 100,
    enhancementsPerDay: 200,
    bypassModeration: false
  },
  developer: {
    imagesPerDay: 1000,
    enhancementsPerDay: 1000,
    bypassModeration: true
  }
};

export const rateLimitMiddleware = async (req, res, next) => {
  try {
    const user = req.user;
    const limits = RATE_LIMITS[user.tier] || RATE_LIMITS.free;
    
    // Get current usage
    const usage = await getUserUsage(user.userId);
    
    // Check if it's a new day (reset usage)
    const now = new Date();
    const resetTime = new Date(usage.reset_time);
    
    if (now > resetTime) {
      // Reset usage for new day
      usage.images_generated = 0;
      usage.prompts_enhanced = 0;
    }
    
    // Check rate limits based on endpoint
    const endpoint = req.path;
    
    if (endpoint.includes('/generate/image')) {
      if (usage.images_generated >= limits.imagesPerDay) {
        return res.status(429).json({
          error: 'Daily image generation limit exceeded',
          limit: limits.imagesPerDay,
          used: usage.images_generated,
          resetTime: resetTime
        });
      }
    }
    
    if (endpoint.includes('/generate/enhance')) {
      if (usage.prompts_enhanced >= limits.enhancementsPerDay) {
        return res.status(429).json({
          error: 'Daily prompt enhancement limit exceeded',
          limit: limits.enhancementsPerDay,
          used: usage.prompts_enhanced,
          resetTime: resetTime
        });
      }
    }
    
    // Add rate limit info to request
    req.rateLimits = limits;
    
    next();
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    res.status(500).json({ error: 'Rate limiting failed' });
  }
};

