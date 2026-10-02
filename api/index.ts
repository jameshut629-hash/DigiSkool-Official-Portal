process.env.TZ = 'Asia/Karachi';

import express, { Request, Response } from 'express';
import { getDb } from '../server/db.ts';
import { apiRouter } from '../server/routes.ts';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Immediate health check
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'DigiSkool Management Portal API (Vercel Serverless)',
    timestamp: new Date().toISOString()
  });
});

// Lazy initialize database
let dbReadyPromise: Promise<any> | null = null;
app.use(async (req: Request, res: Response, next) => {
  try {
    if (!dbReadyPromise) {
      dbReadyPromise = getDb();
    }
    await dbReadyPromise;
  } catch (err) {
    console.error('Database initialization error on serverless function:', err);
  }
  next();
});

// Mount routes on /api and root
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Universal Vercel Serverless Handler
export default function handler(req: any, res: any) {
  return app(req, res);
}
