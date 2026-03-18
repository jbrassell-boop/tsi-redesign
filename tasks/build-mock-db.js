/**
 * build-mock-db.js
 * Reads real-data-seed.json, denormalizes display fields,
 * and produces a new mock-db.js with real data seeded inline.
 */
const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, 'real-data-seed.json');
const BACKUP_PATH = path.join(__dirname, 'mock-db-backup.js');
const MOCKDB_PATH = path.join(__dirname, '..', 'mock-db.js');

console.log('Reading real-data-seed.json...');
const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

console.log('Reading backup...');
const lines = fs.readFileSync(BACKUP_PATH, 'utf8').split('\n');

// Find key positions
const infraEnd = lines.findIndex((l, i) => i > 200 && l.startsWith('})();'));
const prngStart = lines.findIndex(l => l.includes('Seeded PRNG'));
const gen3Start = lines.findIndex(l => l.includes('Generator 3: Quality Data'));

const infrastructure = lines.slice(0, infraEnd + 1).join('\n');
const prngBlock = lines.slice(prngStart - 1, prngStart + 17).join('\n');
const gen3to5 = lines.slice(gen3Start - 2).join('\n');

console.log(`Infrastructure: lines 0-${infraEnd}`);
console.log(`PRNG: lines ${prngStart - 1}-${prngStart + 16}`);
console.log(`Gen3-5: lines ${gen3Start - 2}-${lines.length - 1}`);

// ============================================================
// DENORMALIZATION — enrich records with display fields
// ============================================================
console.log('\nDenormalizing display fields...');

// Build lookup maps
function buildMap(arr, keyField) {
  const m = {};
  if (!arr) return m;
  arr.forEach(r => { if (r[keyField] != null) m[r[keyField]] = r; });
  return m;
}

const svcLocMap = buildMap(seed.serviceLocations, 'lServiceLocationKey');
const mfrMap = buildMap(seed.manufacturers, 'lManufacturerKey');
const scopeCatMap = buildMap(seed.scopeCategories, 'lScopeCategoryKey');
const scopeTypeMap = buildMap(seed.scopeTypes, 'lScopeTypeKey');
const clientMap = buildMap(seed.clients, 'lClientKey');
const deptMap = buildMap(seed.departments, 'lDepartmentKey');
const scopeMap = buildMap(seed.scopes, 'lScopeKey');
const contractMap = buildMap(seed.contracts, 'lContractKey');
const salesRepMap = buildMap(seed.salesReps, 'lSalesRepKey');
const techMap = buildMap(seed.technicians, 'lTechnicianKey');
const employeeMap = buildMap(seed.employees, 'lEmployeeKey');
const repairStatusMap = buildMap(seed.repairStatuses, 'lRepairStatusID');
const repairReasonMap = buildMap(seed.repairReasons, 'lRepairReasonKey');
const deliveryMap = buildMap(seed.deliveryMethods, 'lDeliveryMethodKey');
const payTermsMap = buildMap(seed.paymentTerms, 'lPaymentTermsKey');
const pricingMap = buildMap(seed.pricingCategories, 'lPricingCategoryKey');
const distributorMap = buildMap(seed.distributors, 'lDistributorKey');
const contractTypeMap = buildMap(seed.contractTypes, 'lContractTypeKey');

// Helper: safe lookup
function lk(map, key, field) {
  const r = map[key];
  return r ? r[field] : null;
}
// Helper: sales rep display name (real data uses sRepFirst/sRepLast, not sSalesRepName)
function repName(key) {
  const r = salesRepMap[key];
  if (!r) return '';
  return (`${r.sRepFirst || ''} ${r.sRepLast || ''}`.trim()) || r.sSalesRepName || '';
}

// --- Enrich scope types with manufacturer name ---
if (seed.scopeTypes) {
  seed.scopeTypes.forEach(st => {
    st.sManufacturerName = lk(mfrMap, st.lManufacturerKey, 'sManufacturer') || '';
    st.sScopeCategory = lk(scopeCatMap, st.lScopeCategoryKey, 'sScopeCategory') || '';
  });
  console.log('  scopeTypes: +sManufacturerName, +sScopeCategory');
}

