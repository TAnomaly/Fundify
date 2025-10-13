import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

// Types
import { ApiError } from './types';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Configure Passport
configurePassport();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/api/', limiter);

// Serve uploaded files statically with CORS headers
app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers for uploaded files - allow all origins for public media
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://funify.vercel.app',
    'https://fundify.vercel.app',
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // For static media, allow any origin (since they're public anyway)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
});

export default app;
