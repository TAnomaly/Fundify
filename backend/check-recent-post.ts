import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPost() {
  const posts = await prisma.creatorPost.findMany({
    select: {
      id: true,
      title: true,
      images: true,
      videoUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  console.log('\n=== Most Recent Posts ===\n');
  posts.forEach((post, i) => {
    console.log(`${i + 1}. ${post.title}`);
    console.log(`   Created: ${post.createdAt.toISOString()}`);
    console.log(`   Images: ${JSON.stringify(post.images)}`);
    console.log(`   Video: ${post.videoUrl || 'none'}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkPost();
