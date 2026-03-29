// ═══════════════════════════════════════════════════════
//  TSI Data Service — Relationship-aware query facade
//  Sits between pages and MockDB. All methods return:
//    { data, error, meta: { count, page, pageSize, total } }
//
//  Dependencies (must be loaded before this file):
//    - mock-db.js  (exposes MockDB global)
//    - services/entity-schema.js  (exposes EntitySchema global)
// ═══════════════════════════════════════════════════════

const DataService = (() => {
  'use strict';

  // ── Standard response envelope ────────────────────────
  function ok(data, meta = {}) {
    const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
    return { data, error: null, meta: { count, ...meta } };
  }

  function err(message, code = 'NOT_FOUND') {
    return { data: null, error: { message, code }, meta: { count: 0 } };
  }

  function notFound(entity, key) {
    return err(`${entity} with key ${key} not found`, 'NOT_FOUND');
  }

  // ── Pagination helper ─────────────────────────────────
  function paginate(rows, page = 1, pageSize = 100) {
    const total = rows.length;
    const start = (page - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);
    return { rows: paged, meta: { count: paged.length, page, pageSize, total } };
  }

  // ── Guard: DB must be available ───────────────────────
  function dbAvailable() {
    return typeof MockDB !== 'undefined' && MockDB.getAll;
  }

  // ══════════════════════════════════════════════════════
  //  ClientService
  // ══════════════════════════════════════════════════════
  const ClientService = {

    // All clients, optional service location filter
    getAll(svcLocationKey = null, pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getAll('clients');
      if (svcLocationKey) {
        rows = rows.filter(c => c.lServiceLocationKey === svcLocationKey);
      }
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },

    // Single client record
    getById(clientKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const client = MockDB.getByKey('clients', clientKey);
      if (!client) return notFound('Client', clientKey);
      return ok(client);
    },

    // Client + nested departments array
    getWithDepartments(clientKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const client = MockDB.getByKey('clients', clientKey);
      if (!client) return notFound('Client', clientKey);
      const departments = MockDB.getFiltered('departments', d => d.lClientKey === clientKey);
      return ok({ ...client, departments });
    },

    // Client + all repairs across all departments (through lClientKey denorm or dept chain)
    getWithRepairs(clientKey, pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const client = MockDB.getByKey('clients', clientKey);
      if (!client) return notFound('Client', clientKey);
      // Repairs carry lClientKey (denormalized) or can be resolved via dept
      let repairs = MockDB.getFiltered('repairs', r =>
        r.lClientKey === clientKey ||
        r.sClientName === client.sClientName1
      );
      if (pagination) {
        const { rows: paged, meta } = paginate(repairs, pagination.page, pagination.pageSize);
        return ok({ ...client, repairs: paged }, meta);
      }
      return ok({ ...client, repairs });
    },

    // Client + all contracts
    getWithContracts(clientKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const client = MockDB.getByKey('clients', clientKey);
      if (!client) return notFound('Client', clientKey);
      const contracts = MockDB.getFiltered('contracts', c => c.lClientKey === clientKey);
      return ok({ ...client, contracts });
    },

    // Full profile: client + departments + contacts + scopes + repairs + contracts + flags
    getFullProfile(clientKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const client = MockDB.getByKey('clients', clientKey);
      if (!client) return notFound('Client', clientKey);

      const departments = MockDB.getFiltered('departments', d => d.lClientKey === clientKey);
      const deptKeys    = departments.map(d => d.lDepartmentKey);
      const deptKeySet  = new Set(deptKeys);

      const contacts  = MockDB.getFiltered('contacts',  c => c.lClientKey === clientKey || deptKeySet.has(c.lDepartmentKey));
      const scopes    = MockDB.getFiltered('scopes',    s => deptKeySet.has(s.lDepartmentKey));
      const repairs   = MockDB.getFiltered('repairs',   r => r.lClientKey === clientKey || deptKeySet.has(r.lDepartmentKey));
      const contracts = MockDB.getFiltered('contracts', c => c.lClientKey === clientKey);
      const flags     = MockDB.getFiltered('flags',     f => f.lOwnerKey === clientKey);
      const documents = MockDB.getFiltered('documents', d => d.lOwnerKey === clientKey);

      return ok({
        ...client,
        departments,
        contacts,
        scopes,
        repairs,
        contracts,
        flags,
        documents,
      }, {
        count: 1,
        departmentCount: departments.length,
        scopeCount: scopes.length,
        repairCount: repairs.length,
        contractCount: contracts.length,
      });
    },
  };

  // ══════════════════════════════════════════════════════
  //  DepartmentService
  // ══════════════════════════════════════════════════════
  const DepartmentService = {

    getAll(svcLocationKey = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getAll('departments');
      if (svcLocationKey) rows = rows.filter(d => d.lServiceLocationKey === svcLocationKey);
      return ok(rows);
    },

    getById(deptKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const dept = MockDB.getByKey('departments', deptKey);
      if (!dept) return notFound('Department', deptKey);
      return ok(dept);
    },

    getByClient(clientKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const rows = MockDB.getFiltered('departments', d => d.lClientKey === clientKey);
      return ok(rows);
    },

    // Department + scopes + contacts
    getWithScopes(deptKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const dept = MockDB.getByKey('departments', deptKey);
      if (!dept) return notFound('Department', deptKey);
      const scopes   = MockDB.getFiltered('scopes',   s => s.lDepartmentKey === deptKey);
      const contacts = MockDB.getFiltered('contacts', c => c.lDepartmentKey === deptKey);
      return ok({ ...dept, scopes, contacts });
    },
  };

  // ══════════════════════════════════════════════════════
  //  RepairService
  // ══════════════════════════════════════════════════════
  const RepairService = {

    getAll(svcLocationKey = null, pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getAll('repairs');
      if (svcLocationKey) rows = rows.filter(r => r.lServiceLocationKey === svcLocationKey);
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },

    getById(repairKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const repair = MockDB.getByKey('repairs', repairKey);
      if (!repair) return notFound('Repair', repairKey);
      return ok(repair);
    },

    // Repair + line items + status history
    getWithDetails(repairKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const repair = MockDB.getByKey('repairs', repairKey);
      if (!repair) return notFound('Repair', repairKey);
      const details       = MockDB.getFiltered('repairDetails', d => d.lRepairKey === repairKey);
      const statusHistory = MockDB.getFiltered('statusTrans',   s => s.lRepairKey === repairKey);
      const inventory     = MockDB.getFiltered('repairInventory', i => i.lRepairKey === repairKey);
      return ok({ ...repair, details, statusHistory, inventory });
    },

    // All repairs for a client (via lClientKey denorm)
    getByClient(clientKey, pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getFiltered('repairs', r => r.lClientKey === clientKey);
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },

    // All repairs for a department
    getByDepartment(deptKey, pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getFiltered('repairs', r => r.lDepartmentKey === deptKey);
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },

    // Repairs for a specific scope (device)
    getByScope(scopeKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const rows = MockDB.getFiltered('repairs', r => r.lScopeKey === scopeKey);
      return ok(rows);
    },
  };

  // ══════════════════════════════════════════════════════
  //  ContractService
  // ══════════════════════════════════════════════════════
  const ContractService = {

    getAll(svcLocationKey = null, pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getAll('contracts');
      if (svcLocationKey) rows = rows.filter(c => c.lServiceLocationKey === svcLocationKey);
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },

    getById(contractKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const contract = MockDB.getByKey('contracts', contractKey);
      if (!contract) return notFound('Contract', contractKey);
      return ok(contract);
    },

    // All contracts for a client
    getByClient(clientKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const rows = MockDB.getFiltered('contracts', c => c.lClientKey === clientKey);
      return ok(rows);
    },

    // Contract + covered departments + covered scopes
    getWithCoverage(contractKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const contract = MockDB.getByKey('contracts', contractKey);
      if (!contract) return notFound('Contract', contractKey);
      const coveredDepts  = MockDB.getFiltered('contractDepartments', cd => cd.lContractKey === contractKey);
      const coveredScopes = MockDB.getFiltered('contractScopes',      cs => cs.lContractKey === contractKey);
      const repairs       = MockDB.getFiltered('repairs', r => r.lContractKey === contractKey);
      return ok({ ...contract, coveredDepts, coveredScopes, repairs }, {
        count: 1,
        coveredDeptCount:  coveredDepts.length,
        coveredScopeCount: coveredScopes.length,
        repairCount:       repairs.length,
      });
    },
  };

  // ══════════════════════════════════════════════════════
  //  ProductSaleService
  // ══════════════════════════════════════════════════════
  const ProductSaleService = {

    getAll(pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const rows = MockDB.getAll('productSales');
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },

    getById(saleKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const sale = MockDB.getByKey('productSales', saleKey);
      if (!sale) return notFound('ProductSale', saleKey);
      return ok(sale);
    },

    // Sale + line items
    getWithItems(saleKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const sale = MockDB.getByKey('productSales', saleKey);
      if (!sale) return notFound('ProductSale', saleKey);
      const items = MockDB.getFiltered('productSaleItems', i => i.lProductSaleKey === saleKey);
      return ok({ ...sale, items });
    },

    // All sales for a client
    getByClient(clientKey, pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getFiltered('productSales', s => s.lClientKey === clientKey);
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },
  };

  // ══════════════════════════════════════════════════════
  //  InventoryService
  // ══════════════════════════════════════════════════════
  const InventoryService = {

    getAll(includeInactive = false, pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getAll('inventory');
      if (!includeInactive) rows = rows.filter(i => i.bActive !== false);
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },

    getById(inventoryKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const item = MockDB.getByKey('inventory', inventoryKey);
      if (!item) return notFound('Inventory', inventoryKey);
      return ok(item);
    },

    // Inventory item + supplier info
    getWithSupplier(inventoryKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const item = MockDB.getByKey('inventory', inventoryKey);
      if (!item) return notFound('Inventory', inventoryKey);
      const supplier = item.lSupplierKey
        ? MockDB.getByKey('suppliers', item.lSupplierKey)
        : null;
      return ok({ ...item, supplier });
    },

    // Low stock items (qty <= reorder point)
    getLowStock() {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const rows = MockDB.getFiltered('inventory', i =>
        i.bActive !== false && i.nQtyOnHand <= (i.nReorderPoint || 0)
      );
      return ok(rows);
    },
  };

  // ══════════════════════════════════════════════════════
  //  InvoiceService
  // ══════════════════════════════════════════════════════
  const InvoiceService = {

    // NOTE: tblInvoice is always empty in production.
    // Use gpInvoiceStaging for revenue queries. This service
    // wraps mock invoices for UI development only.

    getAll(pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const rows = MockDB.getAll('invoices');
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },

    getById(invoiceKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const invoice = MockDB.getByKey('invoices', invoiceKey);
      if (!invoice) return notFound('Invoice', invoiceKey);
      return ok(invoice);
    },

    // All invoices for a client
    getByClient(clientKey, pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getFiltered('invoices', i => i.lClientKey === clientKey);
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },

    // Outstanding (unpaid) invoices
    getOutstanding(svcLocationKey = null, pagination = null) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getFiltered('invoices', i => !i.bPaid && i.nBalance > 0);
      if (svcLocationKey) rows = rows.filter(i => i.lServiceLocationKey === svcLocationKey);
      if (pagination) {
        const { rows: paged, meta } = paginate(rows, pagination.page, pagination.pageSize);
        return ok(paged, meta);
      }
      return ok(rows);
    },
  };

  // ══════════════════════════════════════════════════════
  //  ScopeService (device/instrument records)
  // ══════════════════════════════════════════════════════
  const ScopeService = {

    getByDepartment(deptKey, includeDead = false) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      let rows = MockDB.getFiltered('scopes', s => s.lDepartmentKey === deptKey);
      if (!includeDead) rows = rows.filter(s => !s.bDead);
      return ok(rows);
    },

    getById(scopeKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const scope = MockDB.getByKey('scopes', scopeKey);
      if (!scope) return notFound('Scope', scopeKey);
      return ok(scope);
    },

    // Scope + repair history
    getWithRepairs(scopeKey) {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      const scope = MockDB.getByKey('scopes', scopeKey);
      if (!scope) return notFound('Scope', scopeKey);
      const repairs = MockDB.getFiltered('repairs', r => r.lScopeKey === scopeKey);
      return ok({ ...scope, repairs });
    },
  };

  // ══════════════════════════════════════════════════════
  //  LookupService — reference data (statuses, types, etc.)
  // ══════════════════════════════════════════════════════
  const LookupService = {

    getRepairStatuses() {
      if (!dbAvailable()) return ok(EntitySchema.enums.REPAIR_STATUSES.map((s, i) => ({ lRepairStatusID: i + 1, sStatus: s })));
      const rows = MockDB.getAll('repairStatuses');
      return ok(rows.length ? rows : EntitySchema.enums.REPAIR_STATUSES.map((s, i) => ({ lRepairStatusID: i + 1, sStatus: s })));
    },

    getContractTypes() {
      if (!dbAvailable()) return ok(EntitySchema.enums.CONTRACT_TYPES.map((t, i) => ({ lContractTypeKey: i + 1, sContractType: t })));
      const rows = MockDB.getAll('contractTypes');
      return ok(rows.length ? rows : EntitySchema.enums.CONTRACT_TYPES.map((t, i) => ({ lContractTypeKey: i + 1, sContractType: t })));
    },

    getSalesReps() {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      return ok(MockDB.getAll('salesReps'));
    },

    getServiceLocations() {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      return ok(MockDB.getAll('serviceLocations'));
    },

    getTechnicians() {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      return ok(MockDB.getAll('technicians'));
    },

    getSuppliers() {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      return ok(MockDB.getAll('suppliers'));
    },

    getPricingCategories() {
      if (!dbAvailable()) return err('MockDB not available', 'DB_UNAVAILABLE');
      return ok(MockDB.getAll('pricingCategories'));
    },
  };

  // ══════════════════════════════════════════════════════
  //  Public API
  // ══════════════════════════════════════════════════════
  return {
    ClientService,
    DepartmentService,
    RepairService,
    ContractService,
    ProductSaleService,
    InventoryService,
    InvoiceService,
    ScopeService,
    LookupService,
    // Expose raw helpers for testing
    _ok: ok,
    _err: err,
    _paginate: paginate,
  };
})();

// ── Node.js export support ────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataService;
}
