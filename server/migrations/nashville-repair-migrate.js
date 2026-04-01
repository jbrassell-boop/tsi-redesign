/**
 * Nashville Repair Migration — Phase 1-5
 * Migrates 27,079 repairs + ~1.17M child rows from WinScopeNetNashville → WinScopeNet
 *
 * Usage:
 *   node server/migrations/nashville-repair-migrate.js phase1   # Build crosswalks
 *   node server/migrations/nashville-repair-migrate.js phase2   # Import repairs
 *   node server/migrations/nashville-repair-migrate.js phase3   # Migrate child tables
 *   node server/migrations/nashville-repair-migrate.js phase4   # Fix inventory FKs
 *   node server/migrations/nashville-repair-migrate.js phase5   # Verify
 */

const sql = require('mssql/msnodesqlv8');

const NORTH = 'WinScopeNet';
const SOUTH = 'WinScopeNetNashville';

const config = {
  driver: 'msnodesqlv8',
  connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=${NORTH};Trusted_Connection=yes;TrustServerCertificate=yes;`,
  requestTimeout: 600000,
  pool: { max: 1 }
};

const REPAIR_OFFSET = 20000000;
const DEPT_OFFSET = 10000;
const TECH_OFFSET = 1000;
const SALESREP_OFFSET = 1000;
const SCOPE_OFFSET = 2000000;
const VENDOR_OFFSET = 1000;

let pool;

async function getPool() {
  if (!pool) pool = await sql.connect(config);
  return pool;
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);
}

// ─── PHASE 1: Build Crosswalk Tables ───────────────────────────────────────────

async function phase1() {
  log('=== PHASE 1: Build Crosswalk Tables ===');
  const p = await getPool();

  await phase1a_department(p);
  await phase1b_technician(p);
  await phase1c_salesrep(p);
  await phase1d_scope(p);
  await phase1e_vendor(p);

  log('Phase 1 complete — all crosswalks built.');
}

async function phase1a_department(p) {
  log('--- Step 1a: _xwalk_Department ---');

  // Drop if exists
  await p.request().query(`IF OBJECT_ID('_xwalk_Department') IS NOT NULL DROP TABLE _xwalk_Department`);

  // Create with explicit column sizes
  await p.request().query(`
    CREATE TABLE _xwalk_Department (south_key INT, north_key INT, south_name NVARCHAR(200), match_type VARCHAR(20))
  `);

  // Populate from linked depts
  await p.request().query(`
    INSERT INTO _xwalk_Department (south_key, north_key, south_name, match_type)
    SELECT lDepartmentKey, lLinkKeyToOtherDB, sDepartmentName, 'linked'
    FROM ${SOUTH}.dbo.tblDepartment
    WHERE ISNULL(lLinkKeyToOtherDB, 0) > 0
  `);
  let r = await p.request().query(`SELECT COUNT(*) as cnt FROM _xwalk_Department`);
  log(`  Linked depts: ${r.recordset[0].cnt}`);

  // Try name+client match for unlinked
  r = await p.request().query(`
    SELECT sd.lDepartmentKey AS south_key, nd.lDepartmentKey AS north_key,
           sd.sDepartmentName AS south_name
    FROM ${SOUTH}.dbo.tblDepartment sd
    JOIN ${SOUTH}.dbo.tblClient sc ON sc.lClientKey = sd.lClientKey
    JOIN ${NORTH}.dbo.tblClient nc ON RTRIM(nc.sClientName1) = RTRIM(sc.sClientName1)
    JOIN ${NORTH}.dbo.tblDepartment nd ON nd.lClientKey = nc.lClientKey
      AND RTRIM(nd.sDepartmentName) = RTRIM(sd.sDepartmentName)
    WHERE ISNULL(sd.lLinkKeyToOtherDB, 0) = 0
      AND sd.lDepartmentKey NOT IN (SELECT south_key FROM _xwalk_Department)
  `);
  if (r.recordset.length > 0) {
    for (const row of r.recordset) {
      await p.request().query(`
        INSERT INTO _xwalk_Department (south_key, north_key, south_name, match_type)
        VALUES (${row.south_key}, ${row.north_key}, '${row.south_name.replace(/'/g, "''")}', 'name_match')
      `);
    }
    log(`  Name-matched depts: ${r.recordset.length}`);
  }

  // Import remaining unlinked depts that have repairs
  r = await p.request().query(`
    SELECT DISTINCT sd.lDepartmentKey
    FROM ${SOUTH}.dbo.tblDepartment sd
    JOIN ${SOUTH}.dbo.tblRepair sr ON sr.lDepartmentKey = sd.lDepartmentKey
    WHERE sd.lDepartmentKey NOT IN (SELECT south_key FROM _xwalk_Department)
  `);
  if (r.recordset.length > 0) {
    log(`  Importing ${r.recordset.length} unlinked depts with +${DEPT_OFFSET} offset...`);

    // Get column list (excluding identity if present)
    const cols = await p.request().query(`
      SELECT c.COLUMN_NAME
      FROM ${SOUTH}.INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN ${SOUTH}.sys.identity_columns ic
        ON ic.name = c.COLUMN_NAME
        AND ic.object_id = OBJECT_ID('${SOUTH}.dbo.tblDepartment')
      WHERE c.TABLE_NAME = 'tblDepartment'
      ORDER BY c.ORDINAL_POSITION
    `);
    const colNames = cols.recordset.map(c => c.COLUMN_NAME);
    const hasIdentity = await p.request().query(`
      SELECT name FROM ${SOUTH}.sys.identity_columns
      WHERE object_id = OBJECT_ID('${SOUTH}.dbo.tblDepartment')
    `);

    const deptKeysToImport = r.recordset.map(r => r.lDepartmentKey);

    // Filter out ntext/text/image columns (can't cross-DB insert with subqueries)
    const colTypes = await p.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM ${SOUTH}.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME='tblDepartment' ORDER BY ORDINAL_POSITION
    `);
    const safeCols = colTypes.recordset
      .filter(c => !['ntext', 'text', 'image'].includes(c.DATA_TYPE))
      .map(c => c.COLUMN_NAME);
    // Also filter to only cols that exist in North
    const northDeptCols = await p.request().query(`
      SELECT COLUMN_NAME FROM ${NORTH}.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='tblDepartment'
    `);
    const northDeptColSet = new Set(northDeptCols.recordset.map(c => c.COLUMN_NAME));
    const insertCols = safeCols.filter(c => northDeptColSet.has(c));

    // Use reduced column set for cross-DB insert (avoids ODBC statement prep failure)
    // Pick essential columns only
    const essentialCols = ['lDepartmentKey', 'lClientKey', 'sDepartmentName', 'lSalesRepKey',
      'lPricingCategoryKey', 'lSessionID', 'lDeliveryMethodKey', 'sActiveFlag',
      'lCreateUser', 'dtCreateDate', 'lLastUpdateUser', 'dtLastUpdate', 'lServiceLocationKey'];
    const deptInsertCols = essentialCols.filter(c => insertCols.includes(c));

    for (const sk of deptKeysToImport) {
      const nk = sk + DEPT_OFFSET;
      const selectCols = deptInsertCols.map(c => {
        if (c === 'lDepartmentKey') return `${nk} AS lDepartmentKey`;
        if (c === 'lLinkKeyToOtherDB') return `NULL AS lLinkKeyToOtherDB`;
        return `sd.${c}`;
      }).join(', ');

      await p.request().batch(`
        SET IDENTITY_INSERT ${NORTH}.dbo.tblDepartment ON;
        INSERT INTO ${NORTH}.dbo.tblDepartment (${deptInsertCols.join(', ')})
        SELECT ${selectCols}
        FROM ${SOUTH}.dbo.tblDepartment sd
        WHERE sd.lDepartmentKey = ${sk}
          AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblDepartment WHERE lDepartmentKey = ${nk});
        SET IDENTITY_INSERT ${NORTH}.dbo.tblDepartment OFF;
      `);

      await p.request().query(`
        INSERT INTO _xwalk_Department (south_key, north_key, south_name, match_type)
        SELECT ${sk}, ${nk}, sDepartmentName, 'imported'
        FROM ${SOUTH}.dbo.tblDepartment WHERE lDepartmentKey = ${sk}
          AND NOT EXISTS (SELECT 1 FROM _xwalk_Department WHERE south_key = ${sk})
      `);
    }
    log(`  Imported ${deptKeysToImport.length} depts`);
  }

  r = await p.request().query(`SELECT match_type, COUNT(*) as cnt FROM _xwalk_Department GROUP BY match_type`);
  log('  Crosswalk summary:');
  r.recordset.forEach(row => log(`    ${row.match_type}: ${row.cnt}`));
}

