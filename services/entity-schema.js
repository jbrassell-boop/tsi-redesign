// ═══════════════════════════════════════════════════════
//  TSI Entity Schema — Single source of truth for entity
//  field definitions, types, required fields, defaults,
//  and FK relationships.
//
//  Field type codes: 'int' | 'string' | 'bool' | 'date' | 'float' | 'enum'
//  Usage: EntitySchema.clients.fields, EntitySchema.clients.fk, etc.
// ═══════════════════════════════════════════════════════

const EntitySchema = (() => {
  'use strict';

  // ── Shared audit fields appended to every entity ──────
  const _auditFields = {
    Created_datetime: { type: 'date',   required: false, default: null },
    Created_UserKey:  { type: 'int',    required: false, default: null },
    Updated_datetime: { type: 'date',   required: false, default: null },
    Updated_UserKey:  { type: 'int',    required: false, default: null },
  };

  // ── Repair status enum ─────────────────────────────────
  const REPAIR_STATUSES = [
    'Received', 'D&I', '40-Day', 'In Repair', 'QC', 'Pending Ship',
    'Shipped', 'Completed', 'On Hold', 'Cancelled'
  ];

  // ── Contract type enum ─────────────────────────────────
  // 1=Capitated, 2=Shared Risk, 3=PSA, 4=Fuse, 5=Airway, 6=Rental
  const CONTRACT_TYPES = ['Capitated', 'Shared Risk', 'PSA', 'Fuse', 'Airway', 'Rental'];

  // ── Scope type enum ────────────────────────────────────
  const SCOPE_TYPES = ['R', 'F', 'C', 'I'];  // Rigid, Flexible, Camera, Instrument

  // ══════════════════════════════════════════════════════
  //  Entity Definitions
  // ══════════════════════════════════════════════════════

  const schemas = {

    // ── Client ────────────────────────────────────────────
    clients: {
      table:    'clients',
      pk:       'lClientKey',
      display:  'sClientName1',
      fk:       {
        lSalesRepKey:         { table: 'salesReps',         field: 'lSalesRepKey' },
        lPricingCategoryKey:  { table: 'pricingCategories', field: 'lPricingCategoryKey' },
        lPaymentTermsKey:     { table: 'paymentTerms',      field: 'lPaymentTermsKey' },
        lCreditLimitKey:      { table: 'creditLimits',      field: 'lCreditLimitKey' },
        lDistributorKey:      { table: 'distributors',      field: 'lDistributorKey' },
        lServiceLocationKey:  { table: 'serviceLocations',  field: 'lServiceLocationKey' },
      },
      required: ['sClientName1'],
      fields: {
        lClientKey:           { type: 'int',    required: true,  default: null },
        sClientName1:         { type: 'string', required: true,  default: '' },
        sClientName2:         { type: 'string', required: false, default: '' },
        sMailAddr1:           { type: 'string', required: false, default: '' },
        sMailAddr2:           { type: 'string', required: false, default: '' },
        sMailCity:            { type: 'string', required: false, default: '' },
        sMailState:           { type: 'string', required: false, default: '' },
        sMailZip:             { type: 'string', required: false, default: '' },
        sMailCountry:         { type: 'string', required: false, default: 'USA' },
        sBillAddr1:           { type: 'string', required: false, default: '' },
        sBillAddr2:           { type: 'string', required: false, default: '' },
        sBillCity:            { type: 'string', required: false, default: '' },
        sBillState:           { type: 'string', required: false, default: '' },
        sBillZip:             { type: 'string', required: false, default: '' },
        sPhoneVoice:          { type: 'string', required: false, default: '' },
        sPhoneFAX:            { type: 'string', required: false, default: '' },
        sBillTo:              { type: 'string', required: false, default: 'Customer' },
        sClntTerms:           { type: 'string', required: false, default: 'Net 30' },
        sGPID:                { type: 'string', required: false, default: '' },
        sPeachTreeCustID:     { type: 'string', required: false, default: '' },
        sPricingCategory:     { type: 'string', required: false, default: '' },
        sSalesRepName:        { type: 'string', required: false, default: '' },
        sServiceLocationName: { type: 'string', required: false, default: '' },
        sPaymentTerms:        { type: 'string', required: false, default: '' },
        sDistName1:           { type: 'string', required: false, default: '' },
        dtClientSince:        { type: 'date',   required: false, default: null },
        dtLastUpdate:         { type: 'date',   required: false, default: null },
        bActive:              { type: 'bool',   required: false, default: true },
        bNationalAccount:     { type: 'bool',   required: false, default: false },
        bSkipTracking:        { type: 'bool',   required: false, default: false },
        bNeverHold:           { type: 'bool',   required: false, default: false },
        bEmailNewRepairs:     { type: 'bool',   required: false, default: true },
        bRequisitionTotalsOnly: { type: 'bool', required: false, default: false },
        sBadDebtRisk:         { type: 'string', required: false, default: 'N' },
        sPORequired:          { type: 'string', required: false, default: 'N' },
        lSalesRepKey:         { type: 'int',    required: false, default: null },
        lPricingCategoryKey:  { type: 'int',    required: false, default: null },
        lPaymentTermsKey:     { type: 'int',    required: false, default: null },
        lCreditLimitKey:      { type: 'int',    required: false, default: null },
        lDistributorKey:      { type: 'int',    required: false, default: null },
        lServiceLocationKey:  { type: 'int',    required: false, default: 1 },
        nPortalMonths:        { type: 'int',    required: false, default: 24 },
        _region:              { type: 'string', required: false, default: 'North' },
        _dbKey:               { type: 'int',    required: false, default: 1 },
        ..._auditFields,
      },
    },

    // ── Department ────────────────────────────────────────
    departments: {
      table:    'departments',
      pk:       'lDepartmentKey',
      display:  'sDepartmentName',
      fk:       {
        lClientKey:           { table: 'clients',           field: 'lClientKey', required: true },
        lServiceLocationKey:  { table: 'serviceLocations',  field: 'lServiceLocationKey' },
      },
      required: ['lClientKey', 'sDepartmentName'],
      fields: {
        lDepartmentKey:       { type: 'int',    required: true,  default: null },
        lClientKey:           { type: 'int',    required: true,  default: null },
        sDepartmentName:      { type: 'string', required: true,  default: '' },
        sDeptAddr1:           { type: 'string', required: false, default: '' },
        sDeptAddr2:           { type: 'string', required: false, default: '' },
        sDeptCity:            { type: 'string', required: false, default: '' },
        sDeptState:           { type: 'string', required: false, default: '' },
        sDeptZip:             { type: 'string', required: false, default: '' },
        sPhoneVoice:          { type: 'string', required: false, default: '' },
        sPhoneFAX:            { type: 'string', required: false, default: '' },
        sContactName:         { type: 'string', required: false, default: '' },
        sContactEmail:        { type: 'string', required: false, default: '' },
        lServiceLocationKey:  { type: 'int',    required: false, default: 1 },
        sServiceLocationName: { type: 'string', required: false, default: '' },
        sClientName:          { type: 'string', required: false, default: '' },
        bActive:              { type: 'bool',   required: false, default: true },
        bPortalEnabled:       { type: 'bool',   required: false, default: false },
        bUseClientBillAddr:   { type: 'bool',   required: false, default: true },
        _region:              { type: 'string', required: false, default: 'North' },
        _dbKey:               { type: 'int',    required: false, default: 1 },
        ..._auditFields,
      },
    },

    // ── Scope (device/instrument) ─────────────────────────
    scopes: {
      table:    'scopes',
      pk:       'lScopeKey',
      display:  'sScopeDesc',
      fk:       {
        lDepartmentKey: { table: 'departments', field: 'lDepartmentKey', required: true },
        lScopeTypeKey:  { table: 'scopeTypes',  field: 'lScopeTypeKey' },
      },
      required: ['lDepartmentKey', 'sSerial'],
      fields: {
        lScopeKey:            { type: 'int',    required: true,  default: null },
        lDepartmentKey:       { type: 'int',    required: true,  default: null },
        lScopeTypeKey:        { type: 'int',    required: false, default: null },
        sScopeDesc:           { type: 'string', required: false, default: '' },
        sSerial:              { type: 'string', required: true,  default: '' },
        sModel:               { type: 'string', required: false, default: '' },
        sManufacturer:        { type: 'string', required: false, default: '' },
        sRigidOrFlexible:     { type: 'enum',   required: false, default: 'F', values: SCOPE_TYPES },
        sScopeTypeName:       { type: 'string', required: false, default: '' },
        sDepartmentName:      { type: 'string', required: false, default: '' },
        sClientName:          { type: 'string', required: false, default: '' },
        lClientKey:           { type: 'int',    required: false, default: null },
        bActive:              { type: 'bool',   required: false, default: true },
        bDead:                { type: 'bool',   required: false, default: false },
        dtLastRepair:         { type: 'date',   required: false, default: null },
        _region:              { type: 'string', required: false, default: 'North' },
        _dbKey:               { type: 'int',    required: false, default: 1 },
        ..._auditFields,
      },
    },

    // ── Contact ───────────────────────────────────────────
    contacts: {
      table:    'contacts',
      pk:       'lContactKey',
      display:  'sContactName',
      fk:       {
        lClientKey:     { table: 'clients',     field: 'lClientKey' },
        lDepartmentKey: { table: 'departments', field: 'lDepartmentKey' },
      },
      required: ['sContactName'],
      fields: {
        lContactKey:      { type: 'int',    required: true,  default: null },
        lClientKey:       { type: 'int',    required: false, default: null },
        lDepartmentKey:   { type: 'int',    required: false, default: null },
        sContactName:     { type: 'string', required: true,  default: '' },
        sContactTitle:    { type: 'string', required: false, default: '' },
        sContactEmail:    { type: 'string', required: false, default: '' },
        sContactPhone:    { type: 'string', required: false, default: '' },
        sContactFax:      { type: 'string', required: false, default: '' },
        bPrimary:         { type: 'bool',   required: false, default: false },
        bActive:          { type: 'bool',   required: false, default: true },
        ..._auditFields,
      },
    },

    // ── Repair ────────────────────────────────────────────
    repairs: {
      table:    'repairs',
      pk:       'lRepairKey',
      display:  'sWorkOrderNumber',
      fk:       {
        lDepartmentKey:     { table: 'departments',     field: 'lDepartmentKey', required: true },
        lScopeKey:          { table: 'scopes',          field: 'lScopeKey' },
        lServiceLocationKey:{ table: 'serviceLocations',field: 'lServiceLocationKey' },
        lTechnicianKey:     { table: 'technicians',     field: 'lTechnicianKey' },
      },
      required: ['lDepartmentKey', 'sWorkOrderNumber'],
      fields: {
        lRepairKey:           { type: 'int',    required: true,  default: null },
        lDepartmentKey:       { type: 'int',    required: true,  default: null },
        lScopeKey:            { type: 'int',    required: false, default: null },
        lClientKey:           { type: 'int',    required: false, default: null },
        lServiceLocationKey:  { type: 'int',    required: false, default: 1 },
        lTechnicianKey:       { type: 'int',    required: false, default: null },
        lContractKey:         { type: 'int',    required: false, default: null },
        sWorkOrderNumber:     { type: 'string', required: true,  default: '' },
        sSerial:              { type: 'string', required: false, default: '' },
        sModel:               { type: 'string', required: false, default: '' },
        sManufacturer:        { type: 'string', required: false, default: '' },
        sComplaint:           { type: 'string', required: false, default: '' },
        sRepairStatus:        { type: 'enum',   required: false, default: 'Received', values: REPAIR_STATUSES },
        sClientName:          { type: 'string', required: false, default: '' },
        sDepartmentName:      { type: 'string', required: false, default: '' },
        sTechnicianName:      { type: 'string', required: false, default: '' },
        sServiceLocationName: { type: 'string', required: false, default: '' },
        dtReceived:           { type: 'date',   required: false, default: null },
        dtShipped:            { type: 'date',   required: false, default: null },
        dtPromised:           { type: 'date',   required: false, default: null },
        nRepairTotal:         { type: 'float',  required: false, default: 0 },
        nContractExpense:     { type: 'float',  required: false, default: 0 },
        bUnderContract:       { type: 'bool',   required: false, default: false },
        bUrgent:              { type: 'bool',   required: false, default: false },
        bLoaner:              { type: 'bool',   required: false, default: false },
        sPONumber:            { type: 'string', required: false, default: '' },
        sRigidOrFlexible:     { type: 'enum',   required: false, default: 'F', values: SCOPE_TYPES },
        _region:              { type: 'string', required: false, default: 'North' },
        _dbKey:               { type: 'int',    required: false, default: 1 },
        ..._auditFields,
      },
    },

    // ── Repair Detail (line items) ────────────────────────
    repairDetails: {
      table:    'repairDetails',
      pk:       'lRepairItemTranKey',
      display:  'sRepairItemDesc',
      fk:       {
        lRepairKey:     { table: 'repairs',     field: 'lRepairKey', required: true },
        lRepairItemKey: { table: 'repairItems', field: 'lRepairItemKey' },
      },
      required: ['lRepairKey'],
      fields: {
        lRepairItemTranKey: { type: 'int',    required: true,  default: null },
        lRepairKey:         { type: 'int',    required: true,  default: null },
        lRepairItemKey:     { type: 'int',    required: false, default: null },
        sRepairItemDesc:    { type: 'string', required: false, default: '' },
        sRepairItemCode:    { type: 'string', required: false, default: '' },
        nQty:               { type: 'int',    required: false, default: 1 },
        nUnitPrice:         { type: 'float',  required: false, default: 0 },
        nExtPrice:          { type: 'float',  required: false, default: 0 },
        bApproved:          { type: 'bool',   required: false, default: false },
        bWarranty:          { type: 'bool',   required: false, default: false },
        sRigidOrFlexible:   { type: 'string', required: false, default: 'F' },
        ..._auditFields,
      },
    },

    // ── Contract ──────────────────────────────────────────
    contracts: {
      table:    'contracts',
      pk:       'lContractKey',
      display:  'sContractNumber',
      fk:       {
        lClientKey: { table: 'clients', field: 'lClientKey', required: true },
      },
      required: ['lClientKey', 'sContractNumber'],
      fields: {
        lContractKey:         { type: 'int',    required: true,  default: null },
        lClientKey:           { type: 'int',    required: true,  default: null },
        lContractTypeKey:     { type: 'int',    required: false, default: null },
        sContractNumber:      { type: 'string', required: true,  default: '' },
        sContractType:        { type: 'enum',   required: false, default: 'Capitated', values: CONTRACT_TYPES },
        sClientName:          { type: 'string', required: false, default: '' },
        dtStartDate:          { type: 'date',   required: false, default: null },
        dtEndDate:            { type: 'date',   required: false, default: null },
        nMonthlyFee:          { type: 'float',  required: false, default: 0 },
        nAnnualValue:         { type: 'float',  required: false, default: 0 },
        bActive:              { type: 'bool',   required: false, default: true },
        bCapitated:           { type: 'bool',   required: false, default: false },
        nScopeCount:          { type: 'int',    required: false, default: 0 },
        nDeptCount:           { type: 'int',    required: false, default: 0 },
        lServiceLocationKey:  { type: 'int',    required: false, default: 1 },
        sServiceLocationName: { type: 'string', required: false, default: '' },
        _region:              { type: 'string', required: false, default: 'North' },
        _dbKey:               { type: 'int',    required: false, default: 1 },
        ..._auditFields,
      },
    },

    // ── Product Sale ──────────────────────────────────────
    productSales: {
      table:    'productSales',
      pk:       'lProductSaleKey',
      display:  'sInvoiceNumber',
      fk:       {
        lClientKey: { table: 'clients', field: 'lClientKey', required: true },
      },
      required: ['lClientKey'],
      fields: {
        lProductSaleKey:    { type: 'int',    required: true,  default: null },
        lClientKey:         { type: 'int',    required: true,  default: null },
        lDepartmentKey:     { type: 'int',    required: false, default: null },
        sInvoiceNumber:     { type: 'string', required: false, default: '' },
        sPONumber:          { type: 'string', required: false, default: '' },
        sDescription:       { type: 'string', required: false, default: '' },
        sClientName:        { type: 'string', required: false, default: '' },
        dtSaleDate:         { type: 'date',   required: false, default: null },
        dtShipped:          { type: 'date',   required: false, default: null },
        nTotal:             { type: 'float',  required: false, default: 0 },
        sStatus:            { type: 'string', required: false, default: 'Open' },
        lServiceLocationKey:{ type: 'int',    required: false, default: 1 },
        _region:            { type: 'string', required: false, default: 'North' },
        _dbKey:             { type: 'int',    required: false, default: 1 },
        ..._auditFields,
      },
    },

    // ── Product Sale Item ─────────────────────────────────
    productSaleItems: {
      table:    'productSaleItems',
      pk:       'lProductSaleInventoryKey',
      display:  'sDescription',
      fk:       {
        lProductSaleKey: { table: 'productSales', field: 'lProductSaleKey', required: true },
        lInventoryKey:   { table: 'inventory',    field: 'lInventoryKey' },
      },
      required: ['lProductSaleKey'],
      fields: {
        lProductSaleInventoryKey: { type: 'int',   required: true,  default: null },
        lProductSaleKey:          { type: 'int',   required: true,  default: null },
        lInventoryKey:            { type: 'int',   required: false, default: null },
        sDescription:             { type: 'string',required: false, default: '' },
        sItemCode:                { type: 'string',required: false, default: '' },
        nQty:                     { type: 'int',   required: false, default: 1 },
        nUnitPrice:               { type: 'float', required: false, default: 0 },
        nExtPrice:                { type: 'float', required: false, default: 0 },
        ..._auditFields,
      },
    },

    // ── Inventory ─────────────────────────────────────────
    inventory: {
      table:    'inventory',
      pk:       'lInventoryKey',
      display:  'sDescription',
      fk:       {
        lSupplierKey: { table: 'suppliers', field: 'lSupplierKey' },
      },
      required: ['sDescription'],
      fields: {
        lInventoryKey:        { type: 'int',    required: true,  default: null },
        lSupplierKey:         { type: 'int',    required: false, default: null },
        sDescription:         { type: 'string', required: true,  default: '' },
        sItemCode:            { type: 'string', required: false, default: '' },
        sPartNumber:          { type: 'string', required: false, default: '' },
        sManufacturer:        { type: 'string', required: false, default: '' },
        sSupplierName:        { type: 'string', required: false, default: '' },
        nQtyOnHand:           { type: 'int',    required: false, default: 0 },
        nReorderPoint:        { type: 'int',    required: false, default: 0 },
        nUnitCost:            { type: 'float',  required: false, default: 0 },
        nSellPrice:           { type: 'float',  required: false, default: 0 },
        bActive:              { type: 'bool',   required: false, default: true },
        sRigidOrFlexible:     { type: 'string', required: false, default: 'F' },
        ..._auditFields,
      },
    },

    // ── Invoice ───────────────────────────────────────────
    invoices: {
      table:    'invoices',
      pk:       'lInvoiceKey',
      display:  'sInvoiceNumber',
      fk:       {
        lClientKey: { table: 'clients', field: 'lClientKey', required: true },
      },
      required: ['lClientKey'],
      fields: {
        lInvoiceKey:        { type: 'int',    required: true,  default: null },
        lClientKey:         { type: 'int',    required: true,  default: null },
        lRepairKey:         { type: 'int',    required: false, default: null },
        lContractKey:       { type: 'int',    required: false, default: null },
        sInvoiceNumber:     { type: 'string', required: false, default: '' },
        sClientName:        { type: 'string', required: false, default: '' },
        dtInvoiceDate:      { type: 'date',   required: false, default: null },
        dtDueDate:          { type: 'date',   required: false, default: null },
        nAmount:            { type: 'float',  required: false, default: 0 },
        nBalance:           { type: 'float',  required: false, default: 0 },
        sStatus:            { type: 'string', required: false, default: 'Open' },
        bPaid:              { type: 'bool',   required: false, default: false },
        lServiceLocationKey:{ type: 'int',    required: false, default: 1 },
        _region:            { type: 'string', required: false, default: 'North' },
        ..._auditFields,
      },
    },

    // ── Flag ──────────────────────────────────────────────
    flags: {
      table:    'flags',
      pk:       'lFlagKey',
      display:  'sFlagDescription',
      fk:       {
        lOwnerKey: { table: null, field: 'lOwnerKey' }, // polymorphic — client, dept, repair
      },
      required: ['lOwnerKey', 'sFlagDescription'],
      fields: {
        lFlagKey:         { type: 'int',    required: true,  default: null },
        lOwnerKey:        { type: 'int',    required: true,  default: null },
        lFlagTypeKey:     { type: 'int',    required: false, default: null },
        sFlagDescription: { type: 'string', required: true,  default: '' },
        sFlagType:        { type: 'string', required: false, default: '' },
        dtFlagDate:       { type: 'date',   required: false, default: null },
        bActive:          { type: 'bool',   required: false, default: true },
        ..._auditFields,
      },
    },

    // ── Document ──────────────────────────────────────────
    documents: {
      table:    'documents',
      pk:       'lDocumentKey',
      display:  'sDocumentFileName',
      fk:       {
        lOwnerKey: { table: null, field: 'lOwnerKey' }, // polymorphic
      },
      required: ['lOwnerKey', 'sDocumentFileName'],
      fields: {
        lDocumentKey:           { type: 'int',    required: true,  default: null },
        lOwnerKey:              { type: 'int',    required: true,  default: null },
        lDocumentCategoryKey:   { type: 'int',    required: false, default: null },
        sDocumentFileName:      { type: 'string', required: true,  default: '' },
        sDocumentDescription:   { type: 'string', required: false, default: '' },
        dtUploaded:             { type: 'date',   required: false, default: null },
        ..._auditFields,
      },
    },
  };

  // ── Public helpers ─────────────────────────────────────

  // Get required fields for an entity
  function getRequired(entityName) {
    return schemas[entityName]?.required || [];
  }

  // Get FK relationships for an entity
  function getFKs(entityName) {
    return schemas[entityName]?.fk || {};
  }

  // Get field default values for building new records
  function getDefaults(entityName) {
    const schema = schemas[entityName];
    if (!schema) return {};
    const defaults = {};
    for (const [field, def] of Object.entries(schema.fields)) {
      if (def.default !== null) defaults[field] = def.default;
    }
    return defaults;
  }

  // Build a new empty record with all defaults applied
  function newRecord(entityName) {
    return getDefaults(entityName);
  }

  // List all known entity names
  function getEntityNames() {
    return Object.keys(schemas);
  }

  return {
    ...schemas,
    getRequired,
    getFKs,
    getDefaults,
    newRecord,
    getEntityNames,
    // Expose enum values for external use
    enums: {
      REPAIR_STATUSES,
      CONTRACT_TYPES,
      SCOPE_TYPES,
    },
  };
})();

// ── Node.js export support (for server-side use) ─────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EntitySchema;
}
