import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import router from './routes';
import Logger from './utils/logger';
import { configurePassport } from './config/passport';
import passport from 'passport';

const app = express();

// Configure Passport
configurePassport();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
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
