/**
 * VinciUI Backend Server
 * Simple Express server that handles all your API routes
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
// DB helpers used by routes
const getUserById = async (id) => {
  const { getUserById: dbGetUserById } = await import('./api/utils/database.js');
  return await dbGetUserById(id);
};

const updateUserUsage = async (...args) => {
  const { updateUserUsage: dbUpdateUserUsage } = await import('./api/utils/database.js');
  return await dbUpdateUserUsage(...args);
};

const getUserUsage = async (userId) => {
  const { getUserUsage: dbGetUserUsage } = await import('./api/utils/database.js');
  return await dbGetUserUsage(userId);
};
import { authenticateToken } from './api/middleware/auth.js';
import { rateLimitMiddleware } from './api/middleware/rateLimit.js';
import { contentModerationMiddleware } from './api/middleware/contentModeration.js';

// Load environment variables
// In development, read from .env.local.
// In production, rely on real environment variables (no file needed).
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

// Ensure DB schema is up to date on startup
try {
  const { migrateDatabase } = await import('./api/utils/database.js');
  await migrateDatabase();
} catch (e) {
  console.log('⚠️ Skipping DB migration on startup:', e?.message || e);
}

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: getFrontendOrigin(),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

console.log('🚀 Starting VinciUI Backend Server...');

// Helpers to resolve URLs in any environment
function getApiBaseUrl(req) {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  // Fallback: derive from request (only for development)
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3001';
  return `${protocol}://${host}`;
}

function getFrontendOrigin() {
  const raw = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  // Normalize to absolute URL. If no scheme provided, default to https in prod.
  const hasScheme = /^https?:\/\//i.test(raw);
  if (hasScheme) return raw;
  const scheme = (process.env.NODE_ENV === 'production') ? 'https' : 'http';
  return `${scheme}://${raw}`;
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'VinciUI Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/me (Bearer token = Supabase session)',
      debug: '/api/auth/debug'
    }
  });
});

// Health check with DB connectivity test
app.get('/api/health', async (req, res) => {
  try {
    // Quick DB connectivity check
    let dbStatus = 'unknown';
    try {
      const { getPool } = await import('./api/utils/database.js');
      const pool = getPool();
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch (dbError) {
      dbStatus = 'disconnected';
    }

    res.json({ 
      status: 'ok', 
      message: 'VinciUI Backend is running!',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      port: PORT
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Health check failed',
      error: error.message 
    });
  }
});

// Auth diagnostics (non-sensitive) - helps verify Supabase session
app.get('/api/auth/debug', async (req, res) => {
  try {
    const authHeader = req.headers?.authorization || '';
    const headerToken = authHeader.startsWith('Bearer ') ? 'present' : 'missing';
    let decoded = null;
    let dbUser = null;
    if (headerToken === 'present' && process.env.SUPABASE_JWT_SECRET) {
      try {
        const jwt = await import('jsonwebtoken');
        const raw = authHeader.substring(7);
        decoded = jwt.verify(raw, process.env.SUPABASE_JWT_SECRET);
        const { getOrCreateUserBySupabaseId } = await import('./api/utils/database.js');
        dbUser = await getOrCreateUserBySupabaseId({
          supabaseUserId: decoded.sub,
          email: decoded.email ?? decoded.user_email,
          name: decoded.user_metadata?.full_name,
          picture: decoded.user_metadata?.avatar_url,
        });
      } catch (_) {}
    }
    res.json({
      headerToken,
      decoded: decoded ? { sub: decoded.sub, email: decoded.email } : null,
      dbUser: dbUser ? { id: dbUser.id, email: dbUser.email, tier: dbUser.tier } : null
    });
  } catch (e) {
    res.status(500).json({ error: 'debug_failed' });
  }
});

// Get current user (Supabase JWT in Authorization header)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const usage = await getUserUsage(user.id);
    
    // Map usage to frontend-friendly shape and limits
    const tier = user.tier || 'free';
    const dailyLimits = {
      free: 2,            // lifetime cap enforced separately
      premium: 100,
      tester: 50,
      developer: 1000
    };
    
    res.json({
      user: {
        ...user,
        usage: {
          imagesGenerated: usage?.images_generated ?? 0,
          promptsEnhanced: usage?.prompts_enhanced ?? 0,
          dailyLimit: dailyLimits[tier] ?? 2,
          resetTime: usage?.reset_time ?? new Date(Date.now() + 24*60*60*1000)
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Logout (session is managed by Supabase on the client; backend has no cookie to clear)
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// ==========================================
// IMAGE GENERATION ROUTES
// ==========================================

// Protected image generation (supports multi-image + seed)
app.post('/api/generate/image', 
  authenticateToken, 
  rateLimitMiddleware, 
  contentModerationMiddleware,
  async (req, res) => {
    const {
      prompt,
      images,        // string[] of base64 images
      imageBase64,   // legacy single-image field (backwards compat)
      model = 'gemini-2.5-flash-image-preview',
      seed,
    } = req.body;
    
    try {
      console.log('🎨 Generating image for user:', req.user.email);
      
      const apiKey = process.env.GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const promptParts = [{ text: prompt }];

      // Multi-image support: prefer images[] array, fall back to legacy single image
      const imageList = images && images.length > 0 ? images : (imageBase64 ? [imageBase64] : []);

      // For legacy model that only supports single image, use first image only
      const isLegacy = model === 'gemini-2.0-flash-preview-image-generation';
      const imagesToSend = isLegacy ? imageList.slice(0, 1) : imageList;

      for (const img of imagesToSend) {
        promptParts.push({
          inlineData: { mimeType: "image/png", data: img }
        });
      }

      const generationConfig = {
        temperature: 0.8,
        candidateCount: 1,
        responseModalities: ["TEXT", "IMAGE"],
      };
      if (seed != null) {
        generationConfig.seed = seed;
      }

      const payload = {
        contents: [{ parts: promptParts }],
        generationConfig,
      };

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(`Gemini API error: ${apiResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const result = await apiResponse.json();
      
      let imageData = null;
      if (result.candidates?.[0]?.content?.parts) {
        for (const part of result.candidates[0].content.parts) {
          if (part.inlineData) {
            imageData = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!imageData) {
        throw new Error('No image generated in response');
      }

      await updateUserUsage(req.user.userId, 'image');

      let latestUsage;
      try {
        latestUsage = await getUserUsage(req.user.userId);
      } catch (e) {
        latestUsage = null;
      }
      
      console.log('✅ Image generated successfully');
      res.json({ 
        image: imageData,
        usage: latestUsage ? {
          imagesGenerated: latestUsage.images_generated ?? 0,
          promptsEnhanced: latestUsage.prompts_enhanced ?? 0,
          resetTime: latestUsage.reset_time ?? new Date(Date.now() + 24*60*60*1000)
        } : undefined
      });
      
    } catch (error) {
      console.error('❌ Image generation error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Prompt refinement (auto-refine, Q&A questions, apply answers)
app.post('/api/generate/refine',
  authenticateToken,
  rateLimitMiddleware,
  async (req, res) => {
    const { prompt, mode, referenceImages, answers } = req.body;
    
    try {
      console.log(`✨ Refine (${mode}) for user:`, req.user.email);
      
      const apiKey = process.env.GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      let systemPrompt;

      if (mode === 'auto') {
        systemPrompt = `You are a prompt optimizer for an AI image generator. The user wrote a basic prompt. Improve it by adding specific visual details about composition, lighting, colors, and style while preserving the user's core intent. Keep it under 150 words. Do NOT change what the user wants — only add quality-improving details. Output ONLY the improved prompt, nothing else.

User prompt: "${prompt}"`;
      } else if (mode === 'questions') {
        systemPrompt = `You are helping a user create a better image generation prompt. Given their prompt, generate exactly 3 short clarifying questions to understand what they want. Each question should have 3-5 concise preset answer options. Return ONLY a valid JSON array, no markdown, no explanation:
[{"question": "...", "options": ["...", "...", "..."]}]

User prompt: "${prompt}"`;
      } else if (mode === 'apply') {
        const answersText = (answers || []).map(a => `- ${a.question}: ${a.answer}`).join('\n');
        systemPrompt = `Rewrite this image generation prompt incorporating the user's preferences below. Keep the core subject but enhance with the specified preferences. Output ONLY the rewritten prompt, nothing else. Keep under 200 words.

Original prompt: "${prompt}"
User preferences:
${answersText}`;
      } else {
        return res.status(400).json({ error: 'Invalid refine mode' });
      }

      const parts = [{ text: systemPrompt }];

      if (referenceImages && referenceImages.length > 0) {
        for (const img of referenceImages) {
          parts.push({ inlineData: { mimeType: "image/png", data: img } });
        }
      }

      const payload = {
        contents: [{ parts }],
        generationConfig: {
          temperature: mode === 'questions' ? 0.3 : 0.7,
          candidateCount: 1,
        },
      };

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(`Gemini API error: ${apiResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const result = await apiResponse.json();
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (mode === 'questions') {
        try {
          // Strip markdown code fences if present
          const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          const questions = JSON.parse(cleaned);
          // Initialize empty answers
          const withAnswers = questions.map(q => ({ ...q, answer: '' }));
          res.json({ questions: withAnswers });
        } catch (parseError) {
          console.error('Failed to parse questions JSON:', responseText);
          res.json({
            questions: [
              { question: 'What style do you prefer?', options: ['Photorealistic', 'Digital Art', 'Anime', 'Painterly', 'Minimalist'], answer: '' },
              { question: 'What mood should the image have?', options: ['Calm', 'Dramatic', 'Mysterious', 'Joyful', 'Epic'], answer: '' },
              { question: 'Any specific composition details?', options: ['Close-up', 'Wide shot', 'Bird\'s eye', 'Low angle', 'Centered'], answer: '' },
            ]
          });
        }
      } else {
        await updateUserUsage(req.user.userId, 'enhancement');
        res.json({ refinedPrompt: responseText.trim() });
      }
      
      console.log(`✅ Refine (${mode}) completed successfully`);
      
    } catch (error) {
      console.error('❌ Refine error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Start server
app.listen(PORT, () => {
console.log(`✅ Backend Server running on http://localhost:${PORT}`);
console.log(`🔗 Frontend: ${getFrontendOrigin()}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('🚀 Ready for OAuth and image generation!');
});

export default app;


