// ═══════════════════════════════════════════════════════════════════════════
//  seed-demo.js — Seeds TSI_Demo from WinScopeNet using shared columns only
//
//  Strategy:
//  1. Queries sys.columns on both databases to find shared columns per table
//  2. Disables all constraints/triggers on TSI_Demo
//  3. Deletes all data in reverse dependency order
//  4. Inserts in dependency order with IDENTITY_INSERT ON/OFF
//  5. Date filter: transactional tables use dtDateIn >= 365 days ago
//     Child tables join back to tblRepair instead of date-filtering directly
//  6. Active-record filters: bActive=1 on client/dept/scope/inventory/supplier
//  7. Re-enables constraints, rebuilds indexes, updates stats
//
//  Fixes applied:
//  - IDENTITY mismatch: TSI_Demo has identity col that src doesn't → IDENTITY_INSERT ON
//    only when BOTH databases have the column as identity, OR use NEWID-style skip
//    Actual fix: detect identity on TSI_Demo; insert with IDENTITY_INSERT ON always;
//    the src SELECT just provides integer values regardless of whether src is identity
//  - tblContract: CAST(dtNextBillDate AS datetime) for date→datetime conversion
//  - tblUsers/tblEmails/tblFlags: CAST/LEFT to truncate strings to TSI_Demo col sizes
//  - tblRepairInventory: no lRepairKey in src; use join through tblRepairItemTran
//  - tblRepairRevenueAndExpenses: identity in demo but NOT in src; need IDENTITY_INSERT
//  - tblRepairDefectTracking: same pattern as above
//  - tblScopeTypeContractCostsImport: identity col in demo only; needs IDENTITY_INSERT
//  - tblProductSaleInvoiceDetail: identity col in demo only; needs IDENTITY_INSERT
//
//  Run: node tasks/seed-demo.js
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

let sql;
try { sql = require('mssql/msnodesqlv8'); }
catch { sql = require('mssql'); }

// ── Connection configs ─────────────────────────────────────────────────────

const DEMO_CONN = 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=TSI_Demo;Trusted_Connection=yes;TrustServerCertificate=yes;';

// 365-day cutoff anchored to known data date
const CUTOFF_DATE = '2026-03-13';

// ── Load order ─────────────────────────────────────────────────────────────
// type values:
//   lookup        → load all rows, no date/active filter
//   reference     → load with active filter if applicable
//   transactional → date-filtered (dateCol required)
//   repair_child  → WHERE lRepairKey IN (365-day repair keys)
//   invoice_child → WHERE lInvoiceKey IN (invoice keys for 365-day repairs)
//
// customWhere → override the WHERE clause entirely (appended after "WHERE")
// castCols    → map of colName → cast expression for column type mismatches
// skipCols    → columns to exclude even if shared (to avoid truncation errors)

