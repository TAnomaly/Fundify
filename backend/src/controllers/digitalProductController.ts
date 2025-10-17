import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

type RawDigitalProduct = {
  fileSize?: bigint | null;
  [key: string]: any;
};

type RawPurchase = {
  product?: RawDigitalProduct | null;
  [key: string]: any;
};

const toProductResponse = <T extends RawDigitalProduct | null | undefined>(product: T) => {
  if (!product) {
    return product as T;
  }

  return {
    ...product,
    fileSize: product.fileSize ? product.fileSize.toString() : null,
  };
};

const toProductsResponse = (products: RawDigitalProduct[]) => products.map(toProductResponse);

const toPurchaseResponse = <T extends RawPurchase | null | undefined>(purchase: T) => {
  if (!purchase) {
    return purchase as T;
  }

  return {
    ...purchase,
    product: purchase.product ? toProductResponse(purchase.product) : purchase.product,
  };
};

const ensureArray = (value: string | string[] | undefined): string[] => {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : value.split(',');
  return values
    .map(token => token.trim())
    .filter(token => token.length > 0);
};

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }

  return undefined;
};

const parseOptionalBigInt = (value: unknown): bigint | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  try {
    if (typeof value === 'bigint') {
      return value;
    }

    if (typeof value === 'number') {
      return BigInt(Math.trunc(value));
    }

    return BigInt(String(value));
  } catch {
    return null;
  }
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map(entry => String(entry).trim())
      .filter(entry => entry.length > 0);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map(entry => String(entry).trim())
          .filter(entry => entry.length > 0);
      }
    } catch {
      // ignore parsing errors and fallback to comma-separated parsing
    }

    return value
      .split(',')
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0);
  }

  return undefined;
};

