/**
 * DataTable — sortable, paginated table with sticky headers, row hover,
 * alternating rows, row selection, and optional right-click context menu.
 *
 * Uses existing CSS classes: table-wrap, tbl-card, table-footer,
 * record-info, pagination, pg-btn, pg-select, empty-state-full,
 * empty-state-icon, empty-state-title, empty-state-msg
 *
 * @param {HTMLElement} container - Mount target element
 * @param {Object} options - Configuration options
 * @param {Array<{key:string, label:string, width?:string, align?:string, render?:Function}>} options.columns - Column definitions
 * @param {Array<Object>} options.rows - Data rows (plain objects)
 * @param {number} [options.pageSize=25] - Rows per page (use 0 for all)
 * @param {number[]} [options.pageSizeOptions=[15,25,50,0]] - Page size choices (0 = "All")
 * @param {boolean} [options.selectable=false] - Enable row click selection (adds .selected class)
 * @param {boolean} [options.showFooter=true] - Show table footer with record count + pagination
 * @param {string} [options.emptyTitle='No records found'] - Empty state title
 * @param {string} [options.emptyMessage=''] - Empty state subtitle
 * @param {Function} [options.onRowClick] - Called with (row, index, event) on row click
 * @param {Function} [options.onRowDblClick] - Called with (row, index, event) on row double-click
 * @param {Function} [options.onContextMenu] - Called with (row, index, event) on right-click
 * @param {Function} [options.onSort] - Called with (key, direction) after sort changes
 * @param {Function} [options.onPageChange] - Called with (page, pageSize) after page changes
 */
