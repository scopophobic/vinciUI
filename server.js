/**
 * VinciUI Backend Server
 * Simple Express server that handles all your API routes
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
// Strict DB-backed functions (no fallbacks)
const createUser = async (userData) => {
  const { createUser: dbCreateUser } = await import('./api/utils/database.js');
  return await dbCreateUser(userData);
};

const getUserByEmail = async (email) => {
  const { getUserByEmail: dbGetUserByEmail } = await import('./api/utils/database.js');
  return await dbGetUserByEmail(email);
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
dotenv.config({ path: '.env.local' });

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
      auth: '/api/auth/google',
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

// Auth diagnostics (non-sensitive) - helps verify session quickly
app.get('/api/auth/debug', async (req, res) => {
  try {
    const cookieToken = req.cookies?.auth_token ? 'present' : 'missing';
    const authHeader = req.headers?.authorization || '';
    const headerToken = authHeader.startsWith('Bearer ') ? 'present' : 'missing';

    let decoded = null;
    try {
      const raw = req.cookies?.auth_token || (authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined);
      if (raw) {
        decoded = jwt.verify(raw, process.env.JWT_SECRET);
      }
    } catch {}

    let dbUser = null;
    if (decoded?.email) {
      try {
        dbUser = await getUserByEmail(decoded.email);
      } catch {}
    }

    res.json({
      cookieToken,
      headerToken,
      decoded: decoded ? { userId: decoded.userId, email: decoded.email } : null,
      dbUser: dbUser ? { id: dbUser.id, email: dbUser.email, tier: dbUser.tier } : null
    });
  } catch (e) {
    res.status(500).json({ error: 'debug_failed' });
  }
});

// ==========================================
// AUTH ROUTES
// ==========================================

// Google OAuth initiation
app.get('/api/auth/google', (req, res) => {
  // Check if OAuth credentials are configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('❌ OAuth not configured');
    return res.status(500).json({ error: 'OAuth not configured' });
  }

  const redirectUri = `${getApiBaseUrl(req)}/api/auth/callback`;
  console.log('🔐 OAuth redirect URI:', redirectUri);
  console.log('🔐 API_BASE_URL env:', process.env.API_BASE_URL || 'NOT SET');

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  })}`;
  
  console.log('🔐 Redirecting to Google OAuth...');
  res.redirect(googleAuthUrl);
});

// Google OAuth callback
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    const frontend = getFrontendOrigin();
    return res.redirect(`${frontend}?error=no_code`);
  }

  // No development bypass; require real OAuth

  try {
    console.log('🔄 Processing OAuth callback...');
    
    const redirectUri = `${getApiBaseUrl(req)}/api/auth/callback`;
    console.log('🔐 OAuth callback redirect URI:', redirectUri);
    console.log('🔐 API_BASE_URL env:', process.env.API_BASE_URL || 'NOT SET');
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      console.error('❌ Token exchange failed:', tokens);
      if (tokens.error === 'redirect_uri_mismatch') {
        console.error('❌ REDIRECT URI MISMATCH!');
        console.error('   Expected by Google:', tokens.error_description);
        console.error('   Sent by us:', redirectUri);
        console.error('   API_BASE_URL:', process.env.API_BASE_URL || 'NOT SET');
      }
      throw new Error(`Token exchange failed: ${tokens.error || 'Unknown error'}`);
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    
    const googleUser = await userResponse.json();
    
    // Create or update user in database
    const user = await createUser({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture
    });

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set secure cookie
    const isProd = (process.env.NODE_ENV === 'production');
    res.cookie('auth_token', jwtToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      domain: isProd ? '.scopophobic.xyz' : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    console.log('✅ User authenticated:', user.email);
    console.log('🔗 Redirecting with token to frontend...');
    // Redirect to frontend (in dev include token to ease testing)
    const frontend = getFrontendOrigin();
    if (process.env.NODE_ENV === 'production') {
      res.redirect(`${frontend}?auth_success=true`);
    } else {
      res.redirect(`${frontend}?auth_success=true&token=${encodeURIComponent(jwtToken)}`);
    }
    
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    const frontend = getFrontendOrigin();
    res.redirect(`${frontend}?error=auth_failed`);
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 /api/auth/me called for user:', req.user.email);
    const user = await getUserByEmail(req.user.email);
    if (!user) {
      console.log('❌ User not found by email');
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

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// ==========================================
// IMAGE GENERATION ROUTES
// ==========================================

// Protected image generation
app.post('/api/generate/image', 
  authenticateToken, 
  rateLimitMiddleware, 
  contentModerationMiddleware,
  async (req, res) => {
    const { prompt, imageBase64, model = 'gemini-2.5-flash-image-preview' } = req.body;
    
    try {
      console.log('🎨 Generating image for user:', req.user.email);
      
      // Call Gemini API
      const apiKey = process.env.GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const promptParts = [{ text: prompt }];
      
      if (imageBase64) {
        promptParts.push({
          inlineData: {
            mimeType: "image/png",
            data: imageBase64
          }
        });
      }

      const payload = {
        contents: [{ parts: promptParts }],
        generationConfig: {
          temperature: 0.8,
          candidateCount: 1,
          responseModalities: ["TEXT", "IMAGE"]
        }
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
      
      // Extract image from response
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

      // Update user usage
      await updateUserUsage(req.user.userId, 'image');

      // Fetch latest usage to return with response so UI can update immediately
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

// Protected prompt enhancement
app.post('/api/generate/enhance',
  authenticateToken,
  rateLimitMiddleware,
  contentModerationMiddleware,
  async (req, res) => {
    const { prompt, referenceImage } = req.body;
    
    try {
      console.log('✨ Enhancing prompt for user:', req.user.email);
      
      const apiKey = process.env.GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      let enhancementPrompt = `Enhance this image generation prompt to be more detailed, creative, and likely to produce a high-quality result. Keep it under 200 words and focus on visual details, style, composition, and atmosphere.

Original prompt: "${prompt}"

Enhanced prompt:`;

      const promptParts = [{ text: enhancementPrompt }];
      
      if (referenceImage) {
        promptParts.push({
          inlineData: {
            mimeType: "image/png",
            data: referenceImage
          }
        });
        promptParts[0].text += "\n\nAlso consider the reference image provided for style and composition inspiration.";
      }

      const payload = {
        contents: [{ parts: promptParts }],
        generationConfig: {
          temperature: 0.7,
          candidateCount: 1
        }
      };

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(`Gemini API error: ${apiResponse.status}`);
      }

      const result = await apiResponse.json();
      const enhancedPrompt = result.candidates?.[0]?.content?.parts?.[0]?.text || prompt;
      
      // Update user usage
      await updateUserUsage(req.user.userId, 'enhancement');
      
      console.log('✅ Prompt enhanced successfully');
      res.json({ enhancedPrompt: enhancedPrompt.trim() });
      
    } catch (error) {
      console.error('❌ Prompt enhancement error:', error);
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


