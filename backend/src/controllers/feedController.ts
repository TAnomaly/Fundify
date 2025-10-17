import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

type FeedItemType = 'post' | 'article' | 'event';

interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  summary?: string | null;
  preview?: string | null;
  coverImage?: string | null;
  publishedAt: Date;
  link: string;
  creator: {
    id: string;
    name: string;
    username?: string | null;
    avatar?: string | null;
    slug: string;
  };
  meta?: Record<string, unknown>;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const getQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
};

const parseLimit = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
};

const parseCursor = (raw: string | undefined): Date | null => {
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toSlug = (username?: string | null, name?: string | null): string => {
  if (username) {
    return username;
  }

  if (!name) {
    return '';
  }

  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const truncate = (value: string | null | undefined, limit = 180): string | null => {
  if (!value) {
    return null;
  }

  const clean = value.replace(/<[^>]+>/g, '').trim();
  if (clean.length <= limit) {
    return clean;
  }

  return `${clean.slice(0, limit - 1).trimEnd()}…`;
};

export const getFeed = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limitParam = parseLimit(getQueryValue(req.query.limit));
    const cursorDate = parseCursor(getQueryValue(req.query.cursor));

    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    if (follows.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          items: [],
          nextCursor: null,
          hasMore: false,
        },
      });
      return;
    }

    const followingIds = follows.map((follow) => follow.followingId);
    const perCollectionCount = limitParam * 2;

    const [activeSubscriptions] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          subscriberId: userId,
          creatorId: { in: followingIds },
          status: 'ACTIVE',
        },
        select: { creatorId: true },
      }),
    ]);

    const subscribedCreatorIds = new Set(activeSubscriptions.map((record) => record.creatorId));

    const cursorFilter = cursorDate
      ? { lt: cursorDate }
      : undefined;

    const [posts, articles, events] = await Promise.all([
      prisma.creatorPost.findMany({
        where: {
          authorId: { in: followingIds },
          published: true,
          publishedAt: cursorFilter,
        },
        take: perCollectionCount,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.article.findMany({
        where: {
          authorId: { in: followingIds },
          status: 'PUBLISHED',
          publishedAt: cursorFilter,
        },
        take: perCollectionCount,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.event.findMany({
        where: {
          hostId: { in: followingIds },
          status: 'PUBLISHED',
          createdAt: cursorFilter,
        },
        take: perCollectionCount,
        orderBy: { createdAt: 'desc' },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              rsvps: true,
            },
          },
        },
      }),
    ]);

    const items: FeedItem[] = [];

    posts
      .filter((post) => post.publishedAt)
      .filter((post) => post.isPublic || subscribedCreatorIds.has(post.authorId))
      .forEach((post) => {
        const slug = toSlug(post.author.username, post.author.name);
        items.push({
          id: `post_${post.id}`,
          type: 'post',
          title: post.title,
          summary: post.excerpt,
          preview: post.excerpt ?? truncate(post.content, 200),
          coverImage: post.images?.[0] ?? null,
          publishedAt: post.publishedAt!,
          link: slug ? `/creators/${slug}?tab=posts` : `/creators`,
          creator: {
            id: post.author.id,
            name: post.author.name,
            username: post.author.username,
            avatar: post.author.avatar,
            slug,
          },
          meta: {
            likes: post._count?.likes ?? post.likeCount ?? 0,
            comments: post._count?.comments ?? post.commentCount ?? 0,
            visibility: post.isPublic ? 'public' : 'supporters',
          },
        });
      });

    articles
      .filter((article) => article.publishedAt)
      .filter((article) => !article.isPremium || subscribedCreatorIds.has(article.authorId))
      .forEach((article) => {
        const slug = toSlug(article.author.username, article.author.name);
        items.push({
          id: `article_${article.id}`,
          type: 'article',
          title: article.title,
          summary: article.excerpt,
          preview: article.excerpt ?? truncate(article.content, 220),
          coverImage: article.coverImage,
          publishedAt: article.publishedAt!,
          link: `/blog/${article.slug}`,
          creator: {
            id: article.author.id,
            name: article.author.name,
            username: article.author.username,
            avatar: article.author.avatar,
            slug,
          },
          meta: {
            readTime: article.readTime,
            likes: article._count?.likes ?? 0,
            comments: article._count?.comments ?? 0,
            visibility: article.isPremium ? 'supporters' : 'public',
          },
        });
      });

    events
      .filter((event) => event.createdAt)
      .filter((event) => event.isPublic || subscribedCreatorIds.has(event.hostId))
      .forEach((event) => {
        const slug = toSlug(event.host.username, event.host.name);
        items.push({
          id: `event_${event.id}`,
          type: 'event',
          title: event.title,
          summary: truncate(event.description, 220),
          publishedAt: event.createdAt,
          coverImage: event.coverImage,
          link: `/events/${event.id}`,
          creator: {
            id: event.host.id,
            name: event.host.name,
            username: event.host.username,
            avatar: event.host.avatar,
            slug,
          },
          meta: {
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            rsvps: event._count?.rsvps ?? 0,
            price: event.price,
            visibility: event.isPublic ? 'public' : 'supporters',
          },
        });
      });

    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    const pageItems = items.slice(0, limitParam);
    const lastItem = pageItems[pageItems.length - 1] ?? null;
    const nextCursor = lastItem ? lastItem.publishedAt.toISOString() : null;

    res.status(200).json({
      success: true,
      data: {
        items: pageItems.map((item) => ({
          ...item,
          publishedAt: item.publishedAt.toISOString(),
        })),
        nextCursor,
        hasMore: items.length > limitParam,
      },
    });
  } catch (error) {
    next(error);
  }
};
