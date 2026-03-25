/* ============================================================
   parent-groups.js  —  Three-tier catalog hierarchy
   Parent Group → Instrument Group → Instrument Type (category)
   ============================================================ */

// ── Parent Groups (7) ──────────────────────────────────────────
var PARENT_GROUPS = [
  { key: 1, code: 'CAM',   name: 'Camera & Video',       sortOrder: 1, badge: 'C' },
  { key: 2, code: 'CART',  name: 'EndoCarts',             sortOrder: 2, badge: 'E' },
  { key: 3, code: 'FLEX',  name: 'Flexible Endoscopes',   sortOrder: 3, badge: 'F' },
  { key: 4, code: 'INST',  name: 'Instruments',           sortOrder: 4, badge: 'I' },
  { key: 5, code: 'RIGID', name: 'Rigid Scopes',          sortOrder: 5, badge: 'R' },
  { key: 6, code: 'SALE',  name: 'Product Sales',         sortOrder: 6, badge: 'S' },
  { key: 7, code: 'SITE',  name: 'Site Service',          sortOrder: 7, badge: 'V' }
];

// ── Instrument Groups (17, all under INST parent) ──────────────
var INSTRUMENT_GROUPS = [
  { key: 1,  code: 'ARTH', name: 'Arthroscopy',              parentCode: 'INST', sortOrder: 1 },
  { key: 2,  code: 'BONE', name: 'Bone & Orthopedic',        parentCode: 'INST', sortOrder: 2 },
  { key: 3,  code: 'CLMP', name: 'Clamps & Hemostats',       parentCode: 'INST', sortOrder: 3 },
  { key: 4,  code: 'CNTR', name: 'Containers & Trays',       parentCode: 'INST', sortOrder: 4 },
  { key: 5,  code: 'CURE', name: 'Curettes & Elevators',     parentCode: 'INST', sortOrder: 5 },
  { key: 6,  code: 'DENT', name: 'Dental',                   parentCode: 'INST', sortOrder: 6 },
  { key: 7,  code: 'ELEC', name: 'Electrosurgical',          parentCode: 'INST', sortOrder: 7 },
  { key: 8,  code: 'FORC', name: 'Forceps & Graspers',       parentCode: 'INST', sortOrder: 8 },
  { key: 9,  code: 'LAP',  name: 'Laparoscopic',             parentCode: 'INST', sortOrder: 9 },
  { key: 10, code: 'MICR', name: 'Microsurgical',            parentCode: 'INST', sortOrder: 10 },
  { key: 11, code: 'NEED', name: 'Needle Holders & Drivers', parentCode: 'INST', sortOrder: 11 },
  { key: 12, code: 'OPHT', name: 'Ophthalmic',               parentCode: 'INST', sortOrder: 12 },
  { key: 13, code: 'PWR',  name: 'Power Tools',              parentCode: 'INST', sortOrder: 13 },
  { key: 14, code: 'RETR', name: 'Retractors & Speculums',   parentCode: 'INST', sortOrder: 14 },
  { key: 15, code: 'RONG', name: 'Rongeurs & Punches',       parentCode: 'INST', sortOrder: 15 },
  { key: 16, code: 'SCIS', name: 'Scissors',                 parentCode: 'INST', sortOrder: 16 },
  { key: 17, code: 'SPEC', name: 'Specialty & Misc',         parentCode: 'INST', sortOrder: 17 }
];

// ── sInstrumentType char → parent group code ───────────────────
var INSTRUMENT_TYPE_TO_PARENT = {
  'F': 'FLEX',
  'R': 'RIGID',
  'C': 'CAM',
  'I': 'INST'
};

