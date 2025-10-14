import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
  };
}

// Create a new download
export const createDownload = async (
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
      description,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      mimeType,
      thumbnailUrl,
      isPublic,
      minimumTierId,
    } = req.body;

    if (!title || !fileUrl || !fileName || !fileSize || !fileType || !mimeType) {
      res.status(400).json({
        success: false,
        message: 'Required fields: title, fileUrl, fileName, fileSize, fileType, mimeType',
      });
      return;
    }

    const download = await prisma.download.create({
      data: {
        title,
        description,
        fileUrl,
        fileName,
        fileSize: BigInt(fileSize),
        fileType,
        mimeType,
        thumbnailUrl,
        isPublic: isPublic !== undefined ? isPublic : false,
        minimumTierId,
        creatorId: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Convert BigInt to string for JSON serialization
    const downloadData = {
      ...download,
      fileSize: download.fileSize.toString(),
    };

    res.status(201).json({
      success: true,
      message: 'Download created successfully',
      data: downloadData,
    });
  } catch (error) {
    console.error('Create download error:', error);
    next(error);
  }
};

// Get all downloads for a creator
export const getCreatorDownloads = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { creatorId } = req.params;
    const userId = (req as AuthRequest).user?.id || (req as AuthRequest).user?.userId;

    // Check if user has access based on subscription
    let userSubscription = null;
    if (userId) {
      userSubscription = await prisma.subscription.findFirst({
        where: {
          subscriberId: userId,
          creatorId,
          status: 'ACTIVE',
        },
        include: {
          tier: true,
        },
      });
    }

    const downloads = await prisma.download.findMany({
      where: {
        creatorId,
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            downloads: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Check access for each download
    const downloadsWithAccess = downloads.map((download) => {
      let hasAccess = false;

      if (download.isPublic) {
        hasAccess = true;
      } else if (userSubscription) {
        if (!download.minimumTierId) {
          hasAccess = true;
        } else {
          // Check if user's tier meets minimum requirement
          // This is simplified - in production, you'd compare tier levels
          hasAccess = userSubscription.tierId === download.minimumTierId;
        }
      }

      return {
        ...download,
        fileSize: download.fileSize.toString(),
        hasAccess,
        downloadCount: download._count.downloads,
      };
    });

    res.json({
      success: true,
      data: downloadsWithAccess,
    });
  } catch (error) {
    console.error('Get creator downloads error:', error);
    next(error);
  }
};

// Get single download by ID
export const getDownloadById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.id || (req as AuthRequest).user?.userId;

    const download = await prisma.download.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true,
          },
        },
        _count: {
          select: {
            downloads: true,
          },
        },
      },
    });

    if (!download) {
      res.status(404).json({
        success: false,
        message: 'Download not found',
      });
      return;
    }

    // Check access
    let hasAccess = false;
    if (download.isPublic) {
      hasAccess = true;
    } else if (userId) {
      const userSubscription = await prisma.subscription.findFirst({
        where: {
          subscriberId: userId,
          creatorId: download.creatorId,
          status: 'ACTIVE',
        },
        include: {
          tier: true,
        },
      });

      if (userSubscription) {
        if (!download.minimumTierId) {
          hasAccess = true;
        } else {
          hasAccess = userSubscription.tierId === download.minimumTierId;
        }
      }
    }

    const downloadData = {
      ...download,
      fileSize: download.fileSize.toString(),
      hasAccess,
      downloadCount: download._count.downloads,
    };

    res.json({
      success: true,
      data: downloadData,
    });
  } catch (error) {
    console.error('Get download error:', error);
    next(error);
  }
};

// Record a download (increment count and create record)
export const recordDownload = async (
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

    const download = await prisma.download.findUnique({
      where: { id },
    });

    if (!download) {
      res.status(404).json({
        success: false,
        message: 'Download not found',
      });
      return;
    }

    // Check access
    let hasAccess = false;
    if (download.isPublic) {
      hasAccess = true;
    } else {
      const userSubscription = await prisma.subscription.findFirst({
        where: {
          subscriberId: userId,
          creatorId: download.creatorId,
          status: 'ACTIVE',
        },
      });

      if (userSubscription) {
        if (!download.minimumTierId) {
          hasAccess = true;
        } else {
          hasAccess = userSubscription.tierId === download.minimumTierId;
        }
      }
    }

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'You do not have access to this download. Please subscribe to unlock.',
      });
      return;
    }

    // Create download record and increment count
    const [downloadRecord] = await prisma.$transaction([
      prisma.downloadRecord.create({
        data: {
          userId,
          downloadId: id,
        },
      }),
      prisma.download.update({
        where: { id },
        data: {
          downloadCount: {
            increment: 1,
          },
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Download recorded successfully',
      data: {
        fileUrl: download.fileUrl,
        fileName: download.fileName,
      },
    });
  } catch (error) {
    console.error('Record download error:', error);
    next(error);
  }
};

// Update download
export const updateDownload = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;
    const { title, description, thumbnailUrl, isPublic, minimumTierId, isActive } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const download = await prisma.download.findUnique({
      where: { id },
    });

    if (!download) {
      res.status(404).json({
        success: false,
        message: 'Download not found',
      });
      return;
    }

    if (download.creatorId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own downloads',
      });
      return;
    }

    const updatedDownload = await prisma.download.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(isPublic !== undefined && { isPublic }),
        ...(minimumTierId !== undefined && { minimumTierId }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const downloadData = {
      ...updatedDownload,
      fileSize: updatedDownload.fileSize.toString(),
    };

    res.json({
      success: true,
      message: 'Download updated successfully',
      data: downloadData,
    });
  } catch (error) {
    console.error('Update download error:', error);
    next(error);
  }
};

// Delete download
export const deleteDownload = async (
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

    // Verify ownership
    const download = await prisma.download.findUnique({
      where: { id },
    });

    if (!download) {
      res.status(404).json({
        success: false,
        message: 'Download not found',
      });
      return;
    }

    if (download.creatorId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own downloads',
      });
      return;
    }

    await prisma.download.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Download deleted successfully',
    });
  } catch (error) {
    console.error('Delete download error:', error);
    next(error);
  }
};

// Get user's download history
export const getUserDownloadHistory = async (
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

    const downloadRecords = await prisma.downloadRecord.findMany({
      where: {
        userId,
      },
      include: {
        download: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        downloadedAt: 'desc',
      },
      take: 50,
    });

    const history = downloadRecords.map((record) => ({
      ...record,
      download: {
        ...record.download,
        fileSize: record.download.fileSize.toString(),
      },
    }));

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Get download history error:', error);
    next(error);
  }
};
