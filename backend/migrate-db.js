const { execSync } = require('child_process');

console.log('🚀 Starting database migration...');

try {
  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Push schema to database
  console.log('🗄️ Pushing schema to database...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  
  console.log('✅ Database migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
