import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
  };
}

// Get creator analytics dashboard data
export const getAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { period = '30days' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '12months':
        startDate.setMonth(now.getMonth() - 12);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get total active subscribers
    const activeSubscribers = await prisma.subscription.count({
      where: {
        creatorId: userId,
        status: 'ACTIVE',
      },
    });

    // Get new subscribers in period
    const newSubscribers = await prisma.subscription.count({
      where: {
        creatorId: userId,
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Get canceled subscribers in period
    const canceledSubscribers = await prisma.subscription.count({
      where: {
        creatorId: userId,
        status: 'CANCELLED',
        updatedAt: {
          gte: startDate,
        },
      },
    });

    // Calculate total revenue (all-time)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        creatorId: userId,
        status: 'ACTIVE',
      },
      include: {
        tier: true,
      },
    });

    const monthlyRevenue = subscriptions.reduce((sum, sub) => {
      if (sub.tier.interval === 'MONTHLY') {
        return sum + sub.tier.price;
      } else if (sub.tier.interval === 'YEARLY') {
        return sum + sub.tier.price / 12; // Convert to monthly
      }
      return sum;
    }, 0);

    // Get revenue trend data
    const revenueTrend = await getRevenueTrend(userId, startDate, now);

    // Get subscriber growth trend
    const subscriberTrend = await getSubscriberTrend(userId, startDate, now);

    // Get content stats
    const totalPosts = await prisma.creatorPost.count({
      where: { creatorId: userId },
    });

    const postsInPeriod = await prisma.creatorPost.count({
      where: {
        creatorId: userId,
        createdAt: {
          gte: startDate,
        },
      },
    });

    const totalPolls = await prisma.poll.count({
      where: { creatorId: userId },
    });

    const totalEvents = await prisma.event.count({
      where: { hostId: userId },
    });

    const totalArticles = await prisma.article.count({
      where: { authorId: userId },
    });

    const totalGoals = await prisma.goal.count({
      where: { creatorId: userId },
    });

    const completedGoals = await prisma.goal.count({
      where: { creatorId: userId, isCompleted: true },
    });

    // Get engagement stats
    const totalLikes = await prisma.postLike.count({
      where: {
        post: {
          creatorId: userId,
        },
      },
    });

    const totalComments = await prisma.postComment.count({
      where: {
        post: {
          creatorId: userId,
        },
      },
    });

    const totalDownloads = await prisma.downloadRecord.count({
      where: {
        download: {
          creatorId: userId,
        },
      },
    });

    // Get top-performing content
    const topPosts = await prisma.creatorPost.findMany({
      where: { creatorId: userId },
      orderBy: { likeCount: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        likeCount: true,
        commentCount: true,
        createdAt: true,
      },
    });

    // Get tier distribution
    const tierDistribution = await prisma.subscription.groupBy({
      by: ['tierId'],
      where: {
        creatorId: userId,
        status: 'ACTIVE',
      },
      _count: {
        id: true,
      },
    });

    const tiersWithCounts = await Promise.all(
      tierDistribution.map(async (item) => {
        const tier = await prisma.membershipTier.findUnique({
          where: { id: item.tierId },
          select: { id: true, name: true, price: true },
        });
        return {
          tier,
          count: item._count.id,
          revenue: tier ? tier.price * item._count.id : 0,
        };
      })
    );

    res.json({
      success: true,
      data: {
        overview: {
          activeSubscribers,
          newSubscribers,
          canceledSubscribers,
          monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
          totalPosts,
          totalPolls,
          totalEvents,
          totalArticles,
          totalGoals,
          completedGoals,
          totalLikes,
          totalComments,
          totalDownloads,
        },
        trends: {
          revenue: revenueTrend,
          subscribers: subscriberTrend,
        },
        content: {
          postsInPeriod,
          topPosts,
        },
        tiers: tiersWithCounts,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    next(error);
  }
};

// Helper function to get revenue trend
async function getRevenueTrend(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; revenue: number }>> {
  // Get all active subscriptions
  const subscriptions = await prisma.subscription.findMany({
    where: {
      creatorId: userId,
      OR: [
        { status: 'ACTIVE' },
        {
          status: 'CANCELLED',
          updatedAt: {
            gte: startDate,
          },
        },
      ],
    },
    include: {
      tier: true,
    },
  });

  // Group by date
  const revenueByDate: Record<string, number> = {};
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Calculate revenue for this date
    let dailyRevenue = 0;
    for (const sub of subscriptions) {
      if (
        sub.createdAt <= currentDate &&
        (sub.status === 'ACTIVE' || sub.updatedAt > currentDate)
      ) {
        if (sub.tier.interval === 'MONTHLY') {
          dailyRevenue += sub.tier.price / 30; // Approximate daily revenue
        } else if (sub.tier.interval === 'YEARLY') {
          dailyRevenue += sub.tier.price / 365;
        }
      }
    }

    revenueByDate[dateStr] = Number(dailyRevenue.toFixed(2));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return Object.entries(revenueByDate).map(([date, revenue]) => ({
    date,
    revenue,
  }));
}

// Helper function to get subscriber trend
async function getSubscriberTrend(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; subscribers: number }>> {
  // Get all subscriptions
  const allSubscriptions = await prisma.subscription.findMany({
    where: {
      creatorId: userId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const subscribersByDate: Record<string, number> = {};
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Count active subscribers on this date
    const activeCount = allSubscriptions.filter(
      (sub) =>
        sub.createdAt <= currentDate &&
        (sub.status === 'ACTIVE' ||
          (sub.status === 'CANCELLED' && sub.updatedAt > currentDate))
    ).length;

    subscribersByDate[dateStr] = activeCount;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return Object.entries(subscribersByDate).map(([date, subscribers]) => ({
    date,
    subscribers,
  }));
}

// Get subscriber list with filters
export const getSubscribers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { status, tierId, search, page = '1', limit = '20' } = req.query;

    const where: any = {
      creatorId: userId,
    };

    if (status) {
      where.status = status;
    }

    if (tierId) {
      where.tierId = tierId;
    }

    if (search) {
      where.subscriber = {
        OR: [
          { name: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
        ],
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [subscribers, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          subscriber: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          tier: {
            select: {
              id: true,
              name: true,
              price: true,
              interval: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        subscribers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    next(error);
  }
};

// Send bulk message to subscribers
export const sendBulkMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { subject, content, tierId } = req.body;

    if (!subject || !content) {
      res.status(400).json({
        success: false,
        message: 'Subject and content are required',
      });
      return;
    }

    // Get target subscribers
    const where: any = {
      creatorId: userId,
      status: 'ACTIVE',
    };

    if (tierId) {
      where.tierId = tierId;
    }

    const subscribers = await prisma.subscription.findMany({
      where,
      include: {
        subscriber: true,
      },
    });

    // Create broadcast messages
    const messages = await Promise.all(
      subscribers.map((sub) =>
        prisma.message.create({
          data: {
            content: `**${subject}**\n\n${content}`,
            type: 'TEXT',
            isBroadcast: true,
            senderId: userId,
            receiverId: sub.subscriberId,
          },
        })
      )
    );

    res.json({
      success: true,
      message: `Message sent to ${messages.length} subscribers`,
      data: {
        sentCount: messages.length,
      },
    });
  } catch (error) {
    console.error('Send bulk message error:', error);
    next(error);
  }
};
