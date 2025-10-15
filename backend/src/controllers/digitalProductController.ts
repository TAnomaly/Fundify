import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

// Get all active products (public)
export const getAllProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, featured, creatorId, search } = req.query;

    const where: any = { isActive: true };

    if (type) where.productType = type;
    if (featured === 'true') where.isFeatured = true;
    if (creatorId) where.creatorId = creatorId;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const products = await prisma.digitalProduct.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isCreator: true
          }
        },
        _count: {
          select: { purchases: true }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { salesCount: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const safeProducts = products.map(p => ({
      ...p,
      fileSize: p.fileSize?.toString() || null
    }));

    res.json({
      success: true,
      data: safeProducts
    });
  } catch (error) {
    next(error);
  }
};

// Get single product by ID
export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.digitalProduct.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            bio: true,
            isCreator: true
          }
        },
        _count: {
          select: { purchases: true }
        }
      }
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// Get creator's products
export const getCreatorProducts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const products = await prisma.digitalProduct.findMany({
      where: { creatorId: userId },
      include: {
        _count: {
          select: { purchases: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// Create product (creators only)
export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify user is a creator
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isCreator) {
      res.status(403).json({ success: false, message: 'Only creators can create products' });
      return;
    }

    const {
      title,
      description,
      price,
      productType,
      fileUrl,
      fileSize,
      coverImage,
      previewUrl,
      features,
      requirements
    } = req.body;

    const product = await prisma.digitalProduct.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        productType,
        fileUrl,
        fileSize: fileSize ? BigInt(fileSize) : null,
        coverImage,
        previewUrl,
        features: features || [],
        requirements: requirements || [],
        creatorId: userId
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update product
export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const product = await prisma.digitalProduct.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    if (product.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'You can only edit your own products' });
      return;
    }

    const {
      title,
      description,
      price,
      productType,
      fileUrl,
      fileSize,
      coverImage,
      previewUrl,
      features,
      requirements,
      isActive,
      isFeatured
    } = req.body;

    const updated = await prisma.digitalProduct.update({
      where: { id },
      data: {
        title,
        description,
        price: price ? parseFloat(price) : undefined,
        productType,
        fileUrl,
        fileSize: fileSize ? BigInt(fileSize) : undefined,
        coverImage,
        previewUrl,
        features,
        requirements,
        isActive,
        isFeatured
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Product updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete product
export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const product = await prisma.digitalProduct.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    if (product.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'You can only delete your own products' });
      return;
    }

    await prisma.digitalProduct.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Purchase product
export const purchaseProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const product = await prisma.digitalProduct.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    if (!product.isActive) {
      res.status(400).json({ success: false, message: 'Product is not available' });
      return;
    }

    // Check if user already purchased
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        userId,
        productId: id,
        status: 'COMPLETED'
      }
    });

    if (existingPurchase) {
      res.status(400).json({ success: false, message: 'You already own this product' });
      return;
    }

    // Create purchase
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        productId: id,
        amount: product.price,
        status: 'COMPLETED', // In real app, would be PENDING until payment confirmed
        paymentMethod,
        transactionId
      },
      include: {
        product: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        }
      }
    });

    // Update product stats
    await prisma.digitalProduct.update({
      where: { id },
      data: {
        salesCount: { increment: 1 },
        revenue: { increment: product.price }
      }
    });

    res.status(201).json({
      success: true,
      data: purchase,
      message: 'Purchase completed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get user's purchases
export const getMyPurchases = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: { purchasedAt: 'desc' }
    });

    res.json({
      success: true,
      data: purchases
    });
  } catch (error) {
    next(error);
  }
};

// Download product (for purchased users)
export const downloadProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params; // product ID

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verify user purchased the product
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId,
        productId: id,
        status: 'COMPLETED'
      },
      include: {
        product: true
      }
    });

    if (!purchase) {
      res.status(403).json({ success: false, message: 'You must purchase this product first' });
      return;
    }

    // Update download stats
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        fileUrl: purchase.product.fileUrl,
        fileName: purchase.product.title,
        fileSize: purchase.product.fileSize?.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};
