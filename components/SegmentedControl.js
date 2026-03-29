/**
 * SegmentedControl — pill-shaped button group for mutually exclusive filter options.
 *
 * Uses existing CSS classes: seg-group, seg-btn
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {string} [options.id] - Group element id
 * @param {Array<{label:string, value:string}>} options.options - Button options
 * @param {string} [options.value=''] - Initially selected value
 * @param {Function} [options.onChange] - Called with (value, buttonEl) on selection change
 */
export function SegmentedControl(container, options = {}) {
  const defaults = {
    id: '',
    options: [],
    value: '',
    onChange: null,
  };

  const opts = { ...defaults, ...options };
  let groupEl;

  function render() {
    container.innerHTML = '';

    groupEl = document.createElement('div');
    groupEl.className = 'seg-group';
    if (opts.id) groupEl.id = opts.id;

    opts.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'seg-btn' + (opt.value === opts.value ? ' active' : '');
      btn.dataset.val = opt.value;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        groupEl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        opts.value = opt.value;
        opts.onChange && opts.onChange(opt.value, btn);
      });
      groupEl.appendChild(btn);
    });

    container.appendChild(groupEl);
  }

  render();

  return {
    getValue() {
      return opts.value;
    },
    setValue(value) {
      opts.value = value;
      if (groupEl) {
        groupEl.querySelectorAll('.seg-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.val === String(value));
        });
      }
    },
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      render();
    },
    getState() {
      return { value: opts.value };
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}
