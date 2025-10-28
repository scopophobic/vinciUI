import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimit';
import { moderateContent } from '../middleware/contentModeration';
import { incrementUsage, logGeneration } from '../utils/database';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, enhancementStyle, referenceImage } = req.body;
  const userId = req.user!.userId;

  try {
    // 1. Validate input
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Valid prompt is required' });
    }

    if (prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt cannot be empty' });
    }

    // 2. Check rate limits
    const rateLimitResult = await checkRateLimit(userId, 'enhancement');
    if (!rateLimitResult.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        message: rateLimitResult.message,
        resetTime: rateLimitResult.resetTime,
        remainingQuota: rateLimitResult.remainingQuota
      });
    }

    // 3. Content moderation
    const moderation = await moderateContent(prompt, userId, 'prompt');
    if (!moderation.allowed) {
      return res.status(400).json({ 
        error: 'Content blocked', 
        message: moderation.message,
        flags: moderation.flags
      });
    }

    // 4. Generate enhancement instruction based on style
    const enhancementInstructions = {
      detailed: "Enhance this image prompt with specific visual details. Keep it under 200 words. Add key details about lighting, colors, and composition while preserving the main concept.",
      artistic: "Transform this into an artistic image prompt. Keep it under 200 words. Add art style, color palette, and mood. Focus on the most important artistic elements.",
      photorealistic: "Enhance this for photorealistic generation. Keep it under 200 words. Add key camera and lighting details, materials, and professional photography terms.",
      cinematic: "Make this cinematic. Keep it under 200 words. Add essential film lighting, camera angles, and dramatic composition details."
    };

    const instruction = enhancementInstructions[enhancementStyle as keyof typeof enhancementInstructions] 
      || enhancementInstructions.detailed;

    // 5. Call Gemini for enhancement
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const parts: any[] = [{
      text: `${instruction}\n\nOriginal prompt: "${prompt}"\n\nEnhanced prompt:`
    }];

    // Add reference image if provided
    if (referenceImage) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: referenceImage
        }
      });
      parts[0].text += '\n\nAnalyze the provided reference image and incorporate relevant visual details into the enhancement.';
    }

    const payload = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: 0.7,
        candidateCount: 1,
      }
    };

    console.log(`Enhancing prompt for user ${userId} with style ${enhancementStyle}`);

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        return res.status(429).json({
          error: 'API quota exceeded',
          message: 'Please wait a few minutes and try again, or upgrade your plan.'
        });
      }
      
      throw new Error(`Gemini API failed: ${geminiResponse.status} - ${errorText}`);
    }

    const result = await geminiResponse.json();
    const enhancedPrompt = result?.candidates?.[0]?.content?.parts?.[0]?.text || prompt;

    // 6. Moderate the enhanced prompt
    const enhancedModeration = await moderateContent(enhancedPrompt, userId, 'prompt');
    if (!enhancedModeration.allowed) {
      // If enhanced prompt is inappropriate, return a safe fallback
      const fallbackEnhancement = getFallbackEnhancement(prompt, enhancementStyle);
      
      await incrementUsage(userId, 'enhancement');
      
      return res.json({
        success: true,
        enhancedPrompt: fallbackEnhancement,
        originalPrompt: prompt,
        enhancementStyle,
        fallback: true,
        message: 'Used safe fallback enhancement due to content policy',
        remainingQuota: rateLimitResult.remainingQuota
      });
    }

    // 7. Update usage tracking
    await incrementUsage(userId, 'enhancement');

    // 8. Return enhanced prompt
    res.json({
      success: true,
      enhancedPrompt: enhancedPrompt.trim(),
      originalPrompt: prompt,
      enhancementStyle,
      fallback: false,
      remainingQuota: rateLimitResult.remainingQuota
    });

  } catch (error) {
    console.error('Prompt enhancement error:', error);

    // Fallback to local enhancement if API fails
    const fallbackEnhancement = getFallbackEnhancement(prompt, enhancementStyle);
    
    try {
      await incrementUsage(userId, 'enhancement');
    } catch (usageError) {
      console.error('Failed to update usage:', usageError);
    }

    res.json({
      success: true,
      enhancedPrompt: fallbackEnhancement,
      originalPrompt: prompt,
      enhancementStyle,
      fallback: true,
      message: 'Used local enhancement due to API unavailability',
      remainingQuota: 0
    });
  }
}

// Fallback enhancement when API is unavailable or content is inappropriate
function getFallbackEnhancement(prompt: string, style: string): string {
  const enhancements = {
    detailed: ", highly detailed, sharp focus, vibrant colors, perfect lighting, professional quality",
    artistic: ", digital art, beautiful composition, dramatic lighting, masterpiece, artistic style",
    photorealistic: ", photorealistic, professional photography, perfect lighting, ultra-realistic, high resolution",
    cinematic: ", cinematic lighting, dramatic composition, movie scene, professional cinematography"
  };
  
  const enhancement = enhancements[style as keyof typeof enhancements] || enhancements.detailed;
  return prompt + enhancement;
}

export default requireAuth(handler);
