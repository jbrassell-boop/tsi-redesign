/* ─────────────────────────────────────────────────────────
   toast.js — Shared toast notification system
   Usage: TSI.toast.success('Saved', 'Record updated successfully')
          TSI.toast.error('Error', 'Failed to save changes')
          TSI.toast.warn('Warning', 'Contract expires in 30 days')
          TSI.toast.info('Info', 'Export ready for download')
   ───────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var MAX_TOASTS = 3;
  var DEFAULT_DURATION = 5000;
  var container = null;

  var ICONS = {
    success: '✓',
    danger:  '✕',
    warning: '⚠',
    info:    'ℹ'
  };

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  function show(type, title, msg, duration) {
    var c = ensureContainer();
    duration = duration || DEFAULT_DURATION;

    // Enforce max stack
    while (c.children.length >= MAX_TOASTS) {
      dismiss(c.children[c.children.length - 1]);
    }

    var el = document.createElement('div');
    el.className = 'toast-item';
    el.innerHTML =
      '<div class="toast-icon t-' + type + '">' + (ICONS[type] || 'ℹ') + '</div>' +
      '<div class="toast-body">' +
        '<div class="toast-title">' + title + '</div>' +
        (msg ? '<div class="toast-msg">' + msg + '</div>' : '') +
      '</div>' +
      '<button class="toast-dismiss" aria-label="Dismiss">&times;</button>' +
      '<div class="toast-progress tp-' + type + '" style="animation:toastTimer ' + duration + 'ms linear forwards"></div>';

    el.querySelector('.toast-dismiss').onclick = function () { dismiss(el); };

    c.insertBefore(el, c.firstChild);

    // Auto-dismiss
    el._timer = setTimeout(function () { dismiss(el); }, duration);

    return el;
  }

  function dismiss(el) {
    if (!el || el._dismissed) return;
    el._dismissed = true;
    clearTimeout(el._timer);
    el.classList.add('out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
  }

  // Public API
  window.TSI = window.TSI || {};
  window.TSI.toast = {
    show:    show,
    success: function (t, m, d) { return show('success', t, m, d); },
    error:   function (t, m, d) { return show('danger',  t, m, d); },
    warn:    function (t, m, d) { return show('warning', t, m, d); },
    info:    function (t, m, d) { return show('info',    t, m, d); }
  };
})();
