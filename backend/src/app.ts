import express, { Express } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { env, AppConfig } from './config/env';
import { pool as defaultPool } from './db/pool';
import healthRouter from './routes/health';
import { errorHandler } from './middleware/errorHandler';
import {
  securityHeadersMiddleware,
  csrfProtectionMiddleware,
  createUserLoaderMiddleware,
} from './middleware/security';
import { createRateLimiters } from './middleware/rateLimiter';
import { UserRepository } from './repositories/userRepository';
import { ProjectRepository } from './repositories/projectRepository';
import { AuthService } from './services/authService';
import { ProjectService } from './services/projectService';
import { AuthController } from './controllers/authController';
import { ProjectController } from './controllers/projectController';
import { createAuthRouter } from './routes/auth';
import { createProfileRouter } from './routes/profile';
import { createDirectoryRouter } from './routes/directory';
import { createProjectRouter } from './routes/projects';

export function createApp(
  configOverrides?: Partial<AppConfig>,
  customPool?: Pool
): Express {
  const config: AppConfig = {
    ...env,
    ...configOverrides,
  };

  const pool = customPool || defaultPool;
  const app = express();

  // 1. Disable X-Powered-By
  app.disable('x-powered-by');

  // 2. Trust proxy
  app.set('trust proxy', config.TRUST_PROXY_HOPS);

  // 3. Security headers (Cache-Control: no-store, X-Content-Type-Options: nosniff)
  app.use(securityHeadersMiddleware);

  // 4. JSON body parser (100kb limit)
  app.use(express.json({ limit: '100kb' }));

  // 5. Inject app config onto req
  app.use((req, _res, next) => {
    req.appConfig = config;
    next();
  });

  // 6. Session with connect-pg-simple
  const PgSession = connectPgSimple(session);
  const sessionStore = new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: false,
  });

  const secureOption: boolean | 'auto' =
    config.COOKIE_SECURE === 'true'
      ? true
      : config.COOKIE_SECURE === 'false'
      ? false
      : 'auto';

  app.use(
    session({
      store: sessionStore,
      name: 'projecthub.sid',
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureOption,
        maxAge: config.SESSION_TTL_HOURS * 3600 * 1000,
      },
    })
  );

  // 7. CSRF protection (Origin check + X-CSRF-Token comparison)
  app.use(csrfProtectionMiddleware);

  // 8. User loader (populates req.user from session, destroys session if user deleted)
  app.use(createUserLoaderMiddleware(pool));

  // 9. Rate limiters
  const rateLimiters = createRateLimiters(config);

  // 10. DI Services & Controllers
  const userRepo = new UserRepository(pool);
  const authService = new AuthService(userRepo, config);
  const authController = new AuthController(authService);

  const projectRepo = new ProjectRepository();
  const projectService = new ProjectService(pool, projectRepo, userRepo);
  const projectController = new ProjectController(projectService);

  // 11. Routes
  app.use('/api', healthRouter);
  app.use('/api/auth', createAuthRouter(authController, rateLimiters));
  app.use('/api/profile', createProfileRouter(authController, rateLimiters));
  app.use('/api', createDirectoryRouter(authController, rateLimiters));
  app.use('/api/projects', createProjectRouter(projectController));

  // 12. Central error handler
  app.use(errorHandler);

  return app;
}

const defaultApp = createApp();
export default defaultApp;
