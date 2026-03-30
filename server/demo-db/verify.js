#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
//  verify.js — Smoke test key Express API endpoints
//  Usage: node server/demo-db/verify.js
//  Requires: npm run server (localhost:4000)
// ═══════════════════════════════════════════════════════
const http = require('http');

const BASE = 'http://localhost:4000/api';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(`${BASE}${path}`);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function check(label, fn) {
  try {
    const result = await fn();
    const count = Array.isArray(result.data) ? result.data.length :
      (result.data?.dataSource ? result.data.dataSource.length : '?');
    const ok = result.status === 200;
    console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(45)} ${result.status}  ${typeof count === 'number' ? count + ' rows' : ''}`);
    return ok;
  } catch (e) {
    console.log(`  ✗ ${label.padEnd(45)} ERROR: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('\n═══ TSI Demo API Smoke Test ═══\n');

  let pass = 0, fail = 0;
  const test = async (label, fn) => {
    (await check(label, fn)) ? pass++ : fail++;
  };

  // Health
  await test('GET /health', () => get('/health'));

  // Lookups
  await test('GET Repair Statuses', () => get('/RepairItems/GetRepairStatus'));
  await test('GET Repair Levels', () => get('/RepairItems/GetRepairLevels'));
  await test('GET Technicians', () => get('/Repair/GetAllTechs'));
  await test('GET Delivery Methods', () => get('/Repair/GetAllDeliveryMethods'));
  await test('GET Sales Reps', () => get('/SalesRepNames/GetAllSalesRepNames'));
  await test('GET Pricing Categories', () => get('/PricingCategory/GetAllPricingCategories'));
  await test('GET Payment Terms', () => get('/PaymentTerms/GetAllPaymentTerms'));
  await test('GET Service Locations', () => get('/ServiceLocation/GetAllServiceLocation'));
  await test('GET Scope Types', () => get('/Scopes/GetAllScopeType'));
  await test('GET Contract Types', () => get('/Contract/GetAllContractType'));
  await test('GET Credit Limits', () => get('/CreditLimit/GetAllCreditLimits'));
  await test('GET Distributors', () => get('/DistributorName/GetAllDistributorNames'));
  await test('GET Repair Reasons', () => get('/Repair/GetAllRepairReasons'));

  // Core data
  await test('GET All Repairs (North)', () => get('/Repair/GetAllRepairs?plServiceLocationKey=1'));
  await test('GET All Repairs (South)', () => get('/Repair/GetAllRepairs?plServiceLocationKey=2'));
  await test('GET Single Repair (NR250001)', () => get('/Repair/GetByWorkOrder?wo=NR250001'));
  await test('GET Ready to Ship', () => get('/Repair/GetReadyToShip'));
  await test('GET Clients', () => get('/Client/GetAllClientList'));
  await test('GET Client Detail (key=1)', () => get('/Client/GetClientDetailsByClientId?plClientKey=1'));

  // Dashboard
  await test('POST Dashboard Scopes (All)', () => post('/Dashboard/GetDashboardScopeDataList', { plServiceLocationKey: 0 }));
  await test('POST Dashboard Scopes (Flexible)', () => post('/Dashboard/GetDashboardScopeDataList', { plServiceLocationKey: 0, instrumentTypeValue: 'F' }));

  // Contracts
  await test('POST Contract List', () => post('/Contract/GetAllContractsList', { Pagination: { PageNumber: 1, PageSize: 50 } }));
  await test('GET Contract Detail (key=1)', () => get('/Contract/GetContractById?plContractKey=1'));
  await test('GET Contract Depts (key=1)', () => get('/Contract/GetContractDepartmentsList?plContractKey=1'));

  // Instrument codes
  await test('GET Instrument Codes', () => get('/InstrumentCode/GetAll'));

  // ── New endpoints (Phase 2 additions) ────────────────

  // DashBoardTask
  await test('POST Task List', () => post('/DashBoardTask/GetAllTaskList', {}));
  await test('GET Task Statuses', () => get('/DashBoardTask/GetAllTaskStatus'));
  await test('GET Task Priorities', () => get('/DashBoardTask/GetAllTaskPriorities'));

  // DashBoardTaskLoaner
  await test('GET Task Loaner List', () => get('/DashBoardTaskLoaner/GetAllTaskLoanerList'));

  // PendingArrival
  await test('GET Pending Arrivals (all)', () => get('/PendingArrival/GetAllPendingArrivals?plServiceLocationKey=0'));
  await test('GET Pending Arrivals (pending)', () => get('/PendingArrival/GetAllPendingArrivals?plServiceLocationKey=0&psStatus=pending'));

  // DevelopmentList
  await test('POST Dev Todo List', () => post('/DevelopmentList/GetDevelopmentTodoList', {}));
  await test('GET Dev Todo Statuses', () => get('/DevelopmentList/GetAllTodoStatuses'));
  await test('GET Dev Todo Priorities', () => get('/DevelopmentList/GetAllTodoPriorities'));

  // ── Existing routes with deeper coverage ─────────────

  // Invoices
  await test('GET All Invoices', () => get('/Invoice/GetAllInvoices'));
  await test('GET Ready to Invoice', () => get('/Invoice/GetReadyToInvoice'));

  // Financials
  await test('POST Outstanding Invoices', () => post('/Financials/GetOutstandingInvoicesList', { Pagination: { PageNumber: 1, PageSize: 50 } }));
  await test('POST Draft Invoices', () => post('/Financials/GetAllDraftInvoices', { Pagination: { PageNumber: 1, PageSize: 50 } }));
  await test('POST Clients On Hold', () => post('/Financials/GetAllClientsOnHold', {}));

  // Loaners
  await test('GET All Loaners', () => get('/Loaner/GetAll'));

  // Inventory (POST endpoint)
  await test('POST Inventory List', () => post('/Inventory/GetAllInventoryList', { plInventoryKey: 0, pbIncludeInactive: false }));

  // Suppliers
  await test('GET Supplier List', () => get('/Supplier/GetAllSupplierList'));
  await test('GET Supplier POs', () => get('/SupplierPO/GetAll'));

  // Scopes
  await test('GET Scopes (all)', () => get('/Scopes/GetAllScopes'));

  // Departments
  await test('GET Departments', () => get('/Departments/GetAllDepartments'));

  // Reports
  await test('GET FFS Approval Time Report', () => get('/reports/ffs-approval-time?startDate=2025-01-01'));

  // EndoCarts
  await test('GET EndoCart List', () => get('/EndoCart/GetAll'));

  // Instrument Repairs
  await test('GET Instrument Repairs', () => get('/InstrumentRepair/GetAll'));

  // Users
  await test('GET Users', () => get('/UserManagement/GetAll'));

  // Flags
  await test('GET Flags (owner key=2)', () => get('/Flag/GetFlagList?lOwnerKey=2'));

  // Scope Models
  await test('POST Scope Models', () => post('/ScopeModel/GetAllScopeTypeList', {}));

  // Quality
  await test('GET Quality/ISO', () => get('/Quality/GetAll'));

  // Task Status History
  await test('GET Task Status History (key=3)', () => get('/Tasks/GetStatusHistory/3'));

  // Contract by Department
  await test('GET Contract by Dept (key=3)', () => get('/Contract/GetContractByDepartment/3'));

  // Pricing (mounted at /api/pricing/*)
  await test('GET Pricing Details (cat=1)', () => get('/pricing/details?lPricingCategoryKey=1'));

  // Sub Groups
  await test('GET Sub Groups', () => get('/SubGroups/GetAllSubGroupsList?lDepartmentKey=1'));

  console.log(`\n═══ Results: ${pass} passed, ${fail} failed ═══\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
