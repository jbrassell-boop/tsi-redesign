/**
 * Generates the Phase 3 SQL script by querying actual column metadata.
 * Output: server/migrations/phase3-child-tables.sql
 */
const sql = require('mssql/msnodesqlv8');
const fs = require('fs');
const path = require('path');

const NORTH = 'WinScopeNet';
const SOUTH = 'WinScopeNetNashville';
const REPAIR_OFFSET = 20000000;

const config = {
  driver: 'msnodesqlv8',
  connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${NORTH};Trusted_Connection=yes;TrustServerCertificate=yes;`,
  requestTimeout: 120000
};

// Child table configs: name, pkCol (identity), pkOffset, extraFKs
const childTables = [
  { name: 'tblStatusTran', pkCol: 'lStatusTranKey', pkOffset: 20000000, extraFKs: {} },
  { name: 'tblRepairItemTran', pkCol: 'lRepairItemTranKey', pkOffset: 200000000, extraFKs: { lTechnicianKey: 'tech', lTechnician2Key: 'tech' } },
  { name: 'tblRepairStatusLog', pkCol: 'lRepairStatusLogID', pkOffset: 20000000, extraFKs: {} },
  { name: 'tblShipExecInvoiceChargeRepairs', pkCol: null, pkOffset: 0, extraFKs: {} },
  { name: 'tblShippingChargeRepairs', pkCol: 'lShippingChargeRepairKey', pkOffset: 20000000, extraFKs: {} },
  { name: 'tblPointsOps', pkCol: 'lPointsOpsKey', pkOffset: 20000000, extraFKs: {} },
  { name: 'tblTasks', pkCol: 'lTaskKey', pkOffset: 20000000, extraFKs: { lDepartmentKey: 'dept' } },
  { name: 'tblPointsTechs', pkCol: 'lPointsTechsKey', pkOffset: 20000000, extraFKs: { lTechnicianKey: 'tech', lRepairItemTranKey: 200000000 } },
  { name: 'tblInvoice', pkCol: 'lInvoiceKey', pkOffset: 400000000, extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lSalesRepKey: 'salesrep', lFriendRepairKey: REPAIR_OFFSET } },
  { name: 'tblBlankInspectionSignOffLog', pkCol: 'BlankInspectionSignOffID', pkOffset: 20000000, extraFKs: {} },
  { name: 'tblRepairRevenueAndExpensesContract', pkCol: null, pkOffset: 0, extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lInvoiceKey: 400000000 } },
  { name: 'tblTrackingNumbersInAudit', pkCol: null, pkOffset: 0, extraFKs: {} },
  { name: 'tblDashScopesInSave', pkCol: null, pkOffset: 0, extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lSalesRepKey: 'salesrep' } },
  { name: 'tblLoanerTran', pkCol: 'lLoanerTranKey', pkOffset: 20000000, extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lSalesRepKey: 'salesrep' } },
  { name: 'tblContractRepairsSaved', pkCol: null, pkOffset: 0, extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope' } },
  { name: 'tblRepairFailureCodes', pkCol: null, pkOffset: 0, extraFKs: {} },
  { name: 'tblAmendRepairComments', pkCol: 'lAmendRepairCommentKey', pkOffset: 20000000, extraFKs: {} },
  { name: 'tblRepairUpdateSlips', pkCol: 'lRepairUpdateSlipKey', pkOffset: 20000000, extraFKs: {} },
  { name: 'tblInvoiceVoid', pkCol: 'lInvoiceKey', pkOffset: 400000000, extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lSalesRepKey: 'salesrep', lFriendRepairKey: REPAIR_OFFSET } },
  { name: 'tblRepairInspection', pkCol: 'lRepairInspectionKey', pkOffset: 20000000, extraFKs: { lTechnicianKey: 'tech', lInspectorKey: 'tech' } },
  { name: 'tblRepairInstrumentModels', pkCol: 'lRepairInstrumentModelKey', pkOffset: 20000000, extraFKs: { lTechnicianKey: 'tech', lVendorKey: 'vendor', lOutsourcedRepairKey: REPAIR_OFFSET, lReplacedRepairKey: REPAIR_OFFSET } },
  { name: 'tblRepairRevenueAndExpenses', pkCol: null, pkOffset: 0, extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lSalesRepKey: 'salesrep', lInvoiceKey: 400000000 } },
  { name: 'tblRepairDefectTracking', pkCol: null, pkOffset: 0, extraFKs: {} },
  { name: 'tblRepairDeleteAudit', pkCol: null, pkOffset: 0, extraFKs: {} },
  { name: 'tblISOComplaint', pkCol: 'lISOComplaintKey', pkOffset: 20000000, extraFKs: {} },
];

async function main() {
  const pool = await sql.connect(config);
  const lines = [];
  const w = (s) => lines.push(s);

  w(`-- ============================================================================`);
  w(`-- Nashville Repair Migration — Phase 3: Child Table Migration (Auto-generated)`);
  w(`-- Generated: ${new Date().toISOString()}`);
  w(`-- ============================================================================`);
  w(``);
  w(`PRINT '=== PHASE 3: Nashville Child Table Migration ==='`);
  w(`PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120)`);
  w(``);
  const DUPE_KEYS = '510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208';
  w(`-- 14 Nashville repair keys NOT imported (true WO duplicates)`);
  w(`PRINT 'Dupe/skipped repair keys: 14 (hardcoded in WHERE clauses)';`);
  w(`GO`);
  w(``);

  for (const tbl of childTables) {
    const { name, pkCol, pkOffset, extraFKs } = tbl;

    // Get common columns between South and North
    const r = await pool.request().query(`
      SELECT c1.COLUMN_NAME, c1.DATA_TYPE
      FROM ${SOUTH}.INFORMATION_SCHEMA.COLUMNS c1
      JOIN ${NORTH}.INFORMATION_SCHEMA.COLUMNS c2
        ON c2.COLUMN_NAME = c1.COLUMN_NAME AND c2.TABLE_NAME = '${name}'
      WHERE c1.TABLE_NAME = '${name}'
      ORDER BY c1.ORDINAL_POSITION
    `);
    const cols = r.recordset;
    if (cols.length === 0) {
      w(`-- SKIPPED: ${name} — no common columns`);
      w(`GO`);
      continue;
    }

    const colNames = cols.map(c => c.COLUMN_NAME);
    const hasIdentity = pkCol !== null;
    const hasNtext = cols.some(c => ['ntext', 'text', 'image'].includes(c.DATA_TYPE));

    // Count
    const cnt = await pool.request().query(`SELECT COUNT(*) as cnt FROM ${SOUTH}.dbo.${name}`);
    const rowCount = cnt.recordset[0].cnt;

    w(`-- ============================================================================`);
    w(`-- ${name} (${rowCount.toLocaleString()} rows)${hasIdentity ? ` | PK: ${pkCol} +${pkOffset.toLocaleString()}` : ' | No identity'}`);
    w(`-- ============================================================================`);
    w(`PRINT ''`);
    w(`PRINT '--- ${name} (${rowCount.toLocaleString()} rows) ---'`);
    w(`GO`);
    w(``);

    // Stage 1: SELECT INTO staging
    w(`IF OBJECT_ID('_stage_${name}') IS NOT NULL DROP TABLE _stage_${name};`);

    // Always use SELECT * for staging (most reliable cross-DB)
    // Handle identity column via _newPK approach for all identity tables
    {
      w(`SELECT * INTO _stage_${name}`);
      w(`FROM ${SOUTH}.dbo.${name}`);
      w(`WHERE lRepairKey NOT IN (${DUPE_KEYS});`);
    }
    if (false) {
      // Disabled: compact approach had ODBC issues
      const stageSelect = colNames.map(c => {
        if (c === pkCol) return `${c} + 0 AS ${c}`;
        return c;
      }).join(', ');
      w(`SELECT ${stageSelect}`);
      w(`INTO _stage_${name}`);
      w(`FROM ${SOUTH}.dbo.${name}`);
      w(`WHERE lRepairKey NOT IN (${DUPE_KEYS});`);
    }
    w(`PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'`);
    w(``);

    // Stage 2: Apply offsets
    // For tables staged with SELECT * (identity preserved), we need a _newPK column
    const usedSelectStar = true; // Always SELECT * for staging
    if (hasIdentity && usedSelectStar) {
      w(`ALTER TABLE _stage_${name} ADD _newPK BIGINT;`);
      w(`UPDATE _stage_${name} SET _newPK = CAST(${pkCol} AS BIGINT) + ${pkOffset};`);
    } else if (hasIdentity) {
      w(`UPDATE _stage_${name} SET ${pkCol} = ${pkCol} + ${pkOffset};`);
    }

    // lRepairKey offset
    if (colNames.includes('lRepairKey')) {
      w(`UPDATE _stage_${name} SET lRepairKey = lRepairKey + ${REPAIR_OFFSET};`);
    }

    // Stage 3: FK remaps
    for (const [col, fk] of Object.entries(extraFKs)) {
      if (!colNames.includes(col)) continue;
      if (fk === 'dept') {
        w(`UPDATE s SET s.${col} = xd.north_key FROM _stage_${name} s JOIN _xwalk_Department xd ON xd.south_key = s.${col} WHERE s.${col} > 0;`);
      } else if (fk === 'scope') {
        w(`UPDATE s SET s.${col} = xs.north_key FROM _stage_${name} s JOIN _xwalk_Scope xs ON xs.south_key = s.${col} WHERE s.${col} > 0;`);
      } else if (fk === 'tech') {
        w(`UPDATE s SET s.${col} = xt.north_key FROM _stage_${name} s JOIN _xwalk_Technician xt ON xt.south_key = s.${col} WHERE s.${col} > 0;`);
      } else if (fk === 'salesrep') {
        w(`UPDATE s SET s.${col} = xr.north_key FROM _stage_${name} s JOIN _xwalk_SalesRep xr ON xr.south_key = s.${col} WHERE s.${col} > 0;`);
      } else if (fk === 'vendor') {
        w(`UPDATE s SET s.${col} = xv.north_key FROM _stage_${name} s JOIN _xwalk_Vendor xv ON xv.south_key = s.${col} WHERE s.${col} > 0;`);
      } else if (typeof fk === 'number') {
        // Direct offset
        w(`UPDATE _stage_${name} SET ${col} = ${col} + ${fk} WHERE ${col} > 0;`);
      }
    }
    w(`PRINT 'Offsets and FK remaps applied'`);
    w(``);

    // Stage 4: INSERT into target
    w(`ALTER TABLE ${NORTH}.dbo.${name} NOCHECK CONSTRAINT ALL;`);
    w(`BEGIN TRY ALTER TABLE ${NORTH}.dbo.${name} DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;`);
    w(``);

    if (hasIdentity) {
      w(`SET IDENTITY_INSERT ${NORTH}.dbo.${name} ON;`);
      if (usedSelectStar) {
        // Use _newPK for identity column (SELECT * preserved original identity)
        const insertCols = colNames.join(', ');
        const selectCols = colNames.map(c => c === pkCol ? '_newPK' : c).join(', ');
        w(`INSERT INTO ${NORTH}.dbo.${name} (${insertCols})`);
        w(`SELECT ${selectCols} FROM _stage_${name};`);
      } else {
        const colList = colNames.join(', ');
        w(`INSERT INTO ${NORTH}.dbo.${name} (${colList})`);
        w(`SELECT ${colList} FROM _stage_${name};`);
      }
      w(`SET IDENTITY_INSERT ${NORTH}.dbo.${name} OFF;`);
    } else {
      const colList = colNames.join(', ');
      w(`INSERT INTO ${NORTH}.dbo.${name} (${colList})`);
      w(`SELECT ${colList} FROM _stage_${name};`);
    }

    w(`PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'`);
    w(``);
    w(`BEGIN TRY ALTER TABLE ${NORTH}.dbo.${name} ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;`);
    w(`ALTER TABLE ${NORTH}.dbo.${name} CHECK CONSTRAINT ALL;`);
    w(`DROP TABLE _stage_${name};`);
    w(`PRINT '${name} DONE'`);
    w(`GO`);
    w(``);
  }

  // Phase 4: Fix inventory transaction repair keys
  w(`-- ============================================================================`);
  w(`-- PHASE 4: Fix Inventory Transaction Repair Keys`);
  w(`-- ============================================================================`);
  w(`PRINT ''`);
  w(`PRINT '=== PHASE 4: Fix Inventory Transaction Repair Keys ==='`);
  w(``);
  w(`UPDATE ${NORTH}.dbo.tblInventoryTran`);
  w(`SET lRepairKey = lRepairKey + ${REPAIR_OFFSET}`);
  w(`WHERE lInventoryTranKey >= 1000000`);
  w(`  AND lRepairKey > 0`);
  w(`  AND lRepairKey < ${REPAIR_OFFSET}`);
  w(`  AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblRepair WHERE lRepairKey = ${NORTH}.dbo.tblInventoryTran.lRepairKey);`);
  w(`PRINT 'tblInventoryTran updated: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'`);
  w(``);
  w(`-- tblRepairInventory: no lRepairKey column (uses lRepairItemTranKey) — skip`);
  w(``);
  w(`-- tblLotNumberAdjustments`);
  w(`UPDATE ${NORTH}.dbo.tblLotNumberAdjustments`);
  w(`SET lRepairKey = lRepairKey + ${REPAIR_OFFSET}`);
  w(`WHERE lLotNumberAdjustmentKey >= 1000000`);
  w(`  AND lRepairKey > 0 AND lRepairKey < ${REPAIR_OFFSET}`);
  w(`  AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblRepair WHERE lRepairKey = ${NORTH}.dbo.tblLotNumberAdjustments.lRepairKey);`);
  w(`PRINT 'tblLotNumberAdjustments updated: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'`);
  w(`GO`);
  w(``);
  w(`PRINT 'PHASE 3+4 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)`);

  // Write output
  const outPath = path.join(__dirname, 'phase3-child-tables.sql');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Generated: ${outPath} (${lines.length} lines)`);

  await pool.close();
}

main().catch(e => { console.error(e); process.exit(1); });
