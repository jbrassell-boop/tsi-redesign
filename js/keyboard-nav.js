/* ═══════════════════════════════════════════════════════════════════
   keyboard-nav.js  —  Keyboard navigation for TSI operations app
   Binds arrow keys, Enter, Escape, Ctrl+S, and P/F grid shortcuts
   ═══════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

// ── Helpers ──────────────────────────────────────────────────────

/** Returns true when the active element is an editable field */
function isEditing(e) {
    var tag = (e.target.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
    if (e.target.isContentEditable) return true;
    return false;
}

// ── bindTable ────────────────────────────────────────────────────

/**
 * Add keyboard navigation to a data table.
 * @param {string} tableId  — id of the <table> element
 * @param {object} options  — { onSelect: fn(row), onOpen: fn(row) }
 */
function bindTable(tableId, options) {
    options = options || {};
    var currentIndex = -1;

    function getRows() {
        var tbl = document.getElementById(tableId);
        if (!tbl) return [];
        var tbody = tbl.querySelector('tbody');
        if (!tbody) return [];
        return Array.from(tbody.querySelectorAll('tr'));
    }

    function clearSelection(rows) {
        rows.forEach(function(r) { r.classList.remove('kb-selected'); });
    }

    function selectRow(rows, idx) {
        if (idx < 0 || idx >= rows.length) return;
        clearSelection(rows);
        currentIndex = idx;
        rows[currentIndex].classList.add('kb-selected');
        rows[currentIndex].scrollIntoView({ block: 'nearest' });
        if (typeof options.onSelect === 'function') {
            options.onSelect(rows[currentIndex]);
        }
    }

    document.addEventListener('keydown', function(e) {
        if (isEditing(e)) return;

        var rows = getRows();
        if (!rows.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            var next = currentIndex < rows.length - 1 ? currentIndex + 1 : currentIndex;
            selectRow(rows, next);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            var prev = currentIndex > 0 ? currentIndex - 1 : 0;
            selectRow(rows, prev);
        } else if (e.key === 'Enter') {
            if (currentIndex >= 0 && currentIndex < rows.length) {
                if (typeof options.onOpen === 'function') {
                    options.onOpen(rows[currentIndex]);
                }
            }
        }
    });
}

// ── bindPF ───────────────────────────────────────────────────────

/**
 * Add keyboard navigation to a Pass/Fail inspection grid.
 * @param {string} gridId  — id of the .pf-grid element
 */
function bindPF(gridId) {
    var pfIndex = -1;

    function getItems() {
        var grid = document.getElementById(gridId);
        if (!grid) return [];
        return Array.from(grid.querySelectorAll('.pf-item'));
    }

    function clearActive(items) {
        items.forEach(function(it) { it.classList.remove('kb-active'); });
    }

    function activateItem(items, idx) {
        if (idx < 0 || idx >= items.length) return;
        clearActive(items);
        pfIndex = idx;
        items[pfIndex].classList.add('kb-active');
        items[pfIndex].scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('keydown', function(e) {
        if (isEditing(e)) return;

        var grid = document.getElementById(gridId);
        if (!grid) return;

        // Only respond when the grid or an element inside it has focus,
        // or focus is on body (user clicked into grid area)
        var focused = document.activeElement;
        if (focused && focused !== document.body && !grid.contains(focused)) return;

        var items = getItems();
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            var next = pfIndex < items.length - 1 ? pfIndex + 1 : pfIndex;
            activateItem(items, next);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            var prev = pfIndex > 0 ? pfIndex - 1 : 0;
            activateItem(items, prev);
        } else if (e.key === '1') {
            e.preventDefault();
            if (pfIndex >= 0 && pfIndex < items.length) {
                var passBtn = items[pfIndex].querySelectorAll('.pf-btn')[0];
                if (passBtn) passBtn.click();
            }
        } else if (e.key === '2') {
            e.preventDefault();
            if (pfIndex >= 0 && pfIndex < items.length) {
                var failBtn = items[pfIndex].querySelectorAll('.pf-btn')[1];
                if (failBtn) failBtn.click();
            }
        } else if (e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            var allPass = grid.querySelector('.pf-toolbar .pf-all-pass');
            if (allPass) allPass.click();
        }
    });
}

// ── bindGlobal ───────────────────────────────────────────────────

/** Global keyboard handlers: Escape closes overlays, Ctrl/Cmd+S saves, ? help */
function bindGlobal() {
    document.addEventListener('keydown', function(e) {
        // ── Escape — close any open overlay ──
        if (e.key === 'Escape') {
            var selectors = [
                '.cmd-overlay.open',
                '#kbHelpOverlay.open',
                '.modal-overlay.open',
                '.drawer-overlay.open',
                '.os-overlay.open'
            ];
            for (var i = 0; i < selectors.length; i++) {
                var el = document.querySelector(selectors[i]);
                if (el) {
                    el.classList.remove('open');
                    e.preventDefault();
                    return;
                }
            }
        }

        // ── Ctrl+S / Cmd+S — trigger save ──
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            var saveBtn = document.querySelector('#autoSaveBtn') ||
                          document.querySelector('.btn-save');
            if (saveBtn) saveBtn.click();
        }

        // ── ? — keyboard shortcut help ──
        if (e.key === '?' && !isEditing(e)) {
            e.preventDefault();
            showKbHelp();
        }
    });
}

