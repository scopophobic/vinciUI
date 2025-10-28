import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';
import { getUserById } from '../utils/database';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  tier: 'free' | 'premium';
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: AuthenticatedUser;
}

// Verify JWT token from cookie or Authorization header
export async function verifyAuthToken(req: NextApiRequest): Promise<AuthenticatedUser | null> {
  try {
    let token: string | undefined;

    // Try to get token from cookie first
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      token = cookies['auth-token'];
    }

    // Fallback to Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (!decoded.userId) {
      return null;
    }

    // Verify user still exists in database
    const user = await getUserById(decoded.userId);
    if (!user) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      tier: decoded.tier || user.tier
    };

  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Middleware function to protect API routes
export function requireAuth(handler: (req: AuthenticatedRequest, res: any) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: any) => {
    const user = await verifyAuthToken(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = user;
    return handler(req, res);
  };
}
