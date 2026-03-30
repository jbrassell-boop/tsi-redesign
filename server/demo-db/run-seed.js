#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
//  run-seed.js — Create TSI_Demo database and seed it
//  Usage: node server/demo-db/run-seed.js
// ═══════════════════════════════════════════════════════
const sql = require('mssql/msnodesqlv8');
const fs = require('fs');
const path = require('path');

const DB_NAME = 'TSI_Demo';

const masterConfig = {
  database: 'master',
  driver: 'msnodesqlv8',
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=master;Trusted_Connection=yes;TrustServerCertificate=yes;',
  pool: { max: 5, min: 1, idleTimeoutMillis: 30000 }
};

const demoConfig = {
  database: DB_NAME,
  driver: 'msnodesqlv8',
  connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${DB_NAME};Trusted_Connection=yes;TrustServerCertificate=yes;`,
  pool: { max: 5, min: 1, idleTimeoutMillis: 30000 }
};

// Split SQL on GO batches (mssql doesn't support GO)
function splitBatches(sqlText) {
  return sqlText
    .split(/^\s*GO\s*$/mi)
    .map(b => b.trim())
    .filter(b => b.length > 0);
}

async function runSqlFile(pool, filePath) {
  const label = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const batches = splitBatches(content);
  // If no GO statements, treat entire file as one batch
  const statements = batches.length > 0 ? batches : [content];

  for (const batch of statements) {
    if (!batch.trim()) continue;
    try {
      await pool.request().query(batch);
    } catch (err) {
      console.error(`  [ERROR in ${label}] ${err.message}`);
      // Log first 200 chars of failing SQL for debugging
      console.error(`  SQL: ${batch.substring(0, 200)}...`);
      throw err;
    }
  }
  console.log(`  ✓ ${label}`);
}

async function main() {
  console.log(`\n═══ TSI Demo Database Seed ═══\n`);

  // Step 1: Drop and create database
  console.log(`[1/4] Creating database ${DB_NAME}...`);
  const masterPool = await new sql.ConnectionPool(masterConfig).connect();
  try {
    // Kill existing connections
    await masterPool.request().query(`
      IF EXISTS (SELECT 1 FROM sys.databases WHERE name = '${DB_NAME}')
      BEGIN
        ALTER DATABASE [${DB_NAME}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE [${DB_NAME}];
      END
    `);
    await masterPool.request().query(`CREATE DATABASE [${DB_NAME}]`);
    console.log(`  ✓ Database ${DB_NAME} created\n`);
  } finally {
    await masterPool.close();
  }

  // Step 2: Run schema files
  console.log('[2/4] Running schema scripts...');
  const demoPool = await new sql.ConnectionPool(demoConfig).connect();
  try {
    const schemaDir = path.join(__dirname, 'schema');
    const schemaFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of schemaFiles) {
      await runSqlFile(demoPool, path.join(schemaDir, file));
    }
    console.log();

    // Step 3: Run seed files
    console.log('[3/4] Running seed scripts...');
    const seedDir = path.join(__dirname, 'seed');
    const seedFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of seedFiles) {
      await runSqlFile(demoPool, path.join(seedDir, file));
    }
    console.log();

    // Step 4: Verify counts
    console.log('[4/4] Verifying data...');
    const tables = [
      'tblServiceLocations', 'tblRepairStatuses', 'tblManufacturers', 'tblScopeType',
      'tblSalesRep', 'tblClient', 'tblDepartment', 'tblScope', 'tblTechnicians',
      'tblRepair', 'tblRepairItemTran', 'tblRepairItem', 'tblContract',
      'tblContractDepartments', 'tblContractScope', 'tblInvoice',
      'tblGP_InvoiceStaging', 'tblInventory', 'tblInventorySize',
      'tblSupplier', 'tblSupplierPO', 'tblUsers', 'tblContacts', 'tblLoanerTran'
    ];
    for (const table of tables) {
      try {
        const result = await demoPool.request().query(`SELECT COUNT(*) AS cnt FROM ${table}`);
        const cnt = result.recordset[0].cnt;
        console.log(`  ${table.padEnd(30)} ${cnt} rows`);
      } catch (e) {
        console.log(`  ${table.padEnd(30)} [ERROR: ${e.message}]`);
      }
    }

    console.log(`\n═══ Done! Database ${DB_NAME} is ready. ═══`);
    console.log(`Update server/db.js: database → '${DB_NAME}'`);
    console.log(`Then: npm run server\n`);
  } finally {
    await demoPool.close();
  }
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
