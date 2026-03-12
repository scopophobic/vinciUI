/**
 * Script to promote a user to developer tier
 * Run this after you've signed in once to give yourself developer privileges
 * 
 * Usage: npx tsx scripts/create-developer.ts your-email@gmail.com
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { pool } from '../api/utils/database.js';

async function promoteUserToDeveloper(email: string) {
  console.log('🔧 Promoting user to developer tier...');
  console.log('📧 Email:', email);
  
  try {
    // Connect to database
    const client = await pool().connect();
    
    try {
      // Check if user exists
      const userResult = await client.query(
        'SELECT id, email, tier FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        console.log('❌ User not found. Please sign in to the app first to create your account.');
        return;
      }
      
      const user = userResult.rows[0];
      console.log('👤 Found user:', user.email, '(Current tier:', user.tier + ')');
      
      // Update user to developer tier
      await client.query(
        'UPDATE users SET tier = $1, updated_at = NOW() WHERE email = $2',
        ['developer', email]
      );
      
      // Update usage limits for developer tier
      await client.query(`
        UPDATE user_usage 
        SET daily_limit = 1000, 
            updated_at = NOW() 
        WHERE user_id = $1
      `, [user.id]);
      
      console.log('✅ Successfully promoted user to developer tier!');
      console.log('🚀 New privileges:');
      console.log('   • 1000 image generations per day');
      console.log('   • 1000 prompt enhancements per day');
      console.log('   • Bypass content moderation');
      console.log('   • Priority API access');
      console.log('');  
      console.log('🔄 Please refresh your browser to see the changes.');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error promoting user:', error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide an email address:');
  console.log('   npx tsx scripts/create-developer.ts your-email@gmail.com');
  process.exit(1);
}

if (!email.includes('@')) {
  console.log('❌ Please provide a valid email address');
  process.exit(1);
}

promoteUserToDeveloper(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