const TABLE_ORDER = [
  // ── Tiny lookup tables ────────────────────────────────────────────────────
  { table: 'tblRepairStatuses',              type: 'lookup' },
  { table: 'tblStatus',                      type: 'lookup' },
  { table: 'tblContractTypes',               type: 'lookup' },
  { table: 'tblDeliveryMethod',              type: 'lookup' },
  { table: 'tblDistributor',                 type: 'lookup' },
  { table: 'tblPaymentTerms',                type: 'lookup' },
  { table: 'tblPricingCategory',             type: 'lookup' },
  { table: 'tblRepairLevels',                type: 'lookup' },
  { table: 'tblRepairReasons',               type: 'lookup' },
  { table: 'tblServiceLocations',            type: 'lookup' },
  { table: 'tblSubGroups',                   type: 'lookup' },
  { table: 'tblScopeTypeCategories',         type: 'lookup' },
  { table: 'tblManufacturers',               type: 'lookup' },
  { table: 'tblSupplierPOTypes',             type: 'lookup' },
  { table: 'tblGPOs',                        type: 'lookup' },
  { table: 'tblSystemCodes',                 type: 'lookup' },
  { table: 'tblEmailTypes',                  type: 'lookup' },
  { table: 'tblFlagTypes',                   type: 'lookup' },
  { table: 'tblDocumentCategory',            type: 'lookup' },
  { table: 'tblDocumentCategoryType',        type: 'lookup' },
  { table: 'tblTaskTypes',                   type: 'lookup' },
  { table: 'tblTaskStatuses',                type: 'lookup' },
  { table: 'tblTaskPriorities',              type: 'lookup' },
  { table: 'tblTodoStatuses',                type: 'lookup' },
  { table: 'tblISOComplaint',                type: 'lookup' },
  // ── Users / staff (active only where column exists) ───────────────────────
  { table: 'tblSalesRep',     type: 'reference' },  // no bActive col in src
  { table: 'tblTechnicians',  type: 'reference',
    customWhere: 'bIsActive = 1' },
  { table: 'tblUsers',        type: 'reference',
    customWhere: 'bActive = 1',
    // sMarginApproval: demo=nvarchar(1), src=varchar(16) → must truncate to 1 char
    castCols: { sMarginApproval: 'LEFT([sMarginApproval], 1)' },
  },

  // ── Clients & departments ─────────────────────────────────────────────────
  { table: 'tblClient',       type: 'reference',
    customWhere: 'bActive = 1' },
  { table: 'tblDepartment',   type: 'reference',
    customWhere: 'bActive = 1' },
  { table: 'tblDepartmentSubGroups', type: 'reference' },
  { table: 'tblContacts',     type: 'reference' },
  { table: 'tblContactTran',  type: 'reference' },

  // ── Scope catalog ─────────────────────────────────────────────────────────
  // Load scope types referenced by active scopes only
  { table: 'tblScopeType', type: 'reference',
    customWhere: `lScopeTypeKey IN (
      SELECT DISTINCT lScopeTypeKey FROM WinScopeNet.dbo.tblScope WHERE bActive = 1
    )` },
  { table: 'tblDepartmentScopeTypes', type: 'reference' },
  // tblScope has no bActive column — load all scopes
  { table: 'tblScope',       type: 'reference' },
  { table: 'tblScopeTypeDepartmentMaxCharges', type: 'reference' },
  // tblScopeTypeContractCostsImport: TSI_Demo has identity col not in src → auto-generate
  { table: 'tblScopeTypeContractCostsImport', type: 'reference' },

  // ── Inventory ─────────────────────────────────────────────────────────────
  { table: 'tblInventory',    type: 'reference',
    customWhere: 'bActive = 1' },
  { table: 'tblInventorySize', type: 'reference' },
  { table: 'tblSupplier',     type: 'reference',
    customWhere: 'bActive = 1' },
  { table: 'tblSupplierSizes', type: 'reference' },

  // ── Pricing ───────────────────────────────────────────────────────────────
  { table: 'tblRepairItem',   type: 'reference' },
  { table: 'tblPricingDetail', type: 'reference' },

  // ── Contracts (active = not yet terminated) ───────────────────────────────
  { table: 'tblContract', type: 'reference',
    customWhere: `dtDateTermination >= GETDATE()`,
    castCols: { dtNextBillDate: 'CAST([dtNextBillDate] AS datetime)' } },
  { table: 'tblContractAmendments', type: 'reference',
    customWhere: `lContractKey IN (
      SELECT lContractKey FROM WinScopeNet.dbo.tblContract WHERE dtDateTermination >= GETDATE()
    )` },
  { table: 'tblContractDepartments', type: 'reference',
    customWhere: `lContractKey IN (
      SELECT lContractKey FROM WinScopeNet.dbo.tblContract WHERE dtDateTermination >= GETDATE()
    )` },
  { table: 'tblContractScope', type: 'reference',
    customWhere: `lContractKey IN (
      SELECT lContractKey FROM WinScopeNet.dbo.tblContract WHERE dtDateTermination >= GETDATE()
    )` },
  { table: 'tblPendingContract', type: 'reference' },
  { table: 'tblPendingContractScope', type: 'reference' },

  // ── Acquisitions ──────────────────────────────────────────────────────────
  { table: 'tblAcquisitionSupplierPO',    type: 'reference' },
  { table: 'tblAcquisitionSupplierPOTran', type: 'reference' },
  { table: 'tblSupplierPO',               type: 'transactional', dateCol: 'dtDateOfPO' },
  { table: 'tblSupplierPOTran',           type: 'reference' },

  // ── Documents / flags / emails ────────────────────────────────────────────
  { table: 'tblDocument',        type: 'reference' },
  // tblEmailAttachments: reference, no size issues
  { table: 'tblEmailAttachments', type: 'reference' },
  // tblEmails: sTo in demo=nvarchar(500), src has rows up to 644 chars → LEFT(sTo,500)
  { table: 'tblEmails', type: 'reference',
    castCols: {
      sTo:  'LEFT([sTo], 500)',
      sCC:  'LEFT([sCC], 500)',
      sBCC: 'LEFT([sBCC], 500)',
    }
  },
  // tblFlags: sFlag in demo=nvarchar(500), src has rows up to 1363 chars → LEFT(sFlag,500)
  { table: 'tblFlags', type: 'reference',
    castCols: { sFlag: 'LEFT([sFlag], 500)' } },

  // ── Site services (onsite van) ────────────────────────────────────────────
  { table: 'tblSiteServices',        type: 'transactional', dateCol: 'dtOnsiteDate' },
  { table: 'tblSiteServicesCalendar', type: 'reference' },
  { table: 'tblSiteServiceTrays',     type: 'reference' },

  // ── Product sales ─────────────────────────────────────────────────────────
  { table: 'tblProductSales',        type: 'transactional', dateCol: 'dtOrderDate' },
  // tblProductSaleInvoiceDetail: identity in demo ONLY (not in src) → auto-generate
  { table: 'tblProductSaleInvoiceDetail', type: 'reference' },
  { table: 'tblProductSalesInventory', type: 'reference' },

  // ── Loaners ───────────────────────────────────────────────────────────────
  { table: 'tblLoanerTran', type: 'reference' },
  { table: 'tblScopeSale',  type: 'reference' },

  // ── Core repairs (365-day date filter, both open and closed) ─────────────
  { table: 'tblRepair', type: 'transactional', dateCol: 'dtDateIn' },

  // ── Repair children (join to tblRepair) ───────────────────────────────────
  { table: 'tblStatusTran',     type: 'repair_child' },
  { table: 'tblRepairItemTran', type: 'repair_child' },
  // tblRepairInventory: src has no lRepairKey; filter via tblRepairItemTran
  { table: 'tblRepairInventory', type: 'reference',
    forceIdentity: false,  // no identity col in either DB
    customWhere: `lRepairItemTranKey IN (
      SELECT lRepairItemTranKey FROM WinScopeNet.dbo.tblRepairItemTran
      WHERE lRepairKey IN (
        SELECT lRepairKey FROM WinScopeNet.dbo.tblRepair
        WHERE dtDateIn >= DATEADD(DAY, -365, '${CUTOFF_DATE}')
      )
    )` },
  // tblRepairRevenueAndExpenses: identity in demo ONLY (not in src) → auto-generate
  { table: 'tblRepairRevenueAndExpenses', type: 'repair_child' },
  // tblRepairDefectTracking: identity in demo ONLY → auto-generate
  { table: 'tblRepairDefectTracking', type: 'repair_child' },
  { table: 'tblInvoice',        type: 'repair_child' },

  // ── Revenue (joins tblInvoice → tblRepair) ────────────────────────────────
  { table: 'tblGP_InvoiceStaging', type: 'invoice_child' },

  // ── Inventory transactions ────────────────────────────────────────────────
  { table: 'tblInventoryTran', type: 'transactional', dateCol: 'dtCreateDate' },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  { table: 'tblTasks',           type: 'transactional', dateCol: 'dtTaskDate' },
  { table: 'tblTaskStatusHistory', type: 'reference' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function pad(s, n) { return String(s).padEnd(n); }
function log(msg)  { console.log(`  ${msg}`); }
function section(msg) {
  console.log(`\n${'─'.repeat(60)}\n  ${msg}\n${'─'.repeat(60)}`);
}

async function getPool(connStr) {
  const pool = new sql.ConnectionPool({ driver: 'msnodesqlv8', connectionString: connStr });
  await pool.connect();
  return pool;
}

async function execSql(pool, sqlText) {
  const req = pool.request();
  req.multiple = true;
  return req.query(sqlText);
}

// Returns Map of lowercase column name → original-case column name for a given db+table
async function getColumnMap(pool, dbName, tableName) {
  const result = await pool.request().query(`
    SELECT c.name, c.is_identity, c.max_length,
           tp.name AS type_name, c.column_id
    FROM ${dbName}.sys.tables t
    JOIN ${dbName}.sys.columns c ON c.object_id = t.object_id
    JOIN ${dbName}.sys.types   tp ON tp.user_type_id = c.user_type_id
    WHERE t.name = '${tableName}'
    ORDER BY c.column_id
  `);
  const map = new Map();
  for (const r of result.recordset) {
    map.set(r.name.toLowerCase(), {
      name: r.name,
      isIdentity: r.is_identity === true || r.is_identity === 1,
      maxLength: r.max_length,
      typeName: r.type_name
    });
  }
  return map;
}

// Check if table exists in a given database
async function tableExists(pool, dbName, tableName) {
  const result = await pool.request().query(
    `SELECT COUNT(*) AS cnt FROM ${dbName}.sys.tables WHERE name = '${tableName}'`
  );
  return result.recordset[0].cnt > 0;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  TSI_Demo Seeder — WinScopeNet → TSI_Demo');
  console.log(`  Cutoff: ${CUTOFF_DATE} (365 days), active records only`);
  console.log('═'.repeat(60));

  const pool = await getPool(DEMO_CONN);
  log('Connected to TSI_Demo via ODBC Driver 18');

  // ── Step 1: Discover TSI_Demo tables ──────────────────────────────────────
  section('Step 1: Discovering TSI_Demo tables');
  const allTablesResult = await pool.request().query(
    `SELECT name FROM TSI_Demo.sys.tables ORDER BY name`
  );
  const demoTables = new Set(allTablesResult.recordset.map(r => r.name));
  log(`Found ${demoTables.size} tables in TSI_Demo`);

  // ── Step 2: Disable constraints and triggers ──────────────────────────────
  section('Step 2: Disabling constraints and triggers');
  await execSql(pool, `EXEC sp_msforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'`);
  await execSql(pool, `EXEC sp_msforeachtable 'DISABLE TRIGGER ALL ON ?'`);
  log('All constraints and triggers disabled');

  // ── Step 3: Delete all TSI_Demo data ──────────────────────────────────────
  section('Step 3: Clearing all TSI_Demo data');
  const reverseOrder = [...TABLE_ORDER].reverse();
  const listedTables = new Set(TABLE_ORDER.map(e => e.table));

  for (const entry of reverseOrder) {
    if (!demoTables.has(entry.table)) continue;
    try {
      await pool.request().query(`DELETE FROM TSI_Demo.dbo.[${entry.table}]`);
      log(`Cleared ${entry.table}`);
    } catch (e) {
      log(`WARN clear ${entry.table}: ${e.message.substring(0, 100)}`);
    }
  }
  // Also clear any TSI_Demo-only tables not in our load list
  for (const tbl of [...demoTables].sort()) {
    if (!listedTables.has(tbl)) {
      try {
        await pool.request().query(`DELETE FROM TSI_Demo.dbo.[${tbl}]`);
        log(`Cleared (unlisted) ${tbl}`);
      } catch (e) {
        log(`WARN clear (unlisted) ${tbl}: ${e.message.substring(0, 80)}`);
      }
    }
  }

  // ── Step 4: Seed each table ────────────────────────────────────────────────
  section('Step 4: Seeding tables from WinScopeNet');

  let totalInserted = 0;
  const errors = [];

  for (const entry of TABLE_ORDER) {
    const { table, type, dateCol, customWhere, castCols, forceIdentity } = entry;

    if (!demoTables.has(table)) {
      log(`SKIP ${table} — not in TSI_Demo`);
      continue;
    }

    const existsInSrc = await tableExists(pool, 'WinScopeNet', table);
    if (!existsInSrc) {
      log(`SKIP ${table} — not in WinScopeNet`);
      continue;
    }

    try {
      const demoMap = await getColumnMap(pool, 'TSI_Demo', table);
      const srcMap  = await getColumnMap(pool, 'WinScopeNet', table);

      // Shared columns = in both databases
      const sharedLower = [...demoMap.keys()].filter(c => srcMap.has(c));

      if (sharedLower.length === 0) {
        log(`SKIP ${table} — no shared columns`);
        continue;
      }

      // Build SELECT expressions and INSERT column list
      const selectExprs = [];
      const insertCols  = [];

      for (const lc of sharedLower) {
        const demoCol = demoMap.get(lc);
        const srcCol  = srcMap.get(lc);

        // Skip identity columns in destination when src is also identity
        // (we include them via IDENTITY_INSERT ON)
        // Always include — we handle via IDENTITY_INSERT

        const destColName = demoCol.name;
        const srcColName  = srcCol.name;

        // Use cast expression if specified, otherwise plain column ref
        let expr;
        if (castCols && castCols[lc]) {
          expr = `${castCols[lc]} AS [${destColName}]`;
        } else if (castCols && castCols[destColName]) {
          // also check by original case
          expr = `${castCols[destColName]} AS [${destColName}]`;
        } else {
          expr = `[${srcColName}]`;
        }

        selectExprs.push(expr);
        insertCols.push(`[${destColName}]`);
      }

      // Use IDENTITY_INSERT only when the identity column exists in BOTH databases
      // (i.e., it's in the shared column set). If TSI_Demo has an identity col
      // that doesn't exist in WinScopeNet, it's not in sharedLower — let it auto-generate.
      const demoIdentityColName = [...demoMap.entries()]
        .find(([, v]) => v.isIdentity)?.[0]; // lowercase name
      const identityColIsShared = demoIdentityColName
        ? sharedLower.includes(demoIdentityColName)
        : false;
      const useIdentityInsert = identityColIsShared;

      // Build WHERE clause
      let whereClause = '';
      if (customWhere) {
        whereClause = `WHERE ${customWhere}`;
      } else if (type === 'transactional' && dateCol) {
        const srcHasDateCol = srcMap.has(dateCol.toLowerCase());
        if (srcHasDateCol) {
          whereClause = `WHERE [${dateCol}] >= DATEADD(DAY, -365, '${CUTOFF_DATE}')`;
        }
      } else if (type === 'repair_child') {
        whereClause = `WHERE lRepairKey IN (
          SELECT lRepairKey FROM WinScopeNet.dbo.tblRepair
          WHERE dtDateIn >= DATEADD(DAY, -365, '${CUTOFF_DATE}')
        )`;
      } else if (type === 'invoice_child') {
        whereClause = `WHERE lInvoiceKey IN (
          SELECT lInvoiceKey FROM WinScopeNet.dbo.tblInvoice
          WHERE lRepairKey IN (
            SELECT lRepairKey FROM WinScopeNet.dbo.tblRepair
            WHERE dtDateIn >= DATEADD(DAY, -365, '${CUTOFF_DATE}')
          )
        )`;
      }

      const identOn  = useIdentityInsert
        ? `SET IDENTITY_INSERT TSI_Demo.dbo.[${table}] ON;\n` : '';
      const identOff = useIdentityInsert
        ? `\nSET IDENTITY_INSERT TSI_Demo.dbo.[${table}] OFF;` : '';

      const colList    = insertCols.join(', ');
      const selectList = selectExprs.join(', ');

      const insertSql = `
${identOn}INSERT INTO TSI_Demo.dbo.[${table}] (${colList})
SELECT ${selectList}
FROM WinScopeNet.dbo.[${table}]
${whereClause};${identOff}
      `.trim();

      const result = await pool.request().query(insertSql);

      // rowsAffected is an array; the INSERT statement is at index 1 if IDENTITY_INSERT wraps it
      const rowCount = Array.isArray(result.rowsAffected)
        ? result.rowsAffected.reduce((a, b) => a + b, 0)
        : 0;

      totalInserted += rowCount;
      log(`${pad(table, 44)} → ${String(rowCount).padStart(7)} rows  [${type}]`);

    } catch (e) {
      const shortMsg = e.message.replace(/\n/g, ' ').substring(0, 130);
      log(`ERROR ${table}: ${shortMsg}`);
      errors.push({ table, error: e.message });
    }
  }

  // ── Step 5: Re-enable constraints ────────────────────────────────────────
  section('Step 5: Re-enabling constraints and triggers');
  try {
    await execSql(pool, `EXEC sp_msforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'`);
    log('Constraints re-enabled with validation');
  } catch (e) {
    log(`WARN: CHECK CONSTRAINT failed (likely orphan FKs): ${e.message.substring(0, 100)}`);
    try {
      await execSql(pool, `EXEC sp_msforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL'`);
      log('Constraints re-enabled (no re-validation)');
    } catch (e2) {
      log(`WARN: Constraint re-enable failed: ${e2.message.substring(0, 100)}`);
    }
  }
  try {
    await execSql(pool, `EXEC sp_msforeachtable 'ENABLE TRIGGER ALL ON ?'`);
    log('Triggers re-enabled');
  } catch (e) {
    log(`WARN: Trigger re-enable: ${e.message.substring(0, 100)}`);
  }

  // ── Step 6: Rebuild indexes and update statistics ─────────────────────────
  section('Step 6: Rebuilding indexes and updating statistics');
  try {
    const rebuildSql = `
      DECLARE @sql NVARCHAR(MAX) = N'';
      SELECT @sql += N'ALTER INDEX ALL ON TSI_Demo.dbo.[' + t.name + N'] REBUILD WITH (ONLINE = OFF);' + CHAR(13)
      FROM TSI_Demo.sys.tables t WHERE t.is_ms_shipped = 0;
      EXEC sp_executesql @sql;
    `;
    await pool.request().query(rebuildSql);
    log('All indexes rebuilt');
  } catch (e) {
    log(`WARN: Index rebuild: ${e.message.substring(0, 100)}`);
  }
  try {
    await pool.request().query(`EXEC TSI_Demo..sp_updatestats`);
    log('Statistics updated');
  } catch (e) {
    log(`WARN: sp_updatestats: ${e.message.substring(0, 100)}`);
  }

  // ── Step 7: Verify row counts ─────────────────────────────────────────────
  section('Step 7: Verification — row counts in TSI_Demo');
  const keyTables = [
    'tblClient', 'tblDepartment', 'tblScope', 'tblScopeType',
    'tblContract', 'tblContractScope', 'tblContractDepartments',
    'tblRepair', 'tblStatusTran', 'tblRepairItemTran', 'tblRepairInventory',
    'tblRepairRevenueAndExpenses', 'tblInvoice', 'tblGP_InvoiceStaging',
    'tblInventory', 'tblSalesRep', 'tblTechnicians', 'tblUsers',
    'tblRepairStatuses', 'tblStatus', 'tblDeliveryMethod',
  ];
  for (const tbl of keyTables) {
    if (!demoTables.has(tbl)) continue;
    try {
      const r = await pool.request().query(
        `SELECT COUNT(*) AS cnt FROM TSI_Demo.dbo.[${tbl}]`
      );
      log(`${pad(tbl, 44)} → ${String(r.recordset[0].cnt).padStart(8)} rows`);
    } catch (e) {
      log(`${pad(tbl, 44)} → ERROR: ${e.message.substring(0, 60)}`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  section('Summary');
  log(`Total rows inserted:  ${totalInserted.toLocaleString()}`);
  log(`Tables with errors:   ${errors.length}`);
  if (errors.length > 0) {
    log('\nError details:');
    errors.forEach(e => log(`  ${e.table}: ${e.error.replace(/\n/g,' ').substring(0, 120)}`));
  }

  await pool.close();
  console.log('\n' + '═'.repeat(60));
  console.log(`  Seed ${errors.length === 0 ? 'COMPLETE' : 'COMPLETE WITH ERRORS'}.`);
  console.log('═'.repeat(60) + '\n');
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
