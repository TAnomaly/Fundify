import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { CreateCreatorPostDTO, UpdateCreatorPostDTO } from '../types/creatorPost';
import { Prisma } from '@prisma/client';

// Create a new creator post
export const createCreatorPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify user is a creator
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isCreator: true },
    });

    if (!user?.isCreator) {
      res.status(403).json({
        success: false,
        message: 'Only creators can publish posts. Please upgrade to a creator account.'
      });
      return;
    }

    const data: CreateCreatorPostDTO = req.body;

    const post = await prisma.creatorPost.create({
      data: {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        images: data.images || [],
        videoUrl: data.videoUrl,
        attachments: data.attachments,
        isPublic: data.isPublic ?? false,
        minimumTierId: data.minimumTierId,
        published: data.published ?? true,
        publishedAt: data.publishedAt || new Date(),
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

// Get all posts from a creator
export const getCreatorPosts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { creatorId } = req.params;
    const userId = req.user?.id;
    const { page = '1', limit = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Check if user has subscription to this creator
    const hasSubscription = userId ? await prisma.subscription.findFirst({
      where: {
        subscriberId: userId,
        creatorId,
        status: 'ACTIVE',
      },
      include: {
        tier: { select: { id: true } },
      },
    }) : null;

    const isCreatorOwner = userId === creatorId;

    // Build where clause based on access
    const where: any = {
      authorId: creatorId,
      published: true,
    };

    // If not subscribed, only show public posts
    if (!hasSubscription && !isCreatorOwner) {
      where.isPublic = true;
    }

    const include: Prisma.CreatorPostInclude = {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
          isCreator: true,
        },
      },
    };

    if (userId) {
      include.likes = {
        where: { userId },
        select: { id: true },
      };
    }

    const [posts, total] = await Promise.all([
      prisma.creatorPost.findMany({
        where,
        skip,
        take,
        include,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.creatorPost.count({ where }),
    ]);
    const userHasAccessToPrivatePosts = Boolean(hasSubscription) || isCreatorOwner;

    // Add access information to each post
    const postsWithAccess = posts.map((post) => {
      const postWithLikes = post as typeof post & { likes?: { id: string }[] };
      const { likes = [], ...rest } = postWithLikes;
      return {
        ...rest,
        hasAccess: post.isPublic || userHasAccessToPrivatePosts,
        content: post.isPublic || userHasAccessToPrivatePosts ? post.content : post.excerpt || '',
        hasLiked: userId ? likes.length > 0 : false,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        posts: postsWithAccess,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / take),
        },
        hasSubscription: !!hasSubscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get a single post with access check
export const getCreatorPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    const post = await prisma.creatorPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isCreator: true,
          },
        },
      },
    });

    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    // Check access
    let hasAccess = post.isPublic;

    if (!hasAccess && userId) {
      // Check if user is the author
      if (post.authorId === userId) {
        hasAccess = true;
      } else {
        // Check subscription
        const subscription = await prisma.subscription.findFirst({
          where: {
            subscriberId: userId,
            creatorId: post.authorId,
            status: 'ACTIVE',
          },
          include: {
            tier: { select: { id: true } },
          },
        });

        if (subscription) {
          // TODO: Check if subscription tier meets minimum tier requirement
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'This content is exclusive to subscribers',
        data: {
          id: post.id,
          title: post.title,
          excerpt: post.excerpt,
          isPublic: false,
          authorId: post.authorId,
        },
      });
      return;
    }

    res.status(200).json({ success: true, data: { ...post, hasAccess } });
  } catch (error) {
    next(error);
  }
};

// Update a creator post
export const updateCreatorPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const post = await prisma.creatorPost.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    if (post.authorId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    const data: UpdateCreatorPostDTO = req.body;

    const updatedPost = await prisma.creatorPost.update({
      where: { id: postId },
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    res.status(200).json({ success: true, data: updatedPost });
  } catch (error) {
    next(error);
  }
};

// Delete a creator post
export const deleteCreatorPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const post = await prisma.creatorPost.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    if (post.authorId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    await prisma.creatorPost.delete({
      where: { id: postId },
    });

    res.status(200).json({ success: true, message: 'Post deleted' });
  } catch (error) {
    next(error);
  }
};

// Get user's own posts (for creator dashboard)
export const getMyPosts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const posts = await prisma.creatorPost.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};
