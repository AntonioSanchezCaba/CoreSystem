/**
 * Visual Layout OS — Layers Panel UI
 * Left panel: hierarchical layer tree with lock/hide/rename/reorder controls.
 */
const LayersPanelUI = (() => {
  'use strict';

  let _el = null;

  function init(panelEl) {
    _el = panelEl;
    _render();

    EventBus.on(EventBus.EVENTS.CANVAS_RENDER,   _render);
    EventBus.on(EventBus.EVENTS.SELECTION_CHANGE, _render);
    EventBus.on(EventBus.EVENTS.ANALYSIS_DONE,    _render);
  }

  function refresh() { _render(); }

  // ── Render ─────────────────────────────────────────────────────────────────
  function _render() {
    if (!_el) return;
    const roots = AppState.getRoots();
    if (!roots.length) {
      _el.innerHTML = `<div class="layers__empty">No layers yet.<br>Draw a rectangle to start.</div>`;
      return;
    }

    _el.innerHTML = `
<div class="layers__header">
  <span>Layers</span>
  <button class="layers__btn-sm" data-action="select-all" title="Select all">⊞</button>
</div>
<div class="layers__list" id="layers-list">
  ${roots.slice().reverse().map(el => _renderNode(el, 0)).join('')}
</div>`;

    _bindEvents();
  }

  function _renderNode(el, depth) {
    const isSelected = AppState.selectionIds.includes(el.id);
    const children   = AppState.getChildrenOf(el.id);
    const hasChildren = children.length > 0;
    const roleTag    = el.role ? `<span class="layer__role">${el.role}</span>` : '';
    const indent     = depth * 16;

    return `
<div class="layer ${isSelected ? 'is-selected' : ''} ${el.locked ? 'is-locked' : ''} ${el.hidden ? 'is-hidden' : ''}"
     data-el-id="${el.id}" style="padding-left:${indent + 8}px">
  <button class="layer__expand ${hasChildren ? '' : 'layer__expand--leaf'}"
          data-expand="${el.id}">
    ${hasChildren ? '▾' : '·'}
  </button>
  <span class="layer__icon">${_typeIcon(el)}</span>
  <span class="layer__name" data-rename="${el.id}" title="${el.name}">${el.name}</span>
  ${roleTag}
  <div class="layer__actions">
    <button class="layer__btn ${el.locked ? 'is-on' : ''}"
            data-action="lock" data-el-id="${el.id}" title="${el.locked ? 'Unlock' : 'Lock'}">
      ${el.locked ? '🔒' : '🔓'}
    </button>
    <button class="layer__btn ${el.hidden ? 'is-on' : ''}"
            data-action="hide" data-el-id="${el.id}" title="${el.hidden ? 'Show' : 'Hide'}">
      ${el.hidden ? '👁' : '👁'}
    </button>
    <button class="layer__btn layer__btn--danger"
            data-action="delete" data-el-id="${el.id}" title="Delete">✕</button>
  </div>
</div>
${hasChildren ? children.map(c => _renderNode(c, depth + 1)).join('') : ''}`;
  }

  function _typeIcon(el) {
    const icons = {
      frame:   '▭',
      text:    'T',
      image:   '🖼',
      group:   '⊙',
    };
    return icons[el.type] || '▭';
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  function _bindEvents() {
    if (!_el) return;

    // Row click → select
    _el.addEventListener('click', e => {
      // Prevent triggering select when clicking buttons
      if (e.target.closest('[data-action]')) return;

      const row = e.target.closest('[data-el-id]');
      if (!row) return;
      const id = row.dataset.elId;
      if (e.shiftKey) AppState.addToSelection(id);
      else AppState.setSelection([id]);
      EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);

      // Reveal element in inspector
      EventBus.emit(EventBus.EVENTS.SELECTION_CHANGE, [id]);
    });

    // Action buttons
    _el.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const id  = btn.dataset.elId;
      const el  = id ? AppState.getElement(id) : null;

      switch (btn.dataset.action) {
        case 'lock':
          if (el) AppState.updateElement(id, { locked: !el.locked });
          break;
        case 'hide':
          if (el) AppState.updateElement(id, { hidden: !el.hidden });
          break;
        case 'delete':
          HistoryManager.push('Delete');
          AppState.deleteElement(id);
          break;
        case 'select-all':
          AppState.selectAll();
          break;
      }
      EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
    });

    // Inline rename on double-click
    _el.addEventListener('dblclick', e => {
      const nameEl = e.target.closest('[data-rename]');
      if (!nameEl) return;
      const id = nameEl.dataset.rename;
      const el = AppState.getElement(id);
      if (!el) return;

      const input = document.createElement('input');
      input.className = 'layer__rename-input';
      input.value = el.name;
      nameEl.replaceWith(input);
      input.focus();
      input.select();

      const commit = () => {
        const newName = input.value.trim() || el.name;
        AppState.updateElement(id, { name: newName });
        _render();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') commit();
        if (ev.key === 'Escape') _render();
      });
    });
  }

  // ── Context Menu integration ───────────────────────────────────────────────
  EventBus.on && EventBus.on(EventBus.EVENTS.CONTEXT_MENU, ({ targetId }) => {
    if (targetId) _highlightRow(targetId);
  });

  function _highlightRow(id) {
    _el?.querySelectorAll('.layer').forEach(row => {
      row.classList.toggle('is-context', row.dataset.elId === id);
    });
  }

  return { init, refresh };
})();
