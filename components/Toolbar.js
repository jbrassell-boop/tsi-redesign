/**
 * Toolbar — action bar following the standard pattern:
 *   primary button → divider → filter controls → search input (margin-left auto, right)
 *
 * Uses existing CSS classes: toolbar, toolbar-group, btn, btn-navy, btn-outline,
 * divider, seg-group, seg-btn, filter-sep (inline alias for divider), search-input
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {Object} [options.primaryAction] - Primary (navy) button config
 *   @param {string} options.primaryAction.label - Button text
 *   @param {string} [options.primaryAction.icon] - SVG string to prepend
 *   @param {Function} options.primaryAction.onClick - Click handler
 * @param {Object[]} [options.overflowActions] - Additional actions rendered in a "..." dropdown
 *   Each: { label, icon?, onClick, danger? }
 * @param {Object[]} [options.segments] - Segmented filter groups, rendered after first divider
 *   Each group: { label?, id, options: [{label, value}], value, onChange }
 * @param {Object[]} [options.selects] - Dropdown filter selects
 *   Each: { id, options: [{label, value}], value, placeholder, onChange, minWidth? }
 * @param {Object[]} [options.dateRanges] - Date range pairs [{labelFrom, labelTo, idFrom, idTo, onChange}]
 * @param {Object} [options.search] - Search input config
 *   @param {string} options.search.id - Input element id
 *   @param {string} [options.search.placeholder='Search...']
 *   @param {number} [options.search.debounce=300] - Debounce ms
 *   @param {Function} options.search.onSearch - Called with (value) after debounce
 * @param {Object[]} [options.extraButtons] - Extra btn-outline buttons on the right side
 *   Each: { label, icon?, onClick }
 */
