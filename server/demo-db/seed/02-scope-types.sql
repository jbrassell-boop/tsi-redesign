-- ═══════════════════════════════════════════════════════
--  02-scope-types.sql — Scope type catalog (instruments)
-- ═══════════════════════════════════════════════════════

SET IDENTITY_INSERT tblScopeType ON;
INSERT INTO tblScopeType (lScopeTypeKey, sScopeTypeDesc, sRigidOrFlexible, lManufacturerKey, lScopeTypeCatKey, sAngUp, sAngDown, sAngLeft, sAngRight, bActive, dtCreateDate) VALUES
  -- Flexible Endoscopes
  (1,  'GIF-H190 Gastroscope',          'F', 1, 1, '210', '90', '100', '100', 1, '2025-01-15'),
  (2,  'GIF-HQ190 Gastroscope',         'F', 1, 1, '210', '90', '100', '100', 1, '2025-01-15'),
  (3,  'CF-HQ190L Colonoscope',         'F', 1, 2, '180', '180', '160', '160', 1, '2025-01-15'),
  (4,  'PCF-H190DL Colonoscope',        'F', 1, 2, '180', '180', '160', '160', 1, '2025-01-15'),
  (5,  'TJF-Q190V Duodenoscope',        'F', 1, 3, '120', '90', '110', '90',  1, '2025-01-15'),
  (6,  'BF-H190 Bronchoscope',          'F', 1, 4, '180', '130', '120', '120', 1, '2025-01-15'),
  (7,  'EG-3890TK Gastroscope',         'F', 2, 1, '210', '90', '100', '100', 1, '2025-02-01'),
  (8,  'EC-3890FK2 Colonoscope',        'F', 2, 2, '180', '180', '160', '160', 1, '2025-02-01'),
  (9,  'ED-3490TK Duodenoscope',        'F', 2, 3, '120', '90', '110', '90',  1, '2025-02-01'),
  (10, 'EG-760R Gastroscope',           'F', 3, 1, '210', '90', '100', '100', 1, '2025-02-01'),
  -- Rigid Scopes
  (11, '10mm 0-degree Laparoscope',     'R', 4, 6, NULL, NULL, NULL, NULL, 1, '2025-01-15'),
  (12, '10mm 30-degree Laparoscope',    'R', 4, 6, NULL, NULL, NULL, NULL, 1, '2025-01-15'),
  (13, '4mm 30-degree Arthroscope',     'R', 4, 5, NULL, NULL, NULL, NULL, 1, '2025-01-15'),
  (14, '4mm 70-degree Arthroscope',     'R', 4, 5, NULL, NULL, NULL, NULL, 1, '2025-01-15'),
  (15, '4mm Cystoscope',                'R', 4, 7, NULL, NULL, NULL, NULL, 1, '2025-01-15'),
  (16, '2.7mm Sinuscope',               'R', 4, 7, NULL, NULL, NULL, NULL, 1, '2025-01-15'),
  -- Camera Heads
  (17, '1288 HD Camera Head',           'C', 5, 8, NULL, NULL, NULL, NULL, 1, '2025-01-15'),
  (18, '1588 AIM Camera Head',          'C', 5, 8, NULL, NULL, NULL, NULL, 1, '2025-01-15'),
  -- Instruments (sRigidOrFlexible = 'I')
  (19, 'Grasping Forceps 5mm',          'I', 4, NULL, NULL, NULL, NULL, NULL, 1, '2025-03-01'),
  (20, 'Biopsy Forceps Disposable',     'I', 1, NULL, NULL, NULL, NULL, NULL, 1, '2025-03-01'),
  -- Smith & Nephew (manufacturer key 6)
  (21, '4mm 30-degree Arthroscope',     'R', 6, 5, NULL, NULL, NULL, NULL, 1, '2025-04-01'),
  (22, 'Arthroscopy Instrument Set',    'I', 6, NULL, NULL, NULL, NULL, NULL, 1, '2025-04-01'),
  -- Arthrex (manufacturer key 7)
  (23, 'Shoulder Arthroscope 4mm',      'R', 7, 5, NULL, NULL, NULL, NULL, 1, '2025-04-01'),
  (24, 'Knee Instrument Shaver Set',    'I', 7, NULL, NULL, NULL, NULL, NULL, 1, '2025-04-01'),
  -- ConMed (manufacturer key 8)
  (25, 'Linvatec HD Camera Head',       'C', 8, 8, NULL, NULL, NULL, NULL, 1, '2025-04-01'),
  (26, 'Fiber Optic Light Cable 3m',    'R', 8, 6, NULL, NULL, NULL, NULL, 1, '2025-04-01');
SET IDENTITY_INSERT tblScopeType OFF;
