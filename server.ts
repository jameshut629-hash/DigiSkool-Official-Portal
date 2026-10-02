// Lock Node.js process environment to Pakistan Standard Time (PKT)
process.env.TZ = 'Asia/Karachi';

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db.ts';
import { apiRouter } from './server/routes.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Immediate Health check endpoints for Cloud Run startup/liveness probes
  app.get(['/health', '/healthz', '/api/health'], (req, res) => {
    res.json({
      status: 'ok',
      service: 'DigiSkool Management Portal API',
      timestamp: new Date().toISOString()
    });
  });

  // Start listening immediately so container port 3000 responds to health checks right away
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`DigiSkool Server listening on http://0.0.0.0:${PORT}`);
  });

  // Initialize SQLite Database schema and seed data
  try {
    console.log('Initializing DigiSkool SQLite Database...');
    await getDb();
    console.log('DigiSkool Database ready.');
  } catch (dbErr) {
    console.error('Database initialization error:', dbErr);
  }

  // Mount API Router
  app.use('/api', apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  return server;
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