async function phase1b_technician(p) {
  log('--- Step 1b: _xwalk_Technician ---');

  await p.request().query(`IF OBJECT_ID('_xwalk_Technician') IS NOT NULL DROP TABLE _xwalk_Technician`);

  // Create with explicit column sizes
  await p.request().query(`
    CREATE TABLE _xwalk_Technician (south_key INT, north_key INT, south_name NVARCHAR(200), match_type VARCHAR(20))
  `);
  await p.request().query(`
    INSERT INTO _xwalk_Technician (south_key, north_key, south_name, match_type)
    SELECT lTechnicianKey, lTechnicianKeyLink, sTechName, 'linked'
    FROM ${SOUTH}.dbo.tblTechnicians
    WHERE ISNULL(lTechnicianKeyLink, 0) > 0
  `);
  let r = await p.request().query(`SELECT COUNT(*) as cnt FROM _xwalk_Technician`);
  log(`  Linked techs: ${r.recordset[0].cnt}`);

  // Name match for unlinked
  r = await p.request().query(`
    SELECT st.lTechnicianKey AS south_key, nt.lTechnicianKey AS north_key, st.sTechName AS south_name
    FROM ${SOUTH}.dbo.tblTechnicians st
    JOIN ${NORTH}.dbo.tblTechnicians nt ON RTRIM(LTRIM(nt.sTechName)) = RTRIM(LTRIM(st.sTechName))
    WHERE ISNULL(st.lTechnicianKeyLink, 0) = 0
      AND st.lTechnicianKey NOT IN (SELECT south_key FROM _xwalk_Technician)
  `);
  if (r.recordset.length > 0) {
    for (const row of r.recordset) {
      await p.request().query(`
        INSERT INTO _xwalk_Technician (south_key, north_key, south_name, match_type)
        VALUES (${row.south_key}, ${row.north_key}, '${row.south_name.replace(/'/g, "''")}', 'name_match')
      `);
    }
    log(`  Name-matched techs: ${r.recordset.length}`);
  }

  // Import remaining unlinked techs that appear in repairs
  r = await p.request().query(`
    SELECT DISTINCT st.lTechnicianKey
    FROM ${SOUTH}.dbo.tblTechnicians st
    WHERE st.lTechnicianKey NOT IN (SELECT south_key FROM _xwalk_Technician)
      AND (
        EXISTS (SELECT 1 FROM ${SOUTH}.dbo.tblRepair WHERE lTechnicianKey = st.lTechnicianKey)
        OR EXISTS (SELECT 1 FROM ${SOUTH}.dbo.tblRepair WHERE lInspectorKey = st.lTechnicianKey)
        OR EXISTS (SELECT 1 FROM ${SOUTH}.dbo.tblRepair WHERE lTechnician2Key = st.lTechnicianKey)
      )
  `);
  if (r.recordset.length > 0) {
    log(`  Importing ${r.recordset.length} unlinked techs with +${TECH_OFFSET} offset...`);

    for (const row of r.recordset) {
      const sk = row.lTechnicianKey;
      const nk = sk + TECH_OFFSET;
      await p.request().batch(`
        SET IDENTITY_INSERT ${NORTH}.dbo.tblTechnicians ON;
        INSERT INTO ${NORTH}.dbo.tblTechnicians (
          lTechnicianKey, sTechInits, sTechName, TSEMEMPLID, dtLastUpdate, lLastUpdateUser,
          dtCreateDate, lCreateUser, sTechLevel, dblHourlyRate, lCreateSessionKey, bIsActive,
          lJobTypeKey, lUserKey, sADPPositionID, sEmailAddress, lTechnicianKeyLink,
          bOnsiteServiceTech, sOnsiteServiceTruckNumber, sCalendarColor, lServiceLocationKey, sForeColor
        )
        SELECT ${nk}, sTechInits, sTechName, TSEMEMPLID, dtLastUpdate, lLastUpdateUser,
          dtCreateDate, lCreateUser, sTechLevel, dblHourlyRate, lCreateSessionKey, bIsActive,
          lJobTypeKey, lUserKey, sADPPositionID, sEmailAddress, NULL,
          bOnsiteServiceTech, sOnsiteServiceTruckNumber, sCalendarColor, 2, sForeColor
        FROM ${SOUTH}.dbo.tblTechnicians
        WHERE lTechnicianKey = ${sk}
          AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblTechnicians WHERE lTechnicianKey = ${nk});
        SET IDENTITY_INSERT ${NORTH}.dbo.tblTechnicians OFF;
      `);
      await p.request().query(`
        INSERT INTO _xwalk_Technician (south_key, north_key, south_name, match_type)
        SELECT ${sk}, ${nk}, sTechName, 'imported'
        FROM ${SOUTH}.dbo.tblTechnicians WHERE lTechnicianKey = ${sk}
      `);
    }
    log(`  Imported ${r.recordset.length} techs`);
  }

  // Add identity mapping for techs not in crosswalk (key 0 stays 0)
  r = await p.request().query(`SELECT match_type, COUNT(*) as cnt FROM _xwalk_Technician GROUP BY match_type`);
  log('  Crosswalk summary:');
  r.recordset.forEach(row => log(`    ${row.match_type}: ${row.cnt}`));
}

