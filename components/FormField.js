/**
 * FormField — labeled form field wrapper (.ff) supporting all input types.
 *
 * Uses existing CSS classes: ff, inp, inp-sm, ro, req
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {string} options.id - Input element id attribute
 * @param {string} options.label - Field label text
 * @param {'text'|'email'|'tel'|'number'|'date'|'select'|'textarea'|'toggle'} [options.type='text'] - Input type
 * @param {string} [options.value=''] - Initial value
 * @param {string} [options.placeholder=''] - Placeholder text
 * @param {boolean} [options.required=false] - Show red asterisk
 * @param {boolean} [options.readonly=false] - Apply .ro class (read-only styling)
 * @param {boolean} [options.disabled=false] - Disable the input
 * @param {boolean} [options.small=false] - Use .inp-sm (28px height)
 * @param {Array<{value:string, label:string}>} [options.options=[]] - Options for select type
 * @param {string} [options.hint] - Optional hint text below input
 * @param {number} [options.maxlength] - maxlength attribute for text inputs
 * @param {Function} [options.onChange] - Called with (value, event) on input/change
 * @param {Function} [options.onBlur] - Called with (value, event) on blur
 */
export function FormField(container, options = {}) {
  const defaults = {
    id: '',
    label: '',
    type: 'text',
    value: '',
    placeholder: '',
    required: false,
    readonly: false,
    disabled: false,
    small: false,
    options: [],
    hint: '',
    maxlength: null,
    onChange: null,
    onBlur: null,
  };

  const opts = { ...defaults, ...options };
  let inputEl;

  // ── Build input element ───────────────────────────────────────────────────

  function buildInput() {
    let el;
    const inpClass = 'inp' + (opts.small ? ' inp-sm' : '') + (opts.readonly ? ' ro' : '');

    if (opts.type === 'select') {
      el = document.createElement('select');
      el.className = inpClass;
      opts.options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        if (o.value === opts.value || o.label === opts.value) opt.selected = true;
        el.appendChild(opt);
      });
      el.addEventListener('change', e => {
        opts.onChange && opts.onChange(el.value, e);
      });

    } else if (opts.type === 'textarea') {
      el = document.createElement('textarea');
      el.className = inpClass;
      el.value = opts.value;
      el.placeholder = opts.placeholder;
      el.addEventListener('input', e => opts.onChange && opts.onChange(el.value, e));

    } else if (opts.type === 'toggle') {
      // Returns the toggle wrapper; special handling
      const label = document.createElement('label');
      label.className = 'toggle';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = opts.id;
      checkbox.checked = opts.value === true || opts.value === 'true' || opts.value === 1;
      checkbox.disabled = opts.disabled;
      checkbox.addEventListener('change', e => opts.onChange && opts.onChange(checkbox.checked, e));
      const slider = document.createElement('span');
      slider.className = 'toggle-slider';
      label.appendChild(checkbox);
      label.appendChild(slider);
      return label;

    } else {
      el = document.createElement('input');
      el.type = opts.type;
      el.className = inpClass;
      el.value = opts.value;
      el.placeholder = opts.placeholder;
      if (opts.maxlength) el.maxLength = opts.maxlength;
      el.addEventListener('input', e => opts.onChange && opts.onChange(el.value, e));
    }

    if (opts.id) el.id = opts.id;
    if (opts.disabled) el.disabled = true;
    if (opts.readonly && el.tagName !== 'SELECT') el.readOnly = true;

    el.addEventListener('blur', e => opts.onBlur && opts.onBlur(el.value, e));

    return el;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  function render() {
    container.innerHTML = '';
    container.className = 'ff';

    // Label
    if (opts.label) {
      const lbl = document.createElement('label');
      if (opts.id) lbl.htmlFor = opts.id;
      lbl.textContent = opts.label;
      if (opts.required) {
        const req = document.createElement('span');
        req.className = 'req';
        req.textContent = ' *';
        lbl.appendChild(req);
      }
      container.appendChild(lbl);
    }

    // Input
    inputEl = buildInput();
    container.appendChild(inputEl);

    // Hint
    if (opts.hint) {
      const hint = document.createElement('span');
      hint.style.cssText = 'font-size:10px;color:var(--muted);margin-top:1px';
      hint.textContent = opts.hint;
      container.appendChild(hint);
    }
  }

  render();

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    /** Get current input value */
    getValue() {
      if (!inputEl) return '';
      if (opts.type === 'toggle') return inputEl.querySelector('input').checked;
      return inputEl.value;
    },
    /** Set input value programmatically */
    setValue(val) {
      if (!inputEl) return;
      if (opts.type === 'toggle') {
        inputEl.querySelector('input').checked = !!val;
      } else if (opts.type === 'select') {
        inputEl.value = val;
      } else {
        inputEl.value = val;
      }
    },
    /** Get the underlying input/select/textarea element */
    getInput() {
      return inputEl;
    },
    /** Re-render with new options */
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      render();
    },
    /** Show a validation error message below the input */
    setError(message) {
      let err = container.querySelector('.ff-error');
      if (!err) {
        err = document.createElement('span');
        err.className = 'ff-error';
        err.style.cssText = 'font-size:10px;color:var(--red);margin-top:1px';
        container.appendChild(err);
      }
      err.textContent = message;
      if (inputEl && !inputEl.classList.contains('inp-error')) {
        inputEl.style.borderColor = 'var(--red)';
      }
    },
    /** Clear validation error */
    clearError() {
      const err = container.querySelector('.ff-error');
      if (err) err.remove();
      if (inputEl) inputEl.style.borderColor = '';
    },
    getState() {
      return { value: this.getValue() };
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}
