/**
 * extract-real-data.js
 * Pulls 30 days of real data from WinScopeNet via sqlcmd
 *
 * Usage: node tasks/extract-real-data.js
 * Output: tasks/real-data-seed.json
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER = 'localhost';
const DB = 'WinScopeNet';
const DATE_FROM = '2026-02-13';
const DATE_TO = '2026-03-14';
const TMP_SQL = path.join(__dirname, '_tmp_query.sql');
const SQLCMD = 'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE';
const SVC_LOC_NAMES = { 1: 'Upper Chichester', 2: 'Nashville' };

// ============================================================
// SQL helper via sqlcmd
// ============================================================

function sqlQuery(queryStr) {
  // Write SQL to temp file to avoid escaping issues
  fs.writeFileSync(TMP_SQL, queryStr, 'utf8');

  try {
    const buf = execSync(
      `"${SQLCMD}" -S "${SERVER}" -d "${DB}" -C -i "${TMP_SQL}" -y0 -w 65535`,
      { maxBuffer: 500 * 1024 * 1024, timeout: 300000 }
    );

    // sqlcmd outputs as system codepage; decode and strip all \r
    const cleaned = buf.toString('utf8').replace(/\r/g, '');
    const lines = cleaned.split('\n')
      .map(l => l.trimEnd())
      .filter(l => l && !/^\(\d+ rows? affected\)/.test(l));

    const jsonStr = lines.join('').trim();
    if (!jsonStr || jsonStr === 'NULL') return [];
    return JSON.parse(jsonStr);
  } catch (e) {
    const msg = e.stdout || e.stderr || e.message || '';
    console.error('  ERROR:', String(msg).substring(0, 500));
    return [];
  } finally {
    try { fs.unlinkSync(TMP_SQL); } catch (_) {}
  }
}

function log(name, seed) {
  console.log(`  ${name}: ${seed[name].length} records`);
}

// ============================================================
// Subquery fragments
// ============================================================
const RW = `dtDateIn >= '${DATE_FROM}' AND dtDateIn < '${DATE_TO}'`;
const RK = `SELECT lRepairKey FROM tblRepair WHERE ${RW}`;
const DK = `SELECT DISTINCT lDepartmentKey FROM tblRepair WHERE ${RW}`;
const CK = `SELECT DISTINCT d.lClientKey FROM tblDepartment d JOIN tblRepair r ON d.lDepartmentKey=r.lDepartmentKey WHERE r.${RW}`;

// ============================================================
// Build ntext-safe column list for a table
// ============================================================
function safeSelectCols(tableName, alias) {
  const pfx = alias ? `${alias}.` : '';
  const cols = sqlQuery(`
    SELECT c.name, ty.name AS typeName
    FROM sys.columns c
    JOIN sys.tables t ON c.object_id = t.object_id
    JOIN sys.types ty ON c.user_type_id = ty.user_type_id
    WHERE t.name = '${tableName}'
    ORDER BY c.column_id
    FOR JSON PATH
  `);
  if (!cols.length) return `${pfx}*`;
  // Exclude binary/large-text types AND memo-style nvarchar columns (mXxx)
  // that can contain unescaped quotes breaking sqlcmd JSON output
  return cols
    .filter(c => !['ntext','text','image'].includes(c.typeName))
    .filter(c => !/^m[A-Z]/.test(c.name))
    .map(c => `${pfx}[${c.name}]`)
    .join(', ');
}

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log('Starting extraction from WinScopeNet...');
  console.log(`Date range: ${DATE_FROM} to ${DATE_TO}\n`);

  // Pre-build ntext-safe column lists
  console.log('Building column lists for ntext tables...');
  const repairCols = safeSelectCols('tblRepair', 'r');
  const clientCols = safeSelectCols('tblClient', 'c');
  const deptCols = safeSelectCols('tblDepartment', 'd');
  const scopeCols = safeSelectCols('tblScope', 's');
  const contractCols = safeSelectCols('tblContract', null);
  const statusTranCols = safeSelectCols('tblStatusTran', 'st');
  const supplierCols = safeSelectCols('tblSupplier', null);
  console.log('Done.\n');

  const seed = {};

  // ============================================================
  // PHASE 1: Lookup / Reference Tables
  // ============================================================
  console.log('--- Phase 1: Lookup tables ---');

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

  // ============================================================
  // PHASE 2: Core entities
  // ============================================================
  console.log('\n--- Phase 2: Core entities ---');

  seed.scopeTypes = sqlQuery(`SELECT DISTINCT st.* FROM tblScopeType st JOIN tblScope s ON st.lScopeTypeKey=s.lScopeTypeKey JOIN tblRepair r ON s.lScopeKey=r.lScopeKey WHERE r.${RW} FOR JSON PATH`);
  log('scopeTypes', seed);

  seed.clients = sqlQuery(`SELECT DISTINCT ${clientCols} FROM tblClient c JOIN tblDepartment d ON c.lClientKey=d.lClientKey JOIN tblRepair r ON d.lDepartmentKey=r.lDepartmentKey WHERE r.${RW} FOR JSON PATH`);
  log('clients', seed);

  seed.departments = sqlQuery(`SELECT ${deptCols} FROM tblDepartment d WHERE d.lDepartmentKey IN (${DK}) FOR JSON PATH`);
  seed.departments.forEach(d => { d.sServiceLocationName = SVC_LOC_NAMES[d.lServiceLocationKey] || ''; });
  log('departments', seed);

  seed.contacts = sqlQuery(`SELECT DISTINCT ct.* FROM tblContacts ct JOIN tblContactTran ctr ON ct.lContactKey=ctr.lContactKey WHERE ctr.lClientKey IN (${CK}) FOR JSON PATH`);
  log('contacts', seed);

  seed.contactTrans = sqlQuery(`SELECT * FROM tblContactTran WHERE lClientKey IN (${CK}) FOR JSON PATH`);
  log('contactTrans', seed);

  seed.scopes = sqlQuery(`SELECT DISTINCT ${scopeCols} FROM tblScope s JOIN tblRepair r ON s.lScopeKey=r.lScopeKey WHERE r.${RW} FOR JSON PATH`);
  log('scopes', seed);

  seed.contracts = sqlQuery(`SELECT ${contractCols} FROM tblContract WHERE dtDateTermination >= '${DATE_FROM}' FOR JSON PATH`);
  log('contracts', seed);

  seed.contractDepartments = sqlQuery(`SELECT cd.* FROM tblContractDepartments cd JOIN tblContract c ON cd.lContractKey=c.lContractKey WHERE c.dtDateTermination >= '${DATE_FROM}' FOR JSON PATH`);
  log('contractDepartments', seed);

  seed.contractScopes = sqlQuery(`SELECT cs.* FROM tblContractScope cs JOIN tblContract c ON cs.lContractKey=c.lContractKey WHERE c.dtDateTermination >= '${DATE_FROM}' FOR JSON PATH`);
  log('contractScopes', seed);

  seed.suppliers = sqlQuery(`SELECT ${supplierCols} FROM tblSupplier WHERE bActive=1 FOR JSON PATH`);
  log('suppliers', seed);

  // ============================================================
  // PHASE 3: Transactional data
  // ============================================================
  console.log('\n--- Phase 3: Transactional data ---');

  seed.repairs = sqlQuery(`SELECT ${repairCols} FROM tblRepair r WHERE r.${RW} FOR JSON PATH`);
  log('repairs', seed);

  seed.repairDetails = sqlQuery(`SELECT rit.* FROM tblRepairItemTran rit JOIN tblRepair r ON rit.lRepairKey=r.lRepairKey WHERE r.${RW} FOR JSON PATH`);
  log('repairDetails', seed);

  seed.repairItems = sqlQuery(`SELECT DISTINCT ri.* FROM tblRepairItem ri JOIN tblRepairItemTran rit ON ri.lRepairItemKey=rit.lRepairItemKey JOIN tblRepair r ON rit.lRepairKey=r.lRepairKey WHERE r.${RW} FOR JSON PATH`);
  log('repairItems', seed);

  seed.statusTrans = sqlQuery(`SELECT ${statusTranCols} FROM tblStatusTran st JOIN tblRepair r ON st.lRepairKey=r.lRepairKey WHERE r.${RW} FOR JSON PATH`);
  log('statusTrans', seed);

  seed.repairInventory = sqlQuery(`SELECT ri.* FROM tblRepairInventory ri JOIN tblRepairItemTran rit ON ri.lRepairItemTranKey=rit.lRepairItemTranKey JOIN tblRepair r ON rit.lRepairKey=r.lRepairKey WHERE r.${RW} FOR JSON PATH`);
  log('repairInventory', seed);

  seed.documents = sqlQuery(`SELECT * FROM tblDocument WHERE lOwnerKey IN (${RK}) FOR JSON PATH`);
  log('documents', seed);

  seed.flags = sqlQuery(`SELECT * FROM tblFlags WHERE lOwnerKey IN (${RK}) FOR JSON PATH`);
  log('flags', seed);

  seed.invoices = sqlQuery(`SELECT * FROM tblInvoice WHERE lRepairKey IN (${RK}) FOR JSON PATH`);
  log('invoices', seed);

  seed.invoicePayments = sqlQuery(`SELECT ip.* FROM tblInvoicePayments ip JOIN tblInvoice i ON ip.lInvoiceKey=i.lInvoiceKey WHERE i.lRepairKey IN (${RK}) FOR JSON PATH`);
  log('invoicePayments', seed);

  seed.productSales = sqlQuery(`SELECT * FROM tblProductSales WHERE dtOrderDate >= '${DATE_FROM}' AND dtOrderDate < '${DATE_TO}' FOR JSON PATH`);
  log('productSales', seed);

  seed.productSaleItems = sqlQuery(`SELECT psi.* FROM tblProductSalesInventory psi JOIN tblProductSales ps ON psi.lProductSaleKey=ps.lProductSaleKey WHERE ps.dtOrderDate >= '${DATE_FROM}' AND ps.dtOrderDate < '${DATE_TO}' FOR JSON PATH`);
  log('productSaleItems', seed);

  seed.supplierPOs = sqlQuery(`SELECT * FROM tblSupplierPO WHERE dtDateOfPO >= '${DATE_FROM}' AND dtDateOfPO < '${DATE_TO}' FOR JSON PATH`);
  log('supplierPOs', seed);

  seed.supplierPOTrans = sqlQuery(`SELECT pot.* FROM tblSupplierPOTran pot JOIN tblSupplierPO po ON pot.lSupplierPOKey=po.lSupplierPOKey WHERE po.dtDateOfPO >= '${DATE_FROM}' AND po.dtDateOfPO < '${DATE_TO}' FOR JSON PATH`);
  log('supplierPOTrans', seed);

  seed.inventoryTrans = sqlQuery(`SELECT * FROM tblInventoryTran WHERE dtTranDate >= '${DATE_FROM}' AND dtTranDate < '${DATE_TO}' FOR JSON PATH`);
  log('inventoryTrans', seed);

  seed.inventory = sqlQuery(`SELECT DISTINCT inv.* FROM tblInventory inv WHERE inv.lInventoryKey IN (SELECT DISTINCT isz.lInventoryKey FROM tblInventorySize isz JOIN tblInventoryTran it ON isz.lInventorySizeKey=it.lInventorySizeKey WHERE it.dtTranDate >= '${DATE_FROM}' AND it.dtTranDate < '${DATE_TO}') FOR JSON PATH`);
  log('inventory', seed);

  seed.inventorySizes = sqlQuery(`SELECT DISTINCT isz.* FROM tblInventorySize isz JOIN tblInventoryTran it ON isz.lInventorySizeKey=it.lInventorySizeKey WHERE it.dtTranDate >= '${DATE_FROM}' AND it.dtTranDate < '${DATE_TO}' FOR JSON PATH`);
  log('inventorySizes', seed);

  // ============================================================
  // PHASE 4: Department child tables
  // ============================================================
  console.log('\n--- Phase 4: Department child tables ---');

  seed.departmentScopeTypes = sqlQuery(`SELECT * FROM tblDepartmentScopeTypes WHERE lDepartmentKey IN (${DK}) FOR JSON PATH`);
  log('departmentScopeTypes', seed);

  seed.maxCharges = sqlQuery(`SELECT * FROM tblScopeTypeDepartmentMaxCharges WHERE lDepartmentKey IN (${DK}) FOR JSON PATH`);
  log('maxCharges', seed);

  seed.subGroups = sqlQuery(`SELECT * FROM tblSubGroups FOR JSON PATH`);
  log('subGroups', seed);

  // ============================================================
  // Write output
  // ============================================================
  console.log('\n--- Writing output ---');

  const outPath = path.join(__dirname, 'real-data-seed.json');
  fs.writeFileSync(outPath, JSON.stringify(seed, null, 2));

  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`Written to ${outPath} (${sizeMB} MB)`);

  let total = 0;
  for (const [table, rows] of Object.entries(seed)) {
    total += rows.length;
  }
  console.log(`\n=== EXTRACTION SUMMARY ===`);
  console.log(`Total tables: ${Object.keys(seed).length}`);
  console.log(`Total records: ${total.toLocaleString()}`);
}

main();