export function Toolbar(container, options = {}) {
  const defaults = {
    primaryAction: null,
    overflowActions: [],
    segments: [],
    selects: [],
    dateRanges: [],
    search: null,
    extraButtons: [],
  };

  const opts = { ...defaults, ...options };

  let el;
  let debounceTimer;
  let overflowOpen = false;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function makeSvgBtn(svgStr, label) {
    const wrapper = document.createElement('span');
    wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:6px';
    if (svgStr) {
      wrapper.insertAdjacentHTML('beforeend', svgStr);
    }
    wrapper.insertAdjacentText('beforeend', label);
    return wrapper;
  }

  function makeFilterSep() {
    const sep = document.createElement('div');
    sep.className = 'divider';
    return sep;
  }

  function makeFilterLabel(text) {
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;white-space:nowrap;letter-spacing:.04em';
    lbl.textContent = text;
    return lbl;
  }

  // ── Build sections ───────────────────────────────────────────────────────

  function buildPrimary() {
    if (!opts.primaryAction) return null;
    const btn = document.createElement('button');
    btn.className = 'btn btn-navy';
    if (opts.primaryAction.icon) {
      btn.insertAdjacentHTML('beforeend', opts.primaryAction.icon);
    }
    btn.insertAdjacentText('beforeend', opts.primaryAction.label);
    btn.addEventListener('click', opts.primaryAction.onClick);
    return btn;
  }

  function buildOverflow() {
    if (!opts.overflowActions || !opts.overflowActions.length) return null;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:inline-flex;align-items:center';

    const btn = document.createElement('button');
    btn.className = 'btn btn-outline';
    btn.style.cssText = 'padding:4px 10px;font-size:16px;letter-spacing:2px;color:#6b7c93;border-color:#d0d6dd';
    btn.innerHTML = '&#x22EF;';
    btn.title = 'More actions';

    const menu = document.createElement('div');
    menu.style.cssText = 'display:none;position:absolute;top:100%;left:0;margin-top:4px;background:#fff;border:1px solid #d0d6dd;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:9999;min-width:200px;padding:6px 0;font-size:13px';

    function closeMenu() {
      menu.style.display = 'none';
      overflowOpen = false;
    }

    btn.addEventListener('click', e => {
      e.stopPropagation();
      overflowOpen = !overflowOpen;
      menu.style.display = overflowOpen ? 'block' : 'none';
    });

    document.addEventListener('click', closeMenu);

    opts.overflowActions.forEach((action, i) => {
      if (action.separator) {
        const sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:#e8eaed;margin:4px 12px';
        menu.appendChild(sep);
        return;
      }

      const item = document.createElement('button');
      item.style.cssText = `display:flex;align-items:center;gap:8px;width:100%;padding:8px 16px;border:none;background:none;cursor:pointer;font-size:13px;text-align:left;font-family:inherit;color:${action.danger ? '#c53030' : '#b8860b'}`;
      const hoverBg = action.danger ? '#fef2f2' : '#f7f3e8';
      item.addEventListener('mouseover', () => { item.style.background = hoverBg; });
      item.addEventListener('mouseout', () => { item.style.background = ''; });

      if (action.icon) item.insertAdjacentHTML('beforeend', action.icon);
      item.insertAdjacentText('beforeend', action.label);

      item.addEventListener('click', () => {
        closeMenu();
        action.onClick && action.onClick();
      });
      menu.appendChild(item);
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    return wrap;
  }

  function buildSegments() {
    const frags = [];
    opts.segments.forEach(seg => {
      if (seg.label) frags.push(makeFilterLabel(seg.label));
      const group = document.createElement('div');
      group.className = 'seg-group';
      if (seg.id) group.id = seg.id;

      seg.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'seg-btn' + (opt.value === seg.value ? ' active' : '');
        btn.dataset.val = opt.value;
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          group.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          seg.onChange && seg.onChange(opt.value, btn);
        });
        group.appendChild(btn);
      });
      frags.push(group);
    });
    return frags;
  }

  function buildSelects() {
    return opts.selects.map(cfg => {
      const sel = document.createElement('select');
      sel.className = 'filter-dd';
      if (cfg.id) sel.id = cfg.id;
      if (cfg.minWidth) sel.style.minWidth = cfg.minWidth;
      sel.style.cssText += `;height:30px;border:1.5px solid var(--border-dk);border-radius:6px;padding:0 8px;font-size:11px;font-family:inherit;color:var(--text);background:var(--card);outline:none;cursor:pointer`;

      if (cfg.placeholder) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = cfg.placeholder;
        sel.appendChild(opt);
      }
      cfg.options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        if (o.value === cfg.value) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', () => cfg.onChange && cfg.onChange(sel.value, sel));
      return sel;
    });
  }

  function buildDateRanges() {
    const frags = [];
    opts.dateRanges.forEach(range => {
      if (range.labelFrom) frags.push(makeFilterLabel(range.labelFrom));
      const from = document.createElement('input');
      from.type = 'date';
      from.className = 'filter-dd';
      if (range.idFrom) from.id = range.idFrom;
      from.style.cssText = 'height:30px;min-width:120px;border:1.5px solid var(--border-dk);border-radius:6px;padding:0 8px;font-size:11px;font-family:inherit;cursor:pointer';
      from.addEventListener('change', () => range.onChange && range.onChange(from.value, to.value));
      frags.push(from);

      if (range.labelTo) frags.push(makeFilterLabel(range.labelTo));
      const to = document.createElement('input');
      to.type = 'date';
      to.className = 'filter-dd';
      if (range.idTo) to.id = range.idTo;
      to.style.cssText = 'height:30px;min-width:120px;border:1.5px solid var(--border-dk);border-radius:6px;padding:0 8px;font-size:11px;font-family:inherit;cursor:pointer';
      to.addEventListener('change', () => range.onChange && range.onChange(from.value, to.value));
      frags.push(to);
    });
    return frags;
  }

  function buildSearch() {
    if (!opts.search) return null;
    const input = document.createElement('input');
    input.className = 'search-input';
    input.type = 'text';
    input.placeholder = opts.search.placeholder || 'Search...';
    if (opts.search.id) input.id = opts.search.id;
    input.style.marginLeft = 'auto';
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const delay = opts.search.debounce !== undefined ? opts.search.debounce : 300;
      debounceTimer = setTimeout(() => {
        opts.search.onSearch && opts.search.onSearch(input.value);
      }, delay);
    });
    return input;
  }

  function buildExtraButtons() {
    return opts.extraButtons.map(cfg => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline';
      if (cfg.icon) btn.insertAdjacentHTML('beforeend', cfg.icon);
      btn.insertAdjacentText('beforeend', cfg.label);
      btn.addEventListener('click', cfg.onClick);
      return btn;
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  function render() {
    el.innerHTML = '';

    // Primary action button
    const primary = buildPrimary();
    if (primary) el.appendChild(primary);

    // Overflow menu (... button)
    const overflow = buildOverflow();
    if (overflow) el.appendChild(overflow);

    // Segments (with leading divider if there's a primary)
    const segEls = buildSegments();
    if (segEls.length) {
      if (primary || overflow) el.appendChild(makeFilterSep());
      segEls.forEach(s => el.appendChild(s));
    }

    // Selects (filter dropdowns)
    const selEls = buildSelects();
    if (selEls.length) {
      if (primary || overflow || segEls.length) el.appendChild(makeFilterSep());
      selEls.forEach(s => el.appendChild(s));
    }

    // Date range pickers
    const dateEls = buildDateRanges();
    if (dateEls.length) {
      if (primary || overflow || segEls.length || selEls.length) el.appendChild(makeFilterSep());
      dateEls.forEach(d => el.appendChild(d));
    }

    // Extra buttons (right side, before search)
    const extraEls = buildExtraButtons();
    extraEls.forEach(b => el.appendChild(b));

    // Search input (pushes to right via margin-left:auto)
    const searchEl = buildSearch();
    if (searchEl) el.appendChild(searchEl);
  }

  // ── Mount ────────────────────────────────────────────────────────────────

  function mount() {
    container.innerHTML = '';
    el = document.createElement('div');
    el.className = 'toolbar';
    container.appendChild(el);
    render();
  }

  mount();

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    /** Re-render with updated options */
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      render();
    },
    /** Set the active segment value for a given segment id */
    setSegment(segId, value) {
      const seg = opts.segments.find(s => s.id === segId);
      if (seg) {
        seg.value = value;
        const group = el.querySelector(`#${segId}`);
        if (group) {
          group.querySelectorAll('.seg-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.val === String(value));
          });
        }
      }
    },
    /** Get the search input element for direct access */
    getSearchInput() {
      return el.querySelector('.search-input');
    },
    getState() {
      return {};
    },
    destroy() {
      clearTimeout(debounceTimer);
      container.innerHTML = '';
    },
  };
}