// --- Enrich clients ---
if (seed.clients) {
  seed.clients.forEach(c => {
    c.sSalesRepName = repName(c.lSalesRepKey);
    c.sServiceLocationName = lk(svcLocMap, c.lServiceLocationKey, 'sServiceLocationName') ||
                              lk(svcLocMap, c.lServiceLocationKey, 'sServiceLocation') || '';
    c.sPaymentTerms = lk(payTermsMap, c.lPaymentTermsKey, 'sTermsDesc') || '';
    c.sPricingCategory = lk(pricingMap, c.lPricingCategoryKey, 'sPricingDescription') || '';
    c.sDistName1 = lk(distributorMap, c.lDistributorKey, 'sDistName1') || '';
  });
  console.log('  clients: +sSalesRepName, +sServiceLocationName, +sPaymentTerms, +sPricingCategory, +sDistName1');
}

// --- Enrich departments ---
if (seed.departments) {
  seed.departments.forEach(d => {
    const client = clientMap[d.lClientKey];
    d.sClientName1 = client ? client.sClientName1 : '';
    d.sSalesRepName = repName(d.lSalesRepKey);
    d.sServiceLocationName = lk(svcLocMap, d.lServiceLocationKey, 'sServiceLocationName') ||
                              lk(svcLocMap, d.lServiceLocationKey, 'sServiceLocation') || '';
    d.sPricingCategory = lk(pricingMap, d.lPricingCategoryKey, 'sPricingDescription') || '';
  });
  console.log('  departments: +sClientName1, +sSalesRepName, +sServiceLocationName, +sPricingCategory');
}

// --- Enrich scopes ---
if (seed.scopes) {
  seed.scopes.forEach(s => {
    const st = scopeTypeMap[s.lScopeTypeKey];
    const dept = deptMap[s.lDepartmentKey];
    const client = dept ? clientMap[dept.lClientKey] : null;
    s.sScopeTypeDesc = st ? st.sScopeTypeDesc : '';
    s.sManufacturer = st ? (lk(mfrMap, st.lManufacturerKey, 'sManufacturer') || '') : '';
    s.sScopeCategory = st ? (lk(scopeCatMap, st.lScopeCategoryKey, 'sScopeCategory') || '') : '';
    s.sRigidOrFlexible = st ? st.sRigidOrFlexible : '';
    s.sDepartmentName = dept ? dept.sDepartmentName : '';
    s.sClientName1 = client ? client.sClientName1 : '';
  });
  console.log('  scopes: +sScopeTypeDesc, +sManufacturer, +sScopeCategory, +sRigidOrFlexible, +sDepartmentName, +sClientName1');
}

