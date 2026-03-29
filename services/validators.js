// ═══════════════════════════════════════════════════════
//  TSI Validators — Entity validation for service layer
//
//  Each validate* function returns:
//    { valid: bool, errors: string[] }
//
//  Validates: required fields, FK references, type
//  checks, and business rules.
//
//  Dependencies:
//    - services/entity-schema.js (EntitySchema global)
//    - mock-db.js (MockDB global) — for FK validation
// ═══════════════════════════════════════════════════════

const Validators = (() => {
  'use strict';

  // ── Low-level helpers ─────────────────────────────────

  function result(errors) {
    return { valid: errors.length === 0, errors };
  }

  function isEmpty(val) {
    return val === null || val === undefined || val === '';
  }

  function isDate(val) {
    if (!val) return false;
    const d = new Date(val);
    return !isNaN(d.getTime());
  }

  function isPositiveNumber(val) {
    return typeof val === 'number' && !isNaN(val) && val >= 0;
  }

  function dbAvailable() {
    return typeof MockDB !== 'undefined' && MockDB.getByKey;
  }

  // ── Generic required-field check ─────────────────────
  function checkRequired(data, schema, errors) {
    for (const field of schema.required) {
      if (isEmpty(data[field])) {
        errors.push(`Required field missing: ${field}`);
      }
    }
  }

  // ── Generic FK check ──────────────────────────────────
  function checkFK(data, schema, errors) {
    if (!dbAvailable()) return; // skip if no DB (server-side or test env without MockDB)
    for (const [field, fkDef] of Object.entries(schema.fk || {})) {
      if (!fkDef.table) continue; // polymorphic FK — can't validate without context
      const val = data[field];
      if (isEmpty(val)) {
        if (fkDef.required) {
          errors.push(`FK required: ${field} must reference a valid ${fkDef.table} record`);
        }
        continue;
      }
      const ref = MockDB.getByKey(fkDef.table, val);
      if (!ref) {
        errors.push(`FK invalid: ${field}=${val} — no matching ${fkDef.table} record`);
      }
    }
  }

  // ── Generic field type check ──────────────────────────
  function checkTypes(data, schema, errors) {
    for (const [field, def] of Object.entries(schema.fields || {})) {
      const val = data[field];
      if (isEmpty(val)) continue; // required check already covers missing required fields
      switch (def.type) {
        case 'int':
          if (!Number.isInteger(val)) errors.push(`${field} must be an integer`);
          break;
        case 'float':
          if (typeof val !== 'number' || isNaN(val)) errors.push(`${field} must be a number`);
          break;
        case 'bool':
          if (typeof val !== 'boolean') errors.push(`${field} must be a boolean`);
          break;
        case 'date':
          if (!isDate(val)) errors.push(`${field} must be a valid date string`);
          break;
        case 'enum':
          if (def.values && !def.values.includes(val)) {
            errors.push(`${field} must be one of: ${def.values.join(', ')}`);
          }
          break;
      }
    }
  }

  // ══════════════════════════════════════════════════════
  //  Entity Validators
  // ══════════════════════════════════════════════════════

  function validateClient(data) {
    const errors = [];
    const schema = EntitySchema.clients;
    checkRequired(data, schema, errors);
    checkFK(data, schema, errors);
    checkTypes(data, schema, errors);

    // Business rule: at least one address field required for billing
    if (!isEmpty(data.lClientKey) && isEmpty(data.sMailAddr1) && isEmpty(data.sBillAddr1)) {
      errors.push('Client must have at least one address (mail or bill)');
    }

    // Business rule: sGPID must be unique if provided (check against existing)
    if (!isEmpty(data.sGPID) && dbAvailable()) {
      const existing = MockDB.getFiltered('clients', c =>
        c.sGPID === data.sGPID && c.lClientKey !== data.lClientKey
      );
      if (existing.length > 0) {
        errors.push(`sGPID "${data.sGPID}" is already in use by another client`);
      }
    }

    return result(errors);
  }

  function validateDepartment(data) {
    const errors = [];
    const schema = EntitySchema.departments;
    checkRequired(data, schema, errors);
    checkFK(data, schema, errors);
    checkTypes(data, schema, errors);

    // Business rule: department names must be unique within a client
    if (!isEmpty(data.lClientKey) && !isEmpty(data.sDepartmentName) && dbAvailable()) {
      const existing = MockDB.getFiltered('departments', d =>
        d.lClientKey === data.lClientKey &&
        d.sDepartmentName === data.sDepartmentName &&
        d.lDepartmentKey !== data.lDepartmentKey
      );
      if (existing.length > 0) {
        errors.push(`Department name "${data.sDepartmentName}" already exists for this client`);
      }
    }

    return result(errors);
  }

  function validateScope(data) {
    const errors = [];
    const schema = EntitySchema.scopes;
    checkRequired(data, schema, errors);
    checkFK(data, schema, errors);
    checkTypes(data, schema, errors);

    // Business rule: serial must be non-empty
    if (!isEmpty(data.sSerial) && data.sSerial.trim().length < 2) {
      errors.push('Serial number must be at least 2 characters');
    }

    // Business rule: serial must be unique within a department
    if (!isEmpty(data.lDepartmentKey) && !isEmpty(data.sSerial) && dbAvailable()) {
      const existing = MockDB.getFiltered('scopes', s =>
        s.lDepartmentKey === data.lDepartmentKey &&
        s.sSerial === data.sSerial &&
        s.lScopeKey !== data.lScopeKey
      );
      if (existing.length > 0) {
        errors.push(`Serial "${data.sSerial}" already exists in this department`);
      }
    }

    return result(errors);
  }

  function validateRepair(data) {
    const errors = [];
    const schema = EntitySchema.repairs;
    checkRequired(data, schema, errors);
    checkFK(data, schema, errors);
    checkTypes(data, schema, errors);

    // Business rule: WO number must match prefix convention
    if (!isEmpty(data.sWorkOrderNumber)) {
      const validPrefixes = ['NR', 'SR', 'NI', 'SI', 'NC', 'SC', 'NK', 'SK', 'NV', 'SV'];
      const prefix = data.sWorkOrderNumber.substring(0, 2).toUpperCase();
      if (!validPrefixes.includes(prefix)) {
        errors.push(`WO number must start with a valid prefix (${validPrefixes.join(', ')})`);
      }
    }

    // Business rule: dtShipped cannot be before dtReceived
    if (!isEmpty(data.dtReceived) && !isEmpty(data.dtShipped)) {
      if (new Date(data.dtShipped) < new Date(data.dtReceived)) {
        errors.push('dtShipped cannot be before dtReceived');
      }
    }

    // Business rule: dtPromised cannot be before dtReceived
    if (!isEmpty(data.dtReceived) && !isEmpty(data.dtPromised)) {
      if (new Date(data.dtPromised) < new Date(data.dtReceived)) {
        errors.push('dtPromised cannot be before dtReceived');
      }
    }

    // Business rule: only one open repair per scope at a time
    if (!isEmpty(data.lScopeKey) && dbAvailable()) {
      const openStatuses = ['Received', 'D&I', '40-Day', 'In Repair', 'QC', 'Pending Ship', 'On Hold'];
      const existingOpen = MockDB.getFiltered('repairs', r =>
        r.lScopeKey === data.lScopeKey &&
        openStatuses.includes(r.sRepairStatus) &&
        r.lRepairKey !== data.lRepairKey
      );
      if (existingOpen.length > 0) {
        errors.push(`Scope ${data.lScopeKey} already has an open repair (WO: ${existingOpen[0].sWorkOrderNumber})`);
      }
    }

    return result(errors);
  }

  function validateRepairDetail(data) {
    const errors = [];
    const schema = EntitySchema.repairDetails;
    checkRequired(data, schema, errors);
    checkFK(data, schema, errors);
    checkTypes(data, schema, errors);

    if (!isEmpty(data.nQty) && data.nQty <= 0) {
      errors.push('nQty must be greater than 0');
    }

    if (!isEmpty(data.nUnitPrice) && data.nUnitPrice < 0) {
      errors.push('nUnitPrice cannot be negative');
    }

    // Computed field consistency check
    if (!isEmpty(data.nQty) && !isEmpty(data.nUnitPrice) && !isEmpty(data.nExtPrice)) {
      const expected = Math.round(data.nQty * data.nUnitPrice * 100) / 100;
      if (Math.abs(data.nExtPrice - expected) > 0.01) {
        errors.push(`nExtPrice (${data.nExtPrice}) does not match nQty × nUnitPrice (${expected})`);
      }
    }

    return result(errors);
  }

  function validateContract(data) {
    const errors = [];
    const schema = EntitySchema.contracts;
    checkRequired(data, schema, errors);
    checkFK(data, schema, errors);
    checkTypes(data, schema, errors);

    // Business rule: contract number must be unique
    if (!isEmpty(data.sContractNumber) && dbAvailable()) {
      const existing = MockDB.getFiltered('contracts', c =>
        c.sContractNumber === data.sContractNumber &&
        c.lContractKey !== data.lContractKey
      );
      if (existing.length > 0) {
        errors.push(`Contract number "${data.sContractNumber}" already exists`);
      }
    }

    // Business rule: end date must be after start date
    if (!isEmpty(data.dtStartDate) && !isEmpty(data.dtEndDate)) {
      if (new Date(data.dtEndDate) <= new Date(data.dtStartDate)) {
        errors.push('dtEndDate must be after dtStartDate');
      }
    }

    // Business rule: monthly fee must be non-negative for capitated/PSA contracts
    if (!isEmpty(data.nMonthlyFee) && data.nMonthlyFee < 0) {
      errors.push('nMonthlyFee cannot be negative');
    }

    // Business rule: lContractKey_Renewed is never populated — flag if someone tries
    if (!isEmpty(data.lContractKey_Renewed)) {
      errors.push('lContractKey_Renewed is not used — renewal tracking must be built separately');
    }

    return result(errors);
  }

  function validateProductSale(data) {
    const errors = [];
    const schema = EntitySchema.productSales;
    checkRequired(data, schema, errors);
    checkFK(data, schema, errors);
    checkTypes(data, schema, errors);

    if (!isEmpty(data.dtShipped) && !isEmpty(data.dtSaleDate)) {
      if (new Date(data.dtShipped) < new Date(data.dtSaleDate)) {
        errors.push('dtShipped cannot be before dtSaleDate');
      }
    }

    return result(errors);
  }

  function validateInventoryItem(data) {
    const errors = [];
    const schema = EntitySchema.inventory;
    checkRequired(data, schema, errors);
    checkFK(data, schema, errors);
    checkTypes(data, schema, errors);

    if (!isEmpty(data.nQtyOnHand) && data.nQtyOnHand < 0) {
      errors.push('nQtyOnHand cannot be negative');
    }

    if (!isEmpty(data.nUnitCost) && data.nUnitCost < 0) {
      errors.push('nUnitCost cannot be negative');
    }

    if (!isEmpty(data.nSellPrice) && !isEmpty(data.nUnitCost)) {
      if (data.nSellPrice < data.nUnitCost) {
        // This is a warning, not a hard error — some items may be sold at cost
        // errors.push('nSellPrice is below nUnitCost');
      }
    }

    return result(errors);
  }

  // ── Repair status transition validation ───────────────
  // Enforces the allowed repair lifecycle flow
  const STATUS_TRANSITIONS = {
    'Received':     ['D&I', 'On Hold', 'Cancelled'],
    'D&I':          ['40-Day', 'In Repair', 'On Hold', 'Cancelled'],
    '40-Day':       ['In Repair', 'On Hold', 'Cancelled'],
    'In Repair':    ['QC', 'On Hold', 'Cancelled'],
    'QC':           ['Pending Ship', 'In Repair', 'On Hold'],
    'Pending Ship': ['Shipped'],
    'Shipped':      ['Completed'],
    'Completed':    [], // terminal
    'On Hold':      ['Received', 'D&I', '40-Day', 'In Repair', 'QC', 'Cancelled'],
    'Cancelled':    [], // terminal
  };

  function validateStatusTransition(fromStatus, toStatus) {
    const errors = [];
    const allowed = STATUS_TRANSITIONS[fromStatus];
    if (!allowed) {
      errors.push(`Unknown current status: ${fromStatus}`);
      return result(errors);
    }
    if (!allowed.includes(toStatus)) {
      errors.push(`Invalid transition: ${fromStatus} → ${toStatus}. Allowed: ${allowed.join(', ') || 'none (terminal)'}`);
    }
    return result(errors);
  }

  // ── Batch validation helper ───────────────────────────
  function validateAll(entityName, records) {
    const validators = {
      clients:        validateClient,
      departments:    validateDepartment,
      scopes:         validateScope,
      repairs:        validateRepair,
      repairDetails:  validateRepairDetail,
      contracts:      validateContract,
      productSales:   validateProductSale,
      inventory:      validateInventoryItem,
    };

    const fn = validators[entityName];
    if (!fn) return { valid: false, errors: [`No validator defined for entity: ${entityName}`] };

    const results = records.map((record, idx) => {
      const r = fn(record);
      return { idx, ...r };
    });

    const allValid = results.every(r => r.valid);
    const allErrors = results.filter(r => !r.valid).flatMap(r =>
      r.errors.map(e => `Record[${r.idx}]: ${e}`)
    );

    return { valid: allValid, errors: allErrors, results };
  }

  return {
    validateClient,
    validateDepartment,
    validateScope,
    validateRepair,
    validateRepairDetail,
    validateContract,
    validateProductSale,
    validateInventoryItem,
    validateStatusTransition,
    validateAll,
    STATUS_TRANSITIONS,
  };
})();

// ── Node.js export support ────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validators;
}