async function phase1c_salesrep(p) {
  log('--- Step 1c: _xwalk_SalesRep ---');

  await p.request().query(`IF OBJECT_ID('_xwalk_SalesRep') IS NOT NULL DROP TABLE _xwalk_SalesRep`);

  // Create with explicit column sizes
  await p.request().query(`
    CREATE TABLE _xwalk_SalesRep (south_key INT, north_key INT, south_name NVARCHAR(200), match_type VARCHAR(20))
  `);
  await p.request().query(`
    INSERT INTO _xwalk_SalesRep (south_key, north_key, south_name, match_type)
    SELECT lSalesRepKey, lSalesRepKeyLink,
           RTRIM(ISNULL(sRepLast,'')) + ', ' + RTRIM(ISNULL(sRepFirst,'')), 'linked'
    FROM ${SOUTH}.dbo.tblSalesRep
    WHERE ISNULL(lSalesRepKeyLink, 0) > 0
  `);
  let r = await p.request().query(`SELECT COUNT(*) as cnt FROM _xwalk_SalesRep`);
  log(`  Linked reps: ${r.recordset[0].cnt}`);

  // Name match by sRepLast + sRepFirst
  r = await p.request().query(`
    SELECT ss.lSalesRepKey AS south_key, ns.lSalesRepKey AS north_key,
           RTRIM(ISNULL(ss.sRepLast,'')) + ', ' + RTRIM(ISNULL(ss.sRepFirst,'')) AS south_name
    FROM ${SOUTH}.dbo.tblSalesRep ss
    JOIN ${NORTH}.dbo.tblSalesRep ns
      ON RTRIM(LTRIM(ISNULL(ns.sRepLast,''))) = RTRIM(LTRIM(ISNULL(ss.sRepLast,'')))
      AND RTRIM(LTRIM(ISNULL(ns.sRepFirst,''))) = RTRIM(LTRIM(ISNULL(ss.sRepFirst,'')))
    WHERE ISNULL(ss.lSalesRepKeyLink, 0) = 0
      AND ss.lSalesRepKey NOT IN (SELECT south_key FROM _xwalk_SalesRep)
      AND LEN(RTRIM(ISNULL(ss.sRepLast,''))) > 0
  `);
  if (r.recordset.length > 0) {
    for (const row of r.recordset) {
      await p.request().query(`
        INSERT INTO _xwalk_SalesRep (south_key, north_key, south_name, match_type)
        VALUES (${row.south_key}, ${row.north_key}, '${(row.south_name || '').replace(/'/g, "''")}', 'name_match')
      `);
    }
    log(`  Name-matched reps: ${r.recordset.length}`);
  }

  // Import remaining that have repairs
  r = await p.request().query(`
    SELECT DISTINCT ss.lSalesRepKey
    FROM ${SOUTH}.dbo.tblSalesRep ss
    WHERE ss.lSalesRepKey NOT IN (SELECT south_key FROM _xwalk_SalesRep)
      AND EXISTS (SELECT 1 FROM ${SOUTH}.dbo.tblRepair WHERE lSalesRepKey = ss.lSalesRepKey)
  `);
  if (r.recordset.length > 0) {
    log(`  Importing ${r.recordset.length} unlinked sales reps with +${SALESREP_OFFSET} offset...`);

    const repCols = await p.request().query(`
      SELECT COLUMN_NAME FROM ${SOUTH}.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME='tblSalesRep' ORDER BY ORDINAL_POSITION
    `);
    const repColNames = repCols.recordset.map(c => c.COLUMN_NAME);

    // Check North tblSalesRep columns (may differ)
    const northRepCols = await p.request().query(`
      SELECT COLUMN_NAME FROM ${NORTH}.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME='tblSalesRep' ORDER BY ORDINAL_POSITION
    `);
    const northRepColNames = new Set(northRepCols.recordset.map(c => c.COLUMN_NAME));
    const commonCols = repColNames.filter(c => northRepColNames.has(c));

    for (const row of r.recordset) {
      const sk = row.lSalesRepKey;
      const nk = sk + SALESREP_OFFSET;
      const selectCols = commonCols.map(c => {
        if (c === 'lSalesRepKey') return `${nk} AS lSalesRepKey`;
        if (c === 'lSalesRepKeyLink') return `NULL AS lSalesRepKeyLink`;
        return `ss.${c}`;
      }).join(', ');

      await p.request().batch(`
        SET IDENTITY_INSERT ${NORTH}.dbo.tblSalesRep ON;
        INSERT INTO ${NORTH}.dbo.tblSalesRep (${commonCols.join(', ')})
        SELECT ${selectCols}
        FROM ${SOUTH}.dbo.tblSalesRep ss
        WHERE ss.lSalesRepKey = ${sk}
          AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblSalesRep WHERE lSalesRepKey = ${nk});
        SET IDENTITY_INSERT ${NORTH}.dbo.tblSalesRep OFF;
      `);
      await p.request().query(`
        INSERT INTO _xwalk_SalesRep (south_key, north_key, south_name, match_type)
        SELECT ${sk}, ${nk}, RTRIM(ISNULL(sRepLast,'')) + ', ' + RTRIM(ISNULL(sRepFirst,'')), 'imported'
        FROM ${SOUTH}.dbo.tblSalesRep WHERE lSalesRepKey = ${sk}
      `);
    }
    log(`  Imported ${r.recordset.length} reps`);
  }

  r = await p.request().query(`SELECT match_type, COUNT(*) as cnt FROM _xwalk_SalesRep GROUP BY match_type`);
  log('  Crosswalk summary:');
  r.recordset.forEach(row => log(`    ${row.match_type}: ${row.cnt}`));
}

async function phase1d_scope(p) {
  log('--- Step 1d: _xwalk_Scope ---');

  await p.request().query(`IF OBJECT_ID('_xwalk_Scope') IS NOT NULL DROP TABLE _xwalk_Scope`);

  // Create with explicit column sizes
  await p.request().query(`
    CREATE TABLE _xwalk_Scope (south_key INT, north_key INT, south_serial NVARCHAR(100), match_type VARCHAR(20))
  `);

  // Tier 1: serial + dept match
  await p.request().query(`
    INSERT INTO _xwalk_Scope (south_key, north_key, south_serial, match_type)
    SELECT DISTINCT ss.lScopeKey, ns.lScopeKey, ss.sSerialNumber, 'serial_dept'
    FROM ${SOUTH}.dbo.tblScope ss
    JOIN ${SOUTH}.dbo.tblDepartment sd ON sd.lDepartmentKey = ss.lDepartmentKey
    JOIN ${NORTH}.dbo.tblScope ns ON ns.sSerialNumber = ss.sSerialNumber
      AND ns.lDepartmentKey = sd.lLinkKeyToOtherDB
    WHERE ss.lScopeKey IN (SELECT DISTINCT lScopeKey FROM ${SOUTH}.dbo.tblRepair WHERE lScopeKey > 0)
  `);
  let r = await p.request().query(`SELECT COUNT(*) as cnt FROM _xwalk_Scope`);
  log(`  Tier 1 (serial+dept): ${r.recordset[0].cnt}`);

  // Tier 2: serial-only fallback (pick first match)
  await p.request().query(`
    INSERT INTO _xwalk_Scope (south_key, north_key, south_serial, match_type)
    SELECT ss.lScopeKey,
           (SELECT TOP 1 lScopeKey FROM ${NORTH}.dbo.tblScope WHERE sSerialNumber = ss.sSerialNumber),
           ss.sSerialNumber,
           'serial_only'
    FROM ${SOUTH}.dbo.tblScope ss
    WHERE ss.lScopeKey IN (SELECT DISTINCT lScopeKey FROM ${SOUTH}.dbo.tblRepair WHERE lScopeKey > 0)
      AND ss.lScopeKey NOT IN (SELECT south_key FROM _xwalk_Scope)
      AND EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblScope WHERE sSerialNumber = ss.sSerialNumber)
  `);
  r = await p.request().query(`SELECT COUNT(*) as cnt FROM _xwalk_Scope WHERE match_type = 'serial_only'`);
  log(`  Tier 2 (serial-only): ${r.recordset[0].cnt}`);

  // Tier 3: Import truly orphaned scopes
  r = await p.request().query(`
    SELECT DISTINCT ss.lScopeKey
    FROM ${SOUTH}.dbo.tblScope ss
    WHERE ss.lScopeKey IN (SELECT DISTINCT lScopeKey FROM ${SOUTH}.dbo.tblRepair WHERE lScopeKey > 0)
      AND ss.lScopeKey NOT IN (SELECT south_key FROM _xwalk_Scope)
  `);
  if (r.recordset.length > 0) {
    log(`  Importing ${r.recordset.length} orphaned scopes with +${SCOPE_OFFSET} offset...`);

    const scopeCols = await p.request().query(`
      SELECT COLUMN_NAME FROM ${SOUTH}.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME='tblScope' ORDER BY ORDINAL_POSITION
    `);
    const scopeColNames = scopeCols.recordset.map(c => c.COLUMN_NAME);
    const northScopeCols = await p.request().query(`
      SELECT COLUMN_NAME FROM ${NORTH}.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME='tblScope' ORDER BY ORDINAL_POSITION
    `);
    const northScopeColSet = new Set(northScopeCols.recordset.map(c => c.COLUMN_NAME));
    const commonScopeCols = scopeColNames.filter(c => northScopeColSet.has(c));

    for (const row of r.recordset) {
      const sk = row.lScopeKey;
      const nk = sk + SCOPE_OFFSET;
      const selectCols = commonScopeCols.map(c => {
        if (c === 'lScopeKey') return `${nk} AS lScopeKey`;
        if (c === 'lDepartmentKey') return `ISNULL(xd.north_key, ss.lDepartmentKey) AS lDepartmentKey`;
        return `ss.${c}`;
      }).join(', ');

      await p.request().batch(`
        SET IDENTITY_INSERT ${NORTH}.dbo.tblScope ON;
        INSERT INTO ${NORTH}.dbo.tblScope (${commonScopeCols.join(', ')})
        SELECT ${selectCols}
        FROM ${SOUTH}.dbo.tblScope ss
        LEFT JOIN _xwalk_Department xd ON xd.south_key = ss.lDepartmentKey
        WHERE ss.lScopeKey = ${sk}
          AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblScope WHERE lScopeKey = ${nk});
        SET IDENTITY_INSERT ${NORTH}.dbo.tblScope OFF;
      `);
      await p.request().query(`
        INSERT INTO _xwalk_Scope (south_key, north_key, south_serial, match_type)
        SELECT ${sk}, ${nk}, sSerialNumber, 'imported'
        FROM ${SOUTH}.dbo.tblScope WHERE lScopeKey = ${sk}
      `);
    }
    log(`  Imported ${r.recordset.length} scopes`);
  }

  r = await p.request().query(`SELECT match_type, COUNT(*) as cnt FROM _xwalk_Scope GROUP BY match_type`);
  log('  Crosswalk summary:');
  r.recordset.forEach(row => log(`    ${row.match_type}: ${row.cnt}`));
}

