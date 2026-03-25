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
  'Arthroscopy Grasper':                       'ARTH',
  'Arthroscopy Punch':                         'ARTH',
  'Arthroscopy Scissor':                       'ARTH',
  'Atraumatic Lap Grasper w/ Ratchet':        'ARTH',
  'Shaver':                                    'ARTH',

  // Bone & Orthopedic (BONE)
  'Amputation Knife':                          'BONE',
  'Awls':                                      'BONE',
  'Bone Tamp':                                 'BONE',
  'Distractor':                                'BONE',
  'File':                                      'BONE',
  'Hammer':                                    'BONE',
  'Impactor/Extractor':                        'BONE',
  'Mallet':                                    'BONE',
  'Osteotome':                                 'BONE',
  'Perforator':                                'BONE',
  'Rasp':                                      'BONE',
  'Reamers':                                   'BONE',
  'Tap':                                       'BONE',
  'Tendon':                                    'BONE',
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
  'Genesis Container':                         'CNTR',
  'Pans/Genesis':                              'CNTR',
  'Sterile Box':                               'CNTR',
  'Tray':                                      'CNTR',
  'Tray Refurbishing':                         'CNTR',

  // Curettes & Elevators (CURE)
  'Curette':                                   'CURE',
  'Elevator':                                  'CURE',
  'Pick':                                      'CURE',

  // Dental (DENT)
  'Dental':                                    'DENT',

  // Electrosurgical (ELEC)
  'Bipolar':                                   'ELEC',
  'Electrode':                                 'ELEC',
  'Insulation':                                'ELEC',
  'Insulation + Continuity Tester':            'ELEC',
  'Kleppinger':                                'ELEC',
  'Monopolar Cable':                           'ELEC',

  // Forceps & Graspers (FORC)
  'Biopsy Forceps':                            'FORC',
  'Flexible Micro Grasper':                    'FORC',
  'Flexible Micro Pine Tree Grasping Forcep':  'FORC',
  'Forceps':                                   'FORC',
  'Graspers':                                  'FORC',
  'Rotating Debakey Lap Forcep':               'FORC',
  'Rotating Maryland Lap Forcep':              'FORC',
  'Thumb Forceps':                             'FORC',
  'Tissue Grasper':                            'FORC',
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
  'Valve':                                     'LAP',
  'Verres Needle':                             'LAP',
  'Working Element':                           'LAP',

  // Microsurgical (MICR)
  'Flexible Micro Scissor':                    'MICR',
  'Micro Instruments':                         'MICR',
  'Micro Knife':                               'MICR',
  'Microsurgical Instrument':                  'MICR',
  'Semi-Rigid Micro Grasping Forcep':          'MICR',

  // Needle Holders & Drivers (NEED)
  'Aspirating Needle':                         'NEED',
  'Biopsy Needle':                             'NEED',
  'Driver':                                    'NEED',
  'Guide Wire':                                'NEED',
  'Needle':                                    'NEED',
  'Needle Driver':                             'NEED',
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
  'Saw Guide':                                 'PWR',
  'Shockpulse Handpiece':                      'PWR',
  'Skin Mesh Grafter':                         'PWR',

  // Retractors & Speculums (RETR)
  'Arm':                                       'RETR',
  'Bookwalter':                                'RETR',
  'Greenberg':                                 'RETR',
  'Femoral Hook Support':                      'RETR',
  'Mouth Gag':                                 'RETR',
  'Retractors / Speculum':                     'RETR',
  'Rod':                                       'RETR',
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
  'Cutting Instrument':                        'SCIS',
  'Iris Scissors':                             'SCIS',
  'Scissors':                                  'SCIS',
  'Suture Cutter':                             'SCIS',
  'Suture Passer':                             'SCIS',

  // Specialty & Misc (SPEC) — everything else defaults here
  // Explicitly mapped for clarity:
  'Accessory':                                 'SPEC',
  'Adapter':                                   'SPEC',
  'Adenotome':                                 'SPEC',
  'Air Hose':                                  'SPEC',
  'Attachment':                                'SPEC',
  'Biopsy':                                    'SPEC',
  'Blade':                                     'SPEC',
  'Bookwalter Blade':                          'SPEC',
  'Borescope':                                 'SPEC',
  'Box Lock':                                  'SPEC',
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
  'Finish':                                    'SPEC',
  'Gauge':                                     'SPEC',
  'General':                                   'SPEC',
  'Hand Plate':                                'SPEC',
  'Handle':                                    'SPEC',
  'Hook':                                      'SPEC',
  'Iglesias':                                  'SPEC',
  'Inserts':                                   'SPEC',
  'Knife':                                     'SPEC',
  'Knife Handle':                              'SPEC',
  'Laryngeal':                                 'SPEC',
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
  'Ring Handle':                               'SPEC',
  'Retainer':                                  'SPEC',
  'Scalpel Handle':                            'SPEC',
  'Sharpening':                                'SPEC',
  'Sheath':                                    'SPEC',
  'Speciality Instruments':                    'SPEC',
  'Spring':                                    'SPEC',
  'Stapler':                                   'SPEC',
  'Suction':                                   'SPEC',
  'Suction Instrument':                        'SPEC',
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

