// ═══════════════════════════════════════════════════════
//  dept-enrichment.js — Department & Scope enrichment
//
//  Adds missing fields to department and scope records,
//  links orphaned repairs to departments, and assigns
//  realistic scope models by dept type.
//
//  Dependencies: mock-db.js (MockDB global)
// ═══════════════════════════════════════════════════════

const DeptEnrichment = (() => {
  'use strict';

  // ── Seeded PRNG (deterministic) ───────────────────────
  // Simple mulberry32 — same seed → same output every run
  function makePRNG(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  // ── Dept-type label catalog ───────────────────────────
  // Maps keyword patterns in sDepartmentName → display label
  const DEPT_TYPE_PATTERNS = [
    { pattern: /\bGI\b|gastro|endoscop/i,        label: 'GI Lab'    },
    { pattern: /operat|OR\b|surg/i,              label: 'OR'        },
    { pattern: /sterile|SPD|central.?supply/i,   label: 'SPD'       },
    { pattern: /cath\b|cardiac|cardio/i,         label: 'Cath Lab'  },
    { pattern: /ICU|intens|critical/i,           label: 'ICU'       },
    { pattern: /ER\b|emergency|trauma/i,         label: 'ER'        },
    { pattern: /pulmon|bronch|respir/i,          label: 'Pulmonology'},
    { pattern: /ENT|ear.*nose|rhinol/i,          label: 'ENT'       },
    { pattern: /urol/i,                          label: 'Urology'   },
    { pattern: /gyn|OB.GYN|obstet/i,            label: 'OB/GYN'    },
  ];

  const FALLBACK_DEPT_TYPES = ['GI Lab', 'OR', 'SPD', 'Endoscopy', 'Cath Lab', 'ICU', 'ER'];

  function inferDeptType(deptName, rng) {
    if (!deptName) return pick(rng, FALLBACK_DEPT_TYPES);
    for (const { pattern, label } of DEPT_TYPE_PATTERNS) {
      if (pattern.test(deptName)) return label;
    }
    return pick(rng, FALLBACK_DEPT_TYPES);
  }

  // ── Contact name pools ────────────────────────────────
  const FIRST_NAMES = ['Patricia', 'Sandra', 'Linda', 'Maria', 'Jennifer',
                       'Michael', 'Robert', 'David', 'James', 'Thomas'];
  const LAST_NAMES  = ['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
                       'Miller', 'Davis', 'Wilson', 'Martinez', 'Anderson'];

  function fakePhone(rng) {
    const area = randInt(rng, 200, 999);
    const mid  = randInt(rng, 200, 999);
    const end  = randInt(rng, 1000, 9999);
    return `(${area})${mid}-${end}`;
  }

  // ── Scope model catalogs by dept type ─────────────────
  const SCOPE_MODELS = {
    'GI Lab': [
      { sManufacturer: 'Olympus',         sModel: 'EVIS X1 CF-HQ290I',        sScopeTypeCategory: 'Colonoscope',   sRigidOrFlexible: 'F' },
      { sManufacturer: 'Olympus',         sModel: 'EVIS EXERA III CF-HQ190I',  sScopeTypeCategory: 'Colonoscope',   sRigidOrFlexible: 'F' },
      { sManufacturer: 'Olympus',         sModel: 'EVIS EXERA II CF-H180AI',   sScopeTypeCategory: 'Colonoscope',   sRigidOrFlexible: 'F' },
      { sManufacturer: 'Olympus',         sModel: 'EVIS X1 GIF-HQ290',         sScopeTypeCategory: 'Gastroscope',   sRigidOrFlexible: 'F' },
      { sManufacturer: 'Olympus',         sModel: 'EVIS EXERA III GIF-H190',   sScopeTypeCategory: 'Gastroscope',   sRigidOrFlexible: 'F' },
      { sManufacturer: 'Pentax Medical',  sModel: 'EC-3490TLi',                 sScopeTypeCategory: 'Colonoscope',   sRigidOrFlexible: 'F' },
      { sManufacturer: 'Fujifilm',        sModel: 'EC-760R-V/L',               sScopeTypeCategory: 'Colonoscope',   sRigidOrFlexible: 'F' },
    ],
    'Endoscopy': [
      { sManufacturer: 'Olympus',         sModel: 'EVIS X1 CF-HQ290I',        sScopeTypeCategory: 'Colonoscope',   sRigidOrFlexible: 'F' },
      { sManufacturer: 'Olympus',         sModel: 'EVIS EXERA III GIF-H190',   sScopeTypeCategory: 'Gastroscope',   sRigidOrFlexible: 'F' },
      { sManufacturer: 'Olympus',         sModel: 'CV-190 Processor',           sScopeTypeCategory: 'Processor',     sRigidOrFlexible: 'F' },
      { sManufacturer: 'Fujifilm',        sModel: 'EC-760R-V/L',               sScopeTypeCategory: 'Colonoscope',   sRigidOrFlexible: 'F' },
    ],
    'OR': [
      { sManufacturer: 'Stryker',         sModel: '1288 HD Camera',            sScopeTypeCategory: 'Camera Head',   sRigidOrFlexible: 'R' },
      { sManufacturer: 'Stryker',         sModel: '1488 4K Camera',            sScopeTypeCategory: 'Camera Head',   sRigidOrFlexible: 'R' },
      { sManufacturer: 'Olympus',         sModel: 'WA22011A 0° Laparoscope',   sScopeTypeCategory: 'Laparoscope',   sRigidOrFlexible: 'R' },
      { sManufacturer: 'Olympus',         sModel: 'WA22011A 30° Laparoscope',  sScopeTypeCategory: 'Laparoscope',   sRigidOrFlexible: 'R' },
      { sManufacturer: 'Karl Storz',      sModel: 'IMAGE1 S Camera',           sScopeTypeCategory: 'Camera Head',   sRigidOrFlexible: 'R' },
    ],
    'SPD': [
      { sManufacturer: 'Olympus',         sModel: 'EVIS X1 CF-HQ290I',        sScopeTypeCategory: 'Colonoscope',   sRigidOrFlexible: 'F' },
      { sManufacturer: 'Olympus',         sModel: 'WA22011A 0° Laparoscope',   sScopeTypeCategory: 'Laparoscope',   sRigidOrFlexible: 'R' },
      { sManufacturer: 'Stryker',         sModel: '1288 HD Camera',            sScopeTypeCategory: 'Camera Head',   sRigidOrFlexible: 'R' },
      { sManufacturer: 'Pentax Medical',  sModel: 'EB-1990i Bronchoscope',      sScopeTypeCategory: 'Bronchoscope',  sRigidOrFlexible: 'F' },
    ],
    'Cath Lab': [
      { sManufacturer: 'Olympus',         sModel: 'CF-HQ290I',                 sScopeTypeCategory: 'Colonoscope',   sRigidOrFlexible: 'F' },
      { sManufacturer: 'Karl Storz',      sModel: 'IMAGE1 S Camera',           sScopeTypeCategory: 'Camera Head',   sRigidOrFlexible: 'R' },
    ],
    'ICU': [
      { sManufacturer: 'Olympus',         sModel: 'BF-1TH190 Bronchoscope',    sScopeTypeCategory: 'Bronchoscope',  sRigidOrFlexible: 'F' },
      { sManufacturer: 'Pentax Medical',  sModel: 'EB-1990i Bronchoscope',      sScopeTypeCategory: 'Bronchoscope',  sRigidOrFlexible: 'F' },
    ],
    'ER': [
      { sManufacturer: 'Olympus',         sModel: 'BF-1TH190 Bronchoscope',    sScopeTypeCategory: 'Bronchoscope',  sRigidOrFlexible: 'F' },
      { sManufacturer: 'Karl Storz',      sModel: 'IMAGE1 S Camera',           sScopeTypeCategory: 'Camera Head',   sRigidOrFlexible: 'R' },
    ],
  };

  const GENERIC_MODELS = [
    { sManufacturer: 'Olympus',        sModel: 'EVIS EXERA III GIF-H190',  sScopeTypeCategory: 'Gastroscope',  sRigidOrFlexible: 'F' },
    { sManufacturer: 'Olympus',        sModel: 'EVIS X1 CF-HQ290I',       sScopeTypeCategory: 'Colonoscope',  sRigidOrFlexible: 'F' },
    { sManufacturer: 'Stryker',        sModel: '1288 HD Camera',           sScopeTypeCategory: 'Camera Head',  sRigidOrFlexible: 'R' },
  ];

  const GENERIC_MODEL_NAMES = new Set(['Unknown', 'Scope', '', null, undefined]);

  // ── Active tech keys pool (from real data) ────────────
  // These are lTechnicianKey values we know exist in the DB
  const TECH_POOL = [57, 58, 60, 62, 65, 67];

  // ── Service location map ──────────────────────────────
  const SVC_LOC_PREFIX = { 1: 'NR', 2: 'SR', 3: 'SR' }; // North=1, South=2, Florida=3

  // ═══════════════════════════════════════════════════════
  //  enrichDeptScopeModels(MockDB)
  //  Assigns realistic scope models where model is generic/missing.
  //  Reads dept type from the enriched sDeptTypeLabel field.
  // ═══════════════════════════════════════════════════════
  function enrichDeptScopeModels(MockDB) {
    if (!MockDB || !MockDB.getAll) {
      console.warn('[DeptEnrichment] MockDB not available');
      return;
    }

    const rng    = makePRNG(0xD37A10);   // fixed seed — deterministic
    const depts  = MockDB.getAll('departments');
    const scopes = MockDB.getAll('scopes');

    // Build dept key → dept-type-label map
    const deptTypeMap = new Map();
    for (const dept of depts) {
      const label = dept.sDeptTypeLabel || inferDeptType(dept.sDepartmentName, rng);
      deptTypeMap.set(dept.lDepartmentKey, label);
    }

    let enrichedCount = 0;
    const deptSet = new Set();

    for (const scope of scopes) {
      const isGeneric = GENERIC_MODEL_NAMES.has(scope.sModel) ||
                        GENERIC_MODEL_NAMES.has(scope.sScopeTypeDesc);

      if (!isGeneric) continue;

      const deptType = deptTypeMap.get(scope.lDepartmentKey) || 'GI Lab';
      const catalog  = SCOPE_MODELS[deptType] || GENERIC_MODELS;
      const template = pick(rng, catalog);

      MockDB.update('scopes', scope.lScopeKey, {
        sModel:              template.sModel,
        sScopeTypeDesc:      template.sModel,
        sManufacturer:       template.sManufacturer,
        sScopeTypeCategory:  template.sScopeTypeCategory,
        sRigidOrFlexible:    template.sRigidOrFlexible,
      });

      enrichedCount++;
      deptSet.add(scope.lDepartmentKey);
    }

    console.log(`[DeptEnrichment] Enriched ${enrichedCount} scopes across ${deptSet.size} departments`);
  }

  // ═══════════════════════════════════════════════════════
  //  enrichDepartments(MockDB)
  //  Adds sDeptTypeLabel, nBedCount, sPrimaryContact,
  //  sPrimaryPhone, sServiceLocation to dept records.
  // ═══════════════════════════════════════════════════════
  function enrichDepartments(MockDB) {
    if (!MockDB || !MockDB.getAll) {
      console.warn('[DeptEnrichment] MockDB not available');
      return;
    }

    const rng   = makePRNG(0xA8B2C1);
    const depts = MockDB.getAll('departments');
    let enriched = 0;

    for (const dept of depts) {
      const updates = {};

      if (!dept.sDeptTypeLabel) {
        updates.sDeptTypeLabel = inferDeptType(dept.sDepartmentName, rng);
      }

      if (!dept.nBedCount) {
        // Use existing lBedSize if populated, otherwise generate
        updates.nBedCount = dept.lBedSize && dept.lBedSize > 0
          ? dept.lBedSize
          : randInt(rng, 10, 120);
      }

      if (!dept.sPrimaryContact) {
        // Use existing contact fields if present
        if (dept.sContactFirst || dept.sContactLast) {
          updates.sPrimaryContact = `${(dept.sContactFirst || '').trim()} ${(dept.sContactLast || '').trim()}`.trim();
        } else {
          updates.sPrimaryContact = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
        }
      }

      if (!dept.sPrimaryPhone) {
        updates.sPrimaryPhone = dept.sContactPhoneVoice || fakePhone(rng);
      }

      if (!dept.sServiceLocation) {
        updates.sServiceLocation = SVC_LOC_PREFIX[dept.lServiceLocationKey] || 'NR';
      }

      if (Object.keys(updates).length > 0) {
        MockDB.update('departments', dept.lDepartmentKey, updates);
        enriched++;
      }
    }

    console.log(`[DeptEnrichment] Enriched ${enriched} department records`);
  }

  // ═══════════════════════════════════════════════════════
  //  linkRepairsToDepts(MockDB)
  //  Fixes orphaned repairs:
  //    - Derives lDepartmentKey from scope if missing
  //    - Assigns lTechnicianKey from pool if missing
  // ═══════════════════════════════════════════════════════
  function linkRepairsToDepts(MockDB) {
    if (!MockDB || !MockDB.getAll) {
      console.warn('[DeptEnrichment] MockDB not available');
      return;
    }

    const rng     = makePRNG(0xF1E2D3);
    const repairs = MockDB.getAll('repairs');
    const scopes  = MockDB.getAll('scopes');

    // Build scope key → dept key map
    const scopeDeptMap = new Map();
    for (const scope of scopes) {
      if (scope.lDepartmentKey) {
        scopeDeptMap.set(scope.lScopeKey, scope.lDepartmentKey);
      }
    }

    let linkedDept = 0;
    let linkedTech = 0;

    for (const repair of repairs) {
      const updates = {};

      if (!repair.lDepartmentKey && repair.lScopeKey) {
        const deptKey = scopeDeptMap.get(repair.lScopeKey);
        if (deptKey) {
          updates.lDepartmentKey = deptKey;
          linkedDept++;
        }
      }

      if (!repair.lTechnicianKey && !repair.lTechKey) {
        updates.lTechnicianKey = pick(rng, TECH_POOL);
        linkedTech++;
      }

      if (Object.keys(updates).length > 0) {
        MockDB.update('repairs', repair.lRepairKey, updates);
      }
    }

    console.log(`[DeptEnrichment] Linked ${linkedDept} repairs to departments, assigned tech to ${linkedTech} repairs`);
  }

  // ═══════════════════════════════════════════════════════
  //  runAll(MockDB)
  //  Convenience — run all enrichment passes in order.
  // ═══════════════════════════════════════════════════════
  function runAll(MockDB) {
    enrichDepartments(MockDB);
    enrichDeptScopeModels(MockDB);
    linkRepairsToDepts(MockDB);
  }

  return {
    enrichDepartments,
    enrichDeptScopeModels,
    linkRepairsToDepts,
    runAll,
  };
})();

// ── Node.js export support ────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeptEnrichment;
}
