import { Router, Request, Response } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import passport from '../config/passport';
import { generateToken } from '../utils/jwt';

const router = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me
router.get('/me', authenticate as any, getMe);

// GitHub OAuth routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: process.env.CORS_ORIGIN + '/login?error=github_auth_failed'
  }),
  (req, res) => {
    const { user, token } = req.user as any;
    // Redirect to frontend with token
    res.redirect(`${process.env.CORS_ORIGIN}/auth/callback?token=${token}`);
  }
);

export default router;
