/* ─── Instrument Catalog Tab ───
   Part of instruments.html — 3-column cascade: Category → Manufacturer/Models → Detail
   All functions/variables prefixed with ic_ to avoid namespace collisions.
   Entry point: ic_init() — called lazily when tab first clicked.
   Depends on: js/parent-groups.js, js/instrument-catalog-data.js (IC_DATA, IC_CATEGORIES, IC_MANUFACTURERS)
*/

var ic_allItems       = [];
var ic_byCat          = {};   // category → [items]
var ic_catParent      = {};   // category → parent group code
var ic_catInstGroup   = {};   // category → instrument group code (only for INST parent)
var ic_activeCat      = null;
var ic_mfrSearch      = '';
var ic_selectedKey    = null;
var ic_inited         = false;
var ic_activeParent   = null;  // null = All
var ic_activeInstGrp  = null;  // null = All Instruments

var IC = {KEY:0, CAT:1, CODE:2, REPAIRS:3, STATUS:4, MFR_KEY:5, MFR:6, MDL_KEY:7, MDL:8, MAX:9, HPG:10, VIZ:11, SS:12, USED:13};

function ic_init() {
  if (ic_inited) return;
  ic_inited = true;

  // Build objects from flat arrays and index by category
  ic_allItems = IC_DATA.map(function(r) {
    return {
      scopeTypeKey: r[IC.KEY],
      category:     r[IC.CAT] || '',
      itemCode:     r[IC.CODE] || '',
      repairsNeeded:r[IC.REPAIRS] || '',
      status:       r[IC.STATUS] || 'Active',
      mfrKey:       r[IC.MFR_KEY],
      manufacturer: r[IC.MFR] || '',
      modelKey:     r[IC.MDL_KEY],
      model:        String(r[IC.MDL] || ''),
      maxCharge:    r[IC.MAX] || 0,
      hpgMax:       r[IC.HPG] || 0,
      vizientMax:   r[IC.VIZ] || 0,
      ssMax:        r[IC.SS] || 0,
      usedCount:    r[IC.USED] || 0
    };
  });

  // Index by category
  ic_allItems.forEach(function(item) {
    if (!ic_byCat[item.category]) ic_byCat[item.category] = [];
    ic_byCat[item.category].push(item);
  });

  // Classify each category → parent group + instrument group
  if (typeof getFullHierarchy === 'function') {
    IC_CATEGORIES.forEach(function(cat) {
      var h = getFullHierarchy('I', cat);
      ic_catParent[cat] = h.parentCode;
      if (h.groupCode) ic_catInstGroup[cat] = h.groupCode;
    });
  }

  // Instrument catalog shows instruments only — drop CAM, CART, SITE items
  ic_allItems = ic_allItems.filter(function(item) {
    return (ic_catParent[item.category] || 'INST') === 'INST';
  });
  ic_byCat = {};
  ic_allItems.forEach(function(item) {
    if (!ic_byCat[item.category]) ic_byCat[item.category] = [];
    ic_byCat[item.category].push(item);
  });

  // Parent bar not needed — catalog is instruments only
  var bar = document.getElementById('ic_parentBar');
  if (bar) bar.style.display = 'none';
  ic_buildInstGroupBar();

  ic_renderCategoryList();
  ic_updateStats();
}

// ─── Build parent group bar dynamically (only groups with items) ───
function ic_buildParentBar() {
  var bar = document.getElementById('ic_parentBar');
  if (!bar || typeof PARENT_GROUPS === 'undefined') return;

  // Count items per parent group
  var pgCounts = {};
  var total = 0;
  IC_CATEGORIES.forEach(function(cat) {
    var p = ic_catParent[cat] || 'INST';
    var cnt = ic_byCat[cat] ? ic_byCat[cat].length : 0;
    pgCounts[p] = (pgCounts[p] || 0) + cnt;
    total += cnt;
  });

  var html = '<button class="seg-btn active" onclick="ic_setParent(null, this)">All <span style="font-size:9px;opacity:.6">(' + total.toLocaleString() + ')</span></button>';
  PARENT_GROUPS.forEach(function(g) {
    var cnt = pgCounts[g.code] || 0;
    if (cnt === 0) return; // Hide empty groups
    html += '<button class="seg-btn" onclick="ic_setParent(\'' + g.code + '\', this)">' +
      g.name + ' <span style="font-size:9px;opacity:.6">(' + cnt.toLocaleString() + ')</span></button>';
  });
  bar.innerHTML = html;
}

