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
  tester: {
    imagesPerDay: 50,
    enhancementsPerDay: 100,
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
    let usage = await getUserUsage(user.userId);
    if (!usage) {
      usage = { images_generated: 0, prompts_enhanced: 0 };
    }
    const now = new Date();
    
    // Check rate limits based on endpoint
    const endpoint = req.path;
    
    if (endpoint.includes('/generate/image')) {
      // For free tier, enforce lifetime cap of 2 images total
      if (user.tier === 'free') {
        if ((usage.images_generated || 0) >= 2) {
          return res.status(429).json({
            error: 'Free tier limit reached (2 total generations). Upgrade required.',
            limit: 2,
            used: usage.images_generated || 0
          });
        }
      } else if ((usage.images_generated || 0) >= limits.imagesPerDay) {
        return res.status(429).json({
          error: 'Daily image generation limit exceeded',
          limit: limits.imagesPerDay,
          used: usage.images_generated
        });
      }
    }
    
    if (endpoint.includes('/generate/enhance') || endpoint.includes('/generate/refine')) {
      if ((usage.prompts_enhanced || 0) >= limits.enhancementsPerDay) {
        return res.status(429).json({
          error: 'Daily prompt enhancement limit exceeded',
          limit: limits.enhancementsPerDay,
          used: usage.prompts_enhanced
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

