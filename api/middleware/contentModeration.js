/**
 * Express Content Moderation Middleware
 * Converts the Next.js content moderation middleware to work with Express
 */

// Prohibited keywords and patterns
const PROHIBITED_KEYWORDS = [
  // Explicit content
  'nude', 'naked', 'nsfw', 'porn', 'sex', 'sexual', 'erotic', 'adult',
  'breast', 'penis', 'vagina', 'genitals', 'masturbat', 'orgasm',
  
  // Violence
  'kill', 'murder', 'death', 'blood', 'gore', 'violence', 'weapon',
  'gun', 'knife', 'bomb', 'terrorist', 'suicide',
  
  // Hate speech
  'nazi', 'hitler', 'racist', 'hate', 'discrimination',
  
  // Drugs
  'cocaine', 'heroin', 'meth', 'drug', 'marijuana', 'weed'
];

const SUSPICIOUS_PATTERNS = [
  /\b(very\s+)?(young|child|kid|minor|teen|underage)\b.*\b(sexy|hot|attractive|nude)\b/i,
  /\b(generate|create|make|show)\b.*\b(illegal|harmful|dangerous)\b/i,
  /\b(without\s+)?(clothes|clothing|dress|shirt|pants)\b/i
];

export const contentModerationMiddleware = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Developers can bypass moderation
    if (user.tier === 'developer' && req.rateLimits?.bypassModeration) {
      console.log('🔧 Developer bypassing content moderation');
      return next();
    }
    
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt' });
    }
    
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for prohibited keywords
    for (const keyword of PROHIBITED_KEYWORDS) {
      if (lowerPrompt.includes(keyword.toLowerCase())) {
        console.log(`🚫 Content blocked: prohibited keyword "${keyword}"`);
        return res.status(400).json({
          error: 'Content policy violation',
          message: 'Your prompt contains prohibited content. Please modify your request.',
          code: 'PROHIBITED_CONTENT'
        });
      }
    }
    
    // Check for suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(prompt)) {
        console.log('🚫 Content blocked: suspicious pattern detected');
        return res.status(400).json({
          error: 'Content policy violation',
          message: 'Your prompt may violate our content policy. Please rephrase your request.',
          code: 'SUSPICIOUS_PATTERN'
        });
      }
    }
    
    // Additional AI-based moderation could be added here
    
    console.log('✅ Content moderation passed');
    next();
    
  } catch (error) {
    console.error('Content moderation error:', error);
    res.status(500).json({ error: 'Content moderation failed' });
  }
};

