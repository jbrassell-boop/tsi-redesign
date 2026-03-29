/**
 * Panel — card container with a section header and content body.
 *
 * Uses existing CSS classes: panel, panel-head, panel-body
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {string} options.title - Panel header text
 * @param {HTMLElement|string} [options.body] - Body content
 * @param {HTMLElement|string} [options.headerAction] - Optional element in the header (right side)
 */
export function Panel(container, options = {}) {
  const defaults = {
    title: '',
    body: '',
    headerAction: null,
  };

  const opts = { ...defaults, ...options };
  let panelEl, bodyEl;

  function render() {
    container.innerHTML = '';

    panelEl = document.createElement('div');
    panelEl.className = 'panel';

    // Header
    const head = document.createElement('div');
    head.className = 'panel-head';

    if (opts.headerAction) {
      head.style.cssText = 'display:flex;align-items:center;justify-content:space-between';
      const titleSpan = document.createElement('span');
      titleSpan.textContent = opts.title;
      head.appendChild(titleSpan);
      if (typeof opts.headerAction === 'string') {
        const actionEl = document.createElement('span');
        actionEl.innerHTML = opts.headerAction;
        head.appendChild(actionEl);
      } else if (opts.headerAction instanceof HTMLElement) {
        head.appendChild(opts.headerAction);
      }
    } else {
      head.textContent = opts.title;
    }
    panelEl.appendChild(head);

    // Body
    bodyEl = document.createElement('div');
    bodyEl.className = 'panel-body';
    setBodyContent(opts.body);
    panelEl.appendChild(bodyEl);

    container.appendChild(panelEl);
  }

  function setBodyContent(content) {
    if (!bodyEl) return;
    bodyEl.innerHTML = '';
    if (typeof content === 'string') {
      bodyEl.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      bodyEl.appendChild(content);
    }
  }

  render();

  return {
    /** Get the body element for direct DOM manipulation */
    getBody() {
      return bodyEl;
    },
    /** Replace body content */
    setBody(content) {
      opts.body = content;
      setBodyContent(content);
    },
    /** Update panel title */
    setTitle(title) {
      opts.title = title;
      const head = panelEl.querySelector('.panel-head');
      if (head) head.textContent = title;
    },
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      render();
    },
    getState() {
      return { title: opts.title };
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}
