/**
 * Modal — overlay dialog with animated open/close, header, body, and footer.
 *
 * Uses existing CSS classes: modal-overlay, modal-box, modal-header,
 * modal-header-red, modal-close, modal-body, modal-footer,
 * btn-cancel, btn-save, btn-danger (open class for visibility)
 *
 * Transition: opacity 0.2s on overlay + translateY(15px)→0 on modal-box
 *
 * @param {HTMLElement} container - Parent to append the modal into (typically document.body)
 * @param {Object} options - Configuration options
 * @param {string} options.id - Unique id for the modal overlay element
 * @param {string} [options.title=''] - Modal header title
 * @param {'sm'|'md'|''|'lg'} [options.size=''] - Size variant: sm=420px, md=620px, lg=780px, ''=680px
 * @param {boolean} [options.danger=false] - Use red header (modal-header-red)
 * @param {HTMLElement|string} [options.body=''] - Body content
 * @param {Array<ModalAction>} [options.actions=[]] - Footer action buttons. Cancel first, primary last.
 * @param {boolean} [options.closeOnOverlay=true] - Close when clicking backdrop
 * @param {Function} [options.onOpen] - Called when modal opens
 * @param {Function} [options.onClose] - Called when modal closes
 *
 * @typedef {Object} ModalAction
 * @property {string} label - Button text
 * @property {'save'|'cancel'|'danger'|'outline'} [variant='outline'] - Button style
 * @property {Function} onClick - Click handler; return false to prevent auto-close
 */
export function Modal(container, options = {}) {
  const defaults = {
    id: 'modal-' + Math.random().toString(36).slice(2),
    title: '',
    size: '',
    danger: false,
    body: '',
    actions: [],
    closeOnOverlay: true,
    onOpen: null,
    onClose: null,
  };

  const opts = { ...defaults, ...options };
  let overlayEl, modalEl, bodyEl;

  // ── Build ─────────────────────────────────────────────────────────────────

  function build() {
    overlayEl = document.createElement('div');
    overlayEl.className = 'modal-overlay';
    overlayEl.id = opts.id;

    if (opts.closeOnOverlay) {
      overlayEl.addEventListener('click', e => {
        if (e.target === overlayEl) close();
      });
    }

    const sizeClass = opts.size ? ` ${opts.size}` : '';
    modalEl = document.createElement('div');
    modalEl.className = `modal-box${sizeClass}`;
    modalEl.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    modalEl.style.transform = 'translateY(15px)';
    modalEl.style.opacity = '0';

    // Header
    const header = document.createElement('div');
    header.className = opts.danger ? 'modal-header modal-header-red' : 'modal-header';

    const h3 = document.createElement('h3');
    h3.id = opts.id + '-title';
    h3.textContent = opts.title;
    header.appendChild(h3);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', () => close());
    header.appendChild(closeBtn);
    modalEl.appendChild(header);

    // Body
    bodyEl = document.createElement('div');
    bodyEl.className = 'modal-body';
    bodyEl.id = opts.id + '-body';
    setBodyContent(opts.body);
    modalEl.appendChild(bodyEl);

    // Footer
    if (opts.actions && opts.actions.length) {
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.id = opts.id + '-footer';
      buildFooterActions(footer);
      modalEl.appendChild(footer);
    }

    overlayEl.appendChild(modalEl);
    container.appendChild(overlayEl);
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

  const ACTION_CLASS = {
    save:    'btn-save',
    cancel:  'btn-cancel',
    danger:  'btn btn-danger',
    outline: 'btn-cancel',
  };

  function buildFooterActions(footer) {
    footer.innerHTML = '';
    opts.actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = ACTION_CLASS[action.variant || 'outline'] || 'btn-cancel';
      btn.textContent = action.label;
      btn.addEventListener('click', e => {
        const result = action.onClick && action.onClick(e);
        if (result !== false) close();
      });
      footer.appendChild(btn);
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  function open() {
    overlayEl.classList.add('open');
    // Animate modal in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modalEl.style.transform = 'translateY(0)';
        modalEl.style.opacity = '1';
      });
    });
    opts.onOpen && opts.onOpen();
  }

  function close() {
    modalEl.style.transform = 'translateY(15px)';
    modalEl.style.opacity = '0';
    setTimeout(() => {
      overlayEl.classList.remove('open');
      opts.onClose && opts.onClose();
    }, 200);
  }

  build();

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    open,
    close,
    isOpen() {
      return overlayEl.classList.contains('open');
    },
    /** Update header title */
    setTitle(title) {
      const titleEl = document.getElementById(opts.id + '-title');
      if (titleEl) titleEl.textContent = title;
    },
    /** Replace body content */
    setBody(content) {
      opts.body = content;
      setBodyContent(content);
    },
    /** Get the body element for direct DOM manipulation */
    getBody() {
      return bodyEl;
    },
    /** Get the modal-box element */
    getEl() {
      return modalEl;
    },
    /** Replace footer actions */
    setActions(actions) {
      opts.actions = actions;
      const footer = document.getElementById(opts.id + '-footer');
      if (footer) buildFooterActions(footer);
    },
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      if (newOptions.title) this.setTitle(newOptions.title);
      if (newOptions.body !== undefined) this.setBody(newOptions.body);
      if (newOptions.actions) this.setActions(newOptions.actions);
    },
    getState() {
      return { open: this.isOpen() };
    },
    destroy() {
      overlayEl && overlayEl.remove();
    },
  };
}
