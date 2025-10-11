import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPosts() {
  try {
    const posts = await prisma.creatorPost.findMany({
      select: {
        id: true,
        title: true,
        images: true,
        videoUrl: true,
        createdAt: true,
        author: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log('\n=== Recent Creator Posts (Debug) ===\n');
    console.log(`Found ${posts.length} posts\n`);

    posts.forEach((post, idx) => {
      console.log(`\n[${idx + 1}] ${post.title}`);
      console.log(`Author: ${post.author.name}`);
      console.log(`Created: ${post.createdAt.toISOString()}`);
      console.log(`\nImages (${post.images.length}):`);
      if (post.images.length === 0) {
        console.log('  No images');
      } else {
        post.images.forEach((img, i) => {
          console.log(`  ${i + 1}. ${img}`);
          console.log(`     → Is URL: ${img.startsWith('http')}`);
          console.log(`     → Length: ${img.length} chars`);
        });
      }
      console.log(`\nVideo:`);
      if (post.videoUrl) {
        console.log(`  ${post.videoUrl}`);
        console.log(`  → Is URL: ${post.videoUrl.startsWith('http')}`);
        console.log(`  → Length: ${post.videoUrl.length} chars`);
      } else {
        console.log('  No video');
      }
      console.log('─'.repeat(60));
    });

    console.log('\n=== Debug Complete ===\n');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPosts();

