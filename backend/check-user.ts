import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  // Check for user "tmirac"
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'tmirac', mode: 'insensitive' } },
        { username: { contains: 'tmirac', mode: 'insensitive' } },
        { email: { contains: 'tmirac', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      isCreator: true,
    }
  });

  console.log('\n=== Users matching "tmirac" ===');
  console.log('Found:', users.length);
  users.forEach(u => {
    console.log('\nUser:');
    console.log('  ID:', u.id);
    console.log('  Name:', u.name);
    console.log('  Username:', u.username);
    console.log('  Email:', u.email);
    console.log('  Is Creator:', u.isCreator);
  });

  // Check all creators
  const creators = await prisma.user.findMany({
    where: { isCreator: true },
    select: {
      id: true,
      name: true,
      username: true,
    }
  });

  console.log('\n=== All Creators ===');
  console.log('Total creators:', creators.length);
  creators.forEach(c => {
    console.log(`  - ${c.name} (username: ${c.username})`);
  });

  // Check recent posts
  const posts = await prisma.creatorPost.findMany({
    select: {
      id: true,
      title: true,
      images: true,
      videoUrl: true,
      author: {
        select: {
          name: true,
          isCreator: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  console.log('\n=== Recent Posts ===');
  posts.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.title} by ${p.author.name}`);
    console.log('   Images:', p.images.length, 'files');
    console.log('   Video:', p.videoUrl ? 'Yes' : 'No');
    if (p.images.length > 0) {
      console.log('   First image:', p.images[0]);
    }
    if (p.videoUrl) {
      console.log('   Video URL:', p.videoUrl);
    }
  });

  await prisma.$disconnect();
}

checkUser();