// ─── Build instrument group sidebar list ───
function ic_buildInstGroupBar() {
  var bar = document.getElementById('ic_instGroupBar');
  if (!bar || typeof INSTRUMENT_GROUPS === 'undefined') return;

  // Count items per instrument group
  var grpCounts = {};
  var total = 0;
  IC_CATEGORIES.forEach(function(cat) {
    var grp = ic_catInstGroup[cat];
    var count = ic_byCat[cat] ? ic_byCat[cat].length : 0;
    total += count;
    if (!grp) return;
    grpCounts[grp] = (grpCounts[grp] || 0) + count;
  });

  var html = '<div class="ic-grp-row active" onclick="ic_setInstGroup(null, this)">All Groups<span class="ic-grp-count">' + total.toLocaleString() + '</span></div>';
  INSTRUMENT_GROUPS.forEach(function(g) {
    var cnt = grpCounts[g.code] || 0;
    html += '<div class="ic-grp-row" onclick="ic_setInstGroup(\'' + g.code + '\', this)">' +
      g.name + '<span class="ic-grp-count">' + cnt + '</span></div>';
  });
  bar.innerHTML = html;
}

// ─── Parent Group Filter ───
function ic_setParent(code, el) {
  ic_activeParent = code;
  ic_activeInstGrp = null;
  ic_activeCat = null;

  // Highlight active button
  document.querySelectorAll('#ic_parentBar .seg-btn').forEach(function(b) { b.classList.remove('active'); });
  if (el) el.classList.add('active');

  // Show/hide instrument group sub-bar
  var subBar = document.getElementById('ic_instGroupBar');
  if (subBar) {
    subBar.style.display = (code === 'INST') ? '' : 'none';
    // Reset sub-bar active state
    subBar.querySelectorAll('.seg-btn').forEach(function(b, i) { b.classList.toggle('active', i === 0); });
  }

  // Clear search, re-render
  var searchEl = document.getElementById('ic_catSearch');
  if (searchEl) searchEl.value = '';
  ic_renderCategoryList();
  ic_updateStats();

  // Clear col 2 + 3
  ic_clearMfrArea();
  ic_closeDetail();
}

// ─── Instrument Group Sub-Filter ───
function ic_setInstGroup(code, el) {
  ic_activeInstGrp = code;
  ic_activeCat = null;

  var bar = document.getElementById('ic_instGroupBar');
  if (bar) bar.querySelectorAll('.ic-grp-row').forEach(function(b) { b.classList.remove('active'); });
  if (el) el.classList.add('active');

  var searchEl = document.getElementById('ic_catSearch');
  if (searchEl) searchEl.value = '';
  ic_renderCategoryList();
  ic_updateStats();

  ic_clearMfrArea();
  ic_closeDetail();
}

function ic_clearMfrArea() {
  var area = document.getElementById('ic_mfrModelArea');
  if (area) area.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--muted);font-size:11px">Select a category to see manufacturers &amp; models</div>';
  var head = document.getElementById('ic_mfrHead');
  if (head) head.textContent = 'Select a category';
}

