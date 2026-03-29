/**
 * SearchInput — search bar with magnifier icon, debounce, and clear button.
 *
 * Uses existing CSS class: search-input
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {string} [options.id] - Input element id
 * @param {string} [options.placeholder='Search...'] - Placeholder text
 * @param {number} [options.debounce=300] - Debounce delay in ms
 * @param {string} [options.value=''] - Initial value
 * @param {boolean} [options.showClear=true] - Show × clear button when input has value
 * @param {Function} [options.onSearch] - Called with (value) after debounce
 * @param {Function} [options.onClear] - Called when clear button clicked
 */
export function SearchInput(container, options = {}) {
  const defaults = {
    id: '',
    placeholder: 'Search...',
    debounce: 300,
    value: '',
    showClear: true,
    onSearch: null,
    onClear: null,
  };

  const opts = { ...defaults, ...options };
  let inputEl, clearBtn, timer;

  // ── Render ───────────────────────────────────────────────────────────────

  function render() {
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';

    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'search-input';
    if (opts.id) inputEl.id = opts.id;
    inputEl.placeholder = opts.placeholder;
    inputEl.value = opts.value;

    inputEl.addEventListener('input', () => {
      updateClearBtn();
      clearTimeout(timer);
      timer = setTimeout(() => {
        opts.onSearch && opts.onSearch(inputEl.value);
      }, opts.debounce);
    });

    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        clear();
      }
    });

    container.appendChild(inputEl);

    if (opts.showClear) {
      clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.style.cssText = `
        position:absolute;right:8px;background:none;border:none;cursor:pointer;
        color:var(--muted);font-size:14px;line-height:1;padding:0;display:none;
        width:16px;height:16px;align-items:center;justify-content:center;
      `;
      clearBtn.innerHTML = '&times;';
      clearBtn.title = 'Clear';
      clearBtn.addEventListener('click', () => clear());
      container.appendChild(clearBtn);
      updateClearBtn();
    }
  }

  function updateClearBtn() {
    if (clearBtn) {
      clearBtn.style.display = inputEl.value ? 'flex' : 'none';
    }
  }

  function clear() {
    inputEl.value = '';
    updateClearBtn();
    clearTimeout(timer);
    opts.onSearch && opts.onSearch('');
    opts.onClear && opts.onClear();
    inputEl.focus();
  }

  render();

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    getValue() {
      return inputEl ? inputEl.value : '';
    },
    setValue(val) {
      if (inputEl) {
        inputEl.value = val;
        updateClearBtn();
      }
    },
    focus() {
      inputEl && inputEl.focus();
    },
    clear,
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      render();
    },
    getState() {
      return { value: this.getValue() };
    },
    destroy() {
      clearTimeout(timer);
      container.innerHTML = '';
    },
  };
}