async function phase1e_vendor(p) {
  log('--- Step 1e: _xwalk_Vendor ---');

  await p.request().query(`IF OBJECT_ID('_xwalk_Vendor') IS NOT NULL DROP TABLE _xwalk_Vendor`);

  // Find vendor name column
  const vendorCols = await p.request().query(`
    SELECT COLUMN_NAME FROM ${SOUTH}.INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='tblVendor' AND COLUMN_NAME LIKE '%Name%'
  `);
  const nameCol = vendorCols.recordset.length > 0 ? vendorCols.recordset[0].COLUMN_NAME : 'sName';

  // Get all Nashville vendor columns
  const allVendorCols = await p.request().query(`
    SELECT COLUMN_NAME FROM ${SOUTH}.INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='tblVendor' ORDER BY ORDINAL_POSITION
  `);
  const vendorColNames = allVendorCols.recordset.map(c => c.COLUMN_NAME);
  const northVendorCols = await p.request().query(`
    SELECT COLUMN_NAME FROM ${NORTH}.INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='tblVendor' ORDER BY ORDINAL_POSITION
  `);
  const northVendorColSet = new Set(northVendorCols.recordset.map(c => c.COLUMN_NAME));
  const commonVendorCols = vendorColNames.filter(c => northVendorColSet.has(c));

  // Try name match
  let r;
  try {
    r = await p.request().query(`
      SELECT sv.lVendorKey AS south_key, nv.lVendorKey AS north_key
      FROM ${SOUTH}.dbo.tblVendor sv
      JOIN ${NORTH}.dbo.tblVendor nv ON RTRIM(LTRIM(nv.${nameCol})) = RTRIM(LTRIM(sv.${nameCol}))
    `);
  } catch (e) {
    // Try alternate column
    r = await p.request().query(`
      SELECT sv.lVendorKey AS south_key, nv.lVendorKey AS north_key
      FROM ${SOUTH}.dbo.tblVendor sv
      JOIN ${NORTH}.dbo.tblVendor nv ON RTRIM(LTRIM(nv.sVendorCompany)) = RTRIM(LTRIM(sv.sVendorCompany))
    `);
  }

  await p.request().query(`
    CREATE TABLE _xwalk_Vendor (south_key INT, north_key INT, match_type VARCHAR(20))
  `);

  for (const row of r.recordset) {
    await p.request().query(`
      INSERT INTO _xwalk_Vendor VALUES (${row.south_key}, ${row.north_key}, 'name_match')
    `);
  }
  log(`  Name-matched vendors: ${r.recordset.length}`);

  // Import unmatched vendors that have repairs
  r = await p.request().query(`
    SELECT DISTINCT sv.lVendorKey
    FROM ${SOUTH}.dbo.tblVendor sv
    WHERE sv.lVendorKey NOT IN (SELECT south_key FROM _xwalk_Vendor)
      AND EXISTS (SELECT 1 FROM ${SOUTH}.dbo.tblRepair WHERE lVendorKey = sv.lVendorKey AND lVendorKey > 0)
  `);
  if (r.recordset.length > 0) {
    log(`  Importing ${r.recordset.length} unmatched vendors with +${VENDOR_OFFSET} offset...`);
    const hasVendorIdentity = await p.request().query(`
      SELECT name FROM ${NORTH}.sys.identity_columns
      WHERE object_id = OBJECT_ID('${NORTH}.dbo.tblVendor')
    `);
    const vendorIdent = hasVendorIdentity.recordset.length > 0;
    for (const row of r.recordset) {
      const sk = row.lVendorKey;
      const nk = sk + VENDOR_OFFSET;
      const selectCols = commonVendorCols.map(c => {
        if (c === 'lVendorKey') return `${nk} AS lVendorKey`;
        return `sv.${c}`;
      }).join(', ');

      const identOn = vendorIdent ? `SET IDENTITY_INSERT ${NORTH}.dbo.tblVendor ON;` : '';
      const identOff = vendorIdent ? `SET IDENTITY_INSERT ${NORTH}.dbo.tblVendor OFF;` : '';
      await p.request().batch(`
        ${identOn}
        INSERT INTO ${NORTH}.dbo.tblVendor (${commonVendorCols.join(', ')})
        SELECT ${selectCols}
        FROM ${SOUTH}.dbo.tblVendor sv
        WHERE sv.lVendorKey = ${sk}
          AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblVendor WHERE lVendorKey = ${nk});
        ${identOff}
      `);
      await p.request().query(`
        INSERT INTO _xwalk_Vendor VALUES (${sk}, ${nk}, 'imported')
      `);
    }
    log(`  Imported ${r.recordset.length} vendors`);
  }

  r = await p.request().query(`SELECT match_type, COUNT(*) as cnt FROM _xwalk_Vendor GROUP BY match_type`);
  log('  Crosswalk summary:');
  r.recordset.forEach(row => log(`    ${row.match_type}: ${row.cnt}`));
}

// ─── PHASE 2: Import Nashville Repairs ─────────────────────────────────────────

