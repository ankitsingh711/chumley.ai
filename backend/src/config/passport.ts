import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const configurePassport = () => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID || '',
                clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
                callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
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
                        // Create new user if doesn't exist
                        user = await prisma.user.create({
                            data: {
                                email,
                                name: name || email.split('@')[0],
                                password: '', // No password for OAuth users
                                role: 'REQUESTER', // Default role
                            },
                        });
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
