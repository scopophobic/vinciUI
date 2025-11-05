/**
 * Script to promote a user to tester tier
 * Usage: npx tsx scripts/create-tester.ts tester-email@domain.com
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { pool } from '../api/utils/database.js';

async function promoteUserToTester(email: string) {
  console.log('🧪 Promoting user to tester tier...');
  console.log('📧 Email:', email);
  
  try {
    const client = await pool().connect();
    try {
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

      await client.query(
        'UPDATE users SET tier = $1, updated_at = NOW() WHERE email = $2',
        ['tester', email]
      );

      await client.query(
        `UPDATE user_usage 
         SET daily_limit = 50,
             updated_at = NOW()
         WHERE user_id = $1`,
        [user.id]
      );

      console.log('✅ Successfully promoted user to tester tier!');
      console.log('🎯 Tester privileges:');
      console.log('   • 50 image generations per day');
      console.log('   • 100 prompt enhancements per day');
      console.log('   • No moderation bypass');
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

const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide an email address:');
  console.log('   npx tsx scripts/create-tester.ts tester-email@domain.com');
  process.exit(1);
}

if (!email.includes('@')) {
  console.log('❌ Please provide a valid email address');
  process.exit(1);
}

promoteUserToTester(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
