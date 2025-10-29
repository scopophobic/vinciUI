import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { checkRateLimit, shouldBypassModeration } from '../middleware/rateLimit';
import { moderateContent, aiModeration } from '../middleware/contentModeration';
import { incrementUsage, logGeneration, getUserById } from '../utils/database';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, imageBase64, model } = req.body;
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
    const rateLimitResult = await checkRateLimit(userId, 'image');
    if (!rateLimitResult.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        message: rateLimitResult.message,
        resetTime: rateLimitResult.resetTime,
        remainingQuota: rateLimitResult.remainingQuota
      });
    }

    // 3. Content moderation (skip for developer accounts)
    const user = await getUserById(userId);
    const bypassModeration = user && shouldBypassModeration(user.tier);
    
    if (!bypassModeration) {
      const basicModeration = await moderateContent(prompt, userId, 'prompt');
      if (!basicModeration.allowed) {
        await logGeneration(userId, prompt, model || 'unknown', 'blocked', { 
          moderation: basicModeration 
        });
        
        return res.status(400).json({ 
          error: 'Content blocked', 
          message: basicModeration.message,
          flags: basicModeration.flags
        });
      }

      // 4. Enhanced AI moderation for additional safety
      try {
        const aiModerationResult = await aiModeration(prompt);
        if (!aiModerationResult.allowed) {
          await logGeneration(userId, prompt, model || 'unknown', 'blocked', { 
            aiModeration: aiModerationResult 
          });
          
          return res.status(400).json({ 
            error: 'Content blocked by AI moderation', 
            message: aiModerationResult.message
          });
        }
      } catch (aiError) {
        console.warn('AI moderation failed, proceeding with basic moderation:', aiError);
      }
    } else {
      console.log('Bypassing content moderation for developer account');
    }

    // 5. Validate model selection
    const allowedModels = [
      'gemini-2.5-flash-image-preview',
      'gemini-2.0-flash-preview-image-generation'
    ];
    
    const selectedModel = allowedModels.includes(model) 
      ? model 
      : 'gemini-2.5-flash-image-preview';

    // 6. Log generation attempt
    await logGeneration(userId, prompt, selectedModel, 'pending');

    // 7. Generate image with Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    
    // Prepare prompt parts
    const promptParts: any[] = [{ text: prompt }];
    
    // Add image if provided (for image-to-image generation)
    if (imageBase64) {
      promptParts.push({
        inlineData: {
          mimeType: "image/png",
          data: imageBase64
        }
      });
    }

    const payload = {
      contents: [{
        parts: promptParts
      }],
      generationConfig: {
        temperature: 0.8,
        candidateCount: 1,
        responseModalities: ["TEXT", "IMAGE"]
      }
    };

    console.log(`Generating image for user ${userId} with model ${selectedModel}`);
    
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      
      // Handle specific error cases
      if (geminiResponse.status === 429) {
        const errorData = JSON.parse(errorText);
        const retryDelay = errorData.error?.details?.find((d: any) => 
          d['@type']?.includes('RetryInfo')
        )?.retryDelay;
        
        await logGeneration(userId, prompt, selectedModel, 'failed', { 
          error: 'quota_exceeded', 
          retryDelay 
        });
        
        return res.status(429).json({
          error: 'API quota exceeded',
          message: retryDelay 
            ? `Please wait ${retryDelay} and try again, or upgrade your plan.`
            : 'Please wait a few minutes and try again, or upgrade your plan.',
          retryDelay
        });
      }
      
      await logGeneration(userId, prompt, selectedModel, 'failed', { 
        error: errorText 
      });
      
      throw new Error(`Gemini API failed: ${geminiResponse.status} - ${errorText}`);
    }

    const result = await geminiResponse.json();
    
    // Extract generated image
    let generatedImage = null;
    const candidates = result.candidates || [];
    
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          generatedImage = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      if (generatedImage) break;
    }

    if (!generatedImage) {
      await logGeneration(userId, prompt, selectedModel, 'failed', { 
        error: 'no_image_generated' 
      });
      throw new Error('No image was generated by the API');
    }

    // 8. Update usage tracking
    await incrementUsage(userId, 'image');
    
    // 9. Log successful generation
    await logGeneration(userId, prompt, selectedModel, 'success');

    // 10. Return success response
    res.json({
      success: true,
      image: generatedImage,
      model: selectedModel,
      remainingQuota: rateLimitResult.remainingQuota
    });

  } catch (error) {
    console.error('Image generation error:', error);
    
    // Log failed generation
    try {
      await logGeneration(userId, prompt, model || 'unknown', 'failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    } catch (logError) {
      console.error('Failed to log generation error:', logError);
    }

    res.status(500).json({ 
      error: 'Image generation failed', 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

export default requireAuth(handler);
