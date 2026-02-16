import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import router from './routes';
import Logger from './utils/logger';
import { configurePassport } from './config/passport';
import passport from 'passport';
import { rateLimiterMiddleware } from './middleware/rateLimiter.middleware';

const app = express();

// Configure Passport
configurePassport();

// Middleware
app.use(helmet());
app.use(cookieParser()); // Use cookie-parser before CORS if needed, or generally just before routes
app.use(cors({
    origin: process.env.FRONTEND_URL, // Ensure explicit origin for credentials
    credentials: true
}));
app.use(express.json());

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

// Error Handling (Basic)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    Logger.error(err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
