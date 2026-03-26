/**
 * extract-2025-data.js
 * Pulls ALL data from 2025-01-01 onward from BOTH WinScopeNet (North) and
 * WinScopeNetNashville (South) databases via sqlcmd.
 *
 * S-prefix WOs (SR, SI, SC, SK, SV) = Nashville
 * N-prefix WOs (NR, NI, NC, NK, NV) = North/Upper Chichester
 *
 * Usage: node tasks/extract-2025-data.js
 * Output: tasks/real-data-seed.json (~50-80 MB)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER = 'localhost';
const DATE_FROM = '2025-01-01';
const DATE_TO   = '2026-12-31';  // far future — get everything from 2025 on
const TMP_SQL = path.join(__dirname, '_tmp_query.sql');
const SQLCMD = 'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\180\\Tools\\Binn\\SQLCMD.EXE';
const SVC_LOC_NAMES = { 1: 'Upper Chichester', 2: 'Nashville' };

// ============================================================
// SQL helper via sqlcmd — supports switching database
// ============================================================
let CURRENT_DB = 'WinScopeNet';

function sqlQuery(queryStr, db) {
  const useDb = db || CURRENT_DB;
  fs.writeFileSync(TMP_SQL, queryStr, 'utf8');
  try {
    const buf = execSync(
      `"${SQLCMD}" -S "${SERVER}" -d "${useDb}" -C -i "${TMP_SQL}" -y0 -w 65535`,
      { maxBuffer: 1024 * 1024 * 1024, timeout: 600000 }
    );
    const cleaned = buf.toString('utf8').replace(/\r/g, '');
    const lines = cleaned.split('\n')
      .map(l => l.trimEnd())
      .filter(l => l && !/^\(\d+ rows? affected\)/.test(l));
    let jsonStr = lines.join('').trim();
    if (!jsonStr || jsonStr === 'NULL') return [];

    // Sanitize: remove any control characters that slipped through (except in JSON structure)
    jsonStr = jsonStr.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ');

    return JSON.parse(jsonStr);
  } catch (e) {
    const msg = e.stdout || e.stderr || e.message || '';
    // If JSON parse failed, try harder sanitization
    if (String(msg).includes('JSON') && e.stdout) {
      try {
        let raw = e.stdout.toString('utf8').replace(/\r/g, '');
        const rawLines = raw.split('\n').map(l => l.trimEnd()).filter(l => l && !/^\(\d+ rows? affected\)/.test(l));
        let fixed = rawLines.join('').trim();
        // Strip ALL control chars except structural ones
        fixed = fixed.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ');
        // Fix common JSON issues: trailing backslash before quote
        fixed = fixed.replace(/\\"/g, '\\\\"').replace(/\\\\\\\\/g, '\\\\');
        return JSON.parse(fixed);
      } catch (e2) {
        console.error('  ERROR (retry failed):', String(e2.message).substring(0, 200));
        return [];
      }
    }
    console.error('  ERROR:', String(msg).substring(0, 800));
    return [];
  } finally {
    try { fs.unlinkSync(TMP_SQL); } catch (_) {}
  }
}

function log(name, seed) {
  const count = Array.isArray(seed[name]) ? seed[name].length : 0;
  console.log(`  ${name}: ${count.toLocaleString()} records`);
}

// ============================================================
// Build ntext-safe column list for a table
// ============================================================
function safeSelectCols(tableName, alias, db) {
  const pfx = alias ? `${alias}.` : '';
  const cols = sqlQuery(`
    SELECT c.name, ty.name AS typeName
    FROM sys.columns c
    JOIN sys.tables t ON c.object_id = t.object_id
    JOIN sys.types ty ON c.user_type_id = ty.user_type_id
    WHERE t.name = '${tableName}'
    ORDER BY c.column_id
    FOR JSON PATH
  `, db);
  if (!cols.length) return `${pfx}*`;
  return cols
    .filter(c => !['image','ntext','text','varbinary','xml'].includes(c.typeName))
    .filter(c => !/^m[A-Z]/.test(c.name))
    // Exclude nvarchar(MAX) columns — they contain unescaped chars that break JSON
    .filter(c => !(c.typeName === 'nvarchar' && c.max_length === -1))
    .map(c => `${pfx}[${c.name}]`)
    .join(', ');
}

// Build column list that wraps string columns in REPLACE to strip control chars
function safeSelectColsStrict(tableName, alias, db) {
  const pfx = alias ? `${alias}.` : '';
  const cols = sqlQuery(`
    SELECT c.name, ty.name AS typeName, c.max_length
    FROM sys.columns c
    JOIN sys.tables t ON c.object_id = t.object_id
    JOIN sys.types ty ON c.user_type_id = ty.user_type_id
    WHERE t.name = '${tableName}'
    ORDER BY c.column_id
    FOR JSON PATH
  `, db);
  if (!cols.length) return `${pfx}*`;
  return cols
    .filter(c => !['image','ntext','text','varbinary','xml'].includes(c.typeName))
    .filter(c => !/^m[A-Z]/.test(c.name))
    .filter(c => !(c.typeName === 'nvarchar' && c.max_length === -1))
    .map(c => {
      const col = `${pfx}[${c.name}]`;
      // Wrap ALL nvarchar/varchar columns in REPLACE to strip control chars and fix JSON
      if (['char','nchar','nvarchar','varchar'].includes(c.typeName)) {
        return `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${col}, CHAR(0), ''), CHAR(9), ' '), CHAR(10), ' '), CHAR(13), ' '), CHAR(92)+CHAR(92), CHAR(92)) AS [${c.name}]`;
      }
      return col;
    })
    .join(', ');
}

// Tag records with region
function tagRegion(rows, region) {
  if (!rows) return [];
  rows.forEach(r => { r._region = region; r._dbKey = region === 'North' ? 1 : 2; });
  return rows;
}

// Tag work order type from WO number prefix
// NR/SR = Repair, NV/SV = Van/Site Service, NK/SK = EndoCart,
// NI/SI = Instrument Sale, NC/SC = Contract
function tagWOType(repairs) {
  if (!repairs) return [];
  repairs.forEach(r => {
    const wo = (r.sWorkOrderNumber || r.sTransNumber || '').toUpperCase();
    const prefix = wo.substring(0, 2);
    if (['NR','SR'].includes(prefix)) r._woType = 'Repair';
    else if (['NV','SV'].includes(prefix)) r._woType = 'VanService';
    else if (['NK','SK'].includes(prefix)) r._woType = 'EndoCart';
    else if (['NI','SI'].includes(prefix)) r._woType = 'InstrumentSale';
    else if (['NC','SC'].includes(prefix)) r._woType = 'Contract';
    else r._woType = 'Repair'; // default
    r._site = prefix.startsWith('S') ? 'Nashville' : 'North';
  });
  return repairs;
}

// Merge arrays, dedup by key field
function merge(arr1, arr2, keyField) {
  if (!keyField) return [...(arr1 || []), ...(arr2 || [])];
  const seen = new Set();
  const result = [];
  for (const row of [...(arr1 || []), ...(arr2 || [])]) {
    const k = row[keyField];
    if (k != null && seen.has(k)) continue;
    if (k != null) seen.add(k);
    result.push(row);
  }
  return result;
}

// Chunked extraction for large tables that fail JSON parsing
// Extracts in batches using OFFSET/FETCH to avoid control char issues
// If a chunk fails, subdivides it into smaller sub-chunks to skip only bad rows
function sqlQueryChunked(queryBase, orderBy, db, chunkSize = 5000) {
  let allRows = [];
  let offset = 0;
  let consecutiveEmpty = 0;
  const maxOffset = 200000; // safety limit

  while (offset < maxOffset) {
    const chunk = sqlQuery(
      `${queryBase} ORDER BY ${orderBy} OFFSET ${offset} ROWS FETCH NEXT ${chunkSize} ROWS ONLY FOR JSON PATH`,
      db
    );
    if (!chunk.length) {
      // Might be a bad chunk — try smaller sub-chunks to skip past bad data
      let recovered = 0;
      const subSize = Math.max(100, Math.floor(chunkSize / 10));
      for (let subOff = 0; subOff < chunkSize; subOff += subSize) {
        const sub = sqlQuery(
          `${queryBase} ORDER BY ${orderBy} OFFSET ${offset + subOff} ROWS FETCH NEXT ${subSize} ROWS ONLY FOR JSON PATH`,
          db
        );
        if (sub.length) {
          allRows = allRows.concat(sub);
          recovered += sub.length;
        }
      }
      if (recovered === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 3) break; // truly past end of data
      } else {
        consecutiveEmpty = 0;
        console.log(`    (recovered ${recovered} rows from failed chunk at offset ${offset})`);
      }
    } else {
      consecutiveEmpty = 0;
      allRows = allRows.concat(chunk);
      if (chunk.length < chunkSize) break; // last chunk
    }
    offset += chunkSize;
    if (offset % 20000 === 0) process.stdout.write(`    ...${offset.toLocaleString()} rows extracted...\n`);
  }
  return allRows;
}

// ============================================================
// Subquery fragments
// ============================================================
const RW = `dtDateIn >= '${DATE_FROM}'`;
const RK = `SELECT lRepairKey FROM tblRepair WHERE ${RW}`;
const DK = `SELECT DISTINCT lDepartmentKey FROM tblRepair WHERE ${RW}`;
const CK = `SELECT DISTINCT d.lClientKey FROM tblDepartment d JOIN tblRepair r ON d.lDepartmentKey=r.lDepartmentKey WHERE r.${RW}`;

// ============================================================
// MAIN
// ============================================================
function main() {
  const startTime = Date.now();
  console.log('=========================================');
  console.log('  TSI Full Data Extraction (2025+)');
  console.log('  North (WinScopeNet) + South (Nashville)');
  console.log('=========================================');
  console.log(`Date range: ${DATE_FROM} onward\n`);

  // Pre-build safe column lists
  console.log('Building safe column lists...');
  const repairCols = safeSelectColsStrict('tblRepair', 'r');
  const clientCols = safeSelectCols('tblClient', 'c');
  const deptCols = safeSelectCols('tblDepartment', 'd');
  const scopeCols = safeSelectColsStrict('tblScope', 's');
  const contractCols = safeSelectCols('tblContract', null);
  const statusTranCols = safeSelectCols('tblStatusTran', 'st');
  const supplierCols = safeSelectCols('tblSupplier', null);
  const emailCols = safeSelectColsStrict('tblEmails', null);
  const invoiceCols = safeSelectColsStrict('tblInvoice', null);
  const invSizeCols = safeSelectColsStrict('tblInventorySize', null);
  const docCols = safeSelectColsStrict('tblDocument', null);
  console.log('Done.\n');

  const seed = {};

  // ============================================================
  // PHASE 1: Lookup / Reference Tables (full — not date-filtered)
  // These are small tables, pull everything from North
  // ============================================================
  console.log('=== Phase 1: Reference & Lookup Tables ===');

  seed.serviceLocations = sqlQuery(`SELECT lServiceLocationKey, sServiceLocation, sTransNumberPrefix, bUsed FROM tblServiceLocations WHERE bUsed=1 FOR JSON PATH`);
  seed.serviceLocations.forEach(r => { r.sServiceLocationName = SVC_LOC_NAMES[r.lServiceLocationKey] || r.sServiceLocation; });
  log('serviceLocations', seed);

  seed.manufacturers = sqlQuery(`SELECT * FROM tblManufacturers FOR JSON PATH`);
  log('manufacturers', seed);

  seed.scopeCategories = sqlQuery(`SELECT * FROM tblScopeCategories FOR JSON PATH`);
  log('scopeCategories', seed);

  seed.scopeTypeCategories = sqlQuery(`SELECT * FROM tblScopeTypeCategories FOR JSON PATH`);
  log('scopeTypeCategories', seed);

  seed.repairStatuses = sqlQuery(`SELECT * FROM tblRepairStatuses FOR JSON PATH`);
  log('repairStatuses', seed);

  seed.repairReasons = sqlQuery(`SELECT * FROM tblRepairReasons FOR JSON PATH`);
  log('repairReasons', seed);

  seed.repairLevels = sqlQuery(`SELECT * FROM tblRepairLevels FOR JSON PATH`);
  log('repairLevels', seed);

  seed.deliveryMethods = sqlQuery(`SELECT * FROM tblDeliveryMethod FOR JSON PATH`);
  log('deliveryMethods', seed);

  seed.paymentTerms = sqlQuery(`SELECT * FROM tblPaymentTerms FOR JSON PATH`);
  log('paymentTerms', seed);

  seed.pricingCategories = sqlQuery(`SELECT * FROM tblPricingCategory FOR JSON PATH`);
  log('pricingCategories', seed);

  seed.pricingDetails = sqlQuery(`
    SELECT pd.lPricingDetailKey, pd.lPricingCategoryKey, pd.lRepairItemKey,
           pd.dblRepairPrice, pd.sProblemID
    FROM tblPricingDetail pd
      JOIN tblRepairItem ri ON ri.lRepairItemKey = pd.lRepairItemKey
    WHERE ri.bActive = 1 AND pd.dblRepairPrice > 0
    FOR JSON PATH`);
  log('pricingDetails', seed);

  seed.salesReps = sqlQuery(`SELECT * FROM tblSalesRep FOR JSON PATH`);
  log('salesReps', seed);

  seed.technicians = sqlQuery(`SELECT * FROM tblTechnicians FOR JSON PATH`);
  log('technicians', seed);

  seed.employees = sqlQuery(`SELECT * FROM tblEmployee FOR JSON PATH`);
  log('employees', seed);

  seed.distributors = sqlQuery(`SELECT * FROM tblDistributor FOR JSON PATH`);
  log('distributors', seed);

  seed.vendors = sqlQuery(`SELECT * FROM tblVendor FOR JSON PATH`);
  log('vendors', seed);

  seed.salesTax = sqlQuery(`SELECT * FROM tblSalesTax FOR JSON PATH`);
  log('salesTax', seed);

  seed.packageTypes = sqlQuery(`SELECT * FROM tblPackageTypes FOR JSON PATH`);
  log('packageTypes', seed);

  seed.companies = sqlQuery(`SELECT * FROM tblCompany FOR JSON PATH`);
  log('companies', seed);

  seed.contractTypes = sqlQuery(`SELECT * FROM tblContractTypes FOR JSON PATH`);
  log('contractTypes', seed);

  seed.servicePlanTerms = sqlQuery(`SELECT * FROM tblServicePlanTerms FOR JSON PATH`);
  log('servicePlanTerms', seed);

  seed.shippingCarriers = sqlQuery(`SELECT * FROM tblShippingCarriers FOR JSON PATH`);
  log('shippingCarriers', seed);

  seed.supplierPOTypes = sqlQuery(`SELECT * FROM tblSupplierPOTypes FOR JSON PATH`);
  log('supplierPOTypes', seed);

  seed.storageLocations = sqlQuery(`SELECT * FROM tblStorageLocations FOR JSON PATH`);
  log('storageLocations', seed);

  // Additional lookups needed by app pages
  seed.instrumentManufacturers = sqlQuery(`SELECT * FROM tblInstrumentManufacturers FOR JSON PATH`);
  log('instrumentManufacturers', seed);

  seed.instrumentModels = sqlQuery(`SELECT * FROM tblInstrumentManufacturerModels FOR JSON PATH`);
  log('instrumentModels', seed);

  seed.status = sqlQuery(`SELECT * FROM tblStatus FOR JSON PATH`);
  log('status', seed);

  seed.repairItems = sqlQuery(`SELECT * FROM tblRepairItem WHERE bActive=1 FOR JSON PATH`);
  log('repairItems', seed);

  seed.subGroups = sqlQuery(`SELECT * FROM tblSubGroups FOR JSON PATH`);
  log('subGroups', seed);

  seed.users = sqlQuery(`SELECT lUserKey, sUserName, sUserFullName, bActive, dtCreateDate, dtLastLogin FROM tblUsers FOR JSON PATH`);
  log('users', seed);

  seed.holidays = sqlQuery(`SELECT * FROM tblHolidays FOR JSON PATH`);
  log('holidays', seed);

  seed.staffTypes = sqlQuery(`SELECT * FROM tblStaffTypes FOR JSON PATH`);
  log('staffTypes', seed);

  seed.flagTypes = sqlQuery(`SELECT * FROM tblFlagTypes FOR JSON PATH`);
  log('flagTypes', seed);

  seed.flagLocations = sqlQuery(`SELECT * FROM tblFlagLocations FOR JSON PATH`);
  log('flagLocations', seed);

  seed.amendRepairTypes = sqlQuery(`SELECT * FROM tblAmendRepairTypes FOR JSON PATH`);
  log('amendRepairTypes', seed);

  seed.amendRepairReasons = sqlQuery(`SELECT * FROM tblAmendRepairReasons FOR JSON PATH`);
  log('amendRepairReasons', seed);

  // ============================================================
  // PHASE 2: Core Entities — North + Nashville
  // ============================================================
  console.log('\n=== Phase 2: Core Entities (North) ===');
  CURRENT_DB = 'WinScopeNet';

  // All scope types (not just those tied to 2025 repairs — need full catalog)
  const scopeTypeCols = safeSelectColsStrict('tblScopeType', null);
  seed.scopeTypes = sqlQuery(`SELECT ${scopeTypeCols} FROM tblScopeType FOR JSON PATH`);
  tagRegion(seed.scopeTypes, 'North');
  log('scopeTypes', seed);

  // All active clients (not just those with 2025 repairs)
  seed.clients = sqlQuery(`SELECT ${clientCols} FROM tblClient c WHERE c.bActive=1 FOR JSON PATH`);
  tagRegion(seed.clients, 'North');
  log('clients', seed);

  // All active departments
  seed.departments = sqlQuery(`SELECT ${deptCols} FROM tblDepartment d WHERE d.bActive=1 FOR JSON PATH`);
  seed.departments.forEach(d => { d.sServiceLocationName = SVC_LOC_NAMES[d.lServiceLocationKey] || ''; });
  tagRegion(seed.departments, 'North');
  log('departments', seed);

  // All scopes tied to active departments — chunked to avoid JSON parse failures on 60K rows
  console.log('  (extracting scopes in chunks — ~60K rows...)');
  seed.scopes = sqlQueryChunked(
    `SELECT ${scopeCols} FROM tblScope s WHERE s.lDepartmentKey IN (SELECT lDepartmentKey FROM tblDepartment WHERE bActive=1)`,
    's.lScopeKey'
  );
  tagRegion(seed.scopes, 'North');
  log('scopes', seed);

  // Contacts for active clients
  seed.contacts = sqlQuery(`SELECT DISTINCT ct.* FROM tblContacts ct JOIN tblContactTran ctr ON ct.lContactKey=ctr.lContactKey WHERE ctr.lClientKey IN (SELECT lClientKey FROM tblClient WHERE bActive=1) FOR JSON PATH`);
  log('contacts', seed);

  seed.contactTrans = sqlQuery(`SELECT * FROM tblContactTran WHERE lClientKey IN (SELECT lClientKey FROM tblClient WHERE bActive=1) FOR JSON PATH`);
  log('contactTrans', seed);

  // Contracts: all active/recent (termination >= 2024 to capture renewals)
  seed.contracts = sqlQuery(`SELECT ${contractCols} FROM tblContract WHERE dtDateTermination >= '2024-01-01' FOR JSON PATH`);
  tagRegion(seed.contracts, 'North');
  log('contracts', seed);

  seed.contractDepartments = sqlQuery(`SELECT cd.* FROM tblContractDepartments cd JOIN tblContract c ON cd.lContractKey=c.lContractKey WHERE c.dtDateTermination >= '2024-01-01' FOR JSON PATH`);
  log('contractDepartments', seed);

  seed.contractScopes = sqlQuery(`SELECT cs.* FROM tblContractScope cs JOIN tblContract c ON cs.lContractKey=c.lContractKey WHERE c.dtDateTermination >= '2024-01-01' FOR JSON PATH`);
  log('contractScopes', seed);

  // Pending contracts
  seed.pendingContracts = sqlQuery(`SELECT * FROM tblPendingContract FOR JSON PATH`);
  log('pendingContracts', seed);

  seed.pendingContractDepartments = sqlQuery(`SELECT * FROM tblPendingContractDepartments FOR JSON PATH`);
  log('pendingContractDepartments', seed);

  // Suppliers
  seed.suppliers = sqlQuery(`SELECT ${supplierCols} FROM tblSupplier WHERE bActive=1 FOR JSON PATH`);
  log('suppliers', seed);

  // ============================================================
  // PHASE 2b: Nashville Core Entities
  // ============================================================
  console.log('\n=== Phase 2b: Core Entities (Nashville) ===');
  CURRENT_DB = 'WinScopeNetNashville';

  const nashRepairCols = safeSelectColsStrict('tblRepair', 'r', 'WinScopeNetNashville');
  const nashClientCols = safeSelectCols('tblClient', 'c', 'WinScopeNetNashville');
  const nashDeptCols = safeSelectCols('tblDepartment', 'd', 'WinScopeNetNashville');
  const nashScopeCols = safeSelectColsStrict('tblScope', 's', 'WinScopeNetNashville');
  const nashContractCols = safeSelectCols('tblContract', null, 'WinScopeNetNashville');

  const nashScopeTypeCols = safeSelectColsStrict('tblScopeType', null, 'WinScopeNetNashville');
  const nashScopeTypes = sqlQueryChunked(
    `SELECT ${nashScopeTypeCols} FROM tblScopeType`,
    'lScopeTypeKey',
    'WinScopeNetNashville',
    2000
  );
  tagRegion(nashScopeTypes, 'Nashville');
  seed.scopeTypes = merge(seed.scopeTypes, nashScopeTypes, 'lScopeTypeKey');
  console.log(`  scopeTypes (merged): ${seed.scopeTypes.length}`);

  const nashClients = sqlQuery(`SELECT ${nashClientCols} FROM tblClient c WHERE c.bActive=1 FOR JSON PATH`);
  tagRegion(nashClients, 'Nashville');
  seed.clients = merge(seed.clients, nashClients, 'lClientKey');
  console.log(`  clients (merged): ${seed.clients.length}`);

  const nashDepts = sqlQuery(`SELECT ${nashDeptCols} FROM tblDepartment d WHERE d.bActive=1 FOR JSON PATH`);
  nashDepts.forEach(d => { d.sServiceLocationName = 'Nashville'; });
  tagRegion(nashDepts, 'Nashville');
  seed.departments = merge(seed.departments, nashDepts, 'lDepartmentKey');
  console.log(`  departments (merged): ${seed.departments.length}`);

  console.log('  (extracting Nashville scopes in chunks...)');
  const nashScopes = sqlQueryChunked(
    `SELECT ${nashScopeCols} FROM tblScope s WHERE s.lDepartmentKey IN (SELECT lDepartmentKey FROM tblDepartment WHERE bActive=1)`,
    's.lScopeKey',
    'WinScopeNetNashville'
  );
  tagRegion(nashScopes, 'Nashville');
  seed.scopes = merge(seed.scopes, nashScopes, 'lScopeKey');
  console.log(`  scopes (merged): ${seed.scopes.length}`);

  const nashContracts = sqlQuery(`SELECT ${nashContractCols} FROM tblContract WHERE dtDateTermination >= '2024-01-01' FOR JSON PATH`);
  tagRegion(nashContracts, 'Nashville');
  seed.contracts = merge(seed.contracts, nashContracts, 'lContractKey');
  console.log(`  contracts (merged): ${seed.contracts.length}`);

  // ============================================================
  // PHASE 3: Transactional Data — North 2025+
  // ============================================================
  console.log('\n=== Phase 3: Transactional Data (North 2025+) ===');
  CURRENT_DB = 'WinScopeNet';

  seed.repairs = sqlQuery(`SELECT ${repairCols} FROM tblRepair r WHERE r.${RW} FOR JSON PATH`);
  tagRegion(seed.repairs, 'North');
  tagWOType(seed.repairs);
  log('repairs', seed);

  seed.repairDetails = sqlQuery(`SELECT rit.* FROM tblRepairItemTran rit WHERE rit.lRepairKey IN (${RK}) FOR JSON PATH`);
  log('repairDetails', seed);

  seed.statusTrans = sqlQuery(`SELECT ${statusTranCols} FROM tblStatusTran st WHERE st.lRepairKey IN (${RK}) FOR JSON PATH`);
  log('statusTrans', seed);

  seed.repairInventory = sqlQuery(`SELECT ri.* FROM tblRepairInventory ri JOIN tblRepairItemTran rit ON ri.lRepairItemTranKey=rit.lRepairItemTranKey WHERE rit.lRepairKey IN (${RK}) FOR JSON PATH`);
  log('repairInventory', seed);

  seed.repairStatusLog = sqlQuery(`SELECT * FROM tblRepairStatusLog WHERE lRepairKey IN (${RK}) FOR JSON PATH`);
  log('repairStatusLog', seed);

  seed.amendments = sqlQuery(`SELECT * FROM tblAmendRepairComments WHERE lRepairKey IN (${RK}) FOR JSON PATH`);
  log('amendments', seed);

  seed.documents = sqlQuery(`SELECT ${docCols} FROM tblDocument WHERE lOwnerKey IN (${RK}) FOR JSON PATH`);
  log('documents', seed);

  // Flags link to multiple entity types (scopes, departments, repairs) — pull all (small table ~1,400 rows)
  seed.flags = sqlQuery(`SELECT * FROM tblFlags FOR JSON PATH`);
  log('flags', seed);

  seed.invoices = sqlQuery(`SELECT ${invoiceCols} FROM tblInvoice WHERE lRepairKey IN (${RK}) FOR JSON PATH`);
  log('invoices', seed);

  seed.invoiceDetails = sqlQuery(`SELECT d.* FROM tblInvoiceDetl d JOIN tblInvoice i ON d.lInvoiceKey=i.lInvoiceKey WHERE i.lRepairKey IN (${RK}) FOR JSON PATH`);
  log('invoiceDetails', seed);

  seed.invoicePayments = sqlQuery(`SELECT ip.* FROM tblInvoicePayments ip JOIN tblInvoice i ON ip.lInvoiceKey=i.lInvoiceKey WHERE i.lRepairKey IN (${RK}) FOR JSON PATH`);
  log('invoicePayments', seed);

  seed.gpInvoiceStaging = sqlQuery(`SELECT * FROM tblGP_InvoiceStaging WHERE dtTranDate >= '${DATE_FROM}' FOR JSON PATH`);
  log('gpInvoiceStaging', seed);

  // Shipping — tblShippingCharges links to repairs via tblShippingChargeRepairs (2025 repairs only)
  seed.shippingChargeRepairs = sqlQuery(`SELECT scr.* FROM tblShippingChargeRepairs scr WHERE scr.lRepairKey IN (${RK}) FOR JSON PATH`);
  log('shippingChargeRepairs', seed);

  seed.shippingCharges = sqlQuery(`SELECT DISTINCT sc.* FROM tblShippingCharges sc
    JOIN tblShippingChargeRepairs scr ON sc.lShippingChargeKey=scr.lShippingChargeKey
    WHERE scr.lRepairKey IN (${RK}) FOR JSON PATH`);
  log('shippingCharges', seed);

  seed.shipPercentage = sqlQuery(`SELECT * FROM tblShipPercentage WHERE dtShipDate >= '${DATE_FROM}' FOR JSON PATH`);
  log('shipPercentage', seed);

  // Loaners
  seed.loanerTrans = sqlQuery(`SELECT * FROM tblLoanerTran WHERE lRepairKey IN (${RK}) FOR JSON PATH`);
  log('loanerTrans', seed);

  // Tech hours
  seed.techHours = sqlQuery(`SELECT * FROM tblTechHours WHERE dtHoursDate >= '${DATE_FROM}' FOR JSON PATH`);
  log('techHours', seed);

  // Points
  seed.pointsOps = sqlQuery(`SELECT * FROM tblPointsOps WHERE dtInvoiceDate >= '${DATE_FROM}' FOR JSON PATH`);
  log('pointsOps', seed);

  seed.pointsTech = sqlQuery(`SELECT * FROM tblPointsTechs WHERE lRepairKey IN (${RK}) FOR JSON PATH`);
  log('pointsTech', seed);

  // Emails (metadata only — no binary)
  // Emails - limit to last 6 months to keep size manageable
  seed.emails = sqlQuery(`SELECT ${emailCols} FROM tblEmails WHERE dtCreateDate >= DATEADD(MONTH, -6, GETDATE()) FOR JSON PATH`);
  log('emails', seed);

  // Product sales
  seed.productSales = sqlQuery(`SELECT * FROM tblProductSales WHERE dtOrderDate >= '${DATE_FROM}' FOR JSON PATH`);
  log('productSales', seed);

  seed.productSaleItems = sqlQuery(`SELECT psi.* FROM tblProductSalesInventory psi JOIN tblProductSales ps ON psi.lProductSaleKey=ps.lProductSaleKey WHERE ps.dtOrderDate >= '${DATE_FROM}' FOR JSON PATH`);
  log('productSaleItems', seed);

  // Supplier POs
  seed.supplierPOs = sqlQuery(`SELECT * FROM tblSupplierPO WHERE dtDateOfPO >= '${DATE_FROM}' FOR JSON PATH`);
  log('supplierPOs', seed);

  seed.supplierPOTrans = sqlQuery(`SELECT pot.* FROM tblSupplierPOTran pot JOIN tblSupplierPO po ON pot.lSupplierPOKey=po.lSupplierPOKey WHERE po.dtDateOfPO >= '${DATE_FROM}' FOR JSON PATH`);
  log('supplierPOTrans', seed);

  // Inventory (all active + transactions from 2025)
  seed.inventory = sqlQuery(`SELECT * FROM tblInventory FOR JSON PATH`);
  log('inventory', seed);

  seed.inventorySizes = sqlQuery(`SELECT ${invSizeCols} FROM tblInventorySize FOR JSON PATH`);
  log('inventorySizes', seed);

  seed.inventoryTrans = sqlQuery(`SELECT * FROM tblInventoryTran WHERE dtTranDate >= '${DATE_FROM}' FOR JSON PATH`);
  log('inventoryTrans', seed);

  // Sessions / user activity
  seed.sessions = sqlQuery(`SELECT lSessionKey, lUserKey, dtLastDate, dtCreateDate FROM tblSessions WHERE dtCreateDate >= '${DATE_FROM}' FOR JSON PATH`);
  log('sessions', seed);

  // Department child tables (all active departments, not just repair-linked)
  seed.departmentScopeTypes = sqlQuery(`SELECT * FROM tblDepartmentScopeTypes WHERE lDepartmentKey IN (SELECT lDepartmentKey FROM tblDepartment WHERE bActive=1) FOR JSON PATH`);
  log('departmentScopeTypes', seed);

  seed.maxCharges = sqlQuery(`SELECT * FROM tblScopeTypeDepartmentMaxCharges WHERE lDepartmentKey IN (SELECT lDepartmentKey FROM tblDepartment WHERE bActive=1) FOR JSON PATH`);
  log('maxCharges', seed);

  // Tasks
  seed.tasks = sqlQuery(`SELECT * FROM tblTasks WHERE dtTaskDate >= '${DATE_FROM}' FOR JSON PATH`);
  log('tasks', seed);

  seed.taskTypes = sqlQuery(`SELECT * FROM tblTaskTypes FOR JSON PATH`);
  log('taskTypes', seed);

  seed.taskStatuses = sqlQuery(`SELECT * FROM tblTaskStatuses FOR JSON PATH`);
  log('taskStatuses', seed);

  seed.taskPriorities = sqlQuery(`SELECT * FROM tblTaskPriorities FOR JSON PATH`);
  log('taskPriorities', seed);

  seed.taskLoaners = sqlQuery(`SELECT * FROM tblTaskLoaners FOR JSON PATH`);
  log('taskLoaners', seed);

  // ============================================================
  // PHASE 3b: Nashville Transactional Data 2025+
  // ============================================================
  console.log('\n=== Phase 3b: Transactional Data (Nashville 2025+) ===');
  CURRENT_DB = 'WinScopeNetNashville';

  const nashRK = `SELECT lRepairKey FROM tblRepair WHERE ${RW}`;

  const nashRepairs = sqlQuery(`SELECT ${nashRepairCols} FROM tblRepair r WHERE r.${RW} FOR JSON PATH`);
  tagRegion(nashRepairs, 'Nashville');
  tagWOType(nashRepairs);
  seed.repairs = [...seed.repairs, ...nashRepairs];
  console.log(`  repairs (merged): ${seed.repairs.length.toLocaleString()}`);

  const nashRepairDetails = sqlQuery(`SELECT rit.* FROM tblRepairItemTran rit WHERE rit.lRepairKey IN (${nashRK}) FOR JSON PATH`);
  seed.repairDetails = [...(seed.repairDetails || []), ...nashRepairDetails];
  console.log(`  repairDetails (merged): ${seed.repairDetails.length.toLocaleString()}`);

  const nashStatusTrans = sqlQuery(`SELECT ${statusTranCols} FROM tblStatusTran st WHERE st.lRepairKey IN (${nashRK}) FOR JSON PATH`);
  seed.statusTrans = [...(seed.statusTrans || []), ...nashStatusTrans];
  console.log(`  statusTrans (merged): ${seed.statusTrans.length.toLocaleString()}`);

  const nashInvoiceCols = safeSelectColsStrict('tblInvoice', null, 'WinScopeNetNashville');
  const nashInvoices = sqlQuery(`SELECT ${nashInvoiceCols} FROM tblInvoice WHERE lRepairKey IN (${nashRK}) FOR JSON PATH`);
  seed.invoices = [...(seed.invoices || []), ...nashInvoices];
  console.log(`  invoices (merged): ${seed.invoices.length.toLocaleString()}`);

  const nashInvoiceDetails = sqlQuery(`SELECT d.* FROM tblInvoiceDetl d JOIN tblInvoice i ON d.lInvoiceKey=i.lInvoiceKey WHERE i.lRepairKey IN (${nashRK}) FOR JSON PATH`);
  seed.invoiceDetails = [...(seed.invoiceDetails || []), ...nashInvoiceDetails];
  console.log(`  invoiceDetails (merged): ${seed.invoiceDetails.length.toLocaleString()}`);

  const nashLoaners = sqlQuery(`SELECT * FROM tblLoanerTran WHERE lRepairKey IN (${nashRK}) FOR JSON PATH`);
  seed.loanerTrans = [...(seed.loanerTrans || []), ...nashLoaners];
  console.log(`  loanerTrans (merged): ${seed.loanerTrans.length.toLocaleString()}`);

  const nashShipRepairs = sqlQuery(`SELECT scr.* FROM tblShippingChargeRepairs scr WHERE scr.lRepairKey IN (${nashRK}) FOR JSON PATH`);
  seed.shippingChargeRepairs = [...(seed.shippingChargeRepairs || []), ...nashShipRepairs];
  console.log(`  shippingChargeRepairs (merged): ${seed.shippingChargeRepairs.length.toLocaleString()}`);

  const nashShipping = sqlQuery(`SELECT DISTINCT sc.* FROM tblShippingCharges sc
    JOIN tblShippingChargeRepairs scr ON sc.lShippingChargeKey=scr.lShippingChargeKey
    WHERE scr.lRepairKey IN (${nashRK}) FOR JSON PATH`);
  seed.shippingCharges = [...(seed.shippingCharges || []), ...nashShipping];
  console.log(`  shippingCharges (merged): ${seed.shippingCharges.length.toLocaleString()}`);

  const nashTechHours = sqlQuery(`SELECT * FROM tblTechHours WHERE dtHoursDate >= '${DATE_FROM}' FOR JSON PATH`);
  seed.techHours = [...(seed.techHours || []), ...nashTechHours];
  console.log(`  techHours (merged): ${seed.techHours.length.toLocaleString()}`);

  const nashPointsOps = sqlQuery(`SELECT * FROM tblPointsOps WHERE dtInvoiceDate >= '${DATE_FROM}' FOR JSON PATH`);
  seed.pointsOps = [...(seed.pointsOps || []), ...nashPointsOps];
  console.log(`  pointsOps (merged): ${seed.pointsOps.length.toLocaleString()}`);

  const nashProductSales = sqlQuery(`SELECT * FROM tblProductSales WHERE dtOrderDate >= '${DATE_FROM}' FOR JSON PATH`);
  seed.productSales = [...(seed.productSales || []), ...nashProductSales];
  console.log(`  productSales (merged): ${seed.productSales.length.toLocaleString()}`);

  // ============================================================
  // PHASE 3c: Site Services (Van/Onsite — small tables)
  // ============================================================
  console.log('\n=== Phase 3c: Site Services ===');
  CURRENT_DB = 'WinScopeNet';

  seed.siteServices = sqlQuery(`SELECT * FROM tblSiteServices FOR JSON PATH`);
  log('siteServices', seed);

  seed.siteServicesCalendar = sqlQuery(`SELECT * FROM tblSiteServicesCalendar FOR JSON PATH`);
  log('siteServicesCalendar', seed);

  seed.siteServiceTrays = sqlQuery(`SELECT * FROM tblSiteServiceTrays FOR JSON PATH`);
  log('siteServiceTrays', seed);

  seed.siteServiceTrayDetails = sqlQuery(`SELECT * FROM tblSiteServiceTrayDetails FOR JSON PATH`);
  log('siteServiceTrayDetails', seed);

  seed.siteServiceTrayInsert = sqlQuery(`SELECT * FROM tblSiteServiceTrayInsert FOR JSON PATH`);
  log('siteServiceTrayInsert', seed);

  seed.departmentSiteServiceTrayNames = sqlQuery(`SELECT * FROM tblDepartmentSiteServiceTrayNames FOR JSON PATH`);
  log('departmentSiteServiceTrayNames', seed);

  // Also pull Nashville site services
  CURRENT_DB = 'WinScopeNetNashville';
  const nashSiteServices = sqlQuery(`SELECT * FROM tblSiteServices FOR JSON PATH`);
  tagRegion(nashSiteServices, 'Nashville');
  seed.siteServices = merge(seed.siteServices, nashSiteServices, 'lSiteServiceKey');
  console.log(`  siteServices (merged): ${seed.siteServices.length}`);

  const nashSSCalendar = sqlQuery(`SELECT * FROM tblSiteServicesCalendar FOR JSON PATH`);
  seed.siteServicesCalendar = [...(seed.siteServicesCalendar || []), ...nashSSCalendar];
  console.log(`  siteServicesCalendar (merged): ${seed.siteServicesCalendar.length}`);

  const nashSSTrays = sqlQuery(`SELECT * FROM tblSiteServiceTrays FOR JSON PATH`);
  seed.siteServiceTrays = [...(seed.siteServiceTrays || []), ...nashSSTrays];
  console.log(`  siteServiceTrays (merged): ${seed.siteServiceTrays.length}`);

  const nashSSTrayDetails = sqlQuery(`SELECT * FROM tblSiteServiceTrayDetails FOR JSON PATH`);
  seed.siteServiceTrayDetails = [...(seed.siteServiceTrayDetails || []), ...nashSSTrayDetails];
  console.log(`  siteServiceTrayDetails (merged): ${seed.siteServiceTrayDetails.length}`);

  const nashSSTrayInsert = sqlQuery(`SELECT * FROM tblSiteServiceTrayInsert FOR JSON PATH`);
  seed.siteServiceTrayInsert = [...(seed.siteServiceTrayInsert || []), ...nashSSTrayInsert];
  console.log(`  siteServiceTrayInsert (merged): ${seed.siteServiceTrayInsert.length}`);

  // ============================================================
  // PHASE 4: GPO Data (full — small tables)
  // ============================================================
  console.log('\n=== Phase 4: GPO & Pricing Data ===');
  CURRENT_DB = 'WinScopeNet';

  seed.hpgList = sqlQuery(`SELECT TOP 5000 * FROM tblHPGList ORDER BY GPOID DESC FOR JSON PATH`);
  log('hpgList', seed);

  seed.premierList = sqlQuery(`SELECT TOP 5000 * FROM tblPremierList ORDER BY 1 DESC FOR JSON PATH`);
  log('premierList', seed);

  seed.vizientList = sqlQuery(`SELECT TOP 5000 * FROM tblVizientList ORDER BY 1 DESC FOR JSON PATH`);
  log('vizientList', seed);

  // ============================================================
  // Write output
  // ============================================================
  console.log('\n=== Writing Output ===');
  CURRENT_DB = 'WinScopeNet';

  const outPath = path.join(__dirname, 'real-data-seed.json');
  fs.writeFileSync(outPath, JSON.stringify(seed, null, 0));  // compact — no indentation for speed

  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`Written to ${outPath} (${sizeMB} MB)`);

  let total = 0;
  const summary = [];
  for (const [table, rows] of Object.entries(seed)) {
    const count = Array.isArray(rows) ? rows.length : 0;
    total += count;
    summary.push({ table, count });
  }
  summary.sort((a, b) => b.count - a.count);

  console.log(`\n=== EXTRACTION SUMMARY ===`);
  console.log(`Total tables: ${Object.keys(seed).length}`);
  console.log(`Total records: ${total.toLocaleString()}`);
  console.log(`File size: ${sizeMB} MB`);
  console.log(`Elapsed: ${((Date.now() - startTime) / 1000).toFixed(0)}s`);
  console.log('\nTop 20 tables by record count:');
  summary.slice(0, 20).forEach(({ table, count }) => {
    console.log(`  ${table}: ${count.toLocaleString()}`);
  });
}

main();
