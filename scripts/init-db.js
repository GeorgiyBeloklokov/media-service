const { execSync } = require('child_process');

async function initDatabase() {
  console.log('🔄 Initializing database...');
  
  try {
    // Check migration status
    execSync('npx prisma migrate status', { stdio: 'pipe' });
    console.log('✅ Database is already initialized');
  } catch (error) {
    console.log('📦 Database not initialized, creating schema...');
    
    try {
      // Attempt to apply existing migrations
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations applied successfully');
    } catch (migrateError) {
      console.log('🔧 No migrations found, pushing schema directly...');
      
      try {
        // If no migrations, push schema directly
        execSync('npx prisma db push', { stdio: 'inherit' });
        console.log('✅ Database schema created successfully');
      } catch (pushError) {
        console.error('❌ Failed to initialize database:', pushError.message);
        process.exit(1);
      }
    }
  }
  
  // Generate Prisma Client
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma Client generated successfully');
  } catch (generateError) {
    console.error('❌ Failed to generate Prisma Client:', generateError.message);
    process.exit(1);
  }
}

initDatabase();