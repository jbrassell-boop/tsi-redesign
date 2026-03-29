/* ═══ repairs-inspection.js ═══
   QC inspection rendering, P/F grid, angulation checks, DI form.
   Part of repairs.html modularization.
*/
(function() {
'use strict';

function renderInspectionCategories(detailed) {
  const categories = [
    { name: 'IMAGE ACCEPTABLE', items: [
      { label: 'Image is Clear and In focus', defects: [] },
      { label: 'Image is Round and clear to edge', defects: [] },
      { label: 'Image is free of contamination', defects: detailed ? ['Dirt','Fluid','Broken Glass'] : [] },
      { label: 'Image Lens system is secure', defects: [] }
    ]},
    { name: 'EYEPIECE/OCULAR ACCEPTABLE', items: [
      { label: 'Eyepiece Color', defects: [] },
      { label: 'Eyepiece condition', defects: detailed ? ['Nicks','Scratches','Dirt','Other'] : [] },
      { label: 'Eyepiece window', defects: detailed ? ['Chips','Scratches','Dirt','Leaks','Other'] : [] },
      { label: 'Eyepiece glue seal', defects: [] },
      { label: 'Ocular Lens (Intact and Clean)', defects: detailed ? ['Spots','Loose','Other'] : [] }
    ]},
    { name: 'TUBING ACCEPTABLE', items: [
      { label: 'Insertion Tube Connection to Body', defects: detailed ? ['Loose','Cracks','Other'] : [] },
      { label: 'Tubing Finish', defects: detailed ? ['Matte','Polished','Highly Polished'] : [] },
      { label: 'Insertion Tube', defects: detailed ? ['Bent','Dents','Other'] : [] },
      { label: 'Insertion Tube Damage to Plating', defects: [] },
      { label: 'Insertion Tube Tip', defects: detailed ? ['Bent','Dents','Nicks','Other'] : [] }
    ]},
    { name: 'BODY/NOSECONE/LIGHT POST ACCEPTABLE', items: [
      { label: 'ID Band in tact and proper color', defects: [] },
      { label: 'Body condition', defects: detailed ? ['Nicks','Scratches','Dirt','Other'] : [] },
      { label: 'Nosecone condition', defects: detailed ? ['Nicks','Scratches','Dirt','Other'] : [] },
      { label: 'Glue/Solder Seals Intact', defects: [] },
      { label: 'Light Post condition', defects: detailed ? ['Loose','Other'] : [] },
      { label: 'Model # Clear and Visible', defects: [] },
      { label: 'Light Post and Tip Angle in Alignment', defects: [] }
    ]},
    { name: 'OBJECTIVE/DISTAL END ACCEPTABLE', items: [
      { label: 'Window (Intact and Clear)', defects: detailed ? ['Scratches','Chip','Cracks','Missing','Other'] : [] },
      { label: 'Negative Lens (Intact and Clear)', defects: detailed ? ['Scratches','Chip','Cracks','Other'] : [] },
      { label: 'Objective System (Intact and secure)', defects: [] },
      { label: 'Free of Dust, Dirt and Fluid', defects: [] }
    ]},
    { name: 'LIGHT FIBERS ACCEPTABLE', items: [
      { label: 'Color of Light at tip and Post acceptable', defects: [] },
      { label: 'Fibers Intact and not loose', defects: [] },
      { label: 'Fiber Glue Intact and Sealed', defects: [] }
    ]}
  ];

  let html = '';
  categories.forEach(cat => {
    html += '<div class="wf-section-label">' + cat.name + '</div><div class="wf-pf-grid">';
    cat.items.forEach((item, idx) => {
      const uid = cat.name.replace(/[^a-zA-Z]/g,'').substring(0,6) + idx;
      html += '<div class="wf-pf-row"><span class="wf-pf-label">' + item.label + '</span>';
      html += '<span class="wf-pf-result"><label><input type="radio" name="pf' + uid + '" style="accent-color:var(--navy)"/> P</label><label><input type="radio" name="pf' + uid + '" style="accent-color:var(--navy)"/> F</label></span>';
      if (item.defects.length > 0) {
        html += '</div><div class="wf-pf-row" style="padding-left:24px"><span class="wf-pf-defects">';
        item.defects.forEach(d => {
          html += '<label><input type="checkbox"/> ' + d + '</label>';
        });
        html += '</span>';
      }
      html += '</div>';
    });
    html += '</div>';
  });

  html += '<div class="wf-section-label">SPECIFICATIONS</div>';
  html += '<div style="display:flex;gap:12px;margin-bottom:8px;font-size:10.5px">';
  html += '<span>Insertion Tube Length (mm): <input style="width:60px;border:1px solid var(--border);border-radius:3px;padding:2px 4px;font-size:10px" value="N/A"/></span>';
  html += '<span>Insertion Tube Diameter (mm): <input style="width:60px;border:1px solid var(--border);border-radius:3px;padding:2px 4px;font-size:10px" value="N/A"/></span>';
  html += '</div>';

  html += '<div class="wf-section-label">IMAGE SPECIFICATIONS</div><div class="wf-pf-grid">';
  ['Degree','Marker Plate Location (Clock Time)','Direction of View','Field of View','Light Field covers the Image Field'].forEach((spec, i) => {
    html += '<div class="wf-pf-row"><span class="wf-pf-label">' + spec + '</span>';
    html += '<span class="wf-pf-result"><label><input type="radio" name="imgspec' + i + '" style="accent-color:var(--navy)"/> P</label><label><input type="radio" name="imgspec' + i + '" style="accent-color:var(--navy)"/> F</label></span></div>';
  });
  html += '</div>';

  html += '<div style="display:flex;gap:12px;margin-top:6px;padding:6px 8px;background:#F0F4FA;border-radius:4px;font-size:10.5px;font-weight:600">';
  html += '<span>Hot/Cold Leak Test: <label><input type="radio" name="leakTest" style="accent-color:var(--green)"/> Pass</label> <label><input type="radio" name="leakTest" style="accent-color:var(--red)"/> Fail</label></span>';
  if (detailed) {
    html += '<span style="margin-left:auto">Autoclave Test: <label><input type="radio" name="autoTest" style="accent-color:var(--green)"/> Pass</label> <label><input type="radio" name="autoTest" style="accent-color:var(--red)"/> Fail</label></span>';
  }
  html += '</div>';

  return html;
}

// Angulation spec check — green if within 10% of spec, red if out
function checkAngSpec(input, specVal) {
  if (!specVal || isNaN(specVal) || !input.value) { input.style.borderColor = ''; input.style.background = ''; return; }
  var measured = parseFloat(input.value);
  if (isNaN(measured)) { input.style.borderColor = ''; input.style.background = ''; return; }
  var threshold = specVal * 0.9; // 10% tolerance
  if (measured >= threshold) {
    input.style.borderColor = 'var(--success)'; input.style.background = 'var(--success-light)';
  } else {
    input.style.borderColor = 'var(--danger)'; input.style.background = 'var(--danger-light)';
  }
}

// Save D&I form data back to the repair record
function saveDIForm() {
  if (!_currentRepair) { showToast('No repair loaded'); return; }
  // Angulation measurements
  var angUp = document.getElementById('diAngUp');
  var angDown = document.getElementById('diAngDown');
  var angRight = document.getElementById('diAngRight');
  var angLeft = document.getElementById('diAngLeft');
  if (angUp) _currentRepair.sAngInUp = angUp.value;
  if (angDown) _currentRepair.sAngInDown = angDown.value;
  if (angRight) _currentRepair.sAngInRight = angRight.value;
  if (angLeft) _currentRepair.sAngInLeft = angLeft.value;
  // Tech notes
  var notes = document.getElementById('diTechNotes');
  if (notes) _currentRepair.mCommentsDisIns = notes.value;
  // Collect all P/F/NA radio values
  var radios = document.querySelectorAll('#wfGenericBody input[type="radio"]:checked');
  var pfData = {};
  radios.forEach(function(r) { pfData[r.name] = r.value; });
  _currentRepair._diResults = pfData;
  // Collect all checked defect checkboxes
  var checks = document.querySelectorAll('#wfGenericBody input[type="checkbox"]:checked');
  var defects = [];
  checks.forEach(function(c) {
    var label = c.parentElement ? c.parentElement.textContent.trim() : '';
    if (label) defects.push(label);
  });
  _currentRepair._diDefects = defects;
  // Scope condition
  var condition = document.querySelector('#wfGenericBody input[name="scopeCondition"]:checked');
  if (condition) _currentRepair._diCondition = condition.value;
  markDirty();
  if (typeof TSI !== 'undefined' && TSI.toast) TSI.toast.success('D&I results saved to repair record');
  else showToast('D&I results saved');
}

// Print blank D&I form (no data, just structure)
function printBlankDI() {
  var body = document.getElementById('wfGenericBody');
  if (!body) return;
  // Clone the form, clear all inputs
  var clone = body.cloneNode(true);
  clone.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(function(i) { i.value = ''; });
  clone.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function(i) { i.checked = false; });
  // Print
  var w = window.open('', '_blank', 'width=900,height=1100');
  w.document.write('<html><head><title>D&I Blank Form — OM05-1</title><style>');
  w.document.write('body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#333}');
  w.document.write('.wf-card{border:1px solid #ccc;border-radius:4px;margin-bottom:12px;break-inside:avoid}');
  w.document.write('.wf-card-head{background:#f0f2f5;padding:6px 10px;font-weight:700;font-size:12px;border-bottom:1px solid #ccc}');
  w.document.write('.wf-card-body{padding:8px 10px}');
  w.document.write('.wf-di-table{width:100%;border-collapse:collapse}');
  w.document.write('.wf-di-table td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:top}');
  w.document.write('.wf-di-cat td{background:#f8f9fa;font-weight:700;font-size:11px;padding:6px}');
  w.document.write('.wf-di-input{border:1px solid #ccc;border-radius:3px;padding:2px 4px;font-size:10px;height:20px}');
  w.document.write('.wf-di-input.wide{width:120px}');
  w.document.write('input[type="radio"],input[type="checkbox"]{margin:0 2px}');
  w.document.write('.wf-form-header{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;padding:8px;border:1px solid #ccc;border-radius:4px;margin-bottom:12px;font-size:11px}');
  w.document.write('@media print{body{margin:10px}}');
  w.document.write('</style></head><body>');
  w.document.write('<div style="text-align:center;margin-bottom:16px"><h2 style="margin:0">Total Scope, Inc.</h2><div style="font-size:12px;color:#666">Flexible Endoscope Diagnostic Report — OM05-1 (Blank)</div></div>');
  w.document.write('<div class="wf-form-header">');
  w.document.write('<div><b>Client:</b> _________________________</div><div><b>W.O. #:</b> _______________</div>');
  w.document.write('<div><b>Department:</b> ___________________</div><div><b>Serial #:</b> _______________</div>');
  w.document.write('<div><b>Model:</b> _________________________</div><div><b>Date:</b> _______________</div>');
  w.document.write('</div>');
  w.document.write(clone.innerHTML);
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
}

function renderFlexDIChecklist() {
  const r = _currentRepair || {};

  // Helper: build a P/F/N/A radio cell + label + defects HTML row
  function diRow(name, label, defectsHTML) {
    return `<tr>
      <td style="width:90px;white-space:nowrap" class="wf-di-radios">
        <label><input type="radio" name="${name}" value="P"> P</label>
        <label><input type="radio" name="${name}" value="F"> F</label>
        <label><input type="radio" name="${name}" value="NA"> N/A</label>
      </td>
      <td><b>${label}</b>${defectsHTML ? ' ' + defectsHTML : ''}</td>
    </tr>`;
  }

  // Helper: inline checkbox
  function chk(label) { return `<label class="wf-di-defects" style="display:inline"><input type="checkbox"> ${label}</label> `; }

  // Helper: inline input
  function inp(label, w) { return `${label ? label + ' ' : ''}<input class="wf-di-input${w ? ' ' + w : ''}">`; }

  let html = '';

  // ── SECTION 3: FUNCTIONAL CHECKS ──
  html += `<div class="wf-card"><div class="wf-card-head">3. Functional Checks</div>
    <div class="wf-card-body" style="padding:0"><table class="wf-di-table"><tbody>`;

  // 3A. Leak Test & Fluid Invasion
  html += `<tr class="wf-di-cat"><td colspan="2">3A. Leak Test &amp; Fluid Invasion</td></tr>`;
  html += diRow('r3a1', 'Leak Test Performed', `&rarr; Result: <input class="wf-di-input"> Leak Location: <input class="wf-di-input wide">`);
  html += diRow('r3a2', 'Fluid Invasion Detected', `&rarr; Location: <span class="wf-di-defects">${chk('BS')}${chk('CB')}${chk('SC')}${chk('LGC')}${chk('Lenses')}${chk('Other:')} <input class="wf-di-input"></span>`);

  // 3B. Angulation System
  const specU = r.sAngSpecUp || '—', specD = r.sAngSpecDown || '—', specL = r.sAngSpecLeft || '—', specR = r.sAngSpecRight || '—';
  html += `<tr class="wf-di-cat"><td colspan="2">3B. Angulation System</td></tr>`;
  html += `<tr>
    <td style="width:90px;white-space:nowrap" class="wf-di-radios">
      <label><input type="radio" name="r3b1" value="P"> P</label>
      <label><input type="radio" name="r3b1" value="F"> F</label>
      <label><input type="radio" name="r3b1" value="NA"> N/A</label>
    </td>
    <td>
      <b>Angulation Measured vs Spec</b>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px 12px;margin:6px 0;font-size:11px">
        <div style="text-align:center">
          <div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase">Up</div>
          <input class="wf-di-input" id="diAngUp" style="width:48px;text-align:center" value="${r.sAngInUp||''}" oninput="checkAngSpec(this,${specU})">
          <div style="font-size:9px;color:var(--muted)">Spec: ${specU}°</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase">Down</div>
          <input class="wf-di-input" id="diAngDown" style="width:48px;text-align:center" value="${r.sAngInDown||''}" oninput="checkAngSpec(this,${specD})">
          <div style="font-size:9px;color:var(--muted)">Spec: ${specD}°</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase">Right</div>
          <input class="wf-di-input" id="diAngRight" style="width:48px;text-align:center" value="${r.sAngInRight||''}" oninput="checkAngSpec(this,${specR})">
          <div style="font-size:9px;color:var(--muted)">Spec: ${specR}°</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase">Left</div>
          <input class="wf-di-input" id="diAngLeft" style="width:48px;text-align:center" value="${r.sAngInLeft||''}" oninput="checkAngSpec(this,${specL})">
          <div style="font-size:9px;color:var(--muted)">Spec: ${specL}°</div>
        </div>
      </div>
    </td>
  </tr>`;
  html += diRow('r3b2', 'Angulation System', `<span class="wf-di-defects">${chk('Play')}${chk('Stiff/Grinding')}${chk('Broken Cable')}${chk('Slip Stopper')}${chk('Orientation Off')}${chk('Broken Bracket')}</span>`);
  html += diRow('r3b3', 'Angulation Knobs', `<span class="wf-di-defects">${chk('Moving Together')}${chk('Not Locking')}${chk('Leaking')}</span> — Location: <input class="wf-di-input wide">`);
  html += diRow('r3b4', 'Angulation Lock', `<span class="wf-di-defects">${chk('Too Tight')}${chk('Too Loose')}${chk('Brake Not Functioning')}${chk('Missing')}</span>`);

  // 3C. Image & Light Transmission
  html += `<tr class="wf-di-cat"><td colspan="2">3C. Image &amp; Light Transmission</td></tr>`;
  html += diRow('r3c1', 'Video Image', `<span class="wf-di-defects">${chk('No Image')}${chk('Static')}${chk('Lens Separation')}${chk('Imperfection')}${chk('Error Code')}</span> Notes: <input class="wf-di-input wide">`);
  html += diRow('r3c2', 'Light Bundle', `<span class="wf-di-defects">${chk('Slip from Tip')}${chk('Broken Fibers')}</span> &rarr; % Broken: <input class="wf-di-input" style="width:40px" value="${r.sBrokenFibersIn||''}">`);
  html += diRow('r3c3', 'Video Features', `<span class="wf-di-defects">${chk('Data')}${chk('WB')}${chk('NBI')}${chk('Dual Focus')}${chk('Orientation')}</span> Uses: <input class="wf-di-input" style="width:30px"> Time: <input class="wf-di-input" style="width:40px">`);
  html += diRow('r3c4', 'Control Switches', `<span class="wf-di-defects">${chk('Misaligned')}${chk('Rubber Cut')}${chk('Inoperative')}</span> — Switch #: <input class="wf-di-input" style="width:40px">`);

  // 3D. Channel Function
  html += `<tr class="wf-di-cat"><td colspan="2">3D. Channel Function</td></tr>`;
  html += diRow('r3d1', 'Suction Channel', `<span class="wf-di-defects">${chk('Blocked')}${chk('Leaking')}${chk('Impeded')}</span>`);
  html += diRow('r3d2', 'Forcep/Biopsy Channel', `<span class="wf-di-defects">${chk('Blocked')}${chk('Leaking')}${chk('Port Seal Damaged')}${chk('Impeded')}</span> — Level: <input class="wf-di-input" style="width:40px">`);
  html += diRow('r3d3', 'Auxiliary Water Channel', `<span class="wf-di-defects">${chk('Blocked')}${chk('Leaking')}${chk('Loose')}${chk('Weak')}</span>`);
  html += diRow('r3d4', 'A/W System Channel', `<span class="wf-di-defects">${chk('Kinked')}${chk('Clogged')}${chk('Leaking')}${chk('Nozzle Clogged')}</span>`);

  // 3E. Electrical & Connector Integrity
  html += `<tr class="wf-di-cat"><td colspan="2">3E. Electrical &amp; Connector Integrity</td></tr>`;
  html += diRow('r3e1', 'Light Guide Connector (LGC)', `<span class="wf-di-defects">${chk('Alignment Pin Missing/Leaking')}${chk('Prong Loose')}${chk('Lens (Dirty or Broken)')}${chk('ETO Valve')}${chk('Bottle Connector Loose')}${chk('Cracked')}${chk('Leaking')}</span>`);
  html += diRow('r3e2', 'Electrical Pins/Contacts', `<span class="wf-di-defects">${chk('Dirty')}${chk('Corroded')}${chk('Bent Pins')}</span>`);

  // 3F. Control Body
  html += `<tr class="wf-di-cat"><td colspan="2">3F. Control Body</td></tr>`;
  html += diRow('r3f1', 'Control Body Housing', `<span class="wf-di-defects">${chk('Leaking')}${chk('Cracked')}${chk('Loose Mount')}</span>`);
  html += diRow('r3f2', 'Elevator Function', `<span class="wf-di-defects">${chk('Wire Broken')}${chk('Needs Adjustment')}${chk('Channel Leaking')}${chk('Port Leaking')}</span>`);

  // 3G. Insertion Tube
  html += `<tr class="wf-di-cat"><td colspan="2">3G. Insertion Tube</td></tr>`;
  html += diRow('r3g1', 'Surface', `<span class="wf-di-defects">${chk('Dented')}${chk('Buckled')}${chk('Cut')}${chk('Peeling')}${chk('Cut Back Too Far')}${chk('Discolored')}</span> — Location: <input class="wf-di-input wide">`);
  html += diRow('r3g2', 'Tensioner', `<span class="wf-di-defects">${chk('Leaking')}${chk('Nonfunctional')}${chk('Needs Adjustment')}${chk('Knob Damage')}</span>`);
  html += diRow('r3g3', 'Flexibility', `<span class="wf-di-defects">${chk('Stiff')}${chk('Over-flexible')}${chk('Snaking')}</span>`);
  html += diRow('r3g4', 'Boot (CB)', `<span class="wf-di-defects">${chk('Torn')}${chk('Loose')}${chk('Trim Ring')}</span>`);

  // 3H. Distal Tip & Adhesive Surfaces
  html += `<tr class="wf-di-cat"><td colspan="2">3H. Distal Tip &amp; Adhesive Surfaces</td></tr>`;
  html += diRow('r3h1', 'C-Cover', `<span class="wf-di-defects">${chk('Cracked')}${chk('Loose')}${chk('RTV Missing')}${chk('Poor Condition')}</span>`);
  html += diRow('r3h2', 'BR Adhesive', `<span class="wf-di-defects">${chk('Flaking')}${chk('Missing')}${chk('Aged')}${chk('Oversized')}</span> &rarr; Measured Size: <input class="wf-di-input" style="width:50px" value="${r.nIncomingEpoxySize||''}"> <span style="font-size:9px;color:var(--steel)">Max: 12.82mm</span>`);
  html += diRow('r3h3', 'Bending Rubber', `<span class="wf-di-defects">${chk('Aging')}${chk('Loose')}${chk('Cut/Hole')}</span>`);
  html += diRow('r3h4', 'Bending Section Mesh', `<span class="wf-di-defects">${chk('Poor Condition')}</span>: <input class="wf-di-input wide">`);
  html += diRow('r3h5', 'Lenses', `<span class="wf-di-defects">${chk('Cracked')}${chk('Chipped')}${chk('Dirty')}${chk('Glue Missing')}${chk('Missing Lens')}</span> — Specify: <input class="wf-di-input wide">`);

  // 3I. Universal Cord & Boots
  html += `<tr class="wf-di-cat"><td colspan="2">3I. Universal Cord &amp; Boots</td></tr>`;
  html += diRow('r3i1', 'Cord', `<span class="wf-di-defects">${chk('Dented')}${chk('Buckled')}${chk('Cut')}${chk('Peeling')}</span>`);
  html += diRow('r3i2', 'Boot (CB)', `<span class="wf-di-defects">${chk('Torn')}${chk('Loose')}${chk('Cracked')}</span>`);
  html += diRow('r3i3', 'Boot (LGC)', `<span class="wf-di-defects">${chk('Torn')}${chk('Loose')}${chk('Cracked')}</span>`);

  html += `</tbody></table></div></div>`;

  // ── SECTION 4: DETAILED INSPECTION ──
  html += `<div class="wf-card"><div class="wf-card-head">4. Detailed Inspection</div>
    <div class="wf-card-body" style="padding:0"><table class="wf-di-table"><tbody>`;
  html += diRow('r4a1', 'Borescope Used', '');
  html += diRow('r4a2', 'Internal Channels', `<span class="wf-di-defects">${chk('Good')}${chk('Freckling')}${chk('Debris')}${chk('Scratched/Deformed')}${chk('Other')}</span>`);
  html += diRow('r4a3', 'Residue', `<span class="wf-di-defects">${chk('Biological')}${chk('Chemical')}${chk('Staining')}${chk('Other')}</span> &rarr; Location: <input class="wf-di-input wide">`);
  html += diRow('r4a4', 'Photos Taken', `<span class="wf-di-defects">${chk('Yes')}${chk('No')}</span>`);
  html += `</tbody></table>
    <div style="padding:8px 14px;font-size:10.5px">
      <b style="font-size:9px;color:var(--steel)">SCOPE CONDITION (select one):</b>
      <div class="wf-di-defects" style="margin-top:4px;display:flex;gap:10px;flex-wrap:wrap">
        <label><input type="radio" name="scopeCondition" style="accent-color:var(--navy)"> Not Patient Safe</label>
        <label><input type="radio" name="scopeCondition" style="accent-color:var(--navy)"> Functional Issue</label>
        <label><input type="radio" name="scopeCondition" style="accent-color:var(--navy)"> Cosmetic Only</label>
        <label><input type="radio" name="scopeCondition" style="accent-color:var(--navy)"> No Issues Found</label>
      </div>
    </div>
  </div></div>`;

  // ── SECTION 5: REPAIR ASSESSMENT ──
  html += `<div class="wf-card"><div class="wf-card-head">5. Repair Assessment</div>
    <div class="wf-card-body">
      <textarea class="wf-textarea" id="diTechNotes" rows="5" placeholder="Tech notes...">${r.mCommentsDisIns || ''}</textarea>
    </div>
  </div>`;

  return html;
}

setTimeout(function() {
  const statusSel = document.getElementById('hRepairStatus');
  if (statusSel) {
    statusSel.addEventListener('change', function() {
      const newStatus = parseInt(this.value) || 1;
      const statusName = _statuses.find(s => s.lRepairStatusID === newStatus)?.sRepairStatus || 'Unknown';
      updateWorkflowForms(newStatus);
      const currentPhase = getPhaseForStatus(newStatus);
      const available = WORKFLOW_FORMS.filter(f => f.phase === currentPhase && !_generatedForms[f.id]);
      if (available.length > 0) {
        showWorkflowToast('Status: ' + statusName + ' \u2014 ' + available.length + ' form' + (available.length > 1 ? 's' : '') + ' now available: ' + available.map(f => f.shortName).join(', '));
      }
    });
  }
}, 0);

// Lookups

const INSPECTION_TEMPLATES = {
  // ── RIGID — matches tblRepair sIns*PF + tblRepairInspection columns ──
  R: {
    categories: [
      { name: 'Image & Optics', items: [
        { label: 'Image Clear/Focus', inField: 'sInsImageClearPF', outField: 'sOutImageClearPF' },
        { label: 'Image Round/Edge', inField: 'sInsImageRoundPF', outField: 'sOutImageRoundPF' },
        { label: 'Free Contamination', inField: 'sInsImageContamPF', outField: 'sOutImageContamPF' },
        { label: 'Lens System Secure', inField: 'sInsLensSecurePF', outField: 'sOutLensSecurePF' },
        { label: 'Vision', inField: 'sInsVisionPF', outField: 'sOutVisionPF' },
        { label: 'Focal Distance', inField: 'sInsFocalDistancePF', outField: 'sOutFocalDistancePF' },
        { label: 'Optics Angle', inField: 'sInsOpticsAnglePF', outField: 'sOutOpticsAnglePF' },
        { label: 'Optics Field', inField: 'sInsOpticsFieldPF', outField: 'sOutOpticsFieldPF' },
        { label: 'Optics Resolution', inField: 'sInsOpticsResolutionPF', outField: 'sOutOpticsResolutionPF' }
      ]},
      { name: 'Eyepiece', items: [
        { label: 'Eyepiece Color', inField: 'sInsEyepieceColorPF', outField: 'sOutEyepieceColorPF' },
        { label: 'Eyepiece Condition', inField: 'sInsEyepieceCondPF', outField: 'sOutEyepieceCondPF' },
        { label: 'Eyepiece Window', inField: 'sInsEyepieceWinPF', outField: 'sOutEyepieceWinPF' },
        { label: 'Eyepiece Glue Seal', inField: 'sInsEyepieceGluePF', outField: 'sOutEyepieceGluePF' },
        { label: 'Ocular Lens', inField: 'sInsOcularLensPF', outField: 'sOutOcularLensPF' }
      ]},
      { name: 'Tubing', items: [
        { label: 'Connection to Body', inField: 'sInsTubeConnPF', outField: 'sOutTubeConnPF' },
        { label: 'Tubing Finish', inField: 'sInsTubeFinishPF', outField: 'sOutTubeFinishPF' },
        { label: 'Bent/Dents', inField: 'sInsTubeBentPF', outField: 'sOutTubeBentPF' },
        { label: 'Damage to Plating', inField: 'sInsTubePlatingPF', outField: 'sOutTubePlatingPF' },
        { label: 'Tubing Tip', inField: 'sInsTubeTipPF', outField: 'sOutTubeTipPF' },
        { label: 'Insertion Tube', inField: 'sInsInsertionTubePF', outField: 'sOutInsertionTubePF' }
      ]},
      { name: 'Body / Nosecone', items: [
        { label: 'ID Band', inField: 'sInsIDBandPF', outField: 'sOutIDBandPF' },
        { label: 'Body Condition', inField: 'sInsBodyCondPF', outField: 'sOutBodyCondPF' },
        { label: 'Nosecone', inField: 'sInsNoseconePF', outField: 'sOutNoseconePF' },
        { label: 'Glue/Solder Seals', inField: 'sInsGlueSealsPF', outField: 'sOutGlueSealsPF' },
        { label: 'Light Post', inField: 'sInsLightPostPF', outField: 'sOutLightPostPF' },
        { label: 'Model# Visible', inField: 'sInsModelVisPF', outField: 'sOutModelVisPF' },
        { label: 'Angle Alignment', inField: 'sInsAngleAlignPF', outField: 'sOutAngleAlignPF' }
      ]},
      { name: 'Objective', items: [
        { label: 'Objective Window', inField: 'sInsObjWindowPF', outField: 'sOutObjWindowPF' },
        { label: 'Negative Lens', inField: 'sInsNegLensPF', outField: 'sOutNegLensPF' },
        { label: 'Objective System', inField: 'sInsObjSystemPF', outField: 'sOutObjSystemPF' },
        { label: 'Free of Dust/Dirt', inField: 'sInsFreeDustPF', outField: 'sOutFreeDustPF' }
      ]},
      { name: 'Light & Fibers', items: [
        { label: 'Color of Light', inField: 'sInsLightColorPF', outField: 'sOutLightColorPF' },
        { label: 'Fibers Intact', inField: 'sInsFibersIntactPF', outField: 'sOutFibersIntactPF' },
        { label: 'Fiber Glue', inField: 'sInsFiberGluePF', outField: 'sOutFiberGluePF' },
        { label: 'Fiber Angle', inField: 'sInsFiberAnglePF', outField: 'sOutFiberAnglePF' },
        { label: 'Fiber Light Trans', inField: 'sInsFiberLightTransPF', outField: 'sOutFiberLightTransPF' },
        { label: 'Light Guide Connector', inField: 'sInsLightGuideConnectorPF', outField: 'sOutLightGuideConnectorPF' }
      ]},
      { name: 'Testing', items: [
        { label: 'Hot/Cold Leak', inField: 'sInsHotColdLeakPF', outField: 'sOutHotColdLeakPF' },
        { label: 'Final Inspection', inField: 'sInsFinalPF', outField: 'sOutFinalPF' }
      ]}
    ]
  },
  // ── FLEXIBLE — matches tblRepair sIns*PF columns for flex scopes ──
  F: {
    categories: [
      { name: 'Functional Systems', items: [
        { label: 'Angulation', inField: 'sInsAngulationPF', outField: 'sOutAngulationPF' },
        { label: 'Insertion Tube', inField: 'sInsInsertionTubePF', outField: 'sOutInsertionTubePF' },
        { label: 'Universal Cord', inField: 'sInsUniversalCordPF', outField: 'sOutUniversalCordPF' },
        { label: 'Light Guide Connector', inField: 'sInsLightGuideConnectorPF', outField: 'sOutLightGuideConnectorPF' },
        { label: 'Distal Tip', inField: 'sInsDistalTipPF', outField: 'sOutDistalTipPF' },
        { label: 'Eyepiece', inField: 'sInsEyePiecePF', outField: 'sOutEyePiecePF' }
      ]},
      { name: 'Channels', items: [
        { label: 'Forcep Channel', inField: 'sInsForcepChannelPF', outField: 'sOutForcepChannelPF' },
        { label: 'Suction', inField: 'sInsSuctionPF', outField: 'sOutSuctionPF' },
        { label: 'Aux Water', inField: 'sInsAuxWaterPF', outField: 'sOutAuxWaterPF' },
        { label: 'Air/Water', inField: 'sInsAirWaterPF', outField: 'sOutAirWaterPF' }
      ]},
      { name: 'Testing', items: [
        { label: 'Leak Test', inField: 'sInsLeakPF', outField: 'sOutLeakPF' },
        { label: 'Hot/Cold Leak', inField: 'sInsHotColdLeakPF', outField: 'sOutHotColdLeakPF' },
        { label: 'Fog Test', inField: 'sInsFogPF', outField: 'sOutFogPF' },
        { label: 'Alcohol Wipe', inField: 'sInsAlcoholWipePF', outField: 'sOutAlcoholWipePF' }
      ]},
      { name: 'Image & Optics', items: [
        { label: 'Image Quality', inField: 'sInsImagePF', outField: 'sOutImagePF' },
        { label: 'Image Centration', inField: 'sInsImageCentrationPF', outField: 'sOutImageCentrationPF' },
        { label: 'Vision', inField: 'sInsVisionPF', outField: 'sOutVisionPF' },
        { label: 'Light Fibers', inField: 'sInsLightFibersPF', outField: 'sOutLightFibersPF' },
        { label: 'Fiber Light Trans', inField: 'sInsFiberLightTransPF', outField: 'sOutFiberLightTransPF' }
      ]},
      { name: 'Overall', items: [
        { label: 'Final Inspection', inField: 'sInsFinalPF', outField: 'sOutFinalPF' }
      ]}
    ]
  },
  C: { // Camera
    categories: [
      { name: 'Camera', items: [
        { label: 'Camera Cable', inField: 'sInsCamCablePF', outField: 'sOutCamCablePF' },
        { label: 'Cable Connector', inField: 'sInsCamCableConnPF', outField: 'sOutCamCableConnPF' },
        { label: 'Lens Cleaned', inField: 'sInsCamLensCleanedPF', outField: 'sOutCamLensCleanedPF' },
        { label: 'Control Buttons', inField: 'sInsCamControlBtnsPF', outField: 'sOutCamControlBtnsPF' },
        { label: 'Focus', inField: 'sInsCamFocusPF', outField: 'sOutCamFocusPF' },
        { label: 'Video Appearance', inField: 'sInsCamVideoAppearPF', outField: 'sOutCamVideoAppearPF' },
        { label: 'White Balance', inField: 'sInsCamWhiteBalPF', outField: 'sOutCamWhiteBalPF' },
        { label: 'Focus Mechanism', inField: 'sInsCamFocusMechPF', outField: 'sOutCamFocusMechPF' },
        { label: 'Soak Cap Assembly', inField: 'sInsCamSoakCapPF', outField: 'sOutCamSoakCapPF' },
        { label: 'Edge Card Protector', inField: 'sInsCamEdgeCardPF', outField: 'sOutCamEdgeCardPF' }
      ]},
      { name: 'Coupler', showIf: 'sIncludesCamCouplerYN', items: [
        { label: 'Coupler Leak', inField: 'sInsCoupLeakPF', outField: 'sOutCoupLeakPF' },
        { label: 'Coupler Lens', inField: 'sInsCoupLensCleanedPF', outField: 'sOutCoupLensCleanedPF' },
        { label: 'Coupler Focus', inField: 'sInsCoupFocusPF', outField: 'sOutCoupFocusPF' },
        { label: 'Coupler Fog', inField: 'sInsCoupFogPF', outField: 'sOutCoupFogPF' },
        { label: 'Focus Mechanism', inField: 'sInsCoupFocusMechPF', outField: 'sOutCoupFocusMechPF' },
        { label: 'Retaining Mechanism', inField: 'sInsCoupRetainPF', outField: 'sOutCoupRetainPF' }
      ]}
    ]
  }
};

function renderInspectionContent(scopeType, direction) {
  const tmpl = INSPECTION_TEMPLATES[scopeType] || INSPECTION_TEMPLATES.R;
  const dir = direction === 'out' ? 'out' : 'in';
  const d = _currentRepair || {};
  let html = '';

  // For Post-Repair: add outgoing angulation first (all scope types)
  if (dir === 'out') {
    html += '<div class="pf-cat">Outgoing Angulation</div>';
    html += '<div class="insp-row">';
    html += '<div class="field"><label>Up</label><input type="number" id="fAngVerifUp" style="text-align:center" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Down</label><input type="number" id="fAngVerifDown" style="text-align:center" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Right</label><input type="number" id="fAngVerifRight" style="text-align:center" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Left</label><input type="number" id="fAngVerifLeft" style="text-align:center" onchange="markDirty()"/></div>';
    html += '</div>';
  }

  // Toolbar: All Pass + Clear + counter
  const panelId = dir + 'PfPanel';
  html += '<div class="pf-toolbar">';
  html += '<button class="pf-all-pass" onclick="pfAllPass(\'' + panelId + '\')">&#10003; All Pass</button>';
  html += '<button class="pf-clear-all" onclick="pfClearAll(\'' + panelId + '\')">Clear</button>';
  html += '<span class="pf-counter" id="' + panelId + 'Count"></span>';
  html += '</div>';

  // P/F list — single vertical scan
  html += '<div class="pf-grid" id="' + panelId + '">';
  tmpl.categories.forEach(cat => {
    if (cat.showIf && d[cat.showIf] !== 'Y') return;
    html += '<div class="pf-cat">' + cat.name + '</div>';
    cat.items.forEach(item => {
      const field = dir === 'in' ? item.inField : item.outField;
      html += '<div class="pf-item" data-field="' + field + '">';
      html += '<div class="pf-cell pf-label" onclick="togglePFByField(\'' + field + '\')">' + item.label + '</div>';
      html += '<div class="pf-cell pf-btn-cell" onclick="togglePFByField(\'' + field + '\')"><button class="pf-btn" data-field="' + field + '">—</button></div>';
      html += '</div>';
    });
  });
  html += '</div>';

  // Measurements section (varies by scope type and direction)
  if (scopeType === 'R' && dir === 'in') {
    html += '<div class="pf-cat">Measurements</div>';
    html += '<div class="insp-row">';
    html += '<div class="field"><label>Tube Length In</label><input type="number" id="fLengthIn" onchange="markDirty()" placeholder="—"/></div>';
    html += '<div class="field"><label>Tube Diameter In</label><input type="number" id="fDiameterIn" onchange="markDirty()" placeholder="—"/></div>';
    html += '<div class="field"><label>Field of View</label><input type="number" id="fFieldOfView" onchange="markDirty()" placeholder="—"/></div>';
    html += '<div class="field"><label>Image Degree</label><input type="number" id="fDegreeKey" onchange="markDirty()" placeholder="—"/></div>';
    html += '</div>';
    // Metadata
    html += '<div class="pf-cat">Metadata</div>';
    html += '<div class="insp-row" style="grid-template-columns:repeat(5,1fr)">';
    html += '<div class="field"><label>Checked In By</label><input id="fCheckedInBy" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Inspector Name</label><input id="fInspectorName" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Time Received</label><input type="time" id="fTimeReceived" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Time Cleaned</label><input type="time" id="fTimeCleaned" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Time Soaked</label><input type="time" id="fTimeSoaked" onchange="markDirty()"/></div>';
    html += '</div>';
    // Condition
    html += '<div class="pf-cat">Condition</div>';
    html += '<div class="insp-checks">';
    html += '<label><input type="checkbox" id="fRepairable" onchange="markDirty()"/> Scope is Repairable</label>';
    html += '<label><input type="checkbox" id="fUsable" onchange="markDirty()"/> Scope is Usable</label>';
    html += '<label><input type="checkbox" id="fImproperCare" onchange="markDirty()"/> Result of Improper Care</label>';
    html += '<label><input type="checkbox" id="fFailureDuringCase" onchange="markDirty()"/> Failure During Case</label>';
    html += '</div>';
    // Config
    html += '<div class="pf-cat">Scope Configuration</div>';
    html += '<div class="insp-row" style="grid-template-columns:repeat(5,1fr)">';
    html += '<label style="font-size:10px;display:flex;align-items:center;gap:5px;cursor:pointer;font-weight:500"><input type="checkbox" id="fScopeDrawing" onchange="markDirty()"/> Scope Drawing</label>';
    html += '<div class="field"><label>Tube System</label><select id="fTubeSystem" onchange="markDirty()"><option value="">—</option><option value="3">3</option><option value="2">2</option></select></div>';
    html += '<div class="field"><label>Lens System</label><select id="fLensSystem" onchange="markDirty()"><option value="">—</option><option value="Rod Lens">Rod Lens</option><option value="Acromat">Acromat</option><option value="IB">IB</option></select></div>';
    html += '<label style="font-size:10px;display:flex;align-items:center;gap:5px;cursor:pointer;font-weight:500"><input type="checkbox" id="fAutoclave" onchange="markDirty()"/> Autoclave</label>';
    html += '<div class="field"><label>Connectors</label><input type="number" id="fConnectorsCount" onchange="markDirty()" placeholder="—" style="width:60px"/></div>';
    html += '</div>';
  } else if (scopeType === 'F' && dir === 'in') {
    // Flex incoming: angulation measurements + metadata
    html += '<div class="pf-cat">Angulation</div>';
    html += '<div class="insp-row">';
    html += '<div class="field"><label>Up</label><input type="number" id="fAngInUp_flex" style="text-align:center" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Down</label><input type="number" id="fAngInDown_flex" style="text-align:center" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Right</label><input type="number" id="fAngInRight_flex" style="text-align:center" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Left</label><input type="number" id="fAngInLeft_flex" style="text-align:center" onchange="markDirty()"/></div>';
    html += '</div>';
    html += '<div class="pf-cat">Additional</div>';
    html += '<div class="insp-row" style="grid-template-columns:repeat(3,1fr)">';
    html += '<div class="field"><label>Broken Fibers In</label><input id="fFlexFibersIn" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Incoming Epoxy Size</label><input type="number" id="fFlexEpoxyIn" step="0.01" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>BR Jig Size</label><input id="fFlexBRJig" onchange="markDirty()"/></div>';
    html += '</div>';
    // Metadata
    html += '<div class="pf-cat">Metadata</div>';
    html += '<div class="insp-row" style="grid-template-columns:repeat(5,1fr)">';
    html += '<div class="field"><label>Checked In By</label><input id="fCheckedInBy" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Inspector Name</label><input id="fInspectorName" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Time Received</label><input type="time" id="fTimeReceived" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Time Cleaned</label><input type="time" id="fTimeCleaned" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Time Soaked</label><input type="time" id="fTimeSoaked" onchange="markDirty()"/></div>';
    html += '</div>';
    // Condition
    html += '<div class="pf-cat">Condition</div>';
    html += '<div class="insp-checks">';
    html += '<label><input type="checkbox" id="fRepairable" onchange="markDirty()"/> Scope is Repairable</label>';
    html += '<label><input type="checkbox" id="fUsable" onchange="markDirty()"/> Scope is Usable</label>';
    html += '<label><input type="checkbox" id="fImproperCare" onchange="markDirty()"/> Result of Improper Care</label>';
    html += '<label><input type="checkbox" id="fFailureDuringCase" onchange="markDirty()"/> Failure During Case</label>';
    html += '</div>';
  } else if (scopeType === 'C' && dir === 'in') {
    // Camera incoming: metadata only
    html += '<div class="pf-cat">Metadata</div>';
    html += '<div class="insp-row" style="grid-template-columns:repeat(5,1fr)">';
    html += '<div class="field"><label>Checked In By</label><input id="fCheckedInBy" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Inspector Name</label><input id="fInspectorName" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Time Received</label><input type="time" id="fTimeReceived" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Time Cleaned</label><input type="time" id="fTimeCleaned" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Time Soaked</label><input type="time" id="fTimeSoaked" onchange="markDirty()"/></div>';
    html += '</div>';
    // Condition
    html += '<div class="pf-cat">Condition</div>';
    html += '<div class="insp-checks">';
    html += '<label><input type="checkbox" id="fRepairable" onchange="markDirty()"/> Scope is Repairable</label>';
    html += '<label><input type="checkbox" id="fUsable" onchange="markDirty()"/> Scope is Usable</label>';
    html += '</div>';
  }

  // Post-Repair outgoing sections (same for all types)
  if (dir === 'out') {
    if (scopeType === 'R') {
      html += '<div class="pf-cat">Outgoing Measurements</div>';
      html += '<div class="insp-row" style="grid-template-columns:repeat(3,1fr)">';
      html += '<div class="field"><label>Tube Length Out</label><input type="number" id="fLengthOut" onchange="markDirty()" placeholder="—"/></div>';
      html += '<div class="field"><label>Tube Diameter Out</label><input type="number" id="fDiameterOut" onchange="markDirty()" placeholder="—"/></div>';
      html += '<div class="field"><label>PS Level Out</label><select id="fPSLevelOut" onchange="markDirty()"></select></div>';
      html += '</div>';
    }
    html += '<div class="pf-cat">Broken Fibers</div>';
    html += '<div class="insp-row" style="grid-template-columns:1fr 1fr">';
    html += '<div class="field"><label>Broken Fibers In</label><input id="fBrokenFibersIn" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Broken Fibers Out</label><input id="fBrokenFibersOut" onchange="markDirty()"/></div>';
    html += '</div>';
    html += '<div class="pf-cat">QC Sign-off</div>';
    html += '<div class="insp-row">';
    html += '<div class="field"><label>Final QC Date</label><input type="date" id="fFinalQCDate" onchange="markDirty()"/></div>';
    html += '<div class="field"><label>Inspected By</label><input id="fFinalInspector" onchange="markDirty()"/></div>';
    html += '<label style="font-size:10px;display:flex;align-items:center;gap:5px;cursor:pointer;font-weight:500;padding-top:14px"><input type="checkbox" id="fReworkRequired" onchange="markDirty()"/> Rework Required</label>';
    html += '<div class="field"><label>Final P/F Status</label><select id="fFinalPFStatus" onchange="markDirty()"><option value="">—</option><option value="P">Pass</option><option value="F">Fail</option></select></div>';
    html += '</div>';
  }

  return html;
}

// ── P/F toggle button helpers ──
function togglePF(btn) {
  const cur = btn.textContent.trim();
  if (cur === '—' || cur === 'F') { btn.textContent = 'P'; btn.className = 'pf-btn pf-pass'; }
  else { btn.textContent = 'F'; btn.className = 'pf-btn pf-fail'; }
  // Color both cells (label + btn-cell)
  const item = btn.closest('.pf-item');
  if (item) {
    const cls = btn.textContent === 'P' ? 'pf-cell-pass' : 'pf-cell-fail';
    item.querySelectorAll('.pf-cell').forEach(c => { c.classList.remove('pf-cell-pass','pf-cell-fail'); c.classList.add(cls); });
  }
  updatePFCounter(btn);
  markDirty();
}
function togglePFByField(field) {
  const btn = document.querySelector('.pf-btn[data-field="' + field + '"]');
  if (btn) togglePF(btn);
}
function setPFBtn(field, val) {
  const btn = document.querySelector('.pf-btn[data-field="' + field + '"]');
  if (!btn) return;
  if (val === 'P') { btn.textContent = 'P'; btn.className = 'pf-btn pf-pass'; }
  else if (val === 'F') { btn.textContent = 'F'; btn.className = 'pf-btn pf-fail'; }
  else { btn.textContent = '—'; btn.className = 'pf-btn'; }
  const item = btn.closest('.pf-item');
  if (item) { const cls = val === 'P' ? 'pf-cell-pass' : val === 'F' ? 'pf-cell-fail' : ''; item.querySelectorAll('.pf-cell').forEach(c => { c.classList.remove('pf-cell-pass','pf-cell-fail'); if (cls) c.classList.add(cls); }); }
}
function pfAllPass(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.querySelectorAll('.pf-btn').forEach(btn => {
    btn.textContent = 'P'; btn.className = 'pf-btn pf-pass';
    const item = btn.closest('.pf-item');
    if (item) item.querySelectorAll('.pf-cell').forEach(c => { c.classList.remove('pf-cell-fail'); c.classList.add('pf-cell-pass'); });
  });
  updatePFCounterByPanel(panelId);
  markDirty();
}
function pfClearAll(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.querySelectorAll('.pf-btn').forEach(btn => {
    btn.textContent = '—'; btn.className = 'pf-btn';
    const item = btn.closest('.pf-item');
    if (item) item.querySelectorAll('.pf-cell').forEach(c => { c.classList.remove('pf-cell-pass','pf-cell-fail'); });
  });
  updatePFCounterByPanel(panelId);
  markDirty();
}
function updatePFCounter(btn) {
  const panel = btn.closest('.pf-grid');
  if (panel && panel.id) updatePFCounterByPanel(panel.id);
}
function updatePFCounterByPanel(panelId) {
  const panel = document.getElementById(panelId);
  const counter = document.getElementById(panelId + 'Count');
  if (!panel || !counter) return;
  const btns = panel.querySelectorAll('.pf-btn');
  const done = Array.from(btns).filter(b => b.textContent.trim() !== '—').length;
  const fails = Array.from(btns).filter(b => b.textContent.trim() === 'F').length;
  counter.textContent = done + '/' + btns.length + (fails ? ' (' + fails + ' fail)' : '');
  counter.style.color = done === btns.length ? (fails ? 'var(--danger)' : 'var(--success)') : 'var(--navy)';
}
function getPFBtn(field) {
  const btn = document.querySelector('.pf-btn[data-field="' + field + '"]');
  if (!btn) return '';
  const v = btn.textContent.trim();
  return (v === 'P' || v === 'F') ? v : '';
}

// ── Sync form field values back to local _currentRepair object ──

// ── Exports ──
window.INSPECTION_TEMPLATES = INSPECTION_TEMPLATES;
window.renderInspectionCategories = renderInspectionCategories;
window.checkAngSpec = checkAngSpec;
window.saveDIForm = saveDIForm;
window.printBlankDI = printBlankDI;
window.renderFlexDIChecklist = renderFlexDIChecklist;
window.renderInspectionContent = renderInspectionContent;
window.togglePF = togglePF;
window.togglePFByField = togglePFByField;
window.setPFBtn = setPFBtn;
window.getPFBtn = getPFBtn;
window.pfAllPass = pfAllPass;
window.pfClearAll = pfClearAll;
window.updatePFCounter = updatePFCounter;
window.updatePFCounterByPanel = updatePFCounterByPanel;
})();
