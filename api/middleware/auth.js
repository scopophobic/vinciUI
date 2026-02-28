/**
 * Express Authentication Middleware
 * Verifies Supabase JWT and syncs user to our DB (tier/usage).
 */

import jwt from 'jsonwebtoken';
import { getOrCreateUserBySupabaseId } from '../utils/database.js';

export const authenticateToken = async (req, res, next) => {
  try {
    let token = req.cookies?.auth_token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      console.error('SUPABASE_JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server auth misconfiguration' });
    }

    const decoded = jwt.verify(token, secret);
    const supabaseUserId = decoded.sub;
    const email = decoded.email ?? decoded.user_email ?? '';
    const name = decoded.user_metadata?.full_name ?? decoded.user_metadata?.name ?? email || 'User';
    const picture = decoded.user_metadata?.avatar_url ?? decoded.user_metadata?.picture ?? '';

    const user = await getOrCreateUserBySupabaseId({
      supabaseUserId,
      email,
      name,
      picture,
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      tier: user.tier,
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
