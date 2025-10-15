const { PrismaClient } = require('@prisma/client');

async function makeCreator() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    // Get the user email from command line
    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: node make-creator.js <email>');
      process.exit(1);
    }

    const user = await prisma.user.update({
      where: { email },
      data: { isCreator: true },
    });

    console.log(`✅ ${user.name} (${user.email}) is now a creator!`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

makeCreator();
