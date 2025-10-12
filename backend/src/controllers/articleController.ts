import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// Helper function to generate slug
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Helper to calculate reading time (words per minute)
const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

// Create article
export const createArticle = async (
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

    const {
      title,
      content,
      excerpt,
      coverImage,
      metaTitle,
      metaDescription,
      keywords,
      status,
      categories,
      tags,
      isPublic,
      isPremium,
      minimumTierId,
      publishedAt,
    } = req.body;

    // Generate slug
    let slug = generateSlug(title);
    
    // Check if slug exists, append number if needed
    const existingSlug = await prisma.article.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Calculate reading time
    const readTime = calculateReadingTime(content);

    // Create article
    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        coverImage,
        metaTitle,
        metaDescription,
        keywords: keywords || [],
        status: status || 'DRAFT',
        isPublic: isPublic !== undefined ? isPublic : true,
        isPremium: isPremium || false,
        minimumTierId,
        readTime,
        publishedAt: status === 'PUBLISHED' ? publishedAt || new Date() : null,
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

    // Add categories
    if (categories && categories.length > 0) {
      await Promise.all(
        categories.map((categoryId: string) =>
          prisma.articleCategory.create({
            data: {
              articleId: article.id,
              categoryId,
            },
          })
        )
      );
    }

    // Add tags
    if (tags && tags.length > 0) {
      await Promise.all(
        tags.map((tagId: string) =>
          prisma.articleTag.create({
            data: {
              articleId: article.id,
              tagId,
            },
          })
        )
      );
    }

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

// Get all articles (public)
export const getArticles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = '1', limit = '10', category, tag, status, authorId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      status: 'PUBLISHED',
    };

    if (authorId) {
      where.authorId = authorId;
    }

    if (category) {
      where.categories = {
        some: {
          category: {
            slug: category,
          },
        },
      };
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            slug: tag,
          },
        },
      };
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
        orderBy: {
          publishedAt: 'desc',
        },
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get article by slug
export const getArticleBySlug = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    // Increment view count
    await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    // Check if user has liked
    let hasLiked = false;
    if (userId) {
      const like = await prisma.articleLike.findUnique({
        where: {
          userId_articleId: {
            userId,
            articleId: article.id,
          },
        },
      });
      hasLiked = !!like;
    }

    res.json({
      success: true,
      data: {
        ...article,
        hasLiked,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update article
export const updateArticle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    if (article.authorId !== userId) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { content, ...updateData } = req.body;

    // Recalculate reading time if content changed
    if (content) {
      updateData.readTime = calculateReadingTime(content);
      updateData.content = content;
    }

    const updatedArticle = await prisma.article.update({
      where: { id },
      data: updateData,
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

    res.json({
      success: true,
      message: 'Article updated successfully',
      data: updatedArticle,
    });
  } catch (error) {
    next(error);
  }
};

// Delete article
export const deleteArticle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    if (article.authorId !== userId) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await prisma.article.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Toggle like
export const toggleArticleLike = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    const existingLike = await prisma.articleLike.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId: id,
        },
      },
    });

    let liked: boolean;

    if (existingLike) {
      // Unlike
      await prisma.articleLike.delete({
        where: {
          id: existingLike.id,
        },
      });
      liked = false;
    } else {
      // Like - use try/catch to handle race condition
      try {
        await prisma.articleLike.create({
          data: {
            userId,
            articleId: id,
          },
        });
        liked = true;
      } catch (createError: any) {
        // If duplicate error, user already liked (race condition)
        if (createError.code === 'P2002') {
          res.status(400).json({
            success: false,
            message: 'You have already liked this article',
          });
          return;
        }
        throw createError;
      }
    }

    // Get updated like count
    const likeCount = await prisma.articleLike.count({
      where: { articleId: id },
    });

    res.json({
      success: true,
      data: {
        liked,
        likeCount,
      },
      message: liked ? 'Article liked' : 'Article unliked',
    });
  } catch (error) {
    next(error);
  }
};

// Get all categories
export const getCategories = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// Get all tags
export const getTags = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    next(error);
  }
};

// Get article comments
export const getArticleComments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const comments = await prisma.articleComment.findMany({
      where: {
        articleId: id,
        parentId: null, // Only get top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

// Add article comment
export const addArticleComment = async (
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

    const { id } = req.params;
    const { content, parentId } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ success: false, message: 'Comment content is required' });
      return;
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    // Create comment
    const comment = await prisma.articleComment.create({
      data: {
        content,
        articleId: id,
        userId,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

// Delete article comment
export const deleteArticleComment = async (
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

    const { id, commentId } = req.params;

    const comment = await prisma.articleComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found' });
      return;
    }

    // Check if user owns the comment or is the article author
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (comment.userId !== userId && article?.authorId !== userId) {
      res.status(403).json({ success: false, message: 'Unauthorized to delete this comment' });
      return;
    }

    await prisma.articleComment.delete({
      where: { id: commentId },
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

