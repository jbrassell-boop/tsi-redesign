// ═══════════════════════════════════════════════════════
//  TSI Express API Server
//  Connects to local SQL Server (WinScopeNet)
//  Mirrors BrightLogix API endpoints for local development
// ═══════════════════════════════════════════════════════
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: true })); // allow all origins in dev
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const color = res.statusCode < 400 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${req.method}\x1b[0m ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const row = await db.queryOne('SELECT DB_NAME() AS db, GETDATE() AS ts, @@VERSION AS ver');
    res.json({ status: 'connected', database: row.db, timestamp: row.ts, version: row.ver.split('\n')[0] });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Route modules
app.use('/api', require('./routes/lookups'));
app.use('/api', require('./routes/repairs'));
app.use('/api', require('./routes/repair-details'));
app.use('/api', require('./routes/repair-status'));
app.use('/api', require('./routes/clients'));
app.use('/api', require('./routes/departments'));
app.use('/api', require('./routes/scopes'));
app.use('/api', require('./routes/contracts'));

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('\x1b[31m[ERROR]\x1b[0m', err.message);
  res.status(500).json({ error: err.message });
});

// Start
(async () => {
  try {
    await db.connect();
    app.listen(PORT, () => {
      console.log(`\n\x1b[36m[TSI Server]\x1b[0m http://localhost:${PORT}/api`);
      console.log(`\x1b[36m[TSI Server]\x1b[0m Add ?api=local to any page URL to use this server\n`);
    });
  } catch (e) {
    console.error('\x1b[31m[FATAL]\x1b[0m Failed to connect to SQL Server:', e.message);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[TSI Server] Shutting down...');
  await db.close();
  process.exit(0);
});