// --- Enrich repairs (the big one) ---
if (seed.repairs) {
  seed.repairs.forEach(r => {
    const scope = scopeMap[r.lScopeKey];
    const st = scope ? scopeTypeMap[scope.lScopeTypeKey] : null;
    const dept = deptMap[r.lDepartmentKey];
    const client = dept ? clientMap[dept.lClientKey] : null;
    const status = repairStatusMap[r.lRepairStatusID];
    const reason = repairReasonMap[r.lRepairReasonKey];
    const tech = techMap[r.lTechnicianKey] || employeeMap[r.lTechnicianKey];
    const salesRep = salesRepMap[r.lSalesRepKey];
    const contract = contractMap[r.lContractKey];
    const delivery = deliveryMap[r.lDeliveryMethodKey];
    const terms = payTermsMap[r.lPaymentTermsKey];

    // Core display fields
    r.sSerialNumber = scope ? scope.sSerialNumber : '';
    r.sScopeTypeDesc = st ? st.sScopeTypeDesc : '';
    r.sManufacturer = st ? (lk(mfrMap, st.lManufacturerKey, 'sManufacturer') || '') : '';
    r.sScopeCategory = st ? (lk(scopeCatMap, st.lScopeCategoryKey, 'sScopeCategory') || '') : '';
    r.sRigidOrFlexible = st ? st.sRigidOrFlexible : '';
    r.sClientName1 = client ? client.sClientName1 : '';
    r.sDepartmentName = dept ? dept.sDepartmentName : '';
    r.sRepairStatus = status ? status.sRepairStatus : '';
    r.sRepairReason = reason ? reason.sRepairReasonDesc : '';
    r.sTechName = tech ? (tech.sTechName || `${tech.sEmployeeFirst || ''} ${tech.sEmployeeLast || ''}`.trim()) : '';
    r.sSalesRepName = salesRep ? (`${salesRep.sRepFirst || ''} ${salesRep.sRepLast || ''}`.trim() || salesRep.sSalesRepName || '') : '';
    r.sContractName1 = contract ? contract.sContractName1 : '';
    r.sDeliveryMethodDesc = delivery ? (delivery.sDeliveryMethodDesc || delivery.sDeliveryMethod || '') : '';
    r.sPaymentTerms = terms ? terms.sTermsDesc : '';
    r.sPricingDescription = lk(pricingMap, r.lPricingCategoryKey, 'sPricingDescription') || '';
    r.sServiceLocationName = lk(svcLocMap, r.lServiceLocationKey, 'sServiceLocationName') ||
                              lk(svcLocMap, r.lServiceLocationKey, 'sServiceLocation') || '';

    // Progress bar status (maps repairStatusID to progress phases)
    const statusId = r.lRepairStatusID;
    if (statusId <= 1) r.ProgBarStatus = 'Received';
    else if (statusId <= 2) r.ProgBarStatus = 'Evaluation';
    else if (statusId <= 3) r.ProgBarStatus = 'Waiting for Approval';
    else if (statusId <= 5) r.ProgBarStatus = 'In Repair';
    else if (statusId <= 6) r.ProgBarStatus = 'Quality Check';
    else if (statusId <= 7) r.ProgBarStatus = 'Ready to Ship';
    else if (statusId <= 8) r.ProgBarStatus = 'Shipped';
    else r.ProgBarStatus = r.sRepairStatus || 'Unknown';

    // Approved flag
    r.Approved = r.dtAprRecvd ? 'Y' : 'N';

    // Turn around time (days between in and out)
    if (r.dtDateIn && r.dtDateOut) {
      const din = new Date(r.dtDateIn);
      const dout = new Date(r.dtDateOut);
      r.nTurnAroundTime = Math.max(0, Math.round((dout - din) / 86400000));
    } else if (r.dtDateIn) {
      r.nTurnAroundTime = Math.max(0, Math.round((new Date('2026-03-14') - new Date(r.dtDateIn)) / 86400000));
    }

    // Days past due (from expected delivery)
    if (r.dtExpDelDate && !r.dtDateOut) {
      const exp = new Date(r.dtExpDelDate);
      const now = new Date('2026-03-14');
      r.nDaysPastDue = Math.max(0, Math.round((now - exp) / 86400000));
    }

    // Lead time = business days from dtDateIn to dtDateOut (or today if open)
    if (r.dtDateIn) {
      const start = new Date(r.dtDateIn);
      const end = r.dtDateOut ? new Date(r.dtDateOut) : new Date('2026-03-14');
      let bizDays = 0;
      const d = new Date(start);
      while (d <= end) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) bizDays++;
        d.setDate(d.getDate() + 1);
      }
      r.nLeadTime = Math.max(0, bizDays - 1); // exclude start day
    }

    // Ship address from department if not on repair
    if (!r.sShipCity && dept) {
      r.sShipCity = dept.sShipCity || '';
      r.sShipState = dept.sShipState || '';
    }
  });
  console.log('  repairs: +sSerialNumber, +sScopeTypeDesc, +sManufacturer, +sScopeCategory, +sRigidOrFlexible,');
  console.log('           +sClientName1, +sDepartmentName, +sRepairStatus, +sRepairReason, +sTechName,');
  console.log('           +sSalesRepName, +sContractName1, +sDeliveryMethodDesc, +sPaymentTerms,');
  console.log('           +sServiceLocationName, +ProgBarStatus, +Approved, +nTurnAroundTime, +nDaysPastDue');
}

