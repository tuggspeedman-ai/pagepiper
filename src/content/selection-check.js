// PagePiper — Lightweight selection check (injected by popup on open)
(() => {
  'use strict';
  const sel = window.getSelection();
  const hasSelection = !!(sel && !sel.isCollapsed && sel.toString().trim().length > 0);
  return {
    hasSelection,
    selectionText: hasSelection ? sel.toString().trim().substring(0, 200) : ''
  };
})();
