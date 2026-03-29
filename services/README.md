# TSI Services Layer

A relationship-aware data service layer that sits between HTML pages and `MockDB`. All methods return a consistent envelope and enforce FK integrity.

## Files

| File | Purpose |
|---|---|
| `entity-schema.js` | Field definitions, types, required fields, defaults, FK relationships |
| `data-service.js` | Query facade — relationship-aware methods for all entities |
| `seed-data.js` | Deterministic test data generator (10 clients, 39 depts, 158 scopes, 393 repairs) |
| `validators.js` | Required field, FK, type, and business rule validation |
| `dept-enrichment.js` | Enriches dept/scope/repair records at runtime: dept-type labels, realistic scope models, orphan repair linking |

## Load Order

All files are plain browser scripts. Load after `mock-db.js`:

```html
<script src="mock-db.js"></script>
<script src="services/entity-schema.js"></script>
<script src="services/data-service.js"></script>
<script src="services/seed-data.js"></script>
<script src="services/validators.js"></script>
<script src="services/dept-enrichment.js"></script>
<!-- Optional: run at startup to enrich all dept/scope/repair records -->
<!-- DeptEnrichment.runAll(MockDB); -->
```

## Response Envelope

Every `DataService.*` method returns:

```js
{
  data:  object | array | null,
  error: null | { message: string, code: string },
  meta:  { count: number, page?, pageSize?, total?, ...entity-specific counts }
}
```

---

## DataService API Reference

### ClientService

```js
// All clients, optional service location filter
DataService.ClientService.getAll(svcLocationKey?, pagination?)

// Single client
DataService.ClientService.getById(clientKey)

// Client + departments array
DataService.ClientService.getWithDepartments(clientKey)

// Client + all repairs across all departments
DataService.ClientService.getWithRepairs(clientKey, pagination?)

// Client + all contracts
DataService.ClientService.getWithContracts(clientKey)

// Full profile: client + departments + contacts + scopes + repairs + contracts + flags + documents
DataService.ClientService.getFullProfile(clientKey)
```

### DepartmentService

```js
DataService.DepartmentService.getAll(svcLocationKey?)
DataService.DepartmentService.getById(deptKey)
DataService.DepartmentService.getByClient(clientKey)
DataService.DepartmentService.getWithScopes(deptKey)   // dept + scopes + contacts

// Scope inventory breakdown for a single department
// Returns: { total, byModel: [{model, manufacturer, count}], byStatus: {active, inactive} }
DataService.DepartmentService.getScopeInventorySummary(deptKey)

// Paginated repair history with summary meta
// Returns data[] + meta: { total, open, inProgress, completed30d, avgTAT }
DataService.DepartmentService.getRepairHistory(deptKey, options?)
// options: { limit: 50, offset: 0 }

// Technicians who have worked repairs for this department
// Returns: [{userKey, name, repairCount30d, avgTAT, openCount}]
DataService.DepartmentService.getAssignedTechs(deptKey)

// All departments for a client with denormalized counts attached
// Returns: departments[] each with scopeCount, openRepairCount, contractStatus
DataService.DepartmentService.getListForClient(clientKey)
```

### RepairService

```js
DataService.RepairService.getAll(svcLocationKey?, pagination?)
DataService.RepairService.getById(repairKey)
DataService.RepairService.getWithDetails(repairKey)     // repair + line items + status history + inventory
DataService.RepairService.getByClient(clientKey, pagination?)
DataService.RepairService.getByDepartment(deptKey, pagination?)
DataService.RepairService.getByScope(scopeKey)
```

### ContractService

```js
DataService.ContractService.getAll(svcLocationKey?, pagination?)
DataService.ContractService.getById(contractKey)
DataService.ContractService.getByClient(clientKey)
DataService.ContractService.getWithCoverage(contractKey)  // contract + covered depts + scopes + repairs
```

### ProductSaleService

```js
DataService.ProductSaleService.getAll(pagination?)
DataService.ProductSaleService.getById(saleKey)
DataService.ProductSaleService.getWithItems(saleKey)    // sale + line items
DataService.ProductSaleService.getByClient(clientKey, pagination?)
```

### InventoryService