// ── Keyboard Help Modal ──────────────────────────────────────────

function showKbHelp() {
    var overlay = document.getElementById('kbHelpOverlay');
    if (overlay) { overlay.classList.toggle('open'); return; }

    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
    var mod = isMac ? '⌘' : 'Ctrl';

    var shortcuts = [
        { section: 'Global' },
        { keys: mod + ' + K',   desc: 'Open command palette / search' },
        { keys: mod + ' + S',   desc: 'Save current record' },
        { keys: '?',            desc: 'Show this help' },
        { keys: 'Esc',          desc: 'Close modal / drawer / overlay' },
        { section: 'Table Navigation' },
        { keys: '↑ / ↓',       desc: 'Move between rows' },
        { keys: 'Enter',        desc: 'Open selected row' },
        { section: 'Inspection Grid (P/F)' },
        { keys: '↑ / ↓',       desc: 'Move between checklist items' },
        { keys: '1',            desc: 'Mark Pass' },
        { keys: '2',            desc: 'Mark Fail' },
        { keys: 'A',            desc: 'All Pass' }
    ];

    var gridHtml = '';
    for (var i = 0; i < shortcuts.length; i++) {
        var s = shortcuts[i];
        if (s.section) {
            gridHtml += '<div class="kb-help-section">' + s.section + '</div>';
        } else {
            var kbdParts = s.keys.split(' + ');
            var kbdHtml = kbdParts.map(function(k) { return '<kbd>' + k + '</kbd>'; }).join(' + ');
            gridHtml += '<div>' + kbdHtml + '</div><div class="kb-help-desc">' + s.desc + '</div>';
        }
    }

    overlay = document.createElement('div');
    overlay.id = 'kbHelpOverlay';
    overlay.className = 'modal-overlay open';
    overlay.innerHTML =
        '<div class="modal-box sm" style="max-height:70vh">' +
          '<div class="modal-header">' +
            '<h3>Keyboard Shortcuts</h3>' +
            '<button class="modal-close" onclick="document.getElementById(\'kbHelpOverlay\').classList.remove(\'open\')">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="kb-help-grid">' + gridHtml + '</div>' +
          '</div>' +
          '<div class="modal-footer" style="justify-content:center;color:var(--neutral-500);font-size:12px">' +
            'Press <kbd style="padding:1px 5px;border:1px solid var(--neutral-200);border-radius:3px;font-size:11px;background:var(--neutral-50)">?</kbd> to toggle &middot; <kbd style="padding:1px 5px;border:1px solid var(--neutral-200);border-radius:3px;font-size:11px;background:var(--neutral-50)">Esc</kbd> to close' +
          '</div>' +
        '</div>';

    overlay.addEventListener('click', function(ev) {
        if (ev.target === overlay) overlay.classList.remove('open');
    });

    document.body.appendChild(overlay);
}

// ── Auto-init global bindings on DOM ready ───────────────────────

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindGlobal);
} else {
    bindGlobal();
}

// ── Public API ───────────────────────────────────────────────────

window.KeyNav = {
    bindTable:  bindTable,
    bindPF:     bindPF,
    bindGlobal: bindGlobal
};

})();