// ─── Category List (Col 1) ───
function ic_renderCategoryList(filter) {
  var list = document.getElementById('ic_catList');
  if (!list) return;
  var search = (filter || '').toLowerCase();

  var cats = IC_CATEGORIES.filter(function(c) {
    // Parent group filter
    if (ic_activeParent) {
      var catPar = ic_catParent[c] || 'INST';
      if (catPar !== ic_activeParent) return false;
    }
    // Instrument group sub-filter
    if (ic_activeInstGrp) {
      var catGrp = ic_catInstGroup[c] || 'SPEC';
      if (catGrp !== ic_activeInstGrp) return false;
    }

    if (!search) return true;
    // Match category name
    if (c.toLowerCase().indexOf(search) !== -1) return true;
    // Also match manufacturers/models within category
    var items = ic_byCat[c];
    if (!items) return false;
    return items.some(function(item) {
      return (item.manufacturer.toLowerCase().indexOf(search) !== -1) ||
             (item.model.toLowerCase().indexOf(search) !== -1) ||
             (item.itemCode.toLowerCase().indexOf(search) !== -1);
    });
  });

  var html = '';
  cats.forEach(function(cat) {
    var count = ic_byCat[cat] ? ic_byCat[cat].length : 0;
    var active = ic_activeCat === cat ? ' active' : '';
    html += '<div class="ic-cat-item' + active + '" onclick="ic_selectCategory(\'' + ic_esc(cat).replace(/'/g, "\\'") + '\')">' +
      '<span>' + ic_esc(cat) + '</span>' +
      '<span class="ic-cat-count">' + count + '</span>' +
      '</div>';
  });

  list.innerHTML = html || '<div style="padding:20px;text-align:center;color:var(--muted);font-size:11px">No categories match</div>';
  document.getElementById('ic_catCount').textContent = '(' + cats.length + ')';
}

function ic_filterCategories() {
  var val = document.getElementById('ic_catSearch').value;
  ic_renderCategoryList(val);
}

// ─── Select Category → show Manufacturers + Models (Col 2) ───
function ic_selectCategory(cat) {
  ic_activeCat = cat;
  // If a global search is active and it doesn't match the category name itself,
  // carry it into the manufacturer/model filter so matching items are visible
  var catSearch = (document.getElementById('ic_catSearch').value || '').toLowerCase();
  var catNameMatches = cat.toLowerCase().indexOf(catSearch) !== -1;
  var searchInp = document.getElementById('ic_mfrSearch');
  if (catSearch && !catNameMatches) {
    ic_mfrSearch = catSearch;
    if (searchInp) searchInp.value = catSearch;
  } else {
    ic_mfrSearch = '';
    if (searchInp) searchInp.value = '';
  }

  // Re-render category list to show active state
  var catSearch = document.getElementById('ic_catSearch');
  ic_renderCategoryList(catSearch ? catSearch.value : '');

  // Update header
  document.getElementById('ic_mfrHead').textContent = cat + ' — Manufacturers & Models';

  // Render manufacturer groups
  ic_renderMfrModels();
}

function ic_renderMfrModels() {
  var area = document.getElementById('ic_mfrModelArea');
  if (!ic_activeCat || !ic_byCat[ic_activeCat]) {
    area.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--muted);font-size:11px">Select a category</div>';
    return;
  }

  var items = ic_byCat[ic_activeCat];
  var search = ic_mfrSearch.toLowerCase();

  // Group by manufacturer
  var mfrMap = {};
  var mfrOrder = [];
  items.forEach(function(item) {
    var mfr = item.manufacturer || '(No Manufacturer)';
    // Apply search filter
    if (search) {
      var haystack = (mfr + ' ' + item.model + ' ' + item.itemCode).toLowerCase();
      if (haystack.indexOf(search) === -1) return;
    }
    if (!mfrMap[mfr]) {
      mfrMap[mfr] = [];
      mfrOrder.push(mfr);
    }
    mfrMap[mfr].push(item);
  });

  mfrOrder.sort();

  if (mfrOrder.length === 0) {
    area.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--muted);font-size:11px">No results match your search</div>';
    return;
  }

  var html = '';
  mfrOrder.forEach(function(mfr) {
    var models = mfrMap[mfr];
    models.sort(function(a, b) { return a.model.localeCompare(b.model); });

    html += '<div class="ic-mfr-group">';
    html += '<div class="ic-mfr-head" onclick="ic_toggleMfr(this)">';
    html += '<span>' + ic_esc(mfr) + ' <span style="font-weight:400;color:var(--muted);font-size:10px">(' + models.length + ' model' + (models.length === 1 ? '' : 's') + ')</span></span>';
    html += '<span class="ic-mfr-toggle">&#9660;</span>';
    html += '</div>';
    html += '<div class="ic-mfr-body">';

    models.forEach(function(item) {
      var sel = ic_selectedKey === (item.scopeTypeKey + '-' + item.modelKey) ? ' selected' : '';
      html += '<div class="ic-model-row' + sel + '" onclick="ic_selectModel(' + item.scopeTypeKey + ',' + (item.modelKey || 0) + ',this)">';
      html += '<span class="ic-model-name" title="' + ic_esc(item.model) + '">' + ic_esc(item.model || '(unnamed)') + '</span>';
      html += '<span style="font-size:9px;color:var(--muted)">' + ic_esc(item.itemCode) + '</span>';
      html += '<span class="ic-model-charge">' + ic_fmtCharge(item.maxCharge) + '</span>';
      html += '<span class="ic-model-used" title="Used in last 365 days">' + (item.usedCount || 0) + '</span>';
      html += '</div>';
    });

    html += '</div></div>';
  });

  area.innerHTML = html;
}

