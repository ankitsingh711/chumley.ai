import { Router } from 'express';
import { register, login, googleAuthCallback, acceptInvite, getMe, logout } from '../controllers/auth.controller';
import passport from '../config/passport';
import { authenticate } from '../middleware/auth.middleware';
import { getFrontendUrl } from '../config/runtime';

const router = Router();
const FRONTEND_URL = getFrontendUrl();
const googleOAuthConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim() &&
    process.env.GOOGLE_CALLBACK_URL?.trim()
);

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.post('/accept-invite', acceptInvite);

// Google OAuth routes
if (googleOAuthConfigured) {
    router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
    router.get('/google/callback',
        passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=auth_failed` }),
        googleAuthCallback
    );
} else {
    router.get('/google', (_req, res) => res.status(503).json({ error: 'Google OAuth is not configured' }));
    router.get('/google/callback', (_req, res) => res.redirect(`${FRONTEND_URL}/login?error=auth_unavailable`));
}

export default router;