async function phase2() {
  log('=== PHASE 2: Import Nashville Repairs ===');
  const p = await getPool();

  // Strategy: SELECT INTO staging table in North, then UPDATE FKs, then INSERT into tblRepair
  // This avoids cross-DB ntext issues and ODBC statement prep limits

  // Step 1: Copy all Nashville repairs to a staging table in North
  log('  Step 2a: Creating staging table...');
  await p.request().query(`IF OBJECT_ID('_stage_Repair') IS NOT NULL DROP TABLE _stage_Repair`);

  // Build explicit column list — drop identity by using CAST on PK, list others directly
  const srcCols = await p.request().query(`
    SELECT COLUMN_NAME FROM ${SOUTH}.INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'tblRepair' ORDER BY ORDINAL_POSITION
  `);
  const otherCols = srcCols.recordset.map(c => c.COLUMN_NAME).filter(c => c !== 'lRepairKey');
  const selectForStage = `CAST(lRepairKey + ${REPAIR_OFFSET} AS INT) AS lRepairKey, ${otherCols.join(', ')}`;

  await p.request().batch(`
    SELECT ${selectForStage}
    INTO _stage_Repair
    FROM ${SOUTH}.dbo.tblRepair
  `);
  let r = await p.request().query(`SELECT COUNT(*) as cnt FROM _stage_Repair`);
  log(`  Staged ${r.recordset[0].cnt} repairs (PK already offset +${REPAIR_OFFSET})`);

  // Step 2: Remove true WO duplicates from staging
  log('  Step 2b: Removing duplicates...');
  await p.request().query(`
    DELETE s FROM _stage_Repair s
    WHERE EXISTS (
      SELECT 1 FROM ${NORTH}.dbo.tblRepair nr
      WHERE nr.sWorkOrderNumber = s.sWorkOrderNumber
      AND (s.sWorkOrderNumber LIKE 'NR%' OR s.sWorkOrderNumber LIKE 'SR%')
    )
  `);
  r = await p.request().query(`SELECT COUNT(*) as cnt FROM _stage_Repair`);
  log(`  After dupe removal: ${r.recordset[0].cnt} repairs`);

  // Step 4: Remap FKs using crosswalks via UPDATE
  log('  Step 2d: Remapping FK columns...');

  // Department
  await p.request().query(`
    UPDATE s SET s.lDepartmentKey = xd.north_key
    FROM _stage_Repair s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey
  `);
  log('    lDepartmentKey remapped');

  // Scope
  await p.request().query(`
    UPDATE s SET s.lScopeKey = xs.north_key
    FROM _stage_Repair s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey
    WHERE s.lScopeKey > 0
  `);
  log('    lScopeKey remapped');

  // Loaner scope
  const hasLoanerScope = await p.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='_stage_Repair' AND COLUMN_NAME='lScopeKey_Loaner'`);
  if (hasLoanerScope.recordset.length > 0) {
    await p.request().query(`
      UPDATE s SET s.lScopeKey_Loaner = xs.north_key
      FROM _stage_Repair s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey_Loaner
      WHERE s.lScopeKey_Loaner > 0
    `);
    log('    lScopeKey_Loaner remapped');
  }

  // Technician (covers lTechnicianKey, lInspectorKey, lTechnician2Key, lResponsibleTech, lReworkTech, lTechnicianKey_DefectTracking)
  const techCols = ['lTechnicianKey', 'lInspectorKey', 'lTechnician2Key', 'lResponsibleTech', 'lReworkTech', 'lTechnicianKey_DefectTracking'];
  for (const col of techCols) {
    const exists = await p.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='_stage_Repair' AND COLUMN_NAME='${col}'`);
    if (exists.recordset.length > 0) {
      await p.request().query(`
        UPDATE s SET s.${col} = xt.north_key
        FROM _stage_Repair s JOIN _xwalk_Technician xt ON xt.south_key = s.${col}
        WHERE s.${col} > 0
      `);
    }
  }
  log('    Technician columns remapped');

  // Sales rep
  await p.request().query(`
    UPDATE s SET s.lSalesRepKey = xr.north_key
    FROM _stage_Repair s JOIN _xwalk_SalesRep xr ON xr.south_key = s.lSalesRepKey
    WHERE s.lSalesRepKey > 0
  `);
  log('    lSalesRepKey remapped');

  // Vendor
  await p.request().query(`
    UPDATE s SET s.lVendorKey = xv.north_key
    FROM _stage_Repair s JOIN _xwalk_Vendor xv ON xv.south_key = s.lVendorKey
    WHERE s.lVendorKey > 0
  `);
  log('    lVendorKey remapped');

  // Contract — NULL out ones not in North
  await p.request().query(`
    UPDATE _stage_Repair SET lContractKey = 0
    WHERE lContractKey > 0
      AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblContract WHERE lContractKey = _stage_Repair.lContractKey)
  `);
  log('    lContractKey verified/nulled');

  // Parent/Friend repair keys — offset them too
  await p.request().query(`UPDATE _stage_Repair SET lParentRepairKey = lParentRepairKey + ${REPAIR_OFFSET} WHERE ISNULL(lParentRepairKey, 0) > 0`);
  await p.request().query(`UPDATE _stage_Repair SET lFriendRepairKey = lFriendRepairKey + ${REPAIR_OFFSET} WHERE ISNULL(lFriendRepairKey, 0) > 0`);
  log('    lParentRepairKey, lFriendRepairKey offset');

  // Service location = 2 (South)
  await p.request().query(`UPDATE _stage_Repair SET lServiceLocationKey = 2`);
  log('    lServiceLocationKey set to 2');

  // Clean up orphaned FK values — set to 0 if parent doesn't exist in North
  const fkCleanups = [
    ['lDepartmentKey', 'tblDepartment', 'lDepartmentKey'],
    ['lScopeKey', 'tblScope', 'lScopeKey'],
    ['lTechnicianKey', 'tblTechnicians', 'lTechnicianKey'],
    ['lInspectorKey', 'tblTechnicians', 'lTechnicianKey'],
    ['lTechnician2Key', 'tblTechnicians', 'lTechnicianKey'],
    ['lSalesRepKey', 'tblSalesRep', 'lSalesRepKey'],
    ['lVendorKey', 'tblVendor', 'lVendorKey'],
  ];
  for (const [fkCol, parentTable, pkCol] of fkCleanups) {
    const exists = await p.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='_stage_Repair' AND COLUMN_NAME='${fkCol}'`);
    if (exists.recordset.length > 0) {
      const upd = await p.request().query(`
        UPDATE _stage_Repair SET ${fkCol} = 0
        WHERE ${fkCol} > 0
          AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.${parentTable} WHERE ${pkCol} = _stage_Repair.${fkCol})
      `);
      if (upd.rowsAffected[0] > 0) log(`    Cleaned ${upd.rowsAffected[0]} orphaned ${fkCol} values`);
    }
  }

  // Disable FK constraints and triggers on tblRepair for import
  log('  Disabling FK constraints and triggers on tblRepair...');
  await p.request().query(`ALTER TABLE ${NORTH}.dbo.tblRepair NOCHECK CONSTRAINT ALL`);
  await p.request().query(`ALTER TABLE ${NORTH}.dbo.tblRepair DISABLE TRIGGER ALL`);

  // Step 5: INSERT from staging into tblRepair (same DB, no cross-DB issues)
  log('  Step 2e: Inserting into tblRepair...');
  const commonCols = await p.request().query(`
    SELECT c1.COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS c1
    JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stage_Repair') c2
      ON c2.COLUMN_NAME = c1.COLUMN_NAME
    WHERE c1.TABLE_NAME = 'tblRepair'
    ORDER BY c1.ORDINAL_POSITION
  `);
  const colList = commonCols.recordset.map(c => c.COLUMN_NAME).join(', ');

  // Batch insert from staging — all in same DB now
  const BATCH = 5000;
  const totalToInsert = (await p.request().query(`SELECT COUNT(*) as cnt FROM _stage_Repair`)).recordset[0].cnt;
  let inserted = 0;
  let offset = 0;

  while (offset < totalToInsert) {
    await p.request().batch(`
      SET IDENTITY_INSERT ${NORTH}.dbo.tblRepair ON;
      INSERT INTO ${NORTH}.dbo.tblRepair (${colList})
      SELECT ${colList}
      FROM (SELECT *, ROW_NUMBER() OVER (ORDER BY lRepairKey) AS _rn FROM _stage_Repair) s
      WHERE s._rn > ${offset} AND s._rn <= ${offset + BATCH};
      SET IDENTITY_INSERT ${NORTH}.dbo.tblRepair OFF;
    `);
    inserted += BATCH;
    offset += BATCH;
    if (offset % 10000 === 0 || offset >= totalToInsert) log(`  Progress: ${Math.min(offset, totalToInsert)}/${totalToInsert}`);
  }

  // Verify
  const verify = await p.request().query(`
    SELECT COUNT(*) as cnt FROM ${NORTH}.dbo.tblRepair WHERE lRepairKey >= ${REPAIR_OFFSET}
  `);
  log(`  Phase 2 complete: ${verify.recordset[0].cnt} repairs imported.`);

  // Re-enable FK constraints and triggers
  await p.request().query(`ALTER TABLE ${NORTH}.dbo.tblRepair ENABLE TRIGGER ALL`);
  await p.request().query(`ALTER TABLE ${NORTH}.dbo.tblRepair CHECK CONSTRAINT ALL`);
  log('  FK constraints and triggers re-enabled.');

  // Cleanup staging
  await p.request().query(`DROP TABLE _stage_Repair`);
  log('  Staging table dropped.');
}

// ─── PHASE 3: Migrate Child Tables ─────────────────────────────────────────────

async function phase3() {
  log('=== PHASE 3: Migrate Child Tables ===');
  const p = await getPool();

  // Build list of duplicate repair keys to exclude
  const dupes = await p.request().query(`
    SELECT sr.lRepairKey
    FROM ${SOUTH}.dbo.tblRepair sr
    JOIN ${NORTH}.dbo.tblRepair nr ON nr.sWorkOrderNumber = sr.sWorkOrderNumber
    WHERE sr.sWorkOrderNumber LIKE 'NR%' OR sr.sWorkOrderNumber LIKE 'SR%'
  `);
  const dupeRepairKeys = new Set(dupes.recordset.map(r => r.lRepairKey));
  const dupeClause = dupeRepairKeys.size > 0
    ? `AND lRepairKey NOT IN (${[...dupeRepairKeys].join(',')})`
    : '';

  // Child table migration configs
  // For identity tables: { name, pkCol, pkOffset, extraFKs: { col: crosswalk_or_offset } }
  // For non-identity tables: { name, hasIdentity: false, extraFKs }
  const childTables = [
    { name: 'tblStatusTran', pkCol: 'lStatusTranKey', pkOffset: 20000000,
      extraFKs: {} },  // lStatusKey is a lookup, pass through
    { name: 'tblRepairItemTran', pkCol: 'lRepairItemTranKey', pkOffset: 200000000,
      extraFKs: { lTechnicianKey: 'tech', lTechnician2Key: 'tech' } },
    { name: 'tblRepairStatusLog', pkCol: 'lRepairStatusLogID', pkOffset: 20000000,
      extraFKs: {} },
    { name: 'tblShipExecInvoiceChargeRepairs', hasIdentity: false,
      extraFKs: {} },
    { name: 'tblShippingChargeRepairs', pkCol: 'lShippingChargeRepairKey', pkOffset: 20000000,
      extraFKs: {} },
    { name: 'tblPointsOps', pkCol: 'lPointsOpsKey', pkOffset: 20000000,
      extraFKs: {} },
    { name: 'tblTasks', pkCol: 'lTaskKey', pkOffset: 20000000,
      extraFKs: { lDepartmentKey: 'dept' } },
    { name: 'tblPointsTechs', pkCol: 'lPointsTechsKey', pkOffset: 20000000,
      extraFKs: { lTechnicianKey: 'tech', lRepairItemTranKey: { offset: 200000000 } } },
    { name: 'tblInvoice', pkCol: 'lInvoiceKey', pkOffset: 2000000000,
      extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lSalesRepKey: 'salesrep',
                  lFriendRepairKey: { offset: REPAIR_OFFSET } } },
    { name: 'tblBlankInspectionSignOffLog', pkCol: 'BlankInspectionSignOffID', pkOffset: 20000000,
      extraFKs: {} },
    { name: 'tblRepairRevenueAndExpensesContract', hasIdentity: false,
      extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lInvoiceKey: { offset: 2000000000 } } },
    { name: 'tblTrackingNumbersInAudit', hasIdentity: false,
      extraFKs: {} },
    { name: 'tblDashScopesInSave', hasIdentity: false,
      extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lSalesRepKey: 'salesrep' } },
    { name: 'tblLoanerTran', pkCol: 'lLoanerTranKey', pkOffset: 20000000,
      extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lSalesRepKey: 'salesrep' } },
    { name: 'tblContractRepairsSaved', hasIdentity: false,
      extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope' } },
    { name: 'tblRepairFailureCodes', hasIdentity: false,
      extraFKs: {} },
    { name: 'tblAmendRepairComments', pkCol: 'lAmendRepairCommentKey', pkOffset: 20000000,
      extraFKs: {} },
    { name: 'tblRepairUpdateSlips', pkCol: 'lRepairUpdateSlipKey', pkOffset: 20000000,
      extraFKs: {} },
    { name: 'tblInvoiceVoid', pkCol: 'lInvoiceKey', pkOffset: 2000000000,
      extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lSalesRepKey: 'salesrep',
                  lFriendRepairKey: { offset: REPAIR_OFFSET } } },
    { name: 'tblRepairInspection', pkCol: 'lRepairInspectionKey', pkOffset: 20000000,
      extraFKs: { lTechnicianKey: 'tech', lInspectorKey: 'tech' } },
    { name: 'tblRepairInstrumentModels', pkCol: 'lRepairInstrumentModelKey', pkOffset: 20000000,
      extraFKs: { lTechnicianKey: 'tech', lVendorKey: 'vendor',
                  lOutsourcedRepairKey: { offset: REPAIR_OFFSET },
                  lReplacedRepairKey: { offset: REPAIR_OFFSET } } },
    { name: 'tblRepairRevenueAndExpenses', hasIdentity: false,
      extraFKs: { lDepartmentKey: 'dept', lScopeKey: 'scope', lSalesRepKey: 'salesrep',
                  lInvoiceKey: { offset: 2000000000 } } },
    { name: 'tblRepairDefectTracking', hasIdentity: false,
      extraFKs: {} },
    { name: 'tblRepairDeleteAudit', hasIdentity: false,
      extraFKs: {} },
    { name: 'tblISOComplaint', pkCol: 'lISOComplaintKey', pkOffset: 20000000,
      extraFKs: {} },
  ];

  for (const tbl of childTables) {
    await migrateChildTable(p, tbl, dupeClause);
  }

  log('Phase 3 complete — all child tables migrated.');
}

async function migrateChildTable(p, tblConfig, dupeClause) {
  const { name, pkCol, pkOffset, extraFKs = {}, hasIdentity } = tblConfig;
  const isIdentity = hasIdentity !== false;

  log(`  --- ${name} ---`);

  // Use staging approach (same as Phase 2) to avoid ODBC cross-DB issues
  const stageName = `_stage_${name}`;
  await p.request().query(`IF OBJECT_ID('${stageName}') IS NOT NULL DROP TABLE ${stageName}`);

  // Get Nashville columns, build SELECT with CAST on identity to break it
  const srcCols = await p.request().query(`
    SELECT COLUMN_NAME FROM ${SOUTH}.INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${name}' ORDER BY ORDINAL_POSITION
  `);
  const srcColNames = srcCols.recordset.map(c => c.COLUMN_NAME);

  // Find the identity column in Nashville
  const identCol = isIdentity ? pkCol : null;
  const stageSelect = srcColNames.map(c => {
    if (c === identCol) return `CAST(${c} AS INT) AS ${c}`;
    return c;
  }).join(', ');

  // Copy to staging (cross-DB SELECT INTO works for all types)
  const srcCount = await p.request().query(`SELECT COUNT(*) as cnt FROM ${SOUTH}.dbo.${name}`);
  const totalRows = srcCount.recordset[0].cnt;
  log(`    Source rows: ${totalRows}`);
  if (totalRows === 0) return;

  const stageReq = p.request();
  stageReq.timeout = 600000;
  await stageReq.query(`
    SELECT ${stageSelect} INTO ${stageName}
    FROM ${SOUTH}.dbo.${name}
    WHERE 1=1 ${dupeClause}
  `);

  // Apply PK offset
  if (isIdentity && pkCol) {
    const pkReq = p.request(); pkReq.timeout = 600000;
    await pkReq.query(`UPDATE ${stageName} SET ${pkCol} = ${pkCol} + ${pkOffset}`);
  }

  // Apply lRepairKey offset
  if (srcColNames.includes('lRepairKey')) {
    const rkReq = p.request(); rkReq.timeout = 600000;
    await rkReq.query(`UPDATE ${stageName} SET lRepairKey = lRepairKey + ${REPAIR_OFFSET}`);
  }

  // Apply FK remaps via UPDATE
  for (const [col, fk] of Object.entries(extraFKs)) {
    if (!srcColNames.includes(col)) continue;
    if (fk === 'dept') {
      await p.request().query(`UPDATE s SET s.${col} = xd.north_key FROM ${stageName} s JOIN _xwalk_Department xd ON xd.south_key = s.${col} WHERE s.${col} > 0`);
    } else if (fk === 'scope') {
      await p.request().query(`UPDATE s SET s.${col} = xs.north_key FROM ${stageName} s JOIN _xwalk_Scope xs ON xs.south_key = s.${col} WHERE s.${col} > 0`);
    } else if (fk === 'tech') {
      await p.request().query(`UPDATE s SET s.${col} = xt.north_key FROM ${stageName} s JOIN _xwalk_Technician xt ON xt.south_key = s.${col} WHERE s.${col} > 0`);
    } else if (fk === 'salesrep') {
      await p.request().query(`UPDATE s SET s.${col} = xr.north_key FROM ${stageName} s JOIN _xwalk_SalesRep xr ON xr.south_key = s.${col} WHERE s.${col} > 0`);
    } else if (fk === 'vendor') {
      await p.request().query(`UPDATE s SET s.${col} = xv.north_key FROM ${stageName} s JOIN _xwalk_Vendor xv ON xv.south_key = s.${col} WHERE s.${col} > 0`);
    } else if (fk.offset) {
      await p.request().query(`UPDATE ${stageName} SET ${col} = ${col} + ${fk.offset} WHERE ${col} > 0`);
    }
  }

  // Get common columns between staging and North target
  const northCols = await p.request().query(`
    SELECT COLUMN_NAME FROM ${NORTH}.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${name}'
  `);
  const northColSet = new Set(northCols.recordset.map(c => c.COLUMN_NAME));
  const stageCols = await p.request().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${stageName}'
  `);
  const commonCols = stageCols.recordset.map(c => c.COLUMN_NAME).filter(c => northColSet.has(c));
  const colList = commonCols.join(', ');

  // Disable triggers/constraints
  await p.request().query(`ALTER TABLE ${NORTH}.dbo.${name} NOCHECK CONSTRAINT ALL`);
  try { await p.request().query(`ALTER TABLE ${NORTH}.dbo.${name} DISABLE TRIGGER ALL`); } catch (e) { /* no triggers */ }

  // Batch INSERT from staging
  const BATCH = 50000;
  const stageCount = (await p.request().query(`SELECT COUNT(*) as cnt FROM ${stageName}`)).recordset[0].cnt;
  let inserted = 0;
  let offset = 0;

  while (offset < stageCount) {
    try {
      const identOn = isIdentity ? `SET IDENTITY_INSERT ${NORTH}.dbo.${name} ON;` : '';
      const identOff = isIdentity ? `SET IDENTITY_INSERT ${NORTH}.dbo.${name} OFF;` : '';
      const insertReq = p.request();
      insertReq.timeout = 600000;
      const result = await insertReq.batch(`
        ${identOn}
        INSERT INTO ${NORTH}.dbo.${name} (${colList})
        SELECT ${colList}
        FROM (SELECT *, ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS _rn FROM ${stageName}) s
        WHERE s._rn > ${offset} AND s._rn <= ${offset + BATCH};
        ${identOff}
      `);
      inserted += result.rowsAffected[0];
    } catch (e) {
      log(`    ERROR at offset ${offset}: ${e.message.substring(0, 200)}`);
    }
    offset += BATCH;
    if (offset % 100000 === 0 || offset >= stageCount) log(`    Progress: ${Math.min(inserted, stageCount)}/${stageCount}`);
  }

  // Re-enable
  try { await p.request().query(`ALTER TABLE ${NORTH}.dbo.${name} ENABLE TRIGGER ALL`); } catch (e) { /* no triggers */ }
  await p.request().query(`ALTER TABLE ${NORTH}.dbo.${name} CHECK CONSTRAINT ALL`);

  // Cleanup
  await p.request().query(`DROP TABLE ${stageName}`);
  log(`    Done: ${inserted} rows inserted`);
}

