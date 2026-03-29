/**
 * StatStrip — horizontal KPI chip row. Chips are optionally clickable
 * to filter data below. Supports active chip highlighting.
 *
 * Uses existing CSS classes: stat-strip, stat-chip, s-icon, s-data,
 * s-val, s-lbl, si-green, si-blue, si-navy, si-amber, si-red, si-purple,
 * s-green, s-blue, s-navy, s-amber, s-red, s-muted, active-chip
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {Array<StatChipConfig>} options.chips - KPI chip definitions
 * @param {Function} [options.onChipClick] - Called with (chipId, chipConfig) on click
 *
 * @typedef {Object} StatChipConfig
 * @property {string} id - Unique identifier
 * @property {string} value - Display value (e.g. "42" or "$1,200")
 * @property {string} label - Uppercase label below value (e.g. "TOTAL ORDERS")
 * @property {'green'|'blue'|'navy'|'amber'|'red'|'purple'} [iconColor='blue'] - Icon background color class (si-*)
 * @property {'green'|'blue'|'navy'|'amber'|'red'|'purple'|'muted'} [valueColor='navy'] - Value text color class (s-*)
 * @property {string} [icon] - SVG string for icon (16x16 recommended). Defaults to a dot.
 * @property {boolean} [clickable=true] - Whether chip responds to clicks
 * @property {boolean} [active=false] - Initially active/selected
 */
export function StatStrip(container, options = {}) {
  const defaults = {
    chips: [],
    onChipClick: null,
  };

  const opts = { ...defaults, ...options };

  let state = {
    activeId: opts.chips.find(c => c.active)?.id || null,
  };

  let stripEl;

  const DEFAULT_ICON = `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="4"/></svg>`;

  // ── Render ───────────────────────────────────────────────────────────────

  function render() {
    stripEl.innerHTML = '';

    opts.chips.forEach(chip => {
      const chipEl = document.createElement('div');
      chipEl.className = 'stat-chip' + (chip.id === state.activeId ? ' active-chip' : '');
      if (chip.clickable !== false) {
        chipEl.style.cursor = 'pointer';
        chipEl.addEventListener('click', () => handleChipClick(chip));
      }

      const iconColorClass = `si-${chip.iconColor || 'blue'}`;
      const valueColorClass = `s-${chip.valueColor || 'navy'}`;

      chipEl.innerHTML = `
        <div class="s-icon ${iconColorClass}">${chip.icon || DEFAULT_ICON}</div>
        <div class="s-data">
          <div class="s-val ${valueColorClass}" data-chip-val="${chip.id}">${chip.value}</div>
          <div class="s-lbl">${chip.label}</div>
        </div>
      `;

      stripEl.appendChild(chipEl);
    });
  }

  function handleChipClick(chip) {
    if (chip.clickable === false) return;
    // Toggle: clicking active chip deactivates it
    state.activeId = state.activeId === chip.id ? null : chip.id;
    render();
    opts.onChipClick && opts.onChipClick(chip.id, chip, state.activeId);
  }

  // ── Mount ────────────────────────────────────────────────────────────────

  function mount() {
    container.innerHTML = '';
    stripEl = document.createElement('div');
    stripEl.className = 'stat-strip';
    container.appendChild(stripEl);
    render();
  }

  mount();

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    /** Update a chip's value display */
    setValue(id, value) {
      const chip = opts.chips.find(c => c.id === id);
      if (chip) chip.value = value;
      const valEl = stripEl.querySelector(`[data-chip-val="${id}"]`);
      if (valEl) valEl.textContent = value;
    },
    /** Update all chip values at once. values is { id: value } */
    setValues(values) {
      Object.entries(values).forEach(([id, val]) => this.setValue(id, val));
    },
    /** Set active chip by id (null to clear) */
    setActive(id) {
      state.activeId = id;
      render();
    },
    /** Get currently active chip id */
    getActive() {
      return state.activeId;
    },
    /** Re-render with new chip configs */
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      render();
    },
    getState() {
      return { activeId: state.activeId };
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}
