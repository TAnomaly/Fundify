import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions, CorsOptionsDelegate } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import path from 'path';
import { configurePassport } from './config/passport';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import campaignRoutes from './routes/campaigns';
import donationRoutes from './routes/donations';
import commentRoutes from './routes/comments';
import withdrawalRoutes from './routes/withdrawals';
import membershipTierRoutes from './routes/membershipTier.routes';
import subscriptionRoutes from './routes/subscription.routes';
import creatorPostRoutes from './routes/creatorPost.routes';
import stripeRoutes from './routes/stripe.routes';
import webhookRoutes from './routes/webhook.routes';
import uploadRoutes from './routes/upload.routes';
import postEngagementRoutes from './routes/postEngagement.routes';
import articleRoutes from './routes/article.routes';
import eventRoutes from './routes/event.routes';
import pollRoutes from './routes/poll.routes';
import goalRoutes from './routes/goal.routes';
import downloadRoutes from './routes/download.routes';
import messageRoutes from './routes/message.routes';
import analyticsRoutes from './routes/analytics.routes';
import scheduledPostRoutes from './routes/scheduledPost.routes';
import welcomeMessageRoutes from './routes/welcomeMessage.routes';
import podcastRoutes from './routes/podcastRoutes';
import digitalProductRoutes from './routes/digitalProduct.routes';
import notificationRoutes from './routes/notification.routes';

// Types
import { ApiError } from './types';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Configure Passport
configurePassport();

// Behind Railway/Vercel proxies, trust X-Forwarded-* headers for proper rate-limit IPs
app.set('trust proxy', true);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(compression({ level: 6 }));
const staticOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://funify.vercel.app',
  'https://fundify.vercel.app',
  'https://perfect-happiness-production.up.railway.app',
];

const envOriginTokens = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_FRONTEND_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.ADMIN_DASHBOARD_ORIGIN,
  process.env.ALLOWED_ORIGINS,
  process.env.CORS_ORIGINS,
]
  .filter(Boolean)
  .flatMap(token => token!.split(','))
  .map(origin => origin.trim())
  .filter(Boolean);

const normalizeOrigin = (origin?: string | null): string | null => {
  if (!origin) {
    return null;
  }

  return origin.trim().replace(/\/$/, '').toLowerCase();
};

const allowedOriginsSet = new Set(
  [...staticOrigins, ...envOriginTokens]
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin))
);

const wildcardOriginMatchers = [
  /\.vercel\.app$/,
  /\.railway\.app$/,
];

const isAllowedOrigin = (origin?: string | null): boolean => {
  const normalized = normalizeOrigin(origin);

  if (!normalized) {
    return true;
  }

  if (allowedOriginsSet.has(normalized)) {
    return true;
  }

  return wildcardOriginMatchers.some(pattern => pattern.test(normalized));
};

const defaultAllowedHeaders = [
  'Content-Type',
  'Authorization',
  'Cache-Control',
  'X-Requested-With',
  'Accept',
  'Accept-Language',
];

const defaultAllowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

const getAllowedHeaders = (req: Request): string[] => {
  const headers = new Map(
    defaultAllowedHeaders.map(header => [header.toLowerCase(), header]),
  );
  const requested = req.headers['access-control-request-headers'];

  const addHeader = (header: string) => {
    if (!header) {
      return;
    }
    const trimmed = header.trim();
    if (!trimmed) {
      return;
    }
    headers.set(trimmed.toLowerCase(), trimmed);
  };

  if (typeof requested === 'string') {
    requested.split(',').forEach(addHeader);
  } else if (Array.isArray(requested)) {
    (requested as string[]).forEach((value) => value.split(',').forEach(addHeader));
  }

  return Array.from(headers.values());
};

const buildCorsOptions = (req: Request): CorsOptions => {
  const origin = req.header('Origin') || undefined;

  if (!isAllowedOrigin(origin)) {
    const corsError = new Error(`CORS origin not allowed: ${origin}`) as ApiError;
    corsError.statusCode = 403;
    throw corsError;
  }

  return {
    origin: origin || true,
    credentials: true,
    methods: defaultAllowedMethods,
    allowedHeaders: getAllowedHeaders(req),
    optionsSuccessStatus: 204,
  };
};