function ic_toggleMfr(el) {
  var group = el.parentElement;
  group.classList.toggle('collapsed');
}

function ic_filterMfrModels() {
  ic_mfrSearch = (document.getElementById('ic_mfrSearch').value || '');
  if (!ic_activeCat && ic_mfrSearch.trim().length >= 2) {
    var head = document.getElementById('ic_mfrHead');
    if (head) head.textContent = 'Search Results';
    ic_renderGlobalInline(ic_findByModel(ic_mfrSearch));
    return;
  }
  ic_renderMfrModels();
}

// ─── Select Model → Detail (Col 3) ───
function ic_selectModel(scopeTypeKey, modelKey, el) {
  ic_selectedKey = scopeTypeKey + '-' + modelKey;

  // Highlight
  document.querySelectorAll('.ic-model-row').forEach(function(r) { r.classList.remove('selected'); });
  if (el) el.classList.add('selected');

  // Find item
  var item = ic_allItems.find(function(it) {
    return it.scopeTypeKey === scopeTypeKey && (it.modelKey || 0) === modelKey;
  });
  if (!item) return;

  // Open detail overlay
  document.getElementById('ic_detailPanel').classList.add('open');

  document.getElementById('ic_dItemCode').textContent = item.itemCode || '—';
  document.getElementById('ic_dCategory').textContent = item.category || '—';
  document.getElementById('ic_dManufacturer').textContent = item.manufacturer || '—';
  document.getElementById('ic_dModel').textContent = item.model || '—';
  document.getElementById('ic_dStatus').textContent = item.status || '—';
  document.getElementById('ic_dRepairs').textContent = item.repairsNeeded || '—';
  document.getElementById('ic_dMaxCharge').textContent = ic_fmtCharge(item.maxCharge);
  document.getElementById('ic_dHpgMax').textContent = ic_fmtCharge(item.hpgMax);
  document.getElementById('ic_dVizientMax').textContent = ic_fmtCharge(item.vizientMax);
  document.getElementById('ic_dSsMax').textContent = ic_fmtCharge(item.ssMax);
  document.getElementById('ic_dUsedCount').textContent = item.usedCount || 0;
  document.getElementById('ic_dScopeKey').textContent = item.scopeTypeKey || '—';

  // Show parent group + instrument group in detail
  var h = (typeof getFullHierarchy === 'function') ? getFullHierarchy('I', item.category) : null;
  var pgEl = document.getElementById('ic_dParentGroup');
  var igEl = document.getElementById('ic_dInstGroup');
  if (pgEl) pgEl.textContent = h ? h.parentName : '—';
  if (igEl) igEl.textContent = h ? (h.groupName || '—') : '—';
}

