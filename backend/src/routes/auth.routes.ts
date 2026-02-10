import { Router } from 'express';
import { register, login, googleAuthCallback, acceptInvite } from '../controllers/auth.controller';
import passport from '../config/passport';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/accept-invite', acceptInvite);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
    googleAuthCallback
);

export default router;
