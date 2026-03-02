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
import { getAllowedOrigins } from './config/runtime';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Configure Passport
configurePassport();

// Middleware
app.use(helmet());
app.use(compression()); // Compress all responses
app.use(cookieParser()); // Use cookie-parser before CORS if needed, or generally just before routes
app.use(cors({
    origin: getAllowedOrigins(),
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
app.use(rateLimiterMiddleware('general')); // Global limit
app.use('/api/auth', rateLimiterMiddleware('auth')); // Stricter auth limit
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
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