const corsOptionsDelegate: CorsOptionsDelegate<Request> = (req, callback) => {
  try {
    const options = buildCorsOptions(req);
    callback(null, options);
  } catch (error) {
    const corsError = error as ApiError;
    callback(corsError, { origin: false });
  }
};

app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));

// Normalise response headers for downstream handlers (including error responses)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV !== 'production') {
      res.header('Access-Control-Allow-Origin', '*');
    }
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  const allowedHeaders = getAllowedHeaders(req);
  res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  res.header('Access-Control-Allow-Methods', defaultAllowedMethods.join(', '));
  res.header('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});
app.use(morgan('dev'));

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({
  reviver: (key, value) => {
    // Handle BigInt serialization
    if (typeof value === 'string' && /^\d+n$/.test(value)) {
      return parseInt(value.slice(0, -1));
    }
    return value;
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/api/', limiter);

// Serve uploaded files statically with CORS headers
app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers for uploaded files - allow all origins for public media
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // For static media, allow any origin (since they're public anyway)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  const allowedHeaders = getAllowedHeaders(req);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  // Set proper Content-Type for video files
  const filePath = req.path.toLowerCase();
  if (filePath.endsWith('.mp4')) {
    res.setHeader('Content-Type', 'video/mp4');
  } else if (filePath.endsWith('.webm')) {
    res.setHeader('Content-Type', 'video/webm');
  } else if (filePath.endsWith('.ogg')) {
    res.setHeader('Content-Type', 'video/ogg');
  } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
    res.setHeader('Content-Type', 'image/jpeg');
  } else if (filePath.endsWith('.png')) {
    res.setHeader('Content-Type', 'image/png');
  } else if (filePath.endsWith('.gif')) {
    res.setHeader('Content-Type', 'image/gif');
  } else if (filePath.endsWith('.webp')) {
    res.setHeader('Content-Type', 'image/webp');
  }

  next();
}, express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/memberships', membershipTierRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/posts', creatorPostRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', postEngagementRoutes);
app.use('/api', articleRoutes);
app.use('/api', eventRoutes);
app.use('/api', pollRoutes);
app.use('/api', goalRoutes);
app.use('/api', downloadRoutes);
app.use('/api', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/scheduled-posts', scheduledPostRoutes);
app.use('/api/welcome-messages', welcomeMessageRoutes);
app.use('/api/podcasts', podcastRoutes);
app.use('/api', digitalProductRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use((err: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Auto-fix database tables in background (non-blocking)
  import('./startup-fix').then(({ ensureDatabaseTables }) => {
    ensureDatabaseTables().catch(err => {
      console.error('⚠️  Database auto-fix failed (non-critical):', err.message);
    });
  }).catch(() => {
    // Silently ignore if startup-fix doesn't exist
  });

  // Start content schedulers (auto-publish scheduled content)
  import('./services/scheduler').then(({ startSchedulers }) => {
    startSchedulers();
  }).catch(err => {
    console.error('⚠️  Failed to start schedulers:', err.message);
  });

  // Test Redis and RabbitMQ connections on startup
  import('./utils/redis').then(({ getRedis }) => {
    const redis = getRedis();
    if (redis) {
      console.log('✅ Redis connected');
      redis.ping().then(() => {
        console.log('✅ Redis ready');
      }).catch(() => {
        console.log('⚠️  Redis ping failed');
      });
    } else {
      console.log('⚠️  Redis not configured');
    }
  }).catch(() => {
    console.log('⚠️  Redis module not found');
  });

  import('./utils/rabbitmq').then(({ getRabbitChannel }) => {
    getRabbitChannel().then((channel: any) => {
      if (channel) {
        console.log('✅ CLOUD_AMQP channel created');
      } else {
        console.log('⚠️  CLOUD_AMQP not configured');
      }
    }).catch(() => {
      console.log('⚠️  CLOUD_AMQP connection failed');
    });
  }).catch(() => {
    console.log('⚠️  RabbitMQ module not found');
  });
});

export default app;
