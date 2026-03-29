/**
 * Pagination — page navigation with records-per-page selector.
 *
 * Uses existing CSS classes: table-footer, record-info, pagination,
 * pg-btn, pg-select
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {number} options.total - Total number of records
 * @param {number} [options.page=1] - Current page (1-indexed)
 * @param {number} [options.pageSize=25] - Records per page (0 = all)
 * @param {number[]} [options.pageSizeOptions=[15,25,50,0]] - Page size choices
 * @param {boolean} [options.showRecordInfo=true] - Show "X–Y of Z records" label
 * @param {Function} [options.onChange] - Called with ({page, pageSize}) on navigation
 */
export function Pagination(container, options = {}) {
  const defaults = {
    total: 0,
    page: 1,
    pageSize: 25,
    pageSizeOptions: [15, 25, 50, 0],
    showRecordInfo: true,
    onChange: null,
  };

  const opts = { ...defaults, ...options };

  let state = {
    page: opts.page,
    pageSize: opts.pageSize,
  };

  function totalPages() {
    if (!state.pageSize) return 1;
    return Math.max(1, Math.ceil(opts.total / state.pageSize));
  }

  function buildPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current]);
    if (current > 1) pages.add(current - 1);
    if (current < total) pages.add(current + 1);
    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) result.push('…');
      result.push(p);
    });
    return result;
  }

  function render() {
    container.innerHTML = '';

    const pages = totalPages();
    const total = opts.total;
    const start = state.pageSize ? (state.page - 1) * state.pageSize + 1 : 1;
    const end = state.pageSize ? Math.min(state.page * state.pageSize, total) : total;

    if (opts.showRecordInfo) {
      const info = document.createElement('div');
      info.className = 'record-info';
      info.textContent = total === 0
        ? '0 records'
        : state.pageSize
          ? `${start}–${end} of ${total} records`
          : `${total} records`;
      container.appendChild(info);
    }

    const right = document.createElement('div');
    right.style.cssText = 'display:flex;align-items:center;gap:12px';

    // Rows per page
    const rowsWrap = document.createElement('div');
    rowsWrap.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)';
    rowsWrap.appendChild(document.createTextNode('Rows:'));

    const sel = document.createElement('select');
    sel.className = 'pg-select';
    opts.pageSizeOptions.forEach(sz => {
      const op = document.createElement('option');
      op.value = sz;
      op.textContent = sz === 0 ? 'All' : sz;
      if (sz === state.pageSize) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener('change', () => {
      state.pageSize = parseInt(sel.value) || 0;
      state.page = 1;
      render();
      opts.onChange && opts.onChange({ page: state.page, pageSize: state.pageSize });
    });
    rowsWrap.appendChild(sel);
    right.appendChild(rowsWrap);

    // Page buttons
    if (pages > 1) {
      const pgWrap = document.createElement('div');
      pgWrap.className = 'pagination';

      const makeBtn = (label, page, disabled, active) => {
        const btn = document.createElement('button');
        btn.className = 'pg-btn' + (active ? ' active' : '');
        btn.textContent = label;
        btn.disabled = disabled;
        if (!disabled) {
          btn.addEventListener('click', () => {
            state.page = page;
            render();
            opts.onChange && opts.onChange({ page: state.page, pageSize: state.pageSize });
          });
        }
        return btn;
      };

      pgWrap.appendChild(makeBtn('‹', state.page - 1, state.page === 1, false));
      buildPageRange(state.page, pages).forEach(p => {
        if (p === '…') {
          const span = document.createElement('span');
          span.style.cssText = 'padding:0 4px;color:var(--muted);font-size:11px';
          span.textContent = '…';
          pgWrap.appendChild(span);
        } else {
          pgWrap.appendChild(makeBtn(p, p, false, p === state.page));
        }
      });
      pgWrap.appendChild(makeBtn('›', state.page + 1, state.page === pages, false));
      right.appendChild(pgWrap);
    }

    container.appendChild(right);
  }

  render();

  return {
    setTotal(total) {
      opts.total = total;
      state.page = 1;
      render();
    },
    goToPage(page) {
      state.page = Math.max(1, Math.min(page, totalPages()));
      render();
    },
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      if (newOptions.page !== undefined) state.page = newOptions.page;
      if (newOptions.pageSize !== undefined) state.pageSize = newOptions.pageSize;
      render();
    },
    getState() {
      return { page: state.page, pageSize: state.pageSize, total: opts.total };
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}
