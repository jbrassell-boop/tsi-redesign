/**
 * TabBar — tab navigation strip with active state, optional badge counts,
 * and content panel switching.
 *
 * Uses existing CSS classes: tab-bar, tab, tab-content (show / show-block),
 * tab-count (optional badge)
 *
 * @param {HTMLElement} container - Mount target for the tab bar
 * @param {Object} options - Configuration options
 * @param {Array<{id:string, label:string, badge?:string|number, contentEl?:HTMLElement}>} options.tabs
 *   - id: unique identifier used to match .tab-content panels in the DOM
 *   - label: display text
 *   - badge: optional pill count (omit to hide)
 *   - contentEl: if provided, the component manages show/hide itself;
 *                otherwise it expects a #tab-{id} element already in the DOM
 * @param {string} [options.activeTab] - id of initially active tab (defaults to first)
 * @param {boolean} [options.blockContent=false] - Use show-block instead of show (flex)
 * @param {Function} [options.onTabChange] - Called with (id, tabConfig) on activation
 */
export function TabBar(container, options = {}) {
  const defaults = {
    tabs: [],
    activeTab: null,
    blockContent: false,
    onTabChange: null,
  };

  const opts = { ...defaults, ...options };

  let state = {
    activeId: opts.activeTab || (opts.tabs[0] && opts.tabs[0].id) || null,
  };

  let barEl;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getContentEl(tabId) {
    const cfg = opts.tabs.find(t => t.id === tabId);
    if (cfg && cfg.contentEl) return cfg.contentEl;
    return document.getElementById(`tab-${tabId}`);
  }

  function hideAll() {
    opts.tabs.forEach(t => {
      const el = getContentEl(t.id);
      if (el) {
        el.classList.remove('show', 'show-block');
      }
    });
  }

  function activateTab(id) {
    state.activeId = id;

    // Update tab button states
    barEl.querySelectorAll('.tab').forEach(tabEl => {
      const isActive = tabEl.dataset.tabId === id;
      tabEl.classList.toggle('active', isActive);
    });

    // Switch content panels
    hideAll();
    const contentEl = getContentEl(id);
    if (contentEl) {
      contentEl.classList.add(opts.blockContent ? 'show-block' : 'show');
    }

    const cfg = opts.tabs.find(t => t.id === id);
    opts.onTabChange && opts.onTabChange(id, cfg);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  function render() {
    barEl.innerHTML = '';

    opts.tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = 'tab' + (tab.id === state.activeId ? ' active' : '');
      tabEl.dataset.tabId = tab.id;
      tabEl.textContent = tab.label;

      if (tab.badge !== undefined && tab.badge !== null && tab.badge !== '') {
        const badge = document.createElement('span');
        badge.className = 'tab-count';
        badge.style.cssText = 'margin-left:5px;background:var(--navy);color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:8px;vertical-align:middle';
        badge.textContent = tab.badge;
        tabEl.appendChild(badge);
      }

      tabEl.addEventListener('click', () => activateTab(tab.id));
      barEl.appendChild(tabEl);
    });
  }

  // ── Mount ────────────────────────────────────────────────────────────────

  function mount() {
    container.innerHTML = '';
    barEl = document.createElement('div');
    barEl.className = 'tab-bar';
    container.appendChild(barEl);
    render();

    // Show the initial active tab content
    hideAll();
    if (state.activeId) {
      const contentEl = getContentEl(state.activeId);
      if (contentEl) {
        contentEl.classList.add(opts.blockContent ? 'show-block' : 'show');
      }
    }
  }

  mount();

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    /** Programmatically activate a tab by id */
    activate(id) {
      activateTab(id);
    },
    /** Update a tab's badge count */
    setBadge(id, value) {
      const tab = opts.tabs.find(t => t.id === id);
      if (tab) {
        tab.badge = value;
        render();
      }
    },
    /** Add a new tab at runtime */
    addTab(tabConfig) {
      opts.tabs.push(tabConfig);
      render();
    },
    /** Remove a tab by id */
    removeTab(id) {
      opts.tabs = opts.tabs.filter(t => t.id !== id);
      if (state.activeId === id && opts.tabs.length) {
        state.activeId = opts.tabs[0].id;
      }
      render();
    },
    /** Re-render with new options */
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      if (newOptions.activeTab) state.activeId = newOptions.activeTab;
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
