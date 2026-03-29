/**
 * ContextMenu — right-click (or programmatically positioned) floating menu.
 *
 * Uses existing CSS classes: ctx-menu, ctx-item, ctx-sep, ctx-item.danger
 *
 * There should be ONE instance per page, repositioned as needed.
 *
 * @param {HTMLElement} container - Parent to append menu into (document.body recommended)
 * @param {Object} options - Configuration options
 * @param {string} [options.id='ctxMenu'] - Element id
 * @param {Array<ContextMenuItem>} [options.items=[]] - Menu items
 *
 * @typedef {Object} ContextMenuItem
 * @property {string} [label] - Display text (omit for separator)
 * @property {boolean} [separator=false] - Render as a separator line
 * @property {string} [icon] - SVG string (14x14 recommended)
 * @property {boolean} [danger=false] - Red color + red hover
 * @property {Function} [onClick] - Click handler; called with (itemConfig)
 */
export function ContextMenu(container, options = {}) {
  const defaults = {
    id: 'ctxMenu',
    items: [],
  };

  const opts = { ...defaults, ...options };
  let menuEl;

  function render() {
    container.innerHTML = '';
    menuEl = document.createElement('div');
    menuEl.className = 'ctx-menu';
    menuEl.id = opts.id;
    buildItems(opts.items);
    container.appendChild(menuEl);
  }

  function buildItems(items) {
    menuEl.innerHTML = '';
    items.forEach(item => {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'ctx-sep';
        menuEl.appendChild(sep);
        return;
      }

      const el = document.createElement('div');
      el.className = 'ctx-item' + (item.danger ? ' danger' : '');
      if (item.disabled) {
        el.style.opacity = '0.45';
        el.style.cursor = 'default';
        el.style.pointerEvents = 'none';
      }

      if (item.icon) el.insertAdjacentHTML('beforeend', item.icon);
      el.insertAdjacentText('beforeend', item.label || '');

      el.addEventListener('click', e => {
        hide();
        item.onClick && item.onClick(item, e);
      });

      menuEl.appendChild(el);
    });
  }

  function show(x, y, items) {
    if (items) buildItems(items);
    menuEl.style.display = 'block';

    // Clamp to viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mw = menuEl.offsetWidth || 200;
    const mh = menuEl.offsetHeight || items ? items.length * 34 : 200;

    const left = x + mw > vw ? Math.max(0, vw - mw - 8) : x;
    const top = y + mh > vh ? Math.max(0, y - mh) : y;

    menuEl.style.left = left + 'px';
    menuEl.style.top = top + 'px';
  }

  function hide() {
    if (menuEl) menuEl.style.display = 'none';
  }

  // Close on click outside or Escape
  document.addEventListener('click', hide);
  document.addEventListener('contextmenu', hide);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hide();
  });

  render();

  return {
    /**
     * Show the menu at a given position, optionally with a fresh items list.
     * @param {number} x - clientX from the contextmenu event
     * @param {number} y - clientY from the contextmenu event
     * @param {Array} [items] - Override items for this invocation
     */
    show,
    hide,
    /** Update items list permanently */
    setItems(items) {
      opts.items = items;
      buildItems(items);
    },
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      if (newOptions.items) buildItems(newOptions.items);
    },
    getState() {
      return { visible: menuEl && menuEl.style.display === 'block' };
    },
    destroy() {
      document.removeEventListener('click', hide);
      document.removeEventListener('contextmenu', hide);
      menuEl && menuEl.remove();
    },
  };
}
