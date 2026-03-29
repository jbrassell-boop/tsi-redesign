/**
 * FormGrid — CSS grid container for form fields.
 *
 * Uses existing CSS classes: fg, g2, g3, g4, span2, span3
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {2|3|4} [options.cols=2] - Number of grid columns
 * @param {string} [options.gap='8px 12px'] - CSS gap (row-gap col-gap)
 * @param {Array<{el:HTMLElement|string, span?:2|3}>} [options.fields] - Fields to render.
 *   el can be an HTMLElement or an HTML string. span controls grid-column span.
 */
export function FormGrid(container, options = {}) {
  const defaults = {
    cols: 2,
    gap: '8px 12px',
    fields: [],
  };

  const opts = { ...defaults, ...options };
  let gridEl;

  const colClass = { 2: 'g2', 3: 'g3', 4: 'g4' };
  const spanClass = { 2: 'span2', 3: 'span3' };

  // ── Render ───────────────────────────────────────────────────────────────

  function render() {
    container.innerHTML = '';

    gridEl = document.createElement('div');
    gridEl.className = `fg ${colClass[opts.cols] || 'g2'}`;
    gridEl.style.gap = opts.gap;

    opts.fields.forEach(field => {
      const wrapper = document.createElement('div');

      // Apply span class if needed
      if (field.span && spanClass[field.span]) {
        wrapper.className = spanClass[field.span];
      }

      // Mount the field element
      if (typeof field.el === 'string') {
        wrapper.innerHTML = field.el;
      } else if (field.el instanceof HTMLElement) {
        wrapper.appendChild(field.el);
      }

      gridEl.appendChild(wrapper);
    });

    container.appendChild(gridEl);
  }

  render();

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    /** Get the underlying grid element for direct DOM manipulation */
    getGrid() {
      return gridEl;
    },
    /** Append a field to the grid */
    addField(fieldConfig) {
      opts.fields.push(fieldConfig);
      render();
    },
    /** Re-render with new options */
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      render();
    },
    getState() {
      return { cols: opts.cols, fieldCount: opts.fields.length };
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}
