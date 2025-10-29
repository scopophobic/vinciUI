import { initializeDatabase } from '../api/utils/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    console.log('🚀 Initializing database...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is required');
      process.exit(1);
    }
    
    await initializeDatabase();
    console.log('✅ Database initialized successfully!');
    
    console.log('\n📋 Database tables created:');
    console.log('  - users (Google OAuth user data)');
    console.log('  - user_usage (daily usage tracking)');
    console.log('  - generations (generation history)');
    console.log('  - moderation_logs (content moderation logs)');
    
    console.log('\n🎯 Next steps:');
    console.log('  1. Set up Google OAuth credentials');
    console.log('  2. Configure environment variables');
    console.log('  3. Deploy to Vercel or AWS');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