// Get all active products (public)
export const getAllProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      type,
      types,
      featured,
      creatorId,
      search,
      minPrice,
      maxPrice,
      sort,
    } = req.query as {
      type?: string;
      types?: string | string[];
      featured?: string;
      creatorId?: string;
      search?: string;
      minPrice?: string;
      maxPrice?: string;
      sort?: string | string[];
    };

    const where: Prisma.DigitalProductWhereInput = { isActive: true };

    const typesFilter = ensureArray(types);
    if (typesFilter.length > 0) {
      where.productType = { in: typesFilter as any };
    } else if (type) {
      where.productType = type as any;
    }

    const featuredFilter = parseOptionalBoolean(featured);
    if (featuredFilter !== undefined) {
      where.isFeatured = featuredFilter;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const minPriceValue = parseOptionalNumber(minPrice);
    const maxPriceValue = parseOptionalNumber(maxPrice);
    const priceFilter: Prisma.FloatFilter = {};

    if (minPriceValue !== undefined) {
      priceFilter.gte = minPriceValue;
    }
    if (maxPriceValue !== undefined) {
      priceFilter.lte = maxPriceValue;
    }
    if (Object.keys(priceFilter).length > 0) {
      where.price = priceFilter;
    }

    const sortOption = Array.isArray(sort) ? sort[0] : sort;
    const orderBy: Prisma.DigitalProductOrderByWithRelationInput[] = [];

    switch (sortOption) {
      case 'price_asc':
        orderBy.push({ price: 'asc' });
        break;
      case 'price_desc':
        orderBy.push({ price: 'desc' });
        break;
      case 'new':
        orderBy.push({ createdAt: 'desc' });
        break;
      case 'featured':
        orderBy.push({ isFeatured: 'desc' }, { createdAt: 'desc' });
        break;
      case 'sales':
        orderBy.push({ salesCount: 'desc' });
        break;
      case 'popular':
        orderBy.push({ isFeatured: 'desc' }, { salesCount: 'desc' }, { createdAt: 'desc' });
        break;
      default:
        orderBy.push({ isFeatured: 'desc' }, { salesCount: 'desc' }, { createdAt: 'desc' });
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
      orderBy,
    });

    res.json({
      success: true,
      data: toProductsResponse(products)
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
      data: toProductResponse(product)
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
      data: toProductsResponse(products)
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

    if (!title || !productType) {
      res.status(400).json({
        success: false,
        message: 'Title and product type are required',
      });
      return;
    }

    const normalizedFeatures = normalizeStringArray(features) ?? [];
    const normalizedRequirements = normalizeStringArray(requirements) ?? [];
    const priceValue = parseOptionalNumber(price) ?? 0;
    const fileSizeValue = parseOptionalBigInt(fileSize);

    const product = await prisma.digitalProduct.create({
      data: {
        title,
        description,
        price: priceValue,
        productType,
        fileUrl,
        fileSize: fileSizeValue,
        coverImage,
        previewUrl,
        features: normalizedFeatures,
        requirements: normalizedRequirements,
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
      data: toProductResponse(product),
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

    const priceValue = parseOptionalNumber(price);
    const fileSizeProvided = fileSize !== undefined;
    const fileSizeValue = parseOptionalBigInt(fileSize);
    const normalizedFeatures = normalizeStringArray(features);
    const normalizedRequirements = normalizeStringArray(requirements);
    const isActiveValue = parseOptionalBoolean(isActive);
    const isFeaturedValue = parseOptionalBoolean(isFeatured);

    const data: Prisma.DigitalProductUpdateInput = {};

    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (productType !== undefined) data.productType = productType;
    if (fileUrl !== undefined) data.fileUrl = fileUrl;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (previewUrl !== undefined) data.previewUrl = previewUrl;
    if (priceValue !== undefined) data.price = priceValue;
    if (fileSizeProvided) data.fileSize = fileSizeValue;
    if (normalizedFeatures !== undefined) data.features = normalizedFeatures;
    if (normalizedRequirements !== undefined) data.requirements = normalizedRequirements;
    if (isActiveValue !== undefined) data.isActive = isActiveValue;
    if (isFeaturedValue !== undefined) data.isFeatured = isFeaturedValue;

    const updated = await prisma.digitalProduct.update({
      where: { id },
      data,
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
      data: toProductResponse(updated),
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
      data: toPurchaseResponse(purchase),
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
      data: purchases.map(toPurchaseResponse)
    });
  } catch (error) {
    next(error);
  }
};

export const getProductMeta = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeWhere: Prisma.DigitalProductWhereInput = { isActive: true };

    const [
      typeCounts,
      priceStats,
      totalProducts,
      featuredCount,
      creatorIds,
      revenueStats,
    ] = await Promise.all([
      prisma.digitalProduct.groupBy({
        by: ['productType'],
        where: activeWhere,
        _count: { _all: true },
      }),
      prisma.digitalProduct.aggregate({
        where: activeWhere,
        _min: { price: true },
        _max: { price: true },
      }),
      prisma.digitalProduct.count({ where: activeWhere }),
      prisma.digitalProduct.count({ where: { ...activeWhere, isFeatured: true } }),
      prisma.digitalProduct.findMany({
        where: activeWhere,
        distinct: ['creatorId'],
        select: { creatorId: true },
      }),
      prisma.digitalProduct.aggregate({
        where: activeWhere,
        _sum: { revenue: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        types: typeCounts.map(item => ({
          type: item.productType,
          count: item._count._all,
        })),
        priceRange: {
          min: priceStats._min.price ?? 0,
          max: priceStats._max.price ?? 0,
        },
        stats: {
          totalProducts,
          featuredCount,
          creatorCount: creatorIds.length,
          totalRevenue: revenueStats._sum.revenue ?? 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductCollections = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const include: Prisma.DigitalProductInclude = {
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
      _count: {
        select: { purchases: true },
      },
    };

    const whereActive: Prisma.DigitalProductWhereInput = { isActive: true };

    const [featured, topSelling, newArrivals] = await Promise.all([
      prisma.digitalProduct.findMany({
        where: { ...whereActive, isFeatured: true },
        include,
        orderBy: [{ updatedAt: 'desc' }],
        take: 6,
      }),
      prisma.digitalProduct.findMany({
        where: whereActive,
        include,
        orderBy: [{ salesCount: 'desc' }, { revenue: 'desc' }],
        take: 6,
      }),
      prisma.digitalProduct.findMany({
        where: whereActive,
        include,
        orderBy: [{ createdAt: 'desc' }],
        take: 6,
      }),
    ]);

    res.json({
      success: true,
      data: {
        featured: toProductsResponse(featured),
        topSelling: toProductsResponse(topSelling),
        newArrivals: toProductsResponse(newArrivals),
      },
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
