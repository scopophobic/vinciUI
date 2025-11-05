import { Pool } from 'pg';

// Create pool with lazy initialization
let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Parse DATABASE_URL manually to avoid connection string issues
    const dbUrl = new URL(databaseUrl);
    
    pool = new Pool({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 5432,
      database: dbUrl.pathname.slice(1), // Remove leading slash
      user: dbUrl.username,
      password: dbUrl.password,
      ssl: { rejectUnauthorized: false, require: true }, // Force SSL but ignore cert validation
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  
  return pool;
}

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture: string;
  tier: 'free' | 'premium' | 'tester' | 'developer';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserUsage {
  imagesGenerated: number;
  promptsEnhanced: number;
  dailyLimit: number;
  resetTime: Date;
}

export interface UserWithUsage extends User {
  usage: UserUsage;
}

// Create or update user from Google OAuth
export async function createOrUpdateUser(googleUser: {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}): Promise<User> {
  const client = await getPool().connect();
  
  try {
    // Check if user exists
    const existingUser = await client.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleUser.googleId]
    );

    if (existingUser.rows.length > 0) {
      // Update existing user
      const result = await client.query(`
        UPDATE users 
        SET name = $1, picture = $2, updated_at = NOW()
        WHERE google_id = $3
        RETURNING *
      `, [googleUser.name, googleUser.picture, googleUser.googleId]);
      
      return result.rows[0];
    } else {
      // Create new user
      const result = await client.query(`
        INSERT INTO users (google_id, email, name, picture, tier)
        VALUES ($1, $2, $3, $4, 'free')
        RETURNING *
      `, [googleUser.googleId, googleUser.email, googleUser.name, googleUser.picture]);
      
      return result.rows[0];
    }
  } finally {
    client.release();
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const client = await getPool().connect();
  
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

// Get user by Google ID
export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const client = await getPool().connect();
  
  try {
    const result = await client.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

// Get user with current usage stats
export async function getUserWithUsage(userId: string): Promise<UserWithUsage> {
  const client = await getPool().connect();
  
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const today = new Date().toISOString().split('T')[0];
    
    const usageResult = await client.query(`
      SELECT * FROM user_usage 
      WHERE user_id = $1 AND date = $2
    `, [userId, today]);

    const usage = usageResult.rows[0] || {
      images_generated: 0,
      prompts_enhanced: 0
    };

    const dailyLimits = {
      free: { images: 2, enhancements: 5 },
      premium: { images: 100, enhancements: 200 },
      tester: { images: 50, enhancements: 100 },
      developer: { images: 1000, enhancements: 1000 }
    } as const;

    const limits = dailyLimits[user.tier];

    return {
      ...user,
      usage: {
        imagesGenerated: usage.images_generated,
        promptsEnhanced: usage.prompts_enhanced,
        dailyLimit: limits.images,
        resetTime: new Date(new Date().setHours(24, 0, 0, 0)) // Next midnight
      }
    };
  } finally {
    client.release();
  }
}

// Increment usage counter
export async function incrementUsage(userId: string, type: 'image' | 'enhancement'): Promise<void> {
  const client = await getPool().connect();
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const column = type === 'image' ? 'images_generated' : 'prompts_enhanced';
    
    await client.query(`
      INSERT INTO user_usage (user_id, date, ${column})
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET ${column} = user_usage.${column} + 1
    `, [userId, today]);
  } finally {
    client.release();
  }
}

// Get user's last generation time (for cooldown)
export async function getLastGeneration(userId: string): Promise<Date | null> {
  const client = await getPool().connect();
  
  try {
    const result = await client.query(`
      SELECT created_at FROM generations 
      WHERE user_id = $1 AND status = 'success'
      ORDER BY created_at DESC 
      LIMIT 1
    `, [userId]);
    
    return result.rows[0]?.created_at || null;
  } finally {
    client.release();
  }
}

// Log generation attempt
export async function logGeneration(
  userId: string, 
  prompt: string, 
  model: string, 
  status: 'pending' | 'success' | 'failed' | 'blocked',
  moderationFlags: any = {}
): Promise<void> {
  const client = await getPool().connect();
  
  try {
    await client.query(`
      INSERT INTO generations (user_id, prompt, model_used, status, moderation_flags)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, prompt, model, status, JSON.stringify(moderationFlags)]);
  } finally {
    client.release();
  }
}

// Log moderation attempt
export async function logModeration(
  userId: string,
  content: string,
  contentType: 'prompt' | 'image',
  flags: string[],
  action: 'allowed' | 'blocked' | 'flagged'
): Promise<void> {
  const client = await getPool().connect();
  
  try {
    await client.query(`
      INSERT INTO moderation_logs (user_id, content, content_type, flags, action)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, content, contentType, JSON.stringify(flags), action]);
  } finally {
    client.release();
  }
}

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  const client = await getPool().connect();
  
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture TEXT,
        tier VARCHAR(20) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create user_usage table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        images_generated INTEGER DEFAULT 0,
        prompts_enhanced INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      )
    `);

    // Create generations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS generations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        model_used VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        moderation_flags JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create moderation_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS moderation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        content TEXT NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        flags JSONB NOT NULL,
        action VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Database tables initialized successfully');
  } finally {
    client.release();
  }
}

export { getPool as pool };