// --- Enrich repairDetails (line items) ---
const repairItemMap = buildMap(seed.repairItems, 'lRepairItemKey');
if (seed.repairDetails) {
  seed.repairDetails.forEach(d => {
    const item = repairItemMap[d.lRepairItemKey];
    d.sItemDescription = item ? item.sItemDescription : '';
    d.sTSICode = item ? (item.sTSICode || '') : '';
    d.sRigidOrFlexible = item ? (item.sRigidOrFlexible || '') : '';
    d.sPartOrLabor = item ? (item.sPartOrLabor || '') : '';
    // Technician initials
    const tech1 = techMap[d.lTechnicianKey];
    const tech2 = techMap[d.lTechnician2Key];
    d.sTechInits = tech1 ? (tech1.sTechInits || tech1.sRepInits || '') : '';
    d.sTech2Inits = tech2 ? (tech2.sTechInits || tech2.sRepInits || '') : '';
  });
  console.log('  repairDetails: +sItemDescription, +sTSICode, +sRigidOrFlexible, +sPartOrLabor, +sTechInits, +sTech2Inits');
}

// --- Enrich contracts ---
if (seed.contracts) {
  seed.contracts.forEach(c => {
    const client = clientMap[c.lClientKey];
    c.sClientName1 = client ? client.sClientName1 : '';
    c.sSalesRepName = repName(c.lSalesRepKey);
    c.sContractTypeName = lk(contractTypeMap, c.lContractTypeKey, 'sContractTypeName') || '';
    c.sPaymentTerms = lk(payTermsMap, c.lPaymentTermsKey, 'sTermsDesc') || '';
    // Status derived from dates
    const now = new Date('2026-03-14');
    const eff = c.dtDateEffective ? new Date(c.dtDateEffective) : null;
    const term = c.dtDateTermination ? new Date(c.dtDateTermination) : null;
    if (term && term < now) c.sContractStatus = 'Expired';
    else if (eff && eff > now) c.sContractStatus = 'Pending';
    else c.sContractStatus = 'Active';
  });
  console.log('  contracts: +sClientName1, +sSalesRepName, +sContractTypeName, +sPaymentTerms, +sContractStatus');
}

// --- Enrich invoices ---
if (seed.invoices) {
  seed.invoices.forEach(inv => {
    const client = clientMap[inv.lClientKey];
    inv.sClientName1 = client ? client.sClientName1 : '';
    // Find the repair for WO number
    const repair = seed.repairs ? seed.repairs.find(r => r.lRepairKey === inv.lRepairKey) : null;
    inv.sWorkOrderNumber = repair ? repair.sWorkOrderNumber : '';
  });
  console.log('  invoices: +sClientName1, +sWorkOrderNumber');
}

// --- Enrich product sales ---
if (seed.productSales) {
  seed.productSales.forEach(ps => {
    const client = clientMap[ps.lClientKey];
    const rep = salesRepMap[ps.lSalesRepKey];
    ps.sClientName1 = client ? client.sClientName1 : '';
    ps.sSalesRepName = rep ? rep.sSalesRepName : '';
    // sInvoiceNumber is the NI work order number
    ps.sWorkOrderNumber = ps.sInvoiceNumber || '';
  });
  console.log('  productSales: +sClientName1, +sSalesRepName, +sWorkOrderNumber');
}

// --- Enrich supplier POs ---
if (seed.supplierPOs) {
  const supplierMap = buildMap(seed.suppliers, 'lSupplierKey');
  seed.supplierPOs.forEach(po => {
    const sup = supplierMap[po.lSupplierKey];
    po.sSupplierName = sup ? (sup.sSupplierName || sup.sName1 || '') : '';
  });
  console.log('  supplierPOs: +sSupplierName');
}

console.log('Denormalization complete.\n');

