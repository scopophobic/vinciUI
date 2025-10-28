import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuthToken } from '../middleware/auth';
import { getUserWithUsage } from '../utils/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyAuthToken(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user with current usage stats
    const userWithUsage = await getUserWithUsage(user.userId);
    
    res.json({
      user: {
        id: userWithUsage.id,
        email: userWithUsage.email,
        name: userWithUsage.name,
        picture: userWithUsage.picture,
        tier: userWithUsage.tier,
        usage: userWithUsage.usage
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