// ─── Stats ───
function ic_updateStats() {
  // Filtered items based on active parent + inst group
  var filtered = ic_allItems;
  if (ic_activeParent || ic_activeInstGrp) {
    filtered = ic_allItems.filter(function(it) {
      if (ic_activeParent) {
        var p = ic_catParent[it.category] || 'INST';
        if (p !== ic_activeParent) return false;
      }
      if (ic_activeInstGrp) {
        var g = ic_catInstGroup[it.category] || 'SPEC';
        if (g !== ic_activeInstGrp) return false;
      }
      return true;
    });
  }

  var total = filtered.length;
  var cats = {};
  var mfrs = {};
  var totalUsed = 0;
  filtered.forEach(function(it) {
    cats[it.category] = true;
    if (it.manufacturer) mfrs[it.manufacturer] = true;
    totalUsed += (it.usedCount || 0);
  });

  var el = function(id) { return document.getElementById(id); };
  if (el('ic_ssTotal'))  el('ic_ssTotal').textContent = total.toLocaleString();
  if (el('ic_ssCats'))   el('ic_ssCats').textContent = Object.keys(cats).length;
  if (el('ic_ssMfrs'))   el('ic_ssMfrs').textContent = Object.keys(mfrs).length;
  if (el('ic_ssUsed'))   el('ic_ssUsed').textContent = totalUsed.toLocaleString();

  var tabCount = document.getElementById('ic_tabCount');
  if (tabCount) tabCount.textContent = ic_allItems.length.toLocaleString();
}

// ─── Model Number Reverse Lookup ─────────────────────────────────────────────

// Search across all items by model, itemCode, or manufacturer
function ic_findByModel(term) {
  var t = (term || '').toLowerCase().trim();
  if (t.length < 2) return [];
  return ic_allItems.filter(function(it) {
    return (it.model        && it.model.toLowerCase().includes(t)) ||
           (it.itemCode     && it.itemCode.toLowerCase().includes(t)) ||
           (it.manufacturer && it.manufacturer.toLowerCase().includes(t));
  }).slice(0, 50);
}

// Navigate the cascade to a specific item by scopeTypeKey + modelKey
function ic_navigateToKey(scopeTypeKey, modelKey) {
  var mk = (modelKey === undefined || modelKey === null) ? 0 : modelKey;
  var item = ic_allItems.find(function(x) {
    return x.scopeTypeKey === scopeTypeKey && (x.modelKey || 0) === mk;
  });
  // Fallback: match scopeTypeKey only
  if (!item) item = ic_allItems.find(function(x) { return x.scopeTypeKey === scopeTypeKey; });
  ic_navigateTo(item);
}

// Drive the cascade: Group → Category → Manufacturer/Model → Detail
function ic_navigateTo(item) {
  if (!item) return;

  // 1. Activate the right instrument group row
  var groupCode = ic_catInstGroup[item.category] || null;
  ic_activeInstGrp = groupCode;
  var bar = document.getElementById('ic_instGroupBar');
  if (bar) {
    bar.querySelectorAll('.ic-grp-row').forEach(function(row) {
      var onclick = row.getAttribute('onclick') || '';
      var isMatch = groupCode ? onclick.indexOf("'" + groupCode + "'") !== -1 : onclick.indexOf('null') !== -1;
      row.classList.toggle('active', isMatch);
    });
  }

  // 2. Clear search, set active category, re-render category list
  var catSearchEl = document.getElementById('ic_catSearch');
  if (catSearchEl) catSearchEl.value = '';
  ic_activeCat = item.category;
  ic_renderCategoryList();

  setTimeout(function() {
    var active = document.querySelector('.ic-cat-item.active');
    if (active) active.scrollIntoView({block: 'nearest'});
  }, 50);

  // 3. Show this category's models, pre-filter to the model name
  document.getElementById('ic_mfrHead').textContent = item.category + ' \u2014 Manufacturers & Models';
  var mfrSearchEl = document.getElementById('ic_mfrSearch');
  if (mfrSearchEl) { mfrSearchEl.value = item.model; ic_mfrSearch = item.model; }
  ic_renderMfrModels();

  // Close global search dropdown
  var gsResults = document.getElementById('ic_globalResults');
  if (gsResults) gsResults.style.display = 'none';
  var gsInput = document.getElementById('ic_globalSearch');
  if (gsInput) gsInput.value = '';

  // 4. Select model + open detail panel
  setTimeout(function() {
    ic_selectModel(item.scopeTypeKey, item.modelKey || 0, null);
  }, 80);

  ic_updateStats();
}

