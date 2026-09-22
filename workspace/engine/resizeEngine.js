'use strict';
/**
 * CoreSystem Workspace — Resize Engine
 * Manages the 8 resize handles per selected element.
 * Handles are DOM elements inside each box div.
 * DragEngine calls update when a handle is dragged.
 */
const ResizeEng = (() => {
  const HANDLES = ['nw','n','ne','e','se','s','sw','w'];

  const CURSORS = {
    nw:'nw-resize', n:'n-resize',  ne:'ne-resize',
    e:'e-resize',   se:'se-resize',s:'s-resize',
    sw:'sw-resize', w:'w-resize',
  };

  // ── Add handles to a box div ───────────────────────────────────────────────
  function attachHandles(boxDiv) {
    // Remove old ones
    boxDiv.querySelectorAll('.resize-handle').forEach(h => h.remove());

    HANDLES.forEach(pos => {
      const h = document.createElement('div');
      h.className = `resize-handle resize-handle--${pos}`;
      h.dataset.handle = pos;
      h.style.cursor = CURSORS[pos];
      // Prevent drag from propagating to box (handled in dragEngine by closest check)
      h.addEventListener('mousedown', e => { e.stopPropagation(); });
      boxDiv.appendChild(h);
    });
  }

  // ── Remove handles from a box div ─────────────────────────────────────────
  function detachHandles(boxDiv) {
    boxDiv.querySelectorAll('.resize-handle').forEach(h => h.remove());
  }

  // ── Sync handles visibility with selection ─────────────────────────────────
  function syncSelection(selIds) {
    // Remove handles from all deselected
    document.querySelectorAll('[data-id]').forEach(div => {
      const id = div.dataset.id;
      if (selIds.includes(id)) {
        const el = State.getEl(id);
        if (el && !el.locked) {
          attachHandles(div);
          div.classList.add('is-selected');
        }
      } else {
        detachHandles(div);
        div.classList.remove('is-selected');
      }
    });
  }

  State.on('sel:change', syncSelection);

  return { attachHandles, detachHandles, syncSelection };
})();
