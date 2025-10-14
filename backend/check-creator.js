const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCreator() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isCreator: true,
    },
    take: 5,
  });
  
  console.log('Users in database:');
  users.forEach(user => {
    console.log(`- ${user.name} (${user.email}): isCreator=${user.isCreator}`);
  });
  
  await prisma.$disconnect();
}

checkCreator();