```js
DataService.InventoryService.getAll(includeInactive?, pagination?)
DataService.InventoryService.getById(inventoryKey)
DataService.InventoryService.getWithSupplier(inventoryKey)  // item + supplier record
DataService.InventoryService.getLowStock()
```

### InvoiceService

> Note: `tblInvoice` is always empty in production. This wraps mock invoices for UI development only. Use `gpInvoiceStaging` for real revenue queries.

```js
DataService.InvoiceService.getAll(pagination?)
DataService.InvoiceService.getById(invoiceKey)
DataService.InvoiceService.getByClient(clientKey, pagination?)
DataService.InvoiceService.getOutstanding(svcLocationKey?, pagination?)
```

### ScopeService

```js
DataService.ScopeService.getByDepartment(deptKey, includeDead?)
DataService.ScopeService.getById(scopeKey)
DataService.ScopeService.getWithRepairs(scopeKey)
```

### LookupService

```js
DataService.LookupService.getRepairStatuses()
DataService.LookupService.getContractTypes()
DataService.LookupService.getSalesReps()
DataService.LookupService.getServiceLocations()
DataService.LookupService.getTechnicians()
DataService.LookupService.getSuppliers()
DataService.LookupService.getPricingCategories()
```

---

## Pagination

Pass a `pagination` object to any paginated method:

```js
const result = DataService.RepairService.getAll(1, { page: 1, pageSize: 50 });
// result.meta: { count: 50, page: 1, pageSize: 50, total: 393 }
```

---

## Validators

```js
Validators.validateClient(data)        // → { valid, errors }
Validators.validateDepartment(data)
Validators.validateScope(data)
Validators.validateRepair(data)
Validators.validateRepairDetail(data)
Validators.validateContract(data)
Validators.validateProductSale(data)
Validators.validateInventoryItem(data)

// Repair status transition check
Validators.validateStatusTransition('D&I', 'In Repair')
// → { valid: true, errors: [] }
Validators.validateStatusTransition('Completed', 'Received')
// → { valid: false, errors: ['Invalid transition: Completed → Received. Allowed: none (terminal)'] }

// Batch validate
Validators.validateAll('repairs', repairsArray)
// → { valid, errors: ['Record[2]: dtShipped cannot be before dtReceived'], results }
```

---

## Seed Data

```js
// Get a snapshot (does not touch MockDB)
const data = SeedData.build();
// data.clients (10), data.departments (39), data.scopes (158),
// data.repairs (393), data.repairDetails (786), data.contracts (4),
// data.productSales (19), data.invoices (113)

// Seed into MockDB (no-op if table already has data)
SeedData.seedIntoMockDB(MockDB);
```

Key ranges start at 9000 (`BASE.client`, `BASE.dept`, etc.) to avoid colliding with real extracted data which uses low integer keys.

---

## EntitySchema

```js
// Get required fields
EntitySchema.getRequired('repairs')
// → ['lDepartmentKey', 'sWorkOrderNumber']

// Get FK relationships
EntitySchema.getFKs('repairs')
// → { lDepartmentKey: { table: 'departments', field: 'lDepartmentKey', required: true }, ... }

// Get defaults for building a new record
EntitySchema.getDefaults('repairs')

// Build blank record with defaults pre-filled
EntitySchema.newRecord('clients')

// Enum values
EntitySchema.enums.REPAIR_STATUSES   // ['Received', 'D&I', ...]
EntitySchema.enums.CONTRACT_TYPES    // ['Capitated', 'Shared Risk', ...]
EntitySchema.enums.SCOPE_TYPES       // ['R', 'F', 'C', 'I']
```

---

## FK Relationship Map

```
Client (lClientKey)
├── Departments (lClientKey)
│   ├── Scopes (lDepartmentKey)
│   ├── Contacts (lDepartmentKey)
│   └── Repairs (lDepartmentKey, lClientKey denorm)
│       └── RepairDetails (lRepairKey)
├── Contracts (lClientKey)
│   ├── ContractDepartments (lContractKey)
│   └── ContractScopes (lContractKey)
├── ProductSales (lClientKey)
│   └── ProductSaleItems (lProductSaleKey)
├── Invoices (lClientKey)
├── Flags (lOwnerKey — polymorphic)
└── Documents (lOwnerKey — polymorphic)
```
