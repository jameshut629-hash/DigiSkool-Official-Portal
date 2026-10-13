// Lock Node.js process environment to Pakistan Standard Time (PKT)
process.env.TZ = 'Asia/Karachi';

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db.ts';
import { apiRouter } from './server/routes.ts';
import { securityHeaders, apiRateLimiter, sqlInjectionGuard } from './server/security.ts';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // 1. Enterprise HTTP Security Headers & Tamper Protection
  app.use(securityHeaders);

  // 2. Global API Rate Limiter
  app.use('/api', apiRateLimiter);

  // 3. Body parser with strict size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. SQL Injection and Malicious Input Firewall
  app.use(sqlInjectionGuard);

  // Immediate Health check endpoints for probes and liveness
  app.get(['/health', '/healthz', '/api/health'], (req, res) => {
    res.json({
      status: 'ok',
      service: 'DigiSkool Management Portal API',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Router
  app.use('/api', apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Initialize SQLite Database schema and seed data
  try {
    await getDb();
    console.log('DigiSkool Database ready.');
  } catch (dbErr) {
    console.error('Database initialization error:', dbErr);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`DigiSkool Server listening on http://0.0.0.0:${PORT}`);
  });

  return server;
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
