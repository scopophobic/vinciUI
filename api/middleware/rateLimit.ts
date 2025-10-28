import { getUserWithUsage, getLastGeneration } from '../utils/database';

export interface RateLimitResult {
  allowed: boolean;
  message?: string;
  resetTime?: Date;
  remainingQuota?: number;
}

const TIER_LIMITS = {
  free: {
    imagesPerDay: 2,
    enhancementsPerDay: 5,
    cooldownMinutes: 30, // 30 minutes between generations
    maxPromptLength: 300
  },
  premium: {
    imagesPerDay: 100,
    enhancementsPerDay: 200,
    cooldownMinutes: 0, // No cooldown
    maxPromptLength: 1000
  }
};

export async function checkRateLimit(
  userId: string, 
  action: 'image' | 'enhancement'
): Promise<RateLimitResult> {
  try {
    const userWithUsage = await getUserWithUsage(userId);
    const limits = TIER_LIMITS[userWithUsage.tier];
    
    if (action === 'image') {
      // Check daily limit
      if (userWithUsage.usage.imagesGenerated >= limits.imagesPerDay) {
        return {
          allowed: false,
          message: `Daily image generation limit reached (${limits.imagesPerDay}). Resets at midnight.`,
          resetTime: userWithUsage.usage.resetTime,
          remainingQuota: 0
        };
      }

      // Check cooldown for free users
      if (userWithUsage.tier === 'free' && limits.cooldownMinutes > 0) {
        const lastGeneration = await getLastGeneration(userId);
        
        if (lastGeneration) {
          const timeSinceMs = Date.now() - lastGeneration.getTime();
          const cooldownMs = limits.cooldownMinutes * 60 * 1000;
          
          if (timeSinceMs < cooldownMs) {
            const waitMinutes = Math.ceil((cooldownMs - timeSinceMs) / 60000);
            return {
              allowed: false,
              message: `Please wait ${waitMinutes} minutes before next generation (free tier cooldown).`,
              remainingQuota: limits.imagesPerDay - userWithUsage.usage.imagesGenerated
            };
          }
        }
      }

      return {
        allowed: true,
        remainingQuota: limits.imagesPerDay - userWithUsage.usage.imagesGenerated - 1
      };
    }

    if (action === 'enhancement') {
      // Check daily limit for enhancements
      if (userWithUsage.usage.promptsEnhanced >= limits.enhancementsPerDay) {
        return {
          allowed: false,
          message: `Daily prompt enhancement limit reached (${limits.enhancementsPerDay}). Resets at midnight.`,
          resetTime: userWithUsage.usage.resetTime,
          remainingQuota: 0
        };
      }

      return {
        allowed: true,
        remainingQuota: limits.enhancementsPerDay - userWithUsage.usage.promptsEnhanced - 1
      };
    }

    return { allowed: false, message: 'Invalid action type' };

  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: false, message: 'Rate limit check failed' };
  }
}

export function getPromptLengthLimit(tier: 'free' | 'premium'): number {
  return TIER_LIMITS[tier].maxPromptLength;
}

export function getTierLimits(tier: 'free' | 'premium') {
  return TIER_LIMITS[tier];
}
