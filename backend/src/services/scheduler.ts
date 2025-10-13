import prisma from '../utils/prisma';
import cron from 'node-cron';

/**
 * Scheduler Service
 * Handles auto-publishing of scheduled articles and events
 */

// Auto-publish scheduled articles
export const publishScheduledArticles = async (): Promise<void> => {
  try {
    const now = new Date();

    // Find articles that are scheduled and past their scheduled time
    const articlesToPublish = await prisma.article.findMany({
      where: {
        status: 'DRAFT',
        scheduledFor: {
          lte: now, // Less than or equal to now
        },
      },
    });

    if (articlesToPublish.length > 0) {
      console.log(`📅 Publishing ${articlesToPublish.length} scheduled article(s)...`);

      for (const article of articlesToPublish) {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: now,
            scheduledFor: null, // Clear the schedule
          },
        });

        console.log(`✅ Published article: ${article.title}`);
      }
    }
  } catch (error) {
    console.error('❌ Error publishing scheduled articles:', error);
  }
};

// Auto-publish scheduled events
export const publishScheduledEvents = async (): Promise<void> => {
  try {
    const now = new Date();

    // Find events that should be published
    const eventsToPublish = await prisma.event.findMany({
      where: {
        status: 'DRAFT',
        startTime: {
          gte: now, // Only publish if event hasn't started yet
        },
      },
      // You could add a scheduledFor field to Event model if needed
    });

    // Auto-complete past events
    const eventsToComplete = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        endTime: {
          lte: now, // Event has ended
        },
      },
    });

    if (eventsToComplete.length > 0) {
      console.log(`🏁 Marking ${eventsToComplete.length} event(s) as completed...`);

      for (const event of eventsToComplete) {
        await prisma.event.update({
          where: { id: event.id },
          data: {
            status: 'COMPLETED',
          },
        });

        console.log(`✅ Completed event: ${event.title}`);
      }
    }
  } catch (error) {
    console.error('❌ Error updating events:', error);
  }
};

// Start all schedulers
export const startSchedulers = (): void => {
  console.log('⏰ Starting content schedulers...');

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 Running scheduled content check...');
    await publishScheduledArticles();
    await publishScheduledEvents();
  });

  // Run immediately on startup
  publishScheduledArticles();
  publishScheduledEvents();

  console.log('✅ Schedulers started successfully');
};
