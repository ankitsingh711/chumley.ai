import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import router from './routes';
import Logger from './utils/logger';
import { configurePassport } from './config/passport';
import passport from 'passport';
import { rateLimiterMiddleware } from './middleware/rateLimiter.middleware';
import { authenticate } from './middleware/auth.middleware';
import { getAllowedOrigins } from './config/runtime';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const allowedOrigins = new Set(getAllowedOrigins());

// Configure Passport
configurePassport();

// Middleware
app.use(helmet());
app.use(compression()); // Compress all responses
app.use(cookieParser()); // Use cookie-parser before CORS if needed, or generally just before routes
app.use(cors({
    origin: Array.from(allowedOrigins),
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic CSRF mitigation for cookie-authenticated browser requests.
app.use((req, res, next) => {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return next();
    }

    const origin = req.headers.origin;
    if (!origin) {
        return next();
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (!allowedOrigins.has(normalizedOrigin)) {
        return res.status(403).json({ error: 'Invalid request origin' });
    }

    next();
});

// Rate Limiting
app.use(rateLimiterMiddleware('general')); // Global limit
app.use('/api/auth', rateLimiterMiddleware('auth')); // Stricter auth limit
import path from 'path';
app.use('/uploads', authenticate, express.static(path.join(process.cwd(), 'uploads')));
app.use(passport.initialize());

// Logger
const morganFormat = ':method :url :status :response-time ms';
app.use(
    morgan(morganFormat, {
        stream: {
            write: (message) => Logger.http(message.trim()),
        },
    })
);

// Routes
app.use('/api', router);

// explicit legacy route for email template PDF backwards compatibility
import exportRoutes from './routes/export.routes';
app.use('/api/v1/export', exportRoutes);

// Error Handling (Basic)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    Logger.error(err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
