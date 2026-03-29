/**
 * StatusBadge — semantic inline badge/chip.
 *
 * Uses existing CSS classes: badge, b-active, b-inactive, b-pass, b-fail,
 * b-conditional, ss-info, ss-danger, ss-warn, ss-active, ss-neutral,
 * b-draft, b-open, b-invoiced, b-cancelled, b-quoted
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {string} options.text - Badge label text
 * @param {'active'|'inactive'|'pass'|'fail'|'conditional'|
 *          'info'|'danger'|'warn'|'success'|'neutral'|
 *          'draft'|'open'|'invoiced'|'cancelled'|'quoted'} options.variant - Semantic variant
 * @param {boolean} [options.pill=true] - Use pill radius (default matches design system)
 *
 * Convenience factory: StatusBadge.render(text, variant) → HTML string (no DOM needed)
 */
export function StatusBadge(container, options = {}) {
  const defaults = {
    text: '',
    variant: 'neutral',
  };

  const opts = { ...defaults, ...options };
  let el;

  const VARIANT_CLASS = {
    active:      'badge b-active',
    inactive:    'badge b-inactive',
    pass:        'badge b-pass',
    fail:        'badge b-fail',
    conditional: 'badge b-conditional',
    info:        'badge ss-info',
    danger:      'badge ss-danger',
    warn:        'badge ss-warn',
    success:     'badge ss-active',
    neutral:     'badge ss-neutral',
    draft:       'badge b-draft',
    open:        'badge b-open',
    invoiced:    'badge b-invoiced',
    cancelled:   'badge b-cancelled',
    quoted:      'badge b-quoted',
  };

  function render() {
    container.innerHTML = '';
    el = document.createElement('span');
    el.className = VARIANT_CLASS[opts.variant] || 'badge ss-neutral';
    el.textContent = opts.text;
    container.appendChild(el);
  }

  render();

  return {
    setText(text) {
      opts.text = text;
      if (el) el.textContent = text;
    },
    setVariant(variant) {
      opts.variant = variant;
      if (el) el.className = VARIANT_CLASS[variant] || 'badge ss-neutral';
    },
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      render();
    },
    getState() {
      return { text: opts.text, variant: opts.variant };
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}

/**
 * Convenience function — returns an HTML string for inline use in table cells / render functions.
 * No DOM required.
 *
 * @param {string} text
 * @param {string} variant - Same values as options.variant above
 * @returns {string} HTML string
 */
StatusBadge.html = function(text, variant) {
  const VARIANT_CLASS = {
    active:      'badge b-active',
    inactive:    'badge b-inactive',
    pass:        'badge b-pass',
    fail:        'badge b-fail',
    conditional: 'badge b-conditional',
    info:        'badge ss-info',
    danger:      'badge ss-danger',
    warn:        'badge ss-warn',
    success:     'badge ss-active',
    neutral:     'badge ss-neutral',
    draft:       'badge b-draft',
    open:        'badge b-open',
    invoiced:    'badge b-invoiced',
    cancelled:   'badge b-cancelled',
    quoted:      'badge b-quoted',
  };
  const cls = VARIANT_CLASS[variant] || 'badge ss-neutral';
  return `<span class="${cls}">${text}</span>`;
};

/**
 * Map a raw status string to a badge variant.
 * Useful for normalizing API status values.
 *
 * @param {string} status
 * @returns {string} variant key
 */
StatusBadge.variantFor = function(status) {
  const map = {
    'active': 'active',
    'inactive': 'inactive',
    'pass': 'pass',
    'fail': 'fail',
    'open': 'open',
    'draft': 'draft',
    'invoiced': 'invoiced',
    'invoice sent': 'invoiced',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'quote sent': 'quoted',
    'quoted': 'quoted',
    'warning': 'warn',
    'pending': 'warn',
    'conditional': 'conditional',
    'info': 'info',
  };
  return map[(status || '').toLowerCase()] || 'neutral';
};
