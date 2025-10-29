import { getPool } from '../api/utils/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createDeveloperAccount() {
  try {
    console.log('🔧 Setting up developer account...');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is required');
      process.exit(1);
    }
    
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      // Prompt for developer email
      const developerEmail = process.argv[2];
      
      if (!developerEmail) {
        console.log('\n📧 Usage: npx tsx scripts/create-developer.ts <email>');
        console.log('Example: npx tsx scripts/create-developer.ts developer@vinciui.com');
        console.log('\nThis will promote the user with the given email to developer tier.');
        console.log('The user must have logged in at least once via Google OAuth first.');
        process.exit(1);
      }
      
      console.log(`\n🔍 Looking for user with email: ${developerEmail}`);
      
      // Check if user exists
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [developerEmail]
      );
      
      if (userResult.rows.length === 0) {
        console.log('❌ User not found!');
        console.log('\n💡 The user must sign in via Google OAuth at least once before being promoted.');
        console.log('Steps:');
        console.log('1. Have the user visit your app and sign in with Google');
        console.log('2. Then run this script again with their email');
        process.exit(1);
      }
      
      const user = userResult.rows[0];
      console.log(`✅ Found user: ${user.name} (${user.email})`);
      console.log(`Current tier: ${user.tier}`);
      
      if (user.tier === 'developer') {
        console.log('✅ User is already a developer!');
        process.exit(0);
      }
      
      // Promote to developer
      await client.query(
        'UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2',
        ['developer', user.id]
      );
      
      console.log('\n🎉 Successfully promoted user to developer tier!');
      console.log('\n🔧 Developer privileges granted:');
      console.log('  ✓ 1000 daily image generations');
      console.log('  ✓ 1000 daily prompt enhancements');
      console.log('  ✓ No cooldown periods');
      console.log('  ✓ Content moderation bypass');
      console.log('  ✓ Extended prompt length (2000 characters)');
      console.log('  ✓ Full API access for testing');
      
      console.log('\n🚀 The user can now test all features without restrictions!');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Failed to create developer account:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createDeveloperAccount();
