import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { FeedContentType } from '@prisma/client';

type FeedItemType = 'post' | 'article' | 'event';
type FeedFilter = 'all' | 'posts' | 'articles' | 'events' | 'highlights';
type FeedSort = 'recent' | 'popular';

interface FeedItem {
  id: string;
  sourceId: string;
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
    followerCount?: number;
  };
  popularityScore: number;
  isHighlight: boolean;
  isNew: boolean;
  isSaved: boolean;
  badges: string[];
  meta: {
    likes?: number;
    comments?: number;
    rsvps?: number;
    readTime?: number | null;
    visibility?: 'public' | 'supporters';
    periodStart?: string | null;
    startTime?: string;
    endTime?: string;
    location?: string | null;
    price?: number | null;
  };
}

interface RecommendedCreator {
  id: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
  creatorBio?: string | null;
  followerCount: number;
  isFollowed: boolean;
  slug: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const DEFAULT_PERIOD_HOURS = 72;
const HIGHLIGHT_RECENT_HOURS = 24;
const POPULARITY_THRESHOLD = 12;
const HIGHLIGHT_LIMIT = 6;
const RECOMMENDED_CONTENT_LIMIT = 6;
const RECOMMENDED_CREATORS_LIMIT = 6;

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

const parseFilter = (raw: string | undefined): FeedFilter => {
  if (!raw) {
    return 'all';
  }

  const normalized = raw.toLowerCase();

  if (['posts', 'articles', 'events', 'highlights'].includes(normalized)) {
    return normalized as FeedFilter;
  }

  return 'all';
};

const parseSort = (raw: string | undefined): FeedSort => {
  if (!raw) {
    return 'recent';
  }

  return raw.toLowerCase() === 'popular' ? 'popular' : 'recent';
};

const parsePeriodHours = (raw: string | undefined): number | null => {
  if (!raw) {
    return null;
  }

  const normalized = raw.toLowerCase();
  if (normalized === '24h') {
    return 24;
  }
  if (normalized === '48h') {
    return 48;
  }
  if (normalized === '7d') {
    return 7 * 24;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isNaN(parsed) && parsed > 0) {
    return parsed;
  }

  return null;
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

const calcPopularityScore = (params: { likes?: number; comments?: number; rsvps?: number }): number => {
  const likes = params.likes ?? 0;
  const comments = params.comments ?? 0;
  const rsvps = params.rsvps ?? 0;

  return likes * 3 + comments * 4 + rsvps * 2;
};

const buildBadges = (item: { isHighlight: boolean; isNew: boolean; popularityScore: number; meta: FeedItem['meta'] }): string[] => {
  const badges: string[] = [];

  if (item.isHighlight) {
    badges.push('Highlight');
  }

  if (item.meta.visibility === 'supporters') {
    badges.push('Supporters');
  }

  if (item.isNew) {
    badges.push('New');
  }

  if (item.popularityScore >= POPULARITY_THRESHOLD) {
    badges.push('Popular');
  }

  return badges;
};

const buildFeedItem = ({
  type,
  slug,
  popularityScore,
  isNew,
  isHighlight,
  isSaved,
  meta,
  base,
}: {
  type: FeedItemType;
  slug: string;
  popularityScore: number;
  isNew: boolean;
  isHighlight: boolean;
  isSaved: boolean;
  meta: FeedItem['meta'];
  base: {
    id: string;
    title: string;
    summary?: string | null;
    preview?: string | null;
    coverImage?: string | null;
    publishedAt: Date;
    link: string;
    creator: FeedItem['creator'];
  };
}): FeedItem => {
  const item: FeedItem = {
    id: `${type}_${base.id}`,
    sourceId: base.id,
    type,
    title: base.title,
    summary: base.summary,
    preview: base.preview,
    coverImage: base.coverImage,
    publishedAt: base.publishedAt,
    link: base.link,
    creator: {
      ...base.creator,
      slug,
    },
    popularityScore,
    isHighlight,
    isNew,
    isSaved,
    meta,
    badges: [],
  };

  item.badges = buildBadges(item);
  return item;
};

const feedContentTypeForItem = (type: FeedItemType): FeedContentType => {
  switch (type) {
    case 'post':
      return FeedContentType.POST;
    case 'article':
      return FeedContentType.ARTICLE;
    case 'event':
      return FeedContentType.EVENT;
    default:
      return FeedContentType.POST;
  }
};

export const getFeed = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limitParam = parseLimit(getQueryValue(req.query.limit));
    const cursorDate = parseCursor(getQueryValue(req.query.cursor));
    const filter = parseFilter(getQueryValue(req.query.type));
    const sort = parseSort(getQueryValue(req.query.sort));
    const periodHours = parsePeriodHours(getQueryValue(req.query.period));

    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = follows.map(follow => follow.followingId);
    const isFollowingAnyone = followingIds.length > 0;

    if (!isFollowingAnyone) {
      res.status(200).json({
        success: true,
        data: {
          items: [],
          highlights: [],
          recommendedContent: [],
          recommendedCreators: [],
          filters: {
            filter,
            sort,
            period: periodHours,
          },
          summary: {
            totalItems: 0,
            highlightCount: 0,
            recommendationsCount: 0,
          },
          nextCursor: null,
          hasMore: false,
        },
      });
      return;
    }

    const perCollectionCount = limitParam * 2;

    const [activeSubscriptions] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          subscriberId: userId,
          creatorId: { in: followingIds },
          status: 'ACTIVE',
        },
        select: { creatorId: true, tierId: true },
      }),
    ]);

    const subscribedCreatorIds = new Set(activeSubscriptions.map(record => record.creatorId));

    const cursorFilter = cursorDate ? { lt: cursorDate } : undefined;
    const recentWindow = new Date(Date.now() - HIGHLIGHT_RECENT_HOURS * 60 * 60 * 1000);
    const periodWindow = periodHours ? new Date(Date.now() - periodHours * 60 * 60 * 1000) : null;

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
              followers: {
                select: { followerId: true },
              },
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
              followers: {
                select: { followerId: true },
              },
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
              followers: {
                select: { followerId: true },
              },
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
    const bookmarkLookup: { type: FeedItemType; id: string }[] = [];

    const buildCreatorMeta = (record: { followers?: { followerId: string }[] } | null | undefined) => {
      if (!record?.followers) {
        return 0;
      }
      return record.followers.length;
    };

    const addPostItems = () => {
      posts.forEach(post => {
        const slug = toSlug(post.author.username, post.author.name);
        const likes = post._count?.likes ?? post.likeCount ?? 0;
        const comments = post._count?.comments ?? post.commentCount ?? 0;
        const hasAccess = post.isPublic || subscribedCreatorIds.has(post.authorId) || post.authorId === userId;

        const visibility: FeedItem['meta']['visibility'] = post.isPublic ? 'public' : 'supporters';
        const isNew = post.publishedAt ? post.publishedAt >= recentWindow : false;
        const popularityScore = calcPopularityScore({ likes, comments });
        const isHighlight = popularityScore >= POPULARITY_THRESHOLD || isNew;

        const feedItem = buildFeedItem({
          type: 'post',
          slug,
          popularityScore,
          isNew,
          isHighlight,
          isSaved: false,
          meta: {
            likes,
            comments,
            visibility,
          },
          base: {
            id: post.id,
            title: post.title,
            summary: post.excerpt,
            preview: hasAccess ? post.content : post.excerpt ?? null,
            coverImage: post.images?.[0] ?? null,
            publishedAt: post.publishedAt ?? post.createdAt,
            link: slug ? `/creators/${slug}?tab=posts&post=${post.id}` : `/creators`,
            creator: {
              id: post.author.id,
              name: post.author.name,
              username: post.author.username,
              avatar: post.author.avatar,
              slug,
              followerCount: buildCreatorMeta(post.author),
            },
          },
        });

        items.push(feedItem);
        bookmarkLookup.push({ type: 'post', id: post.id });
      });
    };

    const addArticleItems = () => {
      articles.forEach(article => {
        const slug = toSlug(article.author.username, article.author.name);
        const likes = article._count?.likes ?? 0;
        const comments = article._count?.comments ?? 0;
        const isNew = article.publishedAt ? article.publishedAt >= recentWindow : false;
        const popularityScore = calcPopularityScore({ likes, comments });
        const isHighlight = popularityScore >= POPULARITY_THRESHOLD || isNew;

        const feedItem = buildFeedItem({
          type: 'article',
          slug,
          popularityScore,
          isNew,
          isHighlight,
          isSaved: false,
          meta: {
            likes,
            comments,
            readTime: article.readTime,
            visibility: article.isPremium ? 'supporters' : 'public',
          },
          base: {
            id: article.id,
            title: article.title,
            summary: article.excerpt,
            preview: truncate(article.content, 260),
            coverImage: article.coverImage,
            publishedAt: article.publishedAt ?? article.createdAt,
            link: `/blog/${article.slug}`,
            creator: {
              id: article.author.id,
              name: article.author.name,
              username: article.author.username,
              avatar: article.author.avatar,
              slug,
              followerCount: buildCreatorMeta(article.author),
            },
          },
        });

        items.push(feedItem);
        bookmarkLookup.push({ type: 'article', id: article.id });
      });
    };

    const addEventItems = () => {
      events.forEach(eventRecord => {
        const slug = toSlug(eventRecord.host.username, eventRecord.host.name);
        const rsvps = eventRecord._count?.rsvps ?? 0;
        const isNew = eventRecord.createdAt ? eventRecord.createdAt >= recentWindow : false;
        const popularityScore = calcPopularityScore({ rsvps });
        const isHighlight = popularityScore >= POPULARITY_THRESHOLD / 2 || isNew;

        const feedItem = buildFeedItem({
          type: 'event',
          slug,
          popularityScore,
          isNew,
          isHighlight,
          isSaved: false,
          meta: {
            rsvps,
            visibility: eventRecord.isPublic ? 'public' : 'supporters',
            periodStart: eventRecord.startTime.toISOString(),
            startTime: eventRecord.startTime.toISOString(),
            endTime: eventRecord.endTime ? eventRecord.endTime.toISOString() : undefined,
            location: eventRecord.location,
            price: eventRecord.price ?? undefined,
          },
          base: {
            id: eventRecord.id,
            title: eventRecord.title,
            summary: truncate(eventRecord.description, 220),
            preview: truncate(eventRecord.description, 280),
            coverImage: eventRecord.coverImage,
            publishedAt: eventRecord.createdAt,
            link: `/events/${eventRecord.id}`,
            creator: {
              id: eventRecord.host.id,
              name: eventRecord.host.name,
              username: eventRecord.host.username,
              avatar: eventRecord.host.avatar,
              slug,
              followerCount: buildCreatorMeta(eventRecord.host),
            },
          },
        });

        items.push(feedItem);
        bookmarkLookup.push({ type: 'event', id: eventRecord.id });
      });
    };

    addPostItems();
    addArticleItems();
    addEventItems();

    // Resolve bookmark states
    if (bookmarkLookup.length > 0) {
      const bookmarks = await prisma.feedBookmark.findMany({
        where: {
          userId,
          OR: bookmarkLookup.map(entry => ({
            contentType: feedContentTypeForItem(entry.type),
            contentId: entry.id,
          })),
        },
      });

      const savedSet = new Set(
        bookmarks.map(bookmark => `${bookmark.contentType}:${bookmark.contentId}`),
      );

      items.forEach(item => {
        const key = `${feedContentTypeForItem(item.type)}:${item.sourceId}`;
        item.isSaved = savedSet.has(key);
      });
    }

    // Determine highlights
    const highlights = items
      .filter(item => item.isHighlight)
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, HIGHLIGHT_LIMIT);

    // Apply period filter
    let filtered = items;

    if (periodWindow) {
      filtered = filtered.filter(item => item.publishedAt >= periodWindow);
    }

    // Filter by type
    if (filter === 'posts') {
      filtered = filtered.filter(item => item.type === 'post');
    } else if (filter === 'articles') {
      filtered = filtered.filter(item => item.type === 'article');
    } else if (filter === 'events') {
      filtered = filtered.filter(item => item.type === 'event');
    } else if (filter === 'highlights') {
      filtered = highlights;
    }

    // Sort
    if (sort === 'popular') {
      filtered = [...filtered].sort((a, b) => b.popularityScore - a.popularityScore);
    } else {
      filtered = [...filtered].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    }

    const limitedItems = filtered.slice(0, limitParam);
    const nextCursor = limitedItems.length > 0
      ? limitedItems[limitedItems.length - 1].publishedAt.toISOString()
      : null;
    const hasMore = filtered.length > limitParam;

    // Recommended content (top public posts/articles/events from non-followed creators)
    const recommendedContentSet = new Set<string>();
    const addRecommendation = (item: FeedItem) => {
      const key = `${item.type}:${item.sourceId}`;
      if (recommendedContentSet.has(key)) {
        return;
      }
      recommendedContentSet.add(key);
      return item;
    };

    const recommendedContent: FeedItem[] = [];

    const recommendedPostsPromise = prisma.creatorPost.findMany({
      where: {
        authorId: { notIn: [...followingIds, userId] },
        isPublic: true,
        published: true,
      },
      orderBy: [
        { likeCount: 'desc' },
        { publishedAt: 'desc' },
      ],
      take: RECOMMENDED_CONTENT_LIMIT,
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
    });

    const recommendedArticlesPromise = prisma.article.findMany({
      where: {
        authorId: { notIn: [...followingIds, userId] },
        status: 'PUBLISHED',
        isPublic: true,
      },
      orderBy: [
        { publishedAt: 'desc' },
      ],
      take: Math.ceil(RECOMMENDED_CONTENT_LIMIT / 2),
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
    });

    const recommendedEventsPromise = prisma.event.findMany({
      where: {
        hostId: { notIn: [...followingIds, userId] },
        status: 'PUBLISHED',
        isPublic: true,
      },
      orderBy: [
        { startTime: 'asc' },
      ],
      take: Math.ceil(RECOMMENDED_CONTENT_LIMIT / 2),
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
    });

    const [recommendedPosts, recommendedArticles, recommendedEvents] = await Promise.all([
      recommendedPostsPromise,
      recommendedArticlesPromise,
      recommendedEventsPromise,
    ]);

    recommendedPosts.forEach(post => {
      const slug = toSlug(post.author.username, post.author.name);
      const likes = post._count?.likes ?? post.likeCount ?? 0;
      const comments = post._count?.comments ?? post.commentCount ?? 0;
      const popularityScore = calcPopularityScore({ likes, comments });
      const isNew = post.publishedAt ? post.publishedAt >= recentWindow : false;

      const feedItem = buildFeedItem({
        type: 'post',
        slug,
        popularityScore,
        isNew,
        isHighlight: popularityScore >= POPULARITY_THRESHOLD,
        isSaved: false,
        meta: {
          likes,
          comments,
          visibility: 'public',
        },
        base: {
          id: post.id,
          title: post.title,
          summary: post.excerpt,
          preview: truncate(post.content, 220),
          coverImage: post.images?.[0] ?? null,
          publishedAt: post.publishedAt ?? post.createdAt,
          link: slug ? `/creators/${slug}?tab=posts&post=${post.id}` : `/creators`,
          creator: {
            id: post.author.id,
            name: post.author.name,
            username: post.author.username,
            avatar: post.author.avatar,
            slug,
          },
        },
      });

      const recommendation = addRecommendation(feedItem);
      if (recommendation) {
        recommendedContent.push(recommendation);
      }
    });

    recommendedArticles.forEach(article => {
      const slug = toSlug(article.author.username, article.author.name);
      const likes = article._count?.likes ?? 0;
      const comments = article._count?.comments ?? 0;
      const popularityScore = calcPopularityScore({ likes, comments });
      const isNew = article.publishedAt ? article.publishedAt >= recentWindow : false;

      const feedItem = buildFeedItem({
        type: 'article',
        slug,
        popularityScore,
        isNew,
        isHighlight: popularityScore >= POPULARITY_THRESHOLD,
        isSaved: false,
        meta: {
          likes,
          comments,
          readTime: article.readTime,
          visibility: 'public',
        },
        base: {
          id: article.id,
          title: article.title,
          summary: article.excerpt,
          preview: truncate(article.content, 220),
          coverImage: article.coverImage,
          publishedAt: article.publishedAt ?? article.createdAt,
          link: `/blog/${article.slug}`,
          creator: {
            id: article.author.id,
            name: article.author.name,
            username: article.author.username,
            avatar: article.author.avatar,
            slug,
          },
        },
      });

      const recommendation = addRecommendation(feedItem);
      if (recommendation) {
        recommendedContent.push(recommendation);
      }
    });

    recommendedEvents.forEach(eventRecord => {
      const slug = toSlug(eventRecord.host.username, eventRecord.host.name);
      const rsvps = eventRecord._count?.rsvps ?? 0;
      const popularityScore = calcPopularityScore({ rsvps });
      const isNew = eventRecord.createdAt >= recentWindow;

      const feedItem = buildFeedItem({
        type: 'event',
        slug,
        popularityScore,
        isNew,
        isHighlight: popularityScore >= POPULARITY_THRESHOLD / 2,
        isSaved: false,
        meta: {
          rsvps,
          visibility: 'public',
          periodStart: eventRecord.startTime.toISOString(),
          startTime: eventRecord.startTime.toISOString(),
          endTime: eventRecord.endTime ? eventRecord.endTime.toISOString() : undefined,
          location: eventRecord.location,
          price: eventRecord.price ?? undefined,
        },
        base: {
          id: eventRecord.id,
          title: eventRecord.title,
          summary: truncate(eventRecord.description, 220),
          preview: truncate(eventRecord.description, 260),
          coverImage: eventRecord.coverImage,
          publishedAt: eventRecord.createdAt,
          link: `/events/${eventRecord.id}`,
          creator: {
            id: eventRecord.host.id,
            name: eventRecord.host.name,
            username: eventRecord.host.username,
            avatar: eventRecord.host.avatar,
            slug,
          },
        },
      });

      const recommendation = addRecommendation(feedItem);
      if (recommendation) {
        recommendedContent.push(recommendation);
      }
    });

    // Recommended creators (social proof)
    const recommendedCreatorsRaw = await prisma.user.findMany({
      where: {
        isCreator: true,
        id: {
          notIn: [...followingIds, userId],
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        creatorBio: true,
        followers: {
          select: { followerId: true },
        },
      },
      take: RECOMMENDED_CREATORS_LIMIT * 3,
    });

    const recommendedCreators: RecommendedCreator[] = recommendedCreatorsRaw
      .map(creator => {
        const followerIds = creator.followers?.map(follower => follower.followerId) ?? [];
        return {
          id: creator.id,
          name: creator.name,
          username: creator.username,
          avatar: creator.avatar,
          creatorBio: creator.creatorBio,
          followerCount: followerIds.length,
          isFollowed: followerIds.includes(userId),
          slug: toSlug(creator.username, creator.name),
        };
      })
      .sort((a, b) => b.followerCount - a.followerCount)
      .slice(0, RECOMMENDED_CREATORS_LIMIT);

    res.status(200).json({
      success: true,
      data: {
        items: limitedItems,
        highlights,
        recommendedContent,
        recommendedCreators,
        filters: {
          filter,
          sort,
          period: periodHours ?? DEFAULT_PERIOD_HOURS,
        },
        summary: {
          totalItems: limitedItems.length,
          highlightCount: highlights.length,
          recommendationsCount: recommendedContent.length,
        },
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
};