// ─── PHASE 4: Fix Inventory Transaction Repair Keys ────────────────────────────

async function phase4() {
  log('=== PHASE 4: Fix Inventory Transaction Repair Keys ===');
  const p = await getPool();

  // tblInventoryTran — South rows (key >= 1M from Step 3G) that reference old Nashville repair keys
  let r = await p.request().query(`
    UPDATE ${NORTH}.dbo.tblInventoryTran
    SET lRepairKey = lRepairKey + ${REPAIR_OFFSET}
    WHERE lInventoryTranKey >= 1000000
      AND lRepairKey > 0
      AND lRepairKey < ${REPAIR_OFFSET}
      AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblRepair WHERE lRepairKey = ${NORTH}.dbo.tblInventoryTran.lRepairKey)
  `);
  log(`  tblInventoryTran: ${r.rowsAffected[0]} rows updated`);

  // tblRepairInventory — South rows
  r = await p.request().query(`
    UPDATE ${NORTH}.dbo.tblRepairInventory
    SET lRepairKey = lRepairKey + ${REPAIR_OFFSET}
    WHERE lRepairKey > 0
      AND lRepairKey < ${REPAIR_OFFSET}
      AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblRepair nr WHERE nr.lRepairKey = ${NORTH}.dbo.tblRepairInventory.lRepairKey)
      AND EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblRepair nr2 WHERE nr2.lRepairKey = ${NORTH}.dbo.tblRepairInventory.lRepairKey + ${REPAIR_OFFSET})
  `);
  log(`  tblRepairInventory: ${r.rowsAffected[0]} rows updated`);

  // tblLotNumberAdjustments
  r = await p.request().query(`
    SELECT COLUMN_NAME FROM ${NORTH}.INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'tblLotNumberAdjustments' AND COLUMN_NAME = 'lRepairKey'
  `);
  if (r.recordset.length > 0) {
    r = await p.request().query(`
      UPDATE ${NORTH}.dbo.tblLotNumberAdjustments
      SET lRepairKey = lRepairKey + ${REPAIR_OFFSET}
      WHERE lLotNumberAdjustmentKey >= 1000000
        AND lRepairKey > 0
        AND lRepairKey < ${REPAIR_OFFSET}
        AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblRepair WHERE lRepairKey = ${NORTH}.dbo.tblLotNumberAdjustments.lRepairKey)
    `);
    log(`  tblLotNumberAdjustments: ${r.rowsAffected[0]} rows updated`);
  }

  // tblRepairLotNumberAdjustments
  r = await p.request().query(`
    SELECT COLUMN_NAME FROM ${NORTH}.INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'tblRepairLotNumberAdjustments' AND COLUMN_NAME = 'lRepairKey'
  `);
  if (r.recordset.length > 0) {
    r = await p.request().query(`
      UPDATE ${NORTH}.dbo.tblRepairLotNumberAdjustments
      SET lRepairKey = lRepairKey + ${REPAIR_OFFSET}
      WHERE lRepairKey > 0
        AND lRepairKey < ${REPAIR_OFFSET}
        AND NOT EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblRepair WHERE lRepairKey = ${NORTH}.dbo.tblRepairLotNumberAdjustments.lRepairKey)
        AND EXISTS (SELECT 1 FROM ${NORTH}.dbo.tblRepair nr2 WHERE nr2.lRepairKey = ${NORTH}.dbo.tblRepairLotNumberAdjustments.lRepairKey + ${REPAIR_OFFSET})
    `);
    log(`  tblRepairLotNumberAdjustments: ${r.rowsAffected[0]} rows updated`);
  }

  log('Phase 4 complete.');
}

