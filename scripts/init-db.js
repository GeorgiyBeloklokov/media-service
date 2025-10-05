const { execSync } = require('child_process');

async function initDatabase() {
  console.log('🔄 Initializing database...');
  
  try {
    // Проверяем статус миграций
    execSync('npx prisma migrate status', { stdio: 'pipe' });
    console.log('✅ Database is already initialized');
  } catch (error) {
    console.log('📦 Database not initialized, creating schema...');
    
    try {
      // Пытаемся применить существующие миграции
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations applied successfully');
    } catch (migrateError) {
      console.log('🔧 No migrations found, pushing schema directly...');
      
      try {
        // Если миграций нет, пушим схему напрямую
        execSync('npx prisma db push', { stdio: 'inherit' });
        console.log('✅ Database schema created successfully');
      } catch (pushError) {
        console.error('❌ Failed to initialize database:', pushError.message);
        process.exit(1);
      }
    }
  }
  
  // Генерируем Prisma Client
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma Client generated successfully');
  } catch (generateError) {
    console.error('❌ Failed to generate Prisma Client:', generateError.message);
    process.exit(1);
  }
}

initDatabase();