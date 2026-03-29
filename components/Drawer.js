/**
 * Drawer — slide-out right panel (600px standard width).
 *
 * Uses existing CSS classes: drawer, drawer-head, dh-info, dh-sn, dh-sub,
 * drawer-close, drawer-body, drawer-footer, drawer-overlay, drawer-tab (dtab),
 * dpane, section-card, section-head, section-body, open
 *
 * @param {HTMLElement} container - Parent element to append drawer + overlay into
 *   (typically document.body or the .shell element)
 * @param {Object} options - Configuration options
 * @param {string} options.id - Unique id for the drawer element
 * @param {string} [options.title=''] - Header title (.dh-sn)
 * @param {string} [options.subtitle=''] - Header subtitle (.dh-sub)
 * @param {string} [options.width='600px'] - Drawer width (override if needed)
 * @param {Array<{id:string, label:string, content:HTMLElement|string}>} [options.tabs] - Drawer tabs.
 *   If omitted, the body is a single scrollable area.
 * @param {HTMLElement|string} [options.body] - Body content when no tabs are used
 * @param {HTMLElement|string} [options.footer] - Footer content (buttons area)
 * @param {boolean} [options.hasOverlay=true] - Show backdrop overlay
 * @param {Function} [options.onOpen] - Called when drawer opens
 * @param {Function} [options.onClose] - Called when drawer closes
 */
export function Drawer(container, options = {}) {
  const defaults = {
    id: 'drawer-' + Math.random().toString(36).slice(2),
    title: '',
    subtitle: '',
    width: '600px',
    tabs: null,
    body: null,
    footer: null,
    hasOverlay: true,
    onOpen: null,
    onClose: null,
  };

  const opts = { ...defaults, ...options };

  let drawerEl, overlayEl, activeTabId;

  // ── Build ─────────────────────────────────────────────────────────────────

  function buildHeader() {
    const head = document.createElement('div');
    head.className = 'drawer-head';

    const info = document.createElement('div');
    info.className = 'dh-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'dh-sn';
    titleEl.id = opts.id + '-title';
    titleEl.textContent = opts.title;
    info.appendChild(titleEl);

    if (opts.subtitle !== null) {
      const sub = document.createElement('div');
      sub.className = 'dh-sub';
      sub.id = opts.id + '-sub';
      sub.textContent = opts.subtitle;
      info.appendChild(sub);
    }

    head.appendChild(info);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'drawer-close';
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    closeBtn.addEventListener('click', () => close());
    head.appendChild(closeBtn);

    return head;
  }

  function buildTabs() {
    if (!opts.tabs || !opts.tabs.length) return null;

    const tabBar = document.createElement('div');
    tabBar.className = 'dtabs';

    const panes = document.createElement('div');
    panes.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden';

    activeTabId = activeTabId || opts.tabs[0].id;

    opts.tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = 'dtab' + (tab.id === activeTabId ? ' active' : '');
      tabEl.dataset.tabId = tab.id;
      tabEl.textContent = tab.label;
      tabEl.addEventListener('click', () => switchDrawerTab(tab.id));
      tabBar.appendChild(tabEl);

      const pane = document.createElement('div');
      pane.className = 'dpane' + (tab.id === activeTabId ? ' active' : '');
      pane.id = opts.id + '-pane-' + tab.id;
      if (typeof tab.content === 'string') {
        pane.innerHTML = tab.content;
      } else if (tab.content instanceof HTMLElement) {
        pane.appendChild(tab.content);
      }
      panes.appendChild(pane);
    });

    return { tabBar, panes };
  }

  function switchDrawerTab(id) {
    activeTabId = id;
    drawerEl.querySelectorAll('.dtab').forEach(el => {
      el.classList.toggle('active', el.dataset.tabId === id);
    });
    drawerEl.querySelectorAll('.dpane').forEach(el => {
      el.classList.toggle('active', el.id === opts.id + '-pane-' + id);
    });
  }

  function buildBody() {
    const body = document.createElement('div');
    body.className = 'drawer-body';
    body.id = opts.id + '-body';
    if (typeof opts.body === 'string') {
      body.innerHTML = opts.body;
    } else if (opts.body instanceof HTMLElement) {
      body.appendChild(opts.body);
    }
    return body;
  }

  function buildFooter() {
    if (!opts.footer) return null;
    const footer = document.createElement('div');
    footer.className = 'drawer-footer';
    footer.id = opts.id + '-footer';
    if (typeof opts.footer === 'string') {
      footer.innerHTML = opts.footer;
    } else if (opts.footer instanceof HTMLElement) {
      footer.appendChild(opts.footer);
    }
    return footer;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  function open() {
    drawerEl.classList.add('open');
    if (overlayEl) overlayEl.classList.add('open');
    opts.onOpen && opts.onOpen();
  }

  function close() {
    drawerEl.classList.remove('open');
    if (overlayEl) overlayEl.classList.remove('open');
    opts.onClose && opts.onClose();
  }

  // ── Mount ─────────────────────────────────────────────────────────────────

  function mount() {
    // Overlay
    if (opts.hasOverlay) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'drawer-overlay';
      overlayEl.id = opts.id + '-overlay';
      overlayEl.addEventListener('click', () => close());
      container.appendChild(overlayEl);
    }

    // Drawer
    drawerEl = document.createElement('div');
    drawerEl.className = 'drawer';
    drawerEl.id = opts.id;
    if (opts.width !== '600px') {
      drawerEl.style.width = opts.width;
    }

    drawerEl.appendChild(buildHeader());

    const tabsResult = buildTabs();
    if (tabsResult) {
      drawerEl.appendChild(tabsResult.tabBar);
      drawerEl.appendChild(tabsResult.panes);
    } else {
      drawerEl.appendChild(buildBody());
    }

    const footerEl = buildFooter();
    if (footerEl) drawerEl.appendChild(footerEl);

    container.appendChild(drawerEl);
  }

  mount();

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    open,
    close,
    /** Check if drawer is open */
    isOpen() {
      return drawerEl.classList.contains('open');
    },
    /** Update header title and/or subtitle */
    setHeader(title, subtitle) {
      const titleEl = document.getElementById(opts.id + '-title');
      if (titleEl && title !== undefined) titleEl.textContent = title;
      const subEl = document.getElementById(opts.id + '-sub');
      if (subEl && subtitle !== undefined) subEl.textContent = subtitle;
    },
    /** Replace body content */
    setBody(content) {
      const body = document.getElementById(opts.id + '-body');
      if (!body) return;
      if (typeof content === 'string') {
        body.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        body.innerHTML = '';
        body.appendChild(content);
      }
    },
    /** Replace footer content */
    setFooter(content) {
      const footer = document.getElementById(opts.id + '-footer');
      if (!footer) return;
      if (typeof content === 'string') {
        footer.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        footer.innerHTML = '';
        footer.appendChild(content);
      }
    },
    /** Activate a tab by id */
    switchTab(id) {
      switchDrawerTab(id);
    },
    /** Get the drawer DOM element */
    getEl() {
      return drawerEl;
    },
    /** Get a tab pane element by tab id */
    getPane(tabId) {
      return document.getElementById(opts.id + '-pane-' + tabId);
    },
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      if (newOptions.title || newOptions.subtitle) {
        this.setHeader(newOptions.title, newOptions.subtitle);
      }
    },
    getState() {
      return { open: this.isOpen(), activeTabId };
    },
    destroy() {
      drawerEl && drawerEl.remove();
      overlayEl && overlayEl.remove();
    },
  };
}