// ── Repair Types (standard repair descriptions per group) ─────
// Sourced from BPI competitor pricing taxonomy, March 2026.
// _PREFIX = parent-level (FLEX/RIGID/CAM); code = instrument group.
var REPAIR_TYPES = {
  // ── Flexible Endoscopes ─────────────────────────────────────
  _FLEX: [
    'Air/Water Channel Repair', 'Air/Water Valve Replacement',
    'Angle Assembly Replacement', 'Angulation Adjustment',
    'Angulation Cable Rebuild', 'Angulation Cable Replacement',
    'Angulation Lock Assembly', 'Bending Rubber Replacement',
    'Bending Section Replacement', 'Biopsy Channel Replacement',
    'Body Assembly Repair', 'Body Tube Replacement',
    'CCD Chip Replacement', 'Channel Assembly Replacement',
    'Cleaning - Standard', 'Cleaning - Ultrasonic',
    'Connector Assembly Repair', 'Control Body Repair',
    'Diagnostic Inspection', 'Disassemble & Inspect',
    'Distal End Repair', 'Distal Tip Replacement',
    'Drum Assembly Repair', 'Eyepiece Replacement',
    'Fiber Bundle Replacement', 'Fiber Optic Bundle Repair',
    'Forceps Elevator Repair', 'Handle Repair',
    'Insertion Tube Replacement', 'Instrument Channel Replacement',
    'Leak Test', 'Light Guide Bundle Replacement',
    'Light Guide Connector Repair', 'Main Body Repair',
    'Objective Lens Repair', 'Optical System Repair',
    'Seal Replacement', 'Suction Channel Replacement',
    'Suction Valve Replacement', 'Switch Assembly Repair',
    'Tip Assembly Replacement', 'Umbilical Cord Replacement',
    'Universal Cord Replacement', 'Valve Replacement',
    'Video Chip Replacement', 'Video System Repair',
    'Water Jet Nozzle Repair', 'Working Channel Replacement'
  ],

  // ── Rigid Scopes ────────────────────────────────────────────
  _RIGID: [
    'Adhesive/Bonding', 'Angle Piece Repair', 'AR Window Replacement',
    'Bridge Repair', 'Cement Repair', 'Clean & Adjust Optical System',
    'Clean & Inspect', 'Connector Assembly Repair',
    'Eyepiece Replacement', 'Light Post Replacement',
    'Rod Lens Replacement', 'Solderable Window Replacement',
    'Window Replacement'
  ],

  // ── Camera & Video ──────────────────────────────────────────
  _CAM: [
    'Alignment', 'Beamsplitter Rebuild', 'Buttons Repair',
    'Cable Assembly Repair', 'Cable Assembly Replacement',
    'Cable Connector Repair', 'Calibration',
    'Camera Head Rebuild', 'Camera Head Repair',
    'Chip Replacement', 'Circuit Board Repair',
    'Circuit Board Replacement', 'Coupler Repair',
    'Coupler Replacement', 'Diagnostic Inspection',
    'Disassemble & Inspect', 'Fiber Optic Light Cable Repair',
    'Fiber Optic Light Cable Replacement', 'Focus Assembly Repair',
    'Housing Assembly Repair', 'Housing Replacement',
    'Iris Repair', 'Lens Assembly Repair', 'Lens Replacement',
    'Light Cable Repair', 'Light Cable Replacement',
    'Light Cord Repair', 'Light Cord Replacement',
    'Optical Alignment', 'Power Supply Repair',
    'Zoom Assembly Repair'
  ],

  // ── Arthroscopy (ARTH) ─────────────────────────────────────
  ARTH: [
    'Arthroscopy Grasper Repair', 'Arthroscopy Punch Repair',
    'Arthroscopy Scissor Repair', 'Shaver Blade Repair',
    'Shaver Handpiece Repair'
  ],

  // ── Bone & Orthopedic (BONE) ───────────────────────────────
  BONE: [
    'Awl Repair', 'Bone Cutter Repair', 'Chisel Sharpen',
    'Dowel Cutter Repair', 'File Repair', 'Gouge Repair',
    'Impactor Repair', 'Mallet Repair', 'Osteotome Sharpen',
    'Perforator Repair', 'Rasp Repair', 'Reamer Repair',
    'Spreader Repair', 'Tap Repair', 'Tendon Repair'
  ],

  // ── Clamps & Hemostats (CLMP) ──────────────────────────────
  CLMP: [
    'Clamp Repair', 'Hemostat Repair', 'Mosquito Clamp Repair',
    'Skin Hook Repair', 'Towel Clip Repair', 'Vascular Clamp Repair'
  ],

  // ── Containers & Trays (CNTR) ──────────────────────────────
  CNTR: [
    'Base Repair', 'Complete Rebuild Base', 'Complete Rebuild Lid',
    'Dent Removal', 'Gasket Frame Repair', 'Gasket Replacement',
    'Handle Repair', 'Latch Repair', 'Lid Repair',
    'Retention Plate Repair', 'Retention Plate Replacement',
    'Tray Refurbishing'
  ],

  // ── Curettes & Elevators (CURE) ────────────────────────────
  CURE: [
    'Curette Sharpen', 'Elevator Repair', 'Pick Repair'
  ],

  // ── Dental (DENT) ──────────────────────────────────────────
  DENT: [
    'Dental Drill Rebuild - Contra Angle', 'Dental Drill Rebuild - Straight',
    'Dental Extractor Repair', 'Dental Scaler Sharpen',
    'Handpiece - Contra Angle Rebuild', 'Handpiece - High Speed Rebuild',
    'Handpiece - Straight Rebuild', 'Ultrasonic Scaler Rebuild'
  ],

  // ── Electrosurgical (ELEC) ─────────────────────────────────
  ELEC: [
    'Bipolar Forcep Repair', 'Bipolar Re-Insulate',
    'Bipolar Tip Replacement', 'Electrode Repair',
    'Insulation Repair', 'Kleppinger Forcep Repair',
    'Monopolar Cable Repair'
  ],

  // ── Forceps & Graspers (FORC) ──────────────────────────────
  FORC: [
    'Biopsy Forceps Rebuild', 'Clip Applying Forceps Repair',
    'Debakey Forceps Repair', 'Forceps Repair',
    'Grasper Repair', 'Jeweler Forceps Repair',
    'Thumb Forceps Repair', 'Tissue Grasper Repair'
  ],

  // ── Laparoscopic (LAP) ─────────────────────────────────────
  LAP: [
    'Cannula Repair', 'Clip Applier Repair', 'End Effector Repair',
    'Handle Repair', 'Insulation Repair', 'Jaw Replacement',
    'Lap Instrument Repair', 'Ratchet Mechanism Repair',
    'Shaft Repair', 'Sleeve Repair', 'Stopcock Repair',
    'Trocar Repair', 'Trumpet Valve Repair', 'Valve Repair',
    'Verres Needle Repair'
  ],

  // ── Microsurgical (MICR) ───────────────────────────────────
  MICR: [
    'Micro Forceps Repair', 'Micro Knife Repair',
    'Micro Loop/Probe Repair', 'Micro Scissor Repair',
    'Microsurgical Instrument Repair'
  ],

  // ── Needle Holders & Drivers (NEED) ────────────────────────
  NEED: [
    'Carbide Jaw Replacement', 'Needle Driver Repair',
    'Needle Holder Repair', 'Pin/Wire Cutter Repair',
    'Wire Cutter Repair', 'Wire Driver Repair'
  ],

  // ── Ophthalmic (OPHT) ─────────────────────────────────────
  OPHT: [
    'Alcon Instrument Rebuild', 'Ophthalmic Instrument Repair',
    'Phaco Handpiece Rebuild', 'Tonometer Repair'
  ],

  // ── Power Tools (PWR) ──────────────────────────────────────
  PWR: [
    'Battery Housing Repair', 'Bur Guard Replacement',
    'Dermatome Repair', 'Footswitch Repair',
    'Handpiece Rebuild', 'Integrated Motor Repair',
    'Nitrogen Hose Repair', 'Oscillating Saw Repair',
    'Pneumatic Handpiece Repair', 'Power Console Repair',
    'Power Source Repair', 'Reciprocating Saw Repair',
    'Rotary Burr Replacement', 'Rotary Drill Repair',
    'Sagittal Saw Repair', 'Skin Mesh Grafter Repair',
    'Stryker System 6 Repair'
  ],

  // ── Retractors & Speculums (RETR) ──────────────────────────
  RETR: [
    'Bookwalter Blade Refurbish', 'Bookwalter Ring Repair',
    'Bookwalter System Repair', 'Chest Retractor Repair',
    'Greenberg Arm Repair', 'Laryngeal Blade Repair',
    'Mouth Gag Repair', 'Retractor Repair',
    'Speculum Repair', 'Stringer Repair'
  ],

  // ── Rongeurs & Punches (RONG) ──────────────────────────────
  RONG: [
    'Bolt Cutter Repair', 'Kerrison Repair', 'Nail Nipper Repair',
    'Pin Cutter Repair', 'Pituitary Rongeur Repair',
    'Punch Repair', 'Rongeur Repair'
  ],

  // ── Scissors (SCIS) ────────────────────────────────────────
  SCIS: [
    'Cast Scissors Repair', 'Iris Scissors Repair',
    'Mayo Scissors Repair', 'Metz Scissors Repair',
    'Potts Scissors Repair', 'Scissors Repair',
    'Suture Cutter Repair'
  ],

  // ── Specialty & Misc (SPEC) ────────────────────────────────
  SPEC: [
    'Adenotome Repair', 'Box Lock Repair', 'Cable Repair',
    'Dilator Repair', 'Handle Repair', 'Hook Repair',
    'Iglesias Working Element Repair', 'Obturator Repair',
    'Probe Repair', 'Ring Handle Repair', 'Sharpening',
    'Sheath Repair', 'Stapler Repair', 'Suction Repair',
    'Tube Repair'
  ]
};