// ── IC_CATEGORIES name → instrument group code ─────────────────
// Only applies when parent = INST.  Default = SPEC.
var CATEGORY_GROUP_MAP = {
  // Arthroscopy (ARTH)
  'Atraumatic Lap Grasper w/ Ratchet':        'ARTH',
  'Shaver':                                    'ARTH',

  // Bone & Orthopedic (BONE)
  'Amputation Knife':                          'BONE',
  'Bone Tamp':                                 'BONE',
  'Distractor':                                'BONE',
  'Hammer':                                    'BONE',
  'Impactor/Extractor':                        'BONE',
  'Mallet':                                    'BONE',
  'Osteotome':                                 'BONE',
  'Tap':                                       'BONE',
  'Tensioner':                                 'BONE',
  'Tensor/Spreader':                           'BONE',

  // Clamps & Hemostats (CLMP)
  'Clamp':                                     'CLMP',
  'Closure Device':                            'CLMP',
  'Facial Closure Device':                     'CLMP',
  'Holder/Clamp':                              'CLMP',
  'Skin Hook':                                 'CLMP',

  // Containers & Trays (CNTR)
  'Containers/Trays':                          'CNTR',
  'Sterile Box':                               'CNTR',
  'Tray':                                      'CNTR',
  'Tray Refurbishing':                         'CNTR',

  // Curettes & Elevators (CURE)
  'Curette':                                   'CURE',
  'Elevator':                                  'CURE',

  // Dental (DENT)
  'Dental':                                    'DENT',

  // Electrosurgical (ELEC)
  'Bipolar':                                   'ELEC',
  'Electrode':                                 'ELEC',
  'Insulation + Continuity Tester':            'ELEC',
  'Monopolar Cable':                           'ELEC',

  // Forceps & Graspers (FORC)
  'Flexible Micro Grasper':                    'FORC',
  'Flexible Micro Pine Tree Grasping Forcep':  'FORC',
  'Forceps':                                   'FORC',
  'Graspers':                                  'FORC',
  'Rotating Debakey Lap Forcep':               'FORC',
  'Rotating Maryland Lap Forcep':              'FORC',
  'Thumb Forceps':                             'FORC',
  'Vascular Instruments':                      'FORC',

  // Laparoscopic (LAP)
  'Cannula':                                   'LAP',
  'Clip Applier':                              'LAP',
  'End Effector':                              'LAP',
  'Injection Needle':                          'LAP',
  'Lap Grasper':                               'LAP',
  'Lap Handle w/ Shaft':                       'LAP',
  'Laparoscopic':                              'LAP',
  'Shaft':                                     'LAP',
  'Stopcock':                                  'LAP',
  'Trocar':                                    'LAP',
  'Trumpet Valve':                             'LAP',
  'Working Element':                           'LAP',

  // Microsurgical (MICR)
  'Flexible Micro Scissor':                    'MICR',
  'Micro Instruments':                         'MICR',
  'Micro Knife':                               'MICR',
  'Semi-Rigid Micro Grasping Forcep':          'MICR',

  // Needle Holders & Drivers (NEED)
  'Driver':                                    'NEED',
  'Needle':                                    'NEED',
  'Needle Holder':                             'NEED',
  'Wire Cutter':                               'NEED',

  // Ophthalmic (OPHT)
  'Opthalmic Instruments':                     'OPHT',
  'Phaco Handpiece':                           'OPHT',

  // Power Tools (PWR)
  'Autopsy Saw':                               'PWR',
  'Battery Housing':                           'PWR',
  'Drill Guide':                               'PWR',
  'Footswitch':                                'PWR',
  'Handpiece':                                 'PWR',
  'Oscillating Saw':                           'PWR',
  'Power Source':                              'PWR',
  'Reciprocating Saw':                         'PWR',
  'Rotary Drill':                              'PWR',
  'Rotary Saw':                                'PWR',
  'Sagittal Saw':                              'PWR',
  'Shockpulse Handpiece':                      'PWR',
  'Skin Mesh Grafter':                         'PWR',

  // Retractors & Speculums (RETR)
  'Arm':                                       'RETR',
  'Femoral Hook Support':                      'RETR',
  'Mouth Gag':                                 'RETR',
  'Retractors / Speculum':                     'RETR',
  'Shoulder Bar':                              'RETR',
  'Speculum':                                  'RETR',
  'Stirrup':                                   'RETR',

  // Rongeurs & Punches (RONG)
  'Bolt Cutter':                               'RONG',
  'Nail Nippers':                              'RONG',
  'Pin Cutter':                                'RONG',
  'Pliers':                                    'RONG',
  'Punch':                                     'RONG',
  'Rongeur':                                   'RONG',
  'Rongerurs & Forceps':                       'RONG',
  'Rongeurs & Forceps':                        'RONG',

  // Scissors (SCIS)
  'Scissors':                                  'SCIS',
  'Suture Cutter':                             'SCIS',
  'Suture Passer':                             'SCIS',

  // Specialty & Misc (SPEC) — everything else defaults here
  // Explicitly mapped for clarity:
  'Accessory':                                 'SPEC',
  'Adapter':                                   'SPEC',
  'Air Hose':                                  'SPEC',
  'Attachment':                                'SPEC',
  'Biopsy':                                    'SPEC',
  'Blade':                                     'SPEC',
  'Borescope':                                 'SPEC',
  'Bridge':                                    'SPEC',
  'Bridge/Cannula/Sheath':                     'SPEC',
  'Bulb':                                      'SPEC',
  'Bur Guard':                                 'SPEC',
  'Cable':                                     'SPEC',
  'Chuck':                                     'SPEC',
  'Collett':                                   'SPEC',
  'Connector':                                 'SPEC',
  'Converter':                                 'SPEC',
  'Descaling/Cleaning':                        'SPEC',
  'Diamond':                                   'SPEC',
  'Dilator':                                   'SPEC',
  'Dispenser':                                 'SPEC',
  'Distending Diverticuloscope':               'SPEC',
  'Diverticuloscope':                          'SPEC',
  'ENT Instruments':                           'SPEC',
  'Esophagoscope':                             'SPEC',
  'Gauge':                                     'SPEC',
  'General':                                   'SPEC',
  'Hand Plate':                                'SPEC',
  'Handle':                                    'SPEC',
  'Hook':                                      'SPEC',
  'Inserts':                                   'SPEC',
  'Knife':                                     'SPEC',
  'Laryngoscope':                              'SPEC',
  'Laser':                                     'SPEC',
  'Lens Holder':                               'SPEC',
  'Manipulator':                               'SPEC',
  'Mount':                                     'SPEC',
  'Multibrider':                               'SPEC',
  'Obturator':                                 'SPEC',
  'Probe':                                     'SPEC',
  'Pump':                                      'SPEC',
  'Restoration Modular Piece':                 'SPEC',
  'Retainer':                                  'SPEC',
  'Sheath':                                    'SPEC',
  'Speciality Instruments':                    'SPEC',
  'Suction':                                   'SPEC',
  'Switch':                                    'SPEC',
  'Tenaculum':                                 'SPEC',
  'Transmitter':                               'SPEC',
  'Trinkle':                                   'SPEC',
  'Tube':                                      'SPEC',
  'Tungsten Carbide Instruments':              'SPEC',
  'Tweezers':                                  'SPEC',
  'Water Cap':                                 'SPEC',
  'Wrench':                                    'SPEC',

  // Parent-level overrides (underscore prefix = reclassify parent, not inst group)
  'Transport Cart':                            '_CART',
  'Van Service':                               '_SITE',

  // Camera/Video items that appear in IC_CATEGORIES with I type
  'Light Cord':                                '_CAM',
  'Light Source':                               '_CAM',
  'Lighthead':                                 '_CAM',
  'Monitor':                                   '_CAM',
  'Processor':                                 '_CAM',

  // Power Tools
  'Dermatome':                                 'PWR',
  'Irrigation Pump':                           'PWR'
};

