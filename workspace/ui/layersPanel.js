'use strict';
/**
 * CoreSystem Workspace — Layers Panel
 * Shows all elements in z-order (top = front).
 * Supports: select, lock, hide, rename, delete, reorder.
 */
const LayersPanel = (() => {
  let _el = null;

  function init(panelEl) {
    _el = panelEl;
    _render();
    State.on('elements:change', _render);
    State.on('sel:change',      _renderSelected);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function _render() {
    if (!_el) return;
    const ids = [...State.rootIds].reverse(); // top = front

    if (!ids.length) {
      _el.innerHTML = `<div class="layers__empty">No elements yet.<br>Drag a component or use Draw mode.</div>`;
      return;
    }

    _el.innerHTML = `
<div class="layers__header">
  <span>Layers (${ids.length})</span>
  <div>
    <button class="layers__btn" data-action="select-all" title="Select all">⊞</button>
    <button class="layers__btn" data-action="delete-sel" title="Delete selected">✕</button>
  </div>
</div>
<div class="layers__list">
  ${ids.map(id => _rowHTML(id)).join('')}
</div>`;

    _bindEvents();
    _renderSelected(State.selIds);
  }

  function _rowHTML(id) {
    const el = State.getEl(id);
    if (!el) return '';
    const typeDef = Toolbox.getTypeDef(el.type);
    const color   = typeDef ? typeDef.stroke : '#94A3B8';
    const icon    = typeDef ? typeDef.icon   : '▭';

    return `
<div class="layer-row ${el.locked?'is-locked':''} ${el.hidden?'is-hidden':''}"
     data-id="${id}" draggable="true">
  <span class="layer-row__icon" style="color:${color}">${icon}</span>
  <span class="layer-row__name" data-rename="${id}">${el.name}</span>
  <span class="layer-row__type">${el.type}</span>
  <div class="layer-row__actions">
    <button class="layer-btn ${el.locked?'is-on':''}"
            data-action="lock" data-id="${id}" title="${el.locked?'Unlock':'Lock'}">
      ${el.locked ? '🔒' : '🔓'}
    </button>
    <button class="layer-btn ${el.hidden?'is-on':''}"
            data-action="hide" data-id="${id}" title="${el.hidden?'Show':'Hide'}">
      ${el.hidden ? '🙈' : '👁'}
    </button>
    <button class="layer-btn layer-btn--del"
            data-action="delete" data-id="${id}" title="Delete">✕</button>
  </div>
</div>`;
  }

  function _renderSelected(ids) {
    _el?.querySelectorAll('.layer-row').forEach(row => {
      row.classList.toggle('is-selected', ids.includes(row.dataset.id));
    });
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  function _bindEvents() {
    if (!_el) return;

    // Header actions
    _el.querySelector('[data-action="select-all"]')?.addEventListener('click', () => State.selectAll());
    _el.querySelector('[data-action="delete-sel"]')?.addEventListener('click', () => {
      History.push('Delete'); State.deleteSelected();
    });

    // Row click → select
    _el.addEventListener('click', e => {
      if (e.target.closest('[data-action]')) return;
      const row = e.target.closest('.layer-row');
      if (!row) return;
      const id = row.dataset.id;
      if (e.shiftKey || e.ctrlKey || e.metaKey) State.addToSel(id);
      else State.setSelection([id]);
    });

    // Action buttons
    _el.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !btn.dataset.id) return;
      e.stopPropagation();
      const id = btn.dataset.id;
      const el = State.getEl(id);
      switch(btn.dataset.action) {
        case 'lock':   if(el) State.update(id, { locked: !el.locked }); break;
        case 'hide':   if(el) State.update(id, { hidden: !el.hidden }); break;
        case 'delete': History.push('Delete'); State.remove(id);         break;
      }
    });

    // Z-order buttons
    _el.addEventListener('click', e => {
      const btn = e.target.closest('[data-zorder]');
      if (!btn) return;
      const id = btn.closest('.layer-row')?.dataset.id;
      if (!id) return;
      switch(btn.dataset.zorder) {
        case 'front': State.bringToFront(id); break;
        case 'back':  State.sendToBack(id);   break;
        case 'fwd':   State.bringForward(id); break;
        case 'bwd':   State.sendBackward(id); break;
      }
    });

    // Double-click rename
    _el.addEventListener('dblclick', e => {
      const nameEl = e.target.closest('[data-rename]');
      if (!nameEl) return;
      const id = nameEl.dataset.rename;
      const el = State.getEl(id);
      if (!el) return;
      nameEl.contentEditable = 'true';
      nameEl.focus();
      const range = document.createRange();
      range.selectNodeContents(nameEl);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      const commit = () => {
        nameEl.contentEditable = 'false';
        State.update(id, { name: nameEl.textContent.trim() || el.name });
        nameEl.removeEventListener('blur', commit);
      };
      nameEl.addEventListener('blur', commit);
      nameEl.addEventListener('keydown', ev => {
        if(ev.key === 'Enter') { ev.preventDefault(); nameEl.blur(); }
        if(ev.key === 'Escape') { nameEl.textContent = el.name; nameEl.blur(); }
      });
    });

    // Drag to reorder (visual z-index)
    let _draggingRow = null;
    _el.addEventListener('dragstart', e => {
      const row = e.target.closest('.layer-row');
      if (row) { _draggingRow = row; row.classList.add('is-dragging'); }
    });
    _el.addEventListener('dragover', e => {
      e.preventDefault();
      const row = e.target.closest('.layer-row');
      if (row && row !== _draggingRow) row.classList.add('drag-over');
    });
    _el.addEventListener('dragleave', e => {
      e.target.closest('.layer-row')?.classList.remove('drag-over');
    });
    _el.addEventListener('drop', e => {
      e.preventDefault();
      const targetRow = e.target.closest('.layer-row');
      if (!targetRow || !_draggingRow || targetRow === _draggingRow) return;
      const fromId = _draggingRow.dataset.id;
      const toId   = targetRow.dataset.id;
      // Move in z-order: swap
      const fromIdx = State.rootIds.indexOf(fromId);
      const toIdx   = State.rootIds.indexOf(toId);
      if (fromIdx < toIdx) State.bringForward(fromId);
      else                 State.sendBackward(fromId);
    });
    _el.addEventListener('dragend', e => {
      _el.querySelectorAll('.is-dragging,.drag-over').forEach(el => {
        el.classList.remove('is-dragging','drag-over');
      });
      _draggingRow = null;
    });
  }

  return { init };
})();
