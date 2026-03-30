// ═══════════════════════════════════════════════════════
//  TSI Express API Server
//  Connects to local SQL Server (WinScopeNet)
//  Mirrors BrightLogix API endpoints for local development
// ═══════════════════════════════════════════════════════
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const ROOT = path.resolve(__dirname, '..');

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
app.use('/api', require('./routes/generate-csa'));
app.use('/api', require('./routes/pending-contracts'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api', require('./routes/reports'));
app.use('/api', require('./routes/floor-meeting'));
app.use('/api', require('./routes/invoices'));
app.use('/api', require('./routes/supplier-pos'));
app.use('/api', require('./routes/analytics'));
app.use('/api', require('./routes/tasks'));
app.use('/api', require('./routes/suppliers'));
app.use('/api', require('./routes/flags'));
app.use('/api', require('./routes/scope-models'));
app.use('/api', require('./routes/sub-groups'));
app.use('/api', require('./routes/max-charges'));
app.use('/api', require('./routes/financials'));
app.use('/api', require('./routes/documents'));
app.use('/api', require('./routes/inventory'));
app.use('/api', require('./routes/loaners'));
app.use('/api', require('./routes/emails'));
app.use('/api', require('./routes/endocarts'));
app.use('/api', require('./routes/quality'));
app.use('/api', require('./routes/acquisitions'));
app.use('/api', require('./routes/product-sales'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/pending-arrivals'));
app.use('/api', require('./routes/development-list'));

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ── Static file serving (HTML, CSS, JS, assets) ────────
// Serve static assets (css, js, images, fonts, etc.)
app.use(express.static(ROOT, { extensions: ['html'] }));

// Clean URLs: /clients → clients.html, /dashboard → dashboard.html
app.use((req, res, next) => {
  // Skip API routes and files with extensions
  if (req.path.startsWith('/api') || path.extname(req.path)) return next();
  // Try to find matching .html file
  const htmlPath = path.join(ROOT, req.path + '.html');
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
  // Fallback to index.html
  const indexPath = path.join(ROOT, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  next();
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