// ============================================================
// SEED TABLE ORDER
// ============================================================
const SEED_ORDER = [
  'serviceLocations', 'manufacturers', 'scopeCategories', 'scopeTypeCategories',
  'repairStatuses', 'repairReasons', 'repairLevels', 'deliveryMethods',
  'paymentTerms', 'pricingCategories', 'salesReps', 'technicians',
  'employees', 'distributors', 'vendors', 'salesTax', 'packageTypes',
  'companies', 'contractTypes', 'servicePlanTerms', 'shippingCarriers',
  'supplierPOTypes', 'storageLocations',
  'scopeTypes', 'clients', 'departments', 'contacts', 'contactTrans',
  'scopes', 'contracts', 'contractDepartments', 'contractScopes', 'suppliers',
  'repairs', 'repairDetails', 'repairItems', 'statusTrans', 'repairInventory',
  'documents', 'flags', 'invoices', 'invoicePayments',
  'productSales', 'productSaleItems',
  'supplierPOs', 'supplierPOTrans',
  'inventoryTrans', 'inventory', 'inventorySizes',
  'departmentScopeTypes', 'maxCharges', 'subGroups',
];
const TABLE_REMAP = { 'maxCharges': 'modelMaxCharges' };

// ============================================================
// Write new mock-db.js
// ============================================================
console.log('Writing new mock-db.js...');
const fd = fs.openSync(MOCKDB_PATH, 'w');
function w(str) { fs.writeSync(fd, str + '\n'); }

// 1. Infrastructure
fs.writeSync(fd, infrastructure + '\n\n');

// 2. Header
w('// ═══════════════════════════════════════════════════════');
w('//  SEED DATA — Real WinScopeNet extract (Feb 13 – Mar 13, 2026)');
w('//  Denormalized with display fields for UI compatibility');
w('// ═══════════════════════════════════════════════════════');
w('');

// Register new tables
['contactTrans', 'vendors', 'salesTax', 'packageTypes', 'inventoryTrans',
 'storageLocations', 'modelMaxCharges', 'departmentScopeTypes'].forEach(t => {
  w(`if (!MockDB.tables['${t}']) MockDB.tables['${t}'] = [];`);
});
w('');

// 3. Seed each table
let totalSeeded = 0;
for (const key of SEED_ORDER) {
  const data = seed[key];
  if (!data || data.length === 0) continue;
  const tableName = TABLE_REMAP[key] || key;
  w(`// ${key}: ${data.length} records`);
  fs.writeSync(fd, `MockDB.seed('${tableName}', ${JSON.stringify(data)});\n`);
  totalSeeded += data.length;
}

w('');
w(`console.log('[MockDB] Real data seeded: ${totalSeeded.toLocaleString()} records');`);
w('');

// 4. Static lookups
w("MockDB.seed('states', " + JSON.stringify(getStates()) + ");");
w("MockDB.seed('countries', [{ lCountryKey: 1, sCountryName: 'United States' }]);");
w("MockDB.seed('users', [");
w("  { lUserKey: 1, sFirstName: 'Joseph', sLastName: 'Brassell', sUserName: 'JBrassell', sEmailAddress: 'jbrassell@totalscope.com', bActive: true, bIsAdmin: true },");
w("  { lUserKey: 2, sFirstName: 'Admin', sLastName: 'System', sUserName: 'admin', sEmailAddress: 'admin@totalscope.com', bActive: true, bIsAdmin: true }");
w("]);");
w('');

// 5. PRNG + Gen3-5
fs.writeSync(fd, prngBlock + '\n\n');
let gen3Fixed = gen3to5;
gen3Fixed = gen3Fixed.replace(
  /pick\(techs\)\.sTechName/g,
  "((pick(techs) || {}).sTechName || (pick(techs) || {}).sEmployeeLast || 'Tech')"
);
fs.writeSync(fd, gen3Fixed);
fs.closeSync(fd);

const sizeMB = (fs.statSync(MOCKDB_PATH).size / 1024 / 1024).toFixed(1);
console.log(`\nDone! New mock-db.js: ${sizeMB} MB`);
console.log(`Seeded ${totalSeeded.toLocaleString()} real records (denormalized)`);

