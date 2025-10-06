import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import prisma from '../utils/prisma';
import { generateToken } from '../utils/jwt';

export const configurePassport = () => {
  // GitHub Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/api/auth/github/callback',
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value;

            if (!email) {
              return done(new Error('No email found in GitHub profile'), null);
            }

            // Check if user exists
            let user = await prisma.user.findUnique({
              where: { email },
            });

            // Create user if doesn't exist
            if (!user) {
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName || profile.username,
                  avatar: profile.photos?.[0]?.value,
                  password: '', // No password for OAuth users
                  githubId: profile.id,
                },
              });
            } else if (!user.githubId) {
              // Link GitHub account if user exists but doesn't have GitHub linked
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  githubId: profile.id,
                  avatar: user.avatar || profile.photos?.[0]?.value,
                },
              });
            }

            // Generate JWT token
            const token = generateToken({
              userId: user.id,
              email: user.email,
              username: user.name,
              role: user.role,
            });

            return done(null, { user, token });
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
  }

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
};

export default passport;
