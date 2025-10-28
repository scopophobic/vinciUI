import { logModeration } from '../utils/database';

export interface ModerationResult {
  allowed: boolean;
  flags: string[];
  action: 'allowed' | 'blocked' | 'flagged';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// Comprehensive banned keywords for strict moderation
const BANNED_KEYWORDS = [
  // NSFW/Adult content
  'nude', 'naked', 'sex', 'porn', 'pornographic', 'explicit', 'adult', 'erotic', 'sexual',
  'topless', 'bottomless', 'underwear', 'lingerie', 'bikini', 'swimsuit', 'revealing',
  'seductive', 'sensual', 'intimate', 'provocative', 'suggestive',
  
  // Violence and weapons
  'violence', 'violent', 'blood', 'bloody', 'gore', 'gory', 'weapon', 'weapons',
  'gun', 'guns', 'rifle', 'pistol', 'knife', 'knives', 'sword', 'blade',
  'kill', 'killing', 'murder', 'death', 'dead', 'corpse', 'torture',
  'fight', 'fighting', 'war', 'battle', 'combat', 'attack', 'assault',
  
  // Hate speech and discrimination
  'hate', 'hatred', 'racist', 'racism', 'nazi', 'fascist', 'terrorist', 'terrorism',
  'supremacist', 'extremist', 'radical', 'bigot', 'discrimination',
  
  // Drugs and illegal substances
  'drug', 'drugs', 'cocaine', 'heroin', 'marijuana', 'cannabis', 'weed', 'meth',
  'addiction', 'overdose', 'substance abuse',
  
  // Self-harm and suicide
  'suicide', 'self-harm', 'cutting', 'depression', 'suicidal',
  
  // Inappropriate for minors
  'child', 'children', 'kid', 'kids', 'minor', 'minors', 'baby', 'infant',
  'school', 'playground', 'daycare'
];

// Suspicious patterns that might indicate inappropriate content
const SUSPICIOUS_PATTERNS = [
  // NSFW patterns
  /\b(nude|naked|sex|porn|explicit|adult|erotic)\b/i,
  /\b(topless|bottomless|revealing|seductive|provocative)\b/i,
  
  // Violence patterns
  /\b(violence|blood|gore|weapon|gun|knife|kill|murder|death)\b/i,
  /\b(fight|war|battle|combat|attack|assault|torture)\b/i,
  
  // Hate speech patterns
  /\b(hate|racist|nazi|terrorist|supremacist|extremist)\b/i,
  
  // Drug patterns
  /\b(drug|cocaine|heroin|marijuana|cannabis|weed|meth)\b/i,
  
  // Self-harm patterns
  /\b(suicide|self-harm|cutting|suicidal)\b/i,
  
  // Inappropriate with minors
  /\b(child|children|kid|kids|minor|baby|infant)\s+(nude|naked|sexual|inappropriate)/i,
  
  // Combination patterns that are concerning
  /\b(young|teen|teenage)\s+(girl|boy|woman|man)\s+(nude|naked|sexy|hot)/i,
  /\b(school|classroom|playground)\s+(violence|fight|weapon|gun)/i
];

// High-risk phrases that should be immediately blocked
const HIGH_RISK_PHRASES = [
  'child pornography', 'child abuse', 'sexual violence', 'rape', 'pedophile',
  'terrorist attack', 'bomb making', 'mass shooting', 'suicide bomber',
  'drug dealing', 'human trafficking', 'slavery'
];

export async function moderateContent(
  content: string, 
  userId: string,
  contentType: 'prompt' | 'image' = 'prompt'
): Promise<ModerationResult> {
  const flags: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';
  
  const lowerContent = content.toLowerCase().trim();
  
  // Check for high-risk phrases first (immediate block)
  for (const phrase of HIGH_RISK_PHRASES) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      flags.push(`high_risk_phrase:${phrase}`);
      severity = 'high';
    }
  }
  
  // Check banned keywords
  for (const keyword of BANNED_KEYWORDS) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      flags.push(`banned_keyword:${keyword}`);
      if (severity === 'low') severity = 'medium';
    }
  }
  
  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(lowerContent)) {
      flags.push(`suspicious_pattern:${pattern.source}`);
      if (severity === 'low') severity = 'medium';
    }
  }
  
  // Length validation
  if (content.length > 1000) {
    flags.push('content_too_long');
  }
  
  // Empty content check
  if (content.trim().length === 0) {
    flags.push('empty_content');
  }
  
  // Special character spam check
  const specialCharCount = (content.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
  if (specialCharCount > content.length * 0.3) {
    flags.push('excessive_special_characters');
  }
  
  // Repeated character spam check
  if (/(.)\1{10,}/.test(content)) {
    flags.push('repeated_character_spam');
  }
  
  // Determine action based on flags and severity
  let action: 'allowed' | 'blocked' | 'flagged' = 'allowed';
  let message = 'Content approved';
  
  if (flags.length > 0) {
    if (severity === 'high' || flags.some(flag => flag.startsWith('high_risk_phrase'))) {
      action = 'blocked';
      message = 'Content blocked due to policy violations. Please ensure your prompts are appropriate and follow our community guidelines.';
    } else if (severity === 'medium' || flags.length >= 3) {
      action = 'blocked';
      message = 'Content blocked due to inappropriate content. Please revise your prompt to comply with our content policy.';
    } else {
      action = 'flagged';
      message = 'Content flagged for review but allowed to proceed.';
    }
  }
  
  // Log moderation attempt
  try {
    await logModeration(userId, content, contentType, flags, action);
  } catch (error) {
    console.error('Failed to log moderation:', error);
  }
  
  return {
    allowed: action !== 'blocked',
    flags,
    action,
    message,
    severity
  };
}

