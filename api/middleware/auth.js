/**
 * Express Authentication Middleware
 * Converts the Next.js auth middleware to work with Express
 */

import jwt from 'jsonwebtoken';

// Fallback getUserById function
const getUserById = async (userId) => {
  try {
    const { getUserById: dbGetUserById } = await import('../utils/database.js');
    return await dbGetUserById(userId);
  } catch (error) {
    console.log('⚠️ Auth middleware - Database getUserById failed:', error.message);
    // Return null - let the JWT token data be used instead
    return null;
  }
};

export const authenticateToken = async (req, res, next) => {
  try {
    // Try to get token from cookie first, then from Authorization header
    let token = req.cookies.auth_token;
    
    console.log('🔍 Auth middleware - Cookie token:', !!token);
    
    if (!token) {
      const authHeader = req.headers.authorization;
      console.log('🔍 Auth middleware - Auth header:', authHeader);
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('🔍 Auth middleware - Extracted token:', !!token);
      }
    }
    
    if (!token) {
      console.log('❌ Auth middleware - No token found');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('🔍 Auth middleware - Verifying token...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Auth middleware - Token verified, userId:', decoded.userId, 'email:', decoded.email);
    
    // Get user from database
    const user = await getUserById(decoded.userId);
    console.log('🔍 Auth middleware - User lookup result:', !!user);
    
    // Use JWT data as fallback if database user not found
    const userInfo = user || {
      id: decoded.userId,
      email: decoded.email,
      tier: 'free' // Default tier for fallback
    };

    // Add user info to request
    req.user = {
      userId: userInfo.id,
      email: userInfo.email,
      tier: userInfo.tier
    };

    console.log('✅ Auth middleware - Success, user:', userInfo.email);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

