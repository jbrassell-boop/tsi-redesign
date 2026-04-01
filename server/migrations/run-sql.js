/**
 * Run a .sql file against SQL Server, splitting on GO statements.
 * Usage: node server/migrations/run-sql.js server/migrations/phase3-child-tables.sql
 */
const sql = require('mssql/msnodesqlv8');
const fs = require('fs');
const path = require('path');

const config = {
  driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;',
  requestTimeout: 600000,
  pool: { max: 1 }
};

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) { console.error('Usage: node run-sql.js <file.sql>'); process.exit(1); }

  const fullPath = path.resolve(sqlFile);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Split on GO (case-insensitive, must be on its own line)
  const batches = content.split(/^\s*GO\s*$/gmi).filter(b => b.trim().length > 0);
  console.log(`[${ts()}] Loaded ${fullPath}: ${batches.length} batches`);

  const pool = await sql.connect(config);
  let batchNum = 0;

  for (const batch of batches) {
    batchNum++;
    const trimmed = batch.trim();
    if (!trimmed) continue;

    // Extract any PRINT statements for logging context
    const prints = trimmed.match(/PRINT\s+'([^']+)'/g);
    const label = prints ? prints[0].replace(/PRINT\s+'/, '').replace(/'$/, '') : `Batch ${batchNum}`;

    try {
      const req = pool.request();
      req.timeout = 600000;

      // Capture PRINT output
      const messages = [];
      req.on('info', msg => messages.push(msg.message));

      await req.batch(trimmed);

      // Show PRINT output
      for (const m of messages) {
        if (m && m.trim()) console.log(`[${ts()}] ${m}`);
      }
    } catch (e) {
      console.error(`[${ts()}] ERROR in batch ${batchNum} (${label}):`);
      console.error(`  ${e.message}`);
      // Continue with next batch — don't stop on error
    }
  }

  console.log(`[${ts()}] All ${batchNum} batches executed.`);
  await pool.close();
}

function ts() { return new Date().toISOString().slice(11, 19); }

main().catch(e => { console.error(e); process.exit(1); });
