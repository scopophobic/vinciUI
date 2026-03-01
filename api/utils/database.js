/**
 * Database utility functions for VinciUI
 * Converted to JavaScript for Express server compatibility
 */

import { Pool } from 'pg';

// Create pool with lazy initialization
let pool;

function getPool() {
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

// Initialize database tables
export async function initializeDatabase() {
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
        tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'tester', 'developer')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create user_usage table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        images_generated INTEGER DEFAULT 0,
        prompts_enhanced INTEGER DEFAULT 0,
        daily_limit INTEGER DEFAULT 2,
        reset_time TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day'),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    // Create moderation_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS moderation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        action VARCHAR(50) NOT NULL CHECK (action IN ('blocked', 'flagged', 'approved')),
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ensure existing databases have required columns added over time
export async function migrateDatabase() {
  const client = await getPool().connect();
  try {
    // Add columns to user_usage if they don't exist
    await client.query(`
      ALTER TABLE IF EXISTS user_usage
      ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 2,
      ADD COLUMN IF NOT EXISTS reset_time TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day'),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);

    // Backfill any NULL dates to today to satisfy NOT NULL expectations
    await client.query(`
      UPDATE user_usage SET date = CURRENT_DATE WHERE date IS NULL;
    `);

    // Ensure a unique index exists for (user_id, date) to support upserts
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_usage_user_date_idx
      ON user_usage (user_id, date);
    `);

    // Ensure users.tier includes new values (can't alter CHECK easily across engines; skip if unavailable)
    // Safe no-op for most setups.
    try {
      await client.query(`
        ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'free';
      `);
    } catch {}

    console.log('✅ Database migration check completed');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    // Do not throw to avoid crashing server; rate limit will still protect
  } finally {
    client.release();
  }
}

// Create or update user
export async function createUser(userData) {
  const client = await getPool().connect();
  
  try {
    // Check if user exists
    const existingUser = await client.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [userData.googleId, userData.email]
    );

    let user;
    if (existingUser.rows.length > 0) {
      // Update existing user
      const updateResult = await client.query(`
        UPDATE users 
        SET name = $1, picture = $2, updated_at = NOW()
        WHERE google_id = $3 OR email = $4
        RETURNING *
      `, [userData.name, userData.picture, userData.googleId, userData.email]);
      
      user = updateResult.rows[0];
    } else {
      // Create new user
      const insertResult = await client.query(`
        INSERT INTO users (google_id, email, name, picture, tier)
        VALUES ($1, $2, $3, $4, 'free')
        RETURNING *
      `, [userData.googleId, userData.email, userData.name, userData.picture]);
      
      user = insertResult.rows[0];

      // Create initial usage record
      await client.query(`
        INSERT INTO user_usage (user_id, daily_limit)
        VALUES ($1, $2)
      `, [user.id, 2]); // Free tier gets 2 generations per day
    }

    return user;
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get user by ID
export async function getUserById(userId) {
  const client = await getPool().connect();
  
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get user by ID error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get user by email
export async function getUserByEmail(email) {
  const client = await getPool().connect();
  
  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get user by email error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get user usage
export async function getUserUsage(userId) {
  const client = await getPool().connect();
  
  try {
    // Return aggregate totals across all time (for free tier lifetime cap)
    const totals = await client.query(`
      SELECT 
        COALESCE(SUM(images_generated), 0) AS images_generated,
        COALESCE(SUM(prompts_enhanced), 0) AS prompts_enhanced,
        MAX(reset_time) AS reset_time
      FROM user_usage
      WHERE user_id = $1
    `, [userId]);

    // Also ensure there's a row for today (initialize if missing)
    const today = new Date().toISOString().split('T')[0];
    await client.query(`
      INSERT INTO user_usage (user_id, date, images_generated, prompts_enhanced)
      VALUES ($1, $2, 0, 0)
      ON CONFLICT (user_id, date)
      DO NOTHING
    `, [userId, today]);
    
    return totals.rows[0];
  } catch (error) {
    console.error('Get user usage error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Update user usage
export async function updateUserUsage(userId, type) {
  const client = await getPool().connect();
  
  try {
    const today = new Date().toISOString().split('T')[0];

    // Ensure today's row exists, then increment the proper counter
    await client.query(`
      INSERT INTO user_usage (user_id, date, images_generated, prompts_enhanced)
      VALUES ($1, $2, 0, 0)
      ON CONFLICT (user_id, date)
      DO NOTHING
    `, [userId, today]);

    if (type === 'image') {
      await client.query(`
        UPDATE user_usage
        SET images_generated = images_generated + 1, updated_at = NOW()
        WHERE user_id = $1 AND date = $2
      `, [userId, today]);
    } else if (type === 'enhancement') {
      await client.query(`
        UPDATE user_usage
        SET prompts_enhanced = prompts_enhanced + 1, updated_at = NOW()
        WHERE user_id = $1 AND date = $2
      `, [userId, today]);
    }
    
    return true;
  } catch (error) {
    console.error('Update user usage error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Log moderation action
export async function logModerationAction(userId, prompt, action, reason = null) {
  const client = await getPool().connect();
  
  try {
    await client.query(`
      INSERT INTO moderation_logs (user_id, prompt, action, reason)
      VALUES ($1, $2, $3, $4)
    `, [userId, prompt, action, reason]);
    
    return true;
  } catch (error) {
    console.error('Log moderation error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { getPool as pool };

