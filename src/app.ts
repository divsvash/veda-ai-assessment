// src/app.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler, notFound } from './middleware/errorHandler';
import assignmentRoutes from './routes/assignment.routes';
import healthRoutes from './routes/health.routes';

export function createApp(): express.Application {
  const app = express();

  // ─── Core Middleware ──────────────────────────────────────────────────────────
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ─── Routes ───────────────────────────────────────────────────────────────────
  app.use('/health', healthRoutes);
  app.use('/api/assignments', assignmentRoutes);

  // Root info
  app.get('/', (_req, res) => {
    res.json({
      name: 'VedaAI Assessment Creator API',
      version: '1.0.0',
      docs: '/health',
      endpoints: {
        assignments: '/api/assignments',
        health: '/health',
        websocket: 'ws://HOST/ws?assignmentId=ID',
      },
      architecture: {
        flow: [
          'Client → POST /api/assignments',
          'API → MongoDB (save) + BullMQ (enqueue)',
          'Worker → Claude AI → parse structured output',
          'Worker → MongoDB (save output) + Redis (cache)',
          'Worker → WebSocket broadcast to subscribed clients',
          'Client → GET /api/assignments/:id/output',
        ],
      },
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
