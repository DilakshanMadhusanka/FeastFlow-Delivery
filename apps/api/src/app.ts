import path from 'path';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { sendSuccess } from './utils/response';
import { NotFoundError } from './utils/errors';

import apiRoutes from './routes';

export function createApp(): Application {
  const app: Application = express();

  // Security Middleware
  app.use(helmet({ crossOriginResourcePolicy: false })); // allow static image fetching across domains
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (like native mobile apps, curl, server-to-server)
        if (!requestOrigin) return callback(null, true);
        const staticAllowed = [
          env.FRONTEND_WEB_URL,
          env.MOBILE_APP_URL,
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:8081',
          'http://127.0.0.1:8081',
          'http://localhost:8082',
          'http://127.0.0.1:8082',
        ];
        if (
          staticAllowed.includes(requestOrigin) ||
          /^https?:\/\/localhost(:\d+)?$/.test(requestOrigin) ||
          /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(requestOrigin)
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Serve uploaded images statically
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'public/uploads')));

  // Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Logging Middleware
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // Health Check
  app.get('/health', (_req: Request, res: Response) => {
    return sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() }, 'Service is operational');
  });

  // Base API Info
  app.get('/api/v1', (_req: Request, res: Response) => {
    return sendSuccess(
      res,
      {
        name: 'FeastFlow Food Delivery API',
        version: '1.0.0',
        documentation: '/api/v1/docs',
      },
      'Welcome to FeastFlow API v1'
    );
  });

  // Mount API Domain Routes
  app.use('/api/v1', apiRoutes);

  // Fallthrough 404 handler
  app.use((req: Request) => {
    throw new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`);
  });

  // Global Centralized Error Handling
  app.use(errorHandler);

  return app;
}
