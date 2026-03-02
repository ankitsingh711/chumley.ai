import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './db';
import Logger from '../utils/logger';


export const configurePassport = () => {
    const clientID = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const callbackURL = process.env.GOOGLE_CALLBACK_URL?.trim();

    if (!clientID || !clientSecret || !callbackURL) {
        Logger.warn('Google OAuth is disabled because GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL are not fully configured');
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID,
                clientSecret,
                callbackURL,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Extract user info from Google profile
                    const email = profile.emails?.[0]?.value;
                    const name = profile.displayName;

                    if (!email) {
                        return done(new Error('No email found in Google profile'), undefined);
                    }

                    // Find or create user
                    let user = await prisma.user.findUnique({
                        where: { email },
                    });

                    if (!user) {
                        return done(new Error('No invited account found for this Google email'), undefined);
                    }

                    if (user.status !== 'ACTIVE') {
                        return done(new Error('Your account is not active yet'), undefined);
                    }

                    return done(null, user);
                } catch (error) {
                    return done(error as Error, undefined);
                }
            }
        )
    );

    // Serialize user for session (not used with JWT but required by passport)
    passport.serializeUser((user: any, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await prisma.user.findUnique({ where: { id } });
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
};

export default passport;