// Global search bar handler (debounced 150ms)
var ic_globalSearchTimer = null;
function ic_onGlobalSearch(term) {
  clearTimeout(ic_globalSearchTimer);
  var wrap = document.getElementById('ic_globalResults');
  if (!wrap) return;
  if ((term || '').trim().length < 2) { wrap.style.display = 'none'; return; }
  ic_globalSearchTimer = setTimeout(function() {
    ic_renderGlobalResults(ic_findByModel(term));
  }, 150);
}

function ic_renderGlobalResults(items) {
  var wrap = document.getElementById('ic_globalResults');
  if (!wrap) return;
  if (!items.length) {
    wrap.innerHTML = '<div style="padding:10px 12px;font-size:10.5px;color:var(--muted)">No matches found</div>';
    wrap.style.display = '';
    return;
  }
  wrap.innerHTML = items.map(function(it) {
    var grpName = 'Specialty & Misc';
    if (typeof INSTRUMENT_GROUPS !== 'undefined') {
      var gc = ic_catInstGroup[it.category];
      var g = gc ? INSTRUMENT_GROUPS.find(function(x) { return x.code === gc; }) : null;
      if (g) grpName = g.name;
    }
    return '<div class="ic-gs-row" onclick="ic_navigateToKey(' + it.scopeTypeKey + ',' + (it.modelKey || 0) + ')">' +
      '<span style="font-weight:700;color:var(--navy)">' + ic_esc(it.model || it.itemCode) + '</span>' +
      '<span>' + ic_esc(it.manufacturer) + '</span>' +
      '<span style="color:var(--muted)">' + ic_esc(it.category) + '</span>' +
      '<span style="color:var(--muted);opacity:.75">' + ic_esc(grpName) + '</span>' +
      '<span style="font-weight:600;text-align:right">' + ic_fmtCharge(it.maxCharge) + '</span>' +
      '</div>';
  }).join('');
  wrap.style.display = '';
}

// Col-2 inline results when no category is selected
function ic_renderGlobalInline(items) {
  var area = document.getElementById('ic_mfrModelArea');
  if (!area) return;
  if (!items.length) {
    area.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--muted);font-size:11px">No matches found</div>';
    return;
  }
  var catMap = {}, catOrder = [];
  items.forEach(function(it) {
    if (!catMap[it.category]) { catMap[it.category] = []; catOrder.push(it.category); }
    catMap[it.category].push(it);
  });
  var html = '';
  catOrder.forEach(function(cat) {
    html += '<div style="padding:4px 12px 3px;font-size:9.5px;font-weight:700;color:var(--navy);background:var(--neutral-50);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.04em">' + ic_esc(cat) + '</div>';
    catMap[cat].forEach(function(it) {
      html += '<div class="ic-model-row" style="padding-left:16px" onclick="ic_navigateToKey(' + it.scopeTypeKey + ',' + (it.modelKey || 0) + ')">' +
        '<span class="ic-model-name">' + ic_esc(it.model || it.itemCode) + '</span>' +
        '<span style="font-size:9px;color:var(--muted)">' + ic_esc(it.manufacturer) + '</span>' +
        '<span class="ic-model-charge">' + ic_fmtCharge(it.maxCharge) + '</span>' +
        '</div>';
    });
  });
  area.innerHTML = html;
}

// ─── Helpers ───
function ic_esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function ic_fmtCharge(n) {
  if (n == null || n === 0 || n === '' || isNaN(n)) return '—';
  return '$' + parseFloat(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function ic_closeDetail() {
  document.getElementById('ic_detailPanel').classList.remove('open');
  ic_selectedKey = null;
  document.querySelectorAll('.ic-model-row').forEach(function(r) { r.classList.remove('selected'); });
}