// ── tblScopeTypeCategories → parent group overrides ────────────
// Some tblScopeTypeCategories with sInstrumentType=F/R/C/I need
// special parent mapping (e.g., EndoCart Part → CART, Cart → CART)
var SCOPE_TYPE_CAT_PARENT_OVERRIDE = {
  'Cart':                'CART',
  'EndoCart Part':       'CART',
  'Flushing Pump':       'CART'
};

// ── WO prefix → parent group (for order-level classification) ──
// NR/SR = Repairs, NI/SI = Sales, NC/SC = Contracts,
// NK/SK = EndoCart, NV/SV = Van/Site Service
var WO_PREFIX_PARENT = {
  'NK': 'CART',
  'SK': 'CART',
  'NI': 'SALE',
  'SI': 'SALE',
  'NV': 'SITE',
  'SV': 'SITE'
};

// ── Helper Functions ───────────────────────────────────────────

/** Get parent group code from sInstrumentType char */
function getParentGroup(sInstrumentType) {
  return INSTRUMENT_TYPE_TO_PARENT[sInstrumentType] || 'INST';
}

/** Get parent group object by code */
function getParentGroupByCode(code) {
  return PARENT_GROUPS.find(function(g) { return g.code === code; }) || null;
}

/** Get instrument group code from IC_CATEGORIES name.
    Returns null for non-INST parent items.
    Returns 'SPEC' as default for unrecognized INST items. */
function getInstrumentGroup(categoryName) {
  if (!categoryName) return 'SPEC';
  var mapped = CATEGORY_GROUP_MAP[categoryName];
  // Underscore-prefixed codes are parent overrides, not instrument groups
  if (mapped && mapped.charAt(0) === '_') return null;
  return mapped || 'SPEC';
}

/** Get instrument group object by code */
function getInstrumentGroupByCode(code) {
  return INSTRUMENT_GROUPS.find(function(g) { return g.code === code; }) || null;
}

/** Get full 3-tier hierarchy for an item.
    @param {string} sInstrumentType - F/R/C/I char
    @param {string} categoryName - from IC_CATEGORIES or tblScopeTypeCategories
    @returns {{parentCode, parentName, groupCode, groupName}} */
function getFullHierarchy(sInstrumentType, categoryName) {
  // Check scope type category parent overrides first
  var override = categoryName && SCOPE_TYPE_CAT_PARENT_OVERRIDE[categoryName];
  var parentCode = override || getParentGroup(sInstrumentType);
  var parent = getParentGroupByCode(parentCode);

  // Check if category maps to a different parent via _ prefix
  var mapped = categoryName && CATEGORY_GROUP_MAP[categoryName];
  if (mapped && mapped.charAt(0) === '_') {
    parentCode = mapped.substring(1);
    parent = getParentGroupByCode(parentCode);
  }

  var groupCode = null, groupName = null;
  if (parentCode === 'INST') {
    groupCode = getInstrumentGroup(categoryName);
    var grp = getInstrumentGroupByCode(groupCode);
    groupName = grp ? grp.name : 'Specialty & Misc';
  }

  return {
    parentCode:  parentCode,
    parentName:  parent ? parent.name : parentCode,
    groupCode:   groupCode,
    groupName:   groupName
  };
}
