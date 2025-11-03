/**
 * VinciUI Backend Server
 * Simple Express server that handles all your API routes
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
// Fallback in-memory storage for when database is unavailable
const tempUsers = new Map();

// Database functions with fallback
const createUser = async (userData) => {
  try {
    const { createUser: dbCreateUser } = await import('./api/utils/database.js');
    return await dbCreateUser(userData);
  } catch (error) {
    console.log('⚠️ Database createUser failed, using fallback:', error.message);
    // Fallback: in-memory storage - preserve original Google data
    const user = { 
      id: Date.now(), 
      tier: 'free', 
      ...userData // This preserves the original Google email, name, picture
    };
    tempUsers.set(userData.email, user);
    console.log('✅ Created temp user with original Google data:', user.email);
    return user;
  }
};

const getUserByEmail = async (email) => {
  try {
    const { getUserByEmail: dbGetUserByEmail } = await import('./api/utils/database.js');
    return await dbGetUserByEmail(email);
  } catch (error) {
    console.log('⚠️ Database getUserByEmail failed, using fallback:', error.message);
    // Fallback: in-memory storage
    const user = tempUsers.get(email);
    console.log('🔍 Getting temp user by email:', email, 'found:', !!user);
    return user;
  }
};

const updateUserUsage = async (...args) => {
  try {
    const { updateUserUsage: dbUpdateUserUsage } = await import('./api/utils/database.js');
    return await dbUpdateUserUsage(...args);
  } catch (error) {
    console.log('⚠️ Database updateUserUsage failed:', error.message);
  }
};

const getUserUsage = async (userId) => {
  try {
    const { getUserUsage: dbGetUserUsage } = await import('./api/utils/database.js');
    return await dbGetUserUsage(userId);
  } catch (error) {
    console.log('⚠️ Database getUserUsage failed, using fallback:', error.message);
    // Fallback: default usage
    return {
      dailyGenerations: 0,
      monthlyGenerations: 0,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }
};
import { authenticateToken } from './api/middleware/auth.js';
import { rateLimitMiddleware } from './api/middleware/rateLimit.js';
import { contentModerationMiddleware } from './api/middleware/contentModeration.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Your Vite frontend
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

console.log('🚀 Starting VinciUI Backend Server...');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VinciUI Backend is running!' });
});

// ==========================================
// AUTH ROUTES
// ==========================================

// Google OAuth initiation
app.get('/api/auth/google', (req, res) => {
  // Check if OAuth credentials are configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('⚠️ OAuth not configured, using development mode');
    // Redirect to development callback
    return res.redirect('http://localhost:3001/api/auth/callback?code=dev_mode');
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `http://localhost:3001/api/auth/callback`,
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
    return res.redirect('http://localhost:5173?error=no_code');
  }

  // Development mode bypass
  if (code === 'dev_mode') {
    console.log('🔧 Development mode: Creating mock user...');
    
    try {
      // Create a mock user for development
      const user = await createUser({
        googleId: 'dev_123456',
        email: 'developer@vinciui.dev',
        name: 'Development User',
        picture: 'https://via.placeholder.com/40x40/000000/FFFFFF?text=DEV'
      });

      // Generate JWT
      const jwtToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set secure cookie
      res.cookie('auth_token', jwtToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      console.log('✅ Development user authenticated:', user.email);
      return res.redirect('http://localhost:5173');
      
    } catch (error) {
      console.error('❌ Development auth error:', error);
      return res.redirect('http://localhost:5173?error=dev_auth_failed');
    }
  }

  try {
    console.log('🔄 Processing OAuth callback...');
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `http://localhost:3001/api/auth/callback`
      })
    });

    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      throw new Error('No access token received');
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
    res.cookie('auth_token', jwtToken, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/' // Ensure cookie is available for all paths
    });

    console.log('✅ User authenticated:', user.email);
    console.log('🔗 Redirecting with token to frontend...');
    // Redirect with token in URL for development (frontend will handle it)
    res.redirect(`http://localhost:5173?auth_success=true&token=${encodeURIComponent(jwtToken)}`);
    
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    res.redirect('http://localhost:5173?error=auth_failed');
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 /api/auth/me called for user:', req.user.email);
    let user = await getUserByEmail(req.user.email);
    
    // If user not found by email, create a fallback user object
    if (!user) {
      console.log('⚠️ User not found by email, using fallback data');
      user = {
        id: req.user.userId,
        email: req.user.email,
        tier: req.user.tier || 'free',
        name: 'Fallback User'
      };
    }
    
    const usage = await getUserUsage(user.id);
    
    res.json({
      user: {
        ...user,
        usage
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
      
      console.log('✅ Image generated successfully');
      res.json({ image: imageData });
      
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
  console.log(`🔗 Frontend: http://localhost:5173`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('🚀 Ready for OAuth and image generation!');
});

export default app;
