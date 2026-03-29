/**
 * EmptyState — centered no-data placeholder with optional icon and message.
 *
 * Uses existing CSS classes: empty-state-full, empty-state-icon,
 * empty-state-title, empty-state-msg, empty-state-action
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {string} [options.title='No records found'] - Primary message
 * @param {string} [options.message=''] - Secondary/subtitle message
 * @param {string} [options.icon] - SVG string for icon (48x48 recommended)
 * @param {string} [options.actionLabel] - Optional action button label
 * @param {Function} [options.onAction] - Called when action button is clicked
 */
export function EmptyState(container, options = {}) {
  const DEFAULT_ICON = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>`;

  const defaults = {
    title: 'No records found',
    message: '',
    icon: DEFAULT_ICON,
    actionLabel: '',
    onAction: null,
  };

  const opts = { ...defaults, ...options };

  function render() {
    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'empty-state-full';

    if (opts.icon) {
      const iconWrap = document.createElement('div');
      iconWrap.className = 'empty-state-icon';
      iconWrap.innerHTML = opts.icon;
      wrap.appendChild(iconWrap);
    }

    const title = document.createElement('div');
    title.className = 'empty-state-title';
    title.textContent = opts.title;
    wrap.appendChild(title);

    if (opts.message) {
      const msg = document.createElement('div');
      msg.className = 'empty-state-msg';
      msg.textContent = opts.message;
      wrap.appendChild(msg);
    }

    if (opts.actionLabel && opts.onAction) {
      const actionWrap = document.createElement('div');
      actionWrap.className = 'empty-state-action';
      const btn = document.createElement('button');
      btn.className = 'btn btn-navy btn-sm';
      btn.textContent = opts.actionLabel;
      btn.addEventListener('click', opts.onAction);
      actionWrap.appendChild(btn);
      wrap.appendChild(actionWrap);
    }

    container.appendChild(wrap);
  }

  render();

  return {
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      render();
    },
    getState() {
      return {};
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}