function getStates() {
  return [
    {lStateKey:1,sStateAbbreviation:'AL',sStateName:'Alabama'},{lStateKey:2,sStateAbbreviation:'AK',sStateName:'Alaska'},
    {lStateKey:3,sStateAbbreviation:'AZ',sStateName:'Arizona'},{lStateKey:4,sStateAbbreviation:'AR',sStateName:'Arkansas'},
    {lStateKey:5,sStateAbbreviation:'CA',sStateName:'California'},{lStateKey:6,sStateAbbreviation:'CO',sStateName:'Colorado'},
    {lStateKey:7,sStateAbbreviation:'CT',sStateName:'Connecticut'},{lStateKey:8,sStateAbbreviation:'DE',sStateName:'Delaware'},
    {lStateKey:9,sStateAbbreviation:'FL',sStateName:'Florida'},{lStateKey:10,sStateAbbreviation:'GA',sStateName:'Georgia'},
    {lStateKey:11,sStateAbbreviation:'HI',sStateName:'Hawaii'},{lStateKey:12,sStateAbbreviation:'ID',sStateName:'Idaho'},
    {lStateKey:13,sStateAbbreviation:'IL',sStateName:'Illinois'},{lStateKey:14,sStateAbbreviation:'IN',sStateName:'Indiana'},
    {lStateKey:15,sStateAbbreviation:'IA',sStateName:'Iowa'},{lStateKey:16,sStateAbbreviation:'KS',sStateName:'Kansas'},
    {lStateKey:17,sStateAbbreviation:'KY',sStateName:'Kentucky'},{lStateKey:18,sStateAbbreviation:'LA',sStateName:'Louisiana'},
    {lStateKey:19,sStateAbbreviation:'ME',sStateName:'Maine'},{lStateKey:20,sStateAbbreviation:'MD',sStateName:'Maryland'},
    {lStateKey:21,sStateAbbreviation:'MA',sStateName:'Massachusetts'},{lStateKey:22,sStateAbbreviation:'MI',sStateName:'Michigan'},
    {lStateKey:23,sStateAbbreviation:'MN',sStateName:'Minnesota'},{lStateKey:24,sStateAbbreviation:'MS',sStateName:'Mississippi'},
    {lStateKey:25,sStateAbbreviation:'MO',sStateName:'Missouri'},{lStateKey:26,sStateAbbreviation:'MT',sStateName:'Montana'},
    {lStateKey:27,sStateAbbreviation:'NE',sStateName:'Nebraska'},{lStateKey:28,sStateAbbreviation:'NV',sStateName:'Nevada'},
    {lStateKey:29,sStateAbbreviation:'NH',sStateName:'New Hampshire'},{lStateKey:30,sStateAbbreviation:'NJ',sStateName:'New Jersey'},
    {lStateKey:31,sStateAbbreviation:'NM',sStateName:'New Mexico'},{lStateKey:32,sStateAbbreviation:'NY',sStateName:'New York'},
    {lStateKey:33,sStateAbbreviation:'NC',sStateName:'North Carolina'},{lStateKey:34,sStateAbbreviation:'ND',sStateName:'North Dakota'},
    {lStateKey:35,sStateAbbreviation:'OH',sStateName:'Ohio'},{lStateKey:36,sStateAbbreviation:'OK',sStateName:'Oklahoma'},
    {lStateKey:37,sStateAbbreviation:'OR',sStateName:'Oregon'},{lStateKey:38,sStateAbbreviation:'PA',sStateName:'Pennsylvania'},
    {lStateKey:39,sStateAbbreviation:'RI',sStateName:'Rhode Island'},{lStateKey:40,sStateAbbreviation:'SC',sStateName:'South Carolina'},
    {lStateKey:41,sStateAbbreviation:'SD',sStateName:'South Dakota'},{lStateKey:42,sStateAbbreviation:'TN',sStateName:'Tennessee'},
    {lStateKey:43,sStateAbbreviation:'TX',sStateName:'Texas'},{lStateKey:44,sStateAbbreviation:'UT',sStateName:'Utah'},
    {lStateKey:45,sStateAbbreviation:'VT',sStateName:'Vermont'},{lStateKey:46,sStateAbbreviation:'VA',sStateName:'Virginia'},
    {lStateKey:47,sStateAbbreviation:'WA',sStateName:'Washington'},{lStateKey:48,sStateAbbreviation:'WV',sStateName:'West Virginia'},
    {lStateKey:49,sStateAbbreviation:'WI',sStateName:'Wisconsin'},{lStateKey:50,sStateAbbreviation:'WY',sStateName:'Wyoming'},
  ];
}