// ── Repair Levels (tiered pricing structure per parent) ───────
// Sourced from BPI competitor pricing tiers, March 2026.
var REPAIR_LEVELS = {
  // ── Flexible Endoscopes: 7 levels ──────────────────────────
  FLEX: {
    tiers: [
      { level: 1, name: 'Level 1', desc: 'Minor — valve, seal, bending rubber, O-ring' },
      { level: 2, name: 'Level 2', desc: 'Standard — angulation cable, channel plug, boot' },
      { level: 3, name: 'Level 3', desc: 'Intermediate — insertion tube section, light guide (partial)' },
      { level: 4, name: 'Level 4', desc: 'Major — CCD/image sensor, main body repair' },
      { level: 5, name: 'Level 5', desc: 'Overhaul — multi-system (bending + optics + channel)' },
      { level: 6, name: 'Level 6', desc: 'Major Overhaul — insertion tube + optics + umbilical' },
      { level: 7, name: 'Level 7', desc: 'Complete Rebuild — full scope refurbishment' }
    ],
    families: [
      'Bronchoscope', 'Choledochoscope', 'Colonoscope', 'Cystoscope',
      'Duodenoscope', 'Enteroscope', 'Gastroscope', 'Rhinolaryngoscope',
      'Sigmoidoscope', 'Small Diameter Scope', 'Ultrasound Scope',
      'Ureteroscope'
    ]
  },

  // ── Rigid Scopes: 3 level types × 3 levels each ───────────
  RIGID: {
    types: {
      Standard: [
        { level: 1, name: 'Level I',   desc: 'Minor — clean, adjust optics, polish' },
        { level: 2, name: 'Level II',  desc: 'Moderate — rod lens replacement, partial rebuild' },
        { level: 3, name: 'Level III', desc: 'Major — full optical system replacement' }
      ],
      'Semi-Rigid': [
        { level: 1, name: 'Level I',   desc: 'Minor — seal, window, minor adjustment' },
        { level: 2, name: 'Level II',  desc: 'Moderate — partial optical rebuild' },
        { level: 3, name: 'Restore',   desc: 'Full restore — complete optical system' }
      ],
      Specialty: [
        { level: 1, name: 'Level I',   desc: 'Minor — specialty scope adjustment' },
        { level: 2, name: 'Level II',  desc: 'Major — specialty scope rebuild' },
        { level: 3, name: 'Restore',   desc: 'Full restore' }
      ]
    },
    families: [
      'Arthroscope', 'Cystoscope', 'Hysteroscope', 'Laparoscope',
      'Nephroscope', 'Resectoscope', 'Sinuscope', 'Urethroscope'
    ]
  },

  // ── Camera & Video: 3 levels ───────────────────────────────
  CAM: {
    tiers: [
      { level: 1, name: 'Level 1', desc: 'Minor — cable, connector, buttons, housing' },
      { level: 2, name: 'Level 2', desc: 'Moderate — CCD/sensor, coupler, circuit board' },
      { level: 3, name: 'Level 3', desc: 'Major — full camera head rebuild' }
    ],
    families: [
      'Camera Head', 'Endoeye', 'Light Source', 'Monitor', 'Processor'
    ]
  },

  // ── Instruments: 4-level default + per-type overrides ──────
  INST: {
    defaultTiers: [
      { level: 1, name: 'Level 1', desc: 'Sharpen / minor adjustment / refurbish' },
      { level: 2, name: 'Level 2', desc: 'Replace one component (screw, spring, tip)' },
      { level: 3, name: 'Level 3', desc: 'Replace multiple components / realign / resurface' },
      { level: 4, name: 'Level 4', desc: 'Full rebuild / major overhaul' }
    ],
    overrides: {
      Scissors: [
        { level: 1, name: 'Scissor 1', desc: 'Sharpen, adjust, refurbish' },
        { level: 2, name: 'Scissor 2', desc: 'Replace screw, adjust, sharpen' },
        { level: 3, name: 'Scissor 3', desc: 'Proximate tips, sharpen, refurbish' },
        { level: 4, name: 'Scissor 4', desc: 'Replace screw + proximate tips, full rebuild' }
      ],
      Rongeur: [
        { level: 1, name: 'Rongeur 1', desc: 'Sharpen jaws, adjust springs' },
        { level: 2, name: 'Rongeur 2', desc: 'Replace screw, sharpen' },
        { level: 3, name: 'Rongeur 3', desc: 'Replace spring, sharpen' },
        { level: 4, name: 'Rongeur 4', desc: 'Replace screw + spring, sharpen' },
        { level: 5, name: 'Rongeur 5', desc: 'Drill out/reshape cup, full rebuild' }
      ],
      Kerrison: [
        { level: 1, name: 'Kerrison 1', desc: 'Sharpen, refurbish' },
        { level: 2, name: 'Kerrison 2', desc: 'Replace screw, sharpen' },
        { level: 3, name: 'Kerrison 3', desc: 'Replace spring, sharpen' },
        { level: 4, name: 'Kerrison 4', desc: 'Replace screw + spring, sharpen' },
        { level: 5, name: 'Kerrison 5', desc: 'Disassemble, align track, resurface jaws, full rebuild' }
      ],
      NeedleHolder: [
        { level: 1, name: 'NH 1', desc: 'New carbide jaw insert' },
        { level: 2, name: 'NH 2', desc: 'Reshape seat + new jaws' },
        { level: 3, name: 'NH 3', desc: 'Full rebuild (jaws + ratchet + alignment)' }
      ],
      Container: [
        { level: 1, name: 'Container 1', desc: 'Align rim, remove burs, refurbish' },
        { level: 2, name: 'Container 2', desc: 'Adjust handle/bracket, align, refurbish' },
        { level: 3, name: 'Container 3', desc: 'Handle + retention stud + dent removal' },
        { level: 4, name: 'Container 4', desc: 'Handle + retention stud + latch repair' },
        { level: 5, name: 'Container 5', desc: 'Full refurbishment (pins, handles, base)' },
        { level: 6, name: 'Container 6', desc: 'Complete rebuild (padding, latch, stud, handle)' }
      ],
      BoneCutter: [
        { level: 1, name: 'Cutter 1', desc: 'Sharpen, test, refurbish' },
        { level: 2, name: 'Cutter 2', desc: 'Replace screw, sharpen' },
        { level: 3, name: 'Cutter 3', desc: 'Replace spring, sharpen' },
        { level: 4, name: 'Cutter 4', desc: 'Replace screw + spring, sharpen' },
        { level: 5, name: 'Cutter 5', desc: 'Reshape damaged cutting edge, full rebuild' }
      ],
      Hemostat: [
        { level: 1, name: 'Hemostat 1', desc: 'Align jaws/ratchet, refurbish' },
        { level: 2, name: 'Hemostat 2', desc: 'Adjust, align, refurbish' },
        { level: 3, name: 'Hemostat 3', desc: 'Align jaws + ratchet, full refurbish' }
      ]
    }
  },

  // ── Power Tools: 3 levels ──────────────────────────────────
  PWR: {
    tiers: [
      { level: 1, name: 'Level 1', desc: 'Minor — housing, cable, switch, external' },
      { level: 2, name: 'Level 2', desc: 'Moderate — motor, chuck, internal mechanism' },
      { level: 3, name: 'Level 3', desc: 'Major — full rebuild / overhaul' }
    ],
    families: [
      'Dental Drill', 'Dermatome', 'Integrated Motor',
      'Oscillating Saw', 'Pneumatic Handpiece', 'Power Console',
      'Reciprocating Saw', 'Rotary Drill', 'Sagittal Saw',
      'Stryker System 6'
    ]
  }
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

/** Get standard repair types for a parent group or instrument group.
    @param {string} parentCode - FLEX/RIGID/CAM/INST
    @param {string} [groupCode] - ARTH/BONE/etc. (only for INST)
    @returns {string[]} */
function getRepairTypes(parentCode, groupCode) {
  if (groupCode && REPAIR_TYPES[groupCode]) return REPAIR_TYPES[groupCode];
  if (REPAIR_TYPES['_' + parentCode]) return REPAIR_TYPES['_' + parentCode];
  return REPAIR_TYPES.SPEC || [];
}

/** Get repair level tiers for a parent group.
    @param {string} parentCode - FLEX/RIGID/CAM/INST/PWR
    @param {string} [instrumentType] - e.g. 'Scissors','Rongeur' (for INST overrides)
    @returns {Array<{level,name,desc}>} */
function getRepairLevels(parentCode, instrumentType) {
  var cfg = REPAIR_LEVELS[parentCode];
  if (!cfg) return [];
  // INST: check per-type overrides first
  if (parentCode === 'INST') {
    if (cfg.overrides && instrumentType && cfg.overrides[instrumentType]) {
      return cfg.overrides[instrumentType];
    }
    return cfg.defaultTiers || [];
  }
  // RIGID has types instead of tiers
  if (cfg.types) return cfg.types.Standard || [];
  return cfg.tiers || [];
}
