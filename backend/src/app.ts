import express from 'express';
import { env } from './config/env';
import healthRouter from './routes/health';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.disable('x-powered-by');

// Trust proxy
app.set('trust proxy', env.TRUST_PROXY_HOPS);

app.use(express.json());

// Routes
app.use('/api', healthRouter);

// Central error handler (must be last)
app.use(errorHandler);

export default app;