export function DataTable(container, options = {}) {
  const defaults = {
    columns: [],
    rows: [],
    pageSize: 25,
    pageSizeOptions: [15, 25, 50, 0],
    selectable: false,
    showFooter: true,
    emptyTitle: 'No records found',
    emptyMessage: '',
    onRowClick: null,
    onRowDblClick: null,
    onContextMenu: null,
    onSort: null,
    onPageChange: null,
  };

  const opts = { ...defaults, ...options };

  let state = {
    rows: opts.rows,
    sortKey: null,
    sortDir: 'asc',
    currentPage: 1,
    pageSize: opts.pageSize,
    selectedIndex: -1,
  };

  let tableWrap, tbody, footerEl;

  // ── Helpers ─────────────────────────────────────────────────────────────

  function getSorted() {
    if (!state.sortKey) return [...state.rows];
    return [...state.rows].sort((a, b) => {
      let av = a[state.sortKey], bv = b[state.sortKey];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return state.sortDir === 'asc' ? av - bv : bv - av;
      }
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
      if (av < bv) return state.sortDir === 'asc' ? -1 : 1;
      if (av > bv) return state.sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function getPage(sorted) {
    if (!state.pageSize) return sorted;
    const start = (state.currentPage - 1) * state.pageSize;
    return sorted.slice(start, start + state.pageSize);
  }

  function totalPages(sorted) {
    if (!state.pageSize) return 1;
    return Math.max(1, Math.ceil(sorted.length / state.pageSize));
  }

  // ── Render ───────────────────────────────────────────────────────────────

  function renderHeader() {
    const tr = document.createElement('tr');
    opts.columns.forEach(col => {
      const th = document.createElement('th');
      if (col.width) th.style.width = col.width;
      if (col.align) th.style.textAlign = col.align;
      if (col.key) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => handleSort(col.key, th));
      }
      const sortSpan = document.createElement('span');
      sortSpan.className = 'sort';
      th.textContent = col.label;
      th.appendChild(sortSpan);
      if (state.sortKey === col.key) {
        th.classList.add('sorted', state.sortDir);
        sortSpan.textContent = state.sortDir === 'asc' ? ' ▲' : ' ▼';
      }
      tr.appendChild(th);
    });
    return tr;
  }

  function renderBody(pageRows, allRows) {
    tbody.innerHTML = '';
    if (!pageRows.length) {
      const td = document.createElement('td');
      td.colSpan = opts.columns.length;
      td.style.padding = '0';
      const empty = document.createElement('div');
      empty.className = 'empty-state-full';
      empty.innerHTML = `
        <div class="empty-state-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
        </div>
        <div class="empty-state-title">${opts.emptyTitle}</div>
        ${opts.emptyMessage ? `<div class="empty-state-msg">${opts.emptyMessage}</div>` : ''}
      `;
      const tr = document.createElement('tr');
      tr.appendChild(td);
      td.appendChild(empty);
      tbody.appendChild(tr);
      return;
    }

    const sortedIndexMap = new Map(allRows.map((r, i) => [r, i]));

    pageRows.forEach((row, relIdx) => {
      const tr = document.createElement('tr');
      const absIdx = sortedIndexMap.get(row) ?? relIdx;
      if (opts.selectable && state.selectedIndex === absIdx) {
        tr.classList.add('selected');
      }
      tr.addEventListener('click', e => {
        if (opts.selectable) {
          state.selectedIndex = absIdx;
          render();
        }
        opts.onRowClick && opts.onRowClick(row, absIdx, e);
      });
      tr.addEventListener('dblclick', e => {
        opts.onRowDblClick && opts.onRowDblClick(row, absIdx, e);
      });
      tr.addEventListener('contextmenu', e => {
        if (opts.onContextMenu) {
          e.preventDefault();
          opts.onContextMenu(row, absIdx, e);
        }
      });

      opts.columns.forEach(col => {
        const td = document.createElement('td');
        if (col.align) td.style.textAlign = col.align;
        if (col.render) {
          const result = col.render(row[col.key], row, absIdx);
          if (result instanceof HTMLElement) {
            td.appendChild(result);
          } else {
            td.innerHTML = result ?? '';
          }
        } else {
          td.textContent = row[col.key] ?? '';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function renderFooter(sorted) {
    if (!footerEl) return;
    const total = sorted.length;
    const pages = totalPages(sorted);
    const start = state.pageSize ? (state.currentPage - 1) * state.pageSize + 1 : 1;
    const end = state.pageSize ? Math.min(state.currentPage * state.pageSize, total) : total;
    const rangeText = total === 0 ? '0 records' : state.pageSize
      ? `${start}–${end} of ${total} records`
      : `${total} records`;

    footerEl.innerHTML = '';

    // Record info
    const info = document.createElement('div');
    info.className = 'record-info';
    info.textContent = rangeText;
    footerEl.appendChild(info);

    // Right side: rows selector + pagination
    const right = document.createElement('div');
    right.style.cssText = 'display:flex;align-items:center;gap:12px';

    // Rows per page
    const rowsWrap = document.createElement('div');
    rowsWrap.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)';
    rowsWrap.innerHTML = 'Rows:';
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
      state.currentPage = 1;
      render();
      opts.onPageChange && opts.onPageChange(state.currentPage, state.pageSize);
    });
    rowsWrap.appendChild(sel);
    right.appendChild(rowsWrap);

    // Pagination buttons
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
            state.currentPage = page;
            render();
            opts.onPageChange && opts.onPageChange(state.currentPage, state.pageSize);
          });
        }
        return btn;
      };

      pgWrap.appendChild(makeBtn('‹', state.currentPage - 1, state.currentPage === 1, false));

      // Show up to 7 page buttons with ellipsis
      const range = buildPageRange(state.currentPage, pages);
      range.forEach(p => {
        if (p === '…') {
          const span = document.createElement('span');
          span.style.cssText = 'padding:0 4px;color:var(--muted);font-size:11px';
          span.textContent = '…';
          pgWrap.appendChild(span);
        } else {
          pgWrap.appendChild(makeBtn(p, p, false, p === state.currentPage));
        }
      });

      pgWrap.appendChild(makeBtn('›', state.currentPage + 1, state.currentPage === pages, false));
      right.appendChild(pgWrap);
    }

    footerEl.appendChild(right);
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
    const sorted = getSorted();
    const pageRows = getPage(sorted);

    // Update headers
    const thead = tableWrap.querySelector('thead');
    thead.innerHTML = '';
    thead.appendChild(renderHeader());

    renderBody(pageRows, sorted);
    if (opts.showFooter) renderFooter(sorted);
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  function handleSort(key, thEl) {
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = key;
      state.sortDir = 'asc';
    }
    state.currentPage = 1;
    render();
    opts.onSort && opts.onSort(state.sortKey, state.sortDir);
  }

  // ── Mount ────────────────────────────────────────────────────────────────

  function mount() {
    container.innerHTML = '';

    tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    if (opts.showFooter) {
      footerEl = document.createElement('div');
      footerEl.className = 'table-footer';
      container.appendChild(footerEl);
    }

    render();
  }

  mount();

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    /** Re-render with new data */
    update(newOptions = {}) {
      Object.assign(opts, newOptions);
      if (newOptions.rows !== undefined) state.rows = newOptions.rows;
      if (newOptions.pageSize !== undefined) state.pageSize = newOptions.pageSize;
      state.currentPage = 1;
      render();
    },
    /** Replace the data rows only (fast path — preserves sort/page) */
    setRows(rows) {
      state.rows = rows;
      state.currentPage = 1;
      render();
    },
    /** Go to a specific page */
    goToPage(page) {
      const sorted = getSorted();
      const pages = totalPages(sorted);
      state.currentPage = Math.max(1, Math.min(page, pages));
      render();
    },
    /** Clear selection */
    clearSelection() {
      state.selectedIndex = -1;
      render();
    },
    /** Get current sort state */
    getState() {
      return {
        sortKey: state.sortKey,
        sortDir: state.sortDir,
        currentPage: state.currentPage,
        pageSize: state.pageSize,
        selectedIndex: state.selectedIndex,
        totalRows: state.rows.length,
      };
    },
    /** Remove from DOM and unbind */
    destroy() {
      container.innerHTML = '';
    },
  };
}