// Enhanced AI-based moderation using Gemini (optional additional layer)
export async function aiModeration(content: string): Promise<ModerationResult> {
  try {
    const moderationPrompt = `
You are a content moderation AI. Analyze this image generation prompt for inappropriate content.

Respond with ONLY a JSON object in this exact format:
{
  "safe": true/false,
  "reason": "brief explanation",
  "severity": "low/medium/high"
}

Consider UNSAFE:
- NSFW/adult/sexual content
- Violence, weapons, gore
- Hate speech, discrimination
- Illegal activities
- Self-harm content
- Inappropriate content involving minors
- Graphic or disturbing imagery

Prompt to analyze: "${content}"
`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not available');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: moderationPrompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          candidateCount: 1,
        }
      })
    });

    if (!response.ok) {
      throw new Error('AI moderation API failed');
    }

    const result = await response.json();
    const aiResponse = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      throw new Error('No AI response received');
    }

    // Parse AI response
    const moderationResult = JSON.parse(aiResponse.trim());
    
    return {
      allowed: moderationResult.safe,
      flags: moderationResult.safe ? [] : ['ai_flagged'],
      action: moderationResult.safe ? 'allowed' : 'blocked',
      message: moderationResult.safe ? 'AI moderation passed' : `AI moderation failed: ${moderationResult.reason}`,
      severity: moderationResult.severity || 'medium'
    };

  } catch (error) {
    console.error('AI moderation error:', error);
    // Fallback to conservative approach if AI moderation fails
    return {
      allowed: false,
      flags: ['ai_moderation_failed'],
      action: 'blocked',
      message: 'Content moderation temporarily unavailable. Please try again later.',
      severity: 'medium'
    };
  }
}

// Validate image uploads
export function validateImageUpload(file: any): ModerationResult {
  const flags: string[] = [];
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    flags.push('file_too_large');
  }
  
  // Check file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    flags.push('invalid_file_type');
  }
  
  const action = flags.length > 0 ? 'blocked' : 'allowed';
  
  return {
    allowed: action === 'allowed',
    flags,
    action,
    message: flags.length > 0 ? 'Invalid image file' : 'Image validation passed',
    severity: 'low'
  };
}