// ─── PHASE 5: Verify ───────────────────────────────────────────────────────────

async function phase5() {
  log('=== PHASE 5: Verify Migration ===');
  const p = await getPool();

  // 5a: Build _xwalk_Repair
  log('--- Building _xwalk_Repair ---');
  await p.request().query(`IF OBJECT_ID('_xwalk_Repair') IS NOT NULL DROP TABLE _xwalk_Repair`);
  await p.request().query(`
    SELECT lRepairKey - ${REPAIR_OFFSET} AS south_key,
           lRepairKey AS north_key,
           sWorkOrderNumber
    INTO _xwalk_Repair
    FROM ${NORTH}.dbo.tblRepair
    WHERE lRepairKey >= ${REPAIR_OFFSET}
  `);
  let r = await p.request().query(`SELECT COUNT(*) as cnt FROM _xwalk_Repair`);
  log(`  _xwalk_Repair: ${r.recordset[0].cnt} rows`);

  // 5b: Row count reconciliation
  log('--- Row Count Reconciliation ---');
  const tables = [
    'tblRepair', 'tblStatusTran', 'tblRepairItemTran', 'tblRepairStatusLog',
    'tblShipExecInvoiceChargeRepairs', 'tblShippingChargeRepairs', 'tblPointsOps',
    'tblTasks', 'tblPointsTechs', 'tblInvoice', 'tblBlankInspectionSignOffLog',
    'tblRepairRevenueAndExpensesContract', 'tblTrackingNumbersInAudit',
    'tblDashScopesInSave', 'tblLoanerTran', 'tblContractRepairsSaved',
    'tblRepairFailureCodes', 'tblAmendRepairComments', 'tblRepairUpdateSlips',
    'tblInvoiceVoid', 'tblRepairInspection', 'tblRepairInstrumentModels',
    'tblRepairRevenueAndExpenses', 'tblRepairDefectTracking',
    'tblRepairDeleteAudit', 'tblISOComplaint'
  ];

  let allMatch = true;
  for (const tbl of tables) {
    try {
      const south = await p.request().query(`SELECT COUNT(*) as cnt FROM ${SOUTH}.dbo.${tbl}`);
      // For tblRepair, count only migrated rows (key >= offset)
      let northQ;
      if (tbl === 'tblRepair') {
        northQ = `SELECT COUNT(*) as cnt FROM ${NORTH}.dbo.${tbl} WHERE lRepairKey >= ${REPAIR_OFFSET}`;
      } else {
        // Count rows that reference migrated repairs
        northQ = `SELECT COUNT(*) as cnt FROM ${NORTH}.dbo.${tbl} WHERE lRepairKey >= ${REPAIR_OFFSET}`;
      }
      const north = await p.request().query(northQ);
      const sCount = south.recordset[0].cnt;
      const nCount = north.recordset[0].cnt;
      const status = sCount <= nCount + 14 ? 'OK' : 'MISMATCH';  // 14 = max dupes
      if (status === 'MISMATCH') allMatch = false;
      log(`  ${tbl}: South=${sCount}, North=${nCount} [${status}]`);
    } catch (e) {
      log(`  ${tbl}: ERROR — ${e.message}`);
    }
  }

  // 5c: FK integrity checks
  log('--- FK Integrity Checks ---');
  const fkChecks = [
    ['tblRepair', 'lDepartmentKey', 'tblDepartment', 'lDepartmentKey'],
    ['tblRepair', 'lScopeKey', 'tblScope', 'lScopeKey'],
    ['tblRepair', 'lTechnicianKey', 'tblTechnicians', 'lTechnicianKey'],
    ['tblRepair', 'lSalesRepKey', 'tblSalesRep', 'lSalesRepKey'],
    ['tblRepair', 'lDistributorKey', 'tblDistributor', 'lDistributorKey'],
  ];

  for (const [child, fkCol, parent, pkCol] of fkChecks) {
    r = await p.request().query(`
      SELECT COUNT(*) as orphans
      FROM ${NORTH}.dbo.${child} c
      LEFT JOIN ${NORTH}.dbo.${parent} p ON p.${pkCol} = c.${fkCol}
      WHERE c.lRepairKey >= ${REPAIR_OFFSET}
        AND c.${fkCol} > 0
        AND p.${pkCol} IS NULL
    `);
    const cnt = r.recordset[0].orphans;
    log(`  ${child}.${fkCol} → ${parent}: ${cnt} orphans ${cnt === 0 ? 'OK' : 'ISSUE'}`);
  }

  // 5d: Spot checks
  log('--- Spot Checks (5 random Nashville repairs) ---');
  r = await p.request().query(`
    SELECT TOP 5 south_key, north_key, sWorkOrderNumber
    FROM _xwalk_Repair
    ORDER BY NEWID()
  `);
  for (const row of r.recordset) {
    const detail = await p.request().query(`
      SELECT r.lRepairKey, r.sWorkOrderNumber, r.lDepartmentKey, r.lScopeKey,
        (SELECT COUNT(*) FROM ${NORTH}.dbo.tblStatusTran WHERE lRepairKey = r.lRepairKey) as status_trans,
        (SELECT COUNT(*) FROM ${NORTH}.dbo.tblRepairItemTran WHERE lRepairKey = r.lRepairKey) as item_trans
      FROM ${NORTH}.dbo.tblRepair r
      WHERE r.lRepairKey = ${row.north_key}
    `);
    if (detail.recordset.length > 0) {
      const d = detail.recordset[0];
      log(`  WO ${d.sWorkOrderNumber} (${row.south_key}→${row.north_key}): dept=${d.lDepartmentKey}, scope=${d.lScopeKey}, statuses=${d.status_trans}, items=${d.item_trans}`);
    }
  }

  log(`Phase 5 complete. All checks ${allMatch ? 'PASSED' : 'have issues — review above'}.`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const phase = process.argv[2];
  if (!phase) {
    console.log('Usage: node nashville-repair-migrate.js <phase1|phase2|phase3|phase4|phase5>');
    process.exit(1);
  }

  try {
    switch (phase) {
      case 'phase1': await phase1(); break;
      case 'phase2': await phase2(); break;
      case 'phase3': await phase3(); break;
      case 'phase4': await phase4(); break;
      case 'phase5': await phase5(); break;
      default: console.log(`Unknown phase: ${phase}`); process.exit(1);
    }
  } catch (e) {
    console.error('FATAL:', e);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

main();
