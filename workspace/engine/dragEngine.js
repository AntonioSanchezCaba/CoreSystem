'use strict';
/**
 * CoreSystem Workspace — Drag Engine
 * Handles all mouse-based canvas interactions:
 *   • Select / rubber-band multi-select
 *   • Drag elements to move
 *   • Alt+drag duplicate
 *   • Draw mode: click+drag to create rectangle
 *   • Toolbox drag-to-canvas
 *   • Space+drag pan (delegates to CanvasEng)
 */
const DragEng = (() => {
  let _viewport = null;
  let _content  = null;
  let _drag     = null; // current interaction descriptor
  let _altDown  = false;

  // ── Init ───────────────────────────────────────────────────────────────────
  function init(viewportEl, contentEl) {
    _viewport = viewportEl;
    _content  = contentEl;

    _viewport.addEventListener('mousedown',  _onDown);
    window.addEventListener('mousemove', _onMove);
    window.addEventListener('mouseup',   _onUp);
    window.addEventListener('keydown',   _onKeyDown);
    window.addEventListener('keyup',     _onKeyUp);
    _viewport.addEventListener('dblclick', _onDblClick);
  }

  // ── Key tracking ──────────────────────────────────────────────────────────
  function _onKeyDown(e) {
    _altDown = e.altKey;
    if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;

    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'z' && !e.shiftKey) { History.undo(); return; }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { History.redo(); return; }
    if (ctrl && e.key === 'a') { e.preventDefault(); State.selectAll(); return; }
    if (ctrl && e.key === 'd') {
      e.preventDefault();
      History.push('Duplicate');
      const newIds = State.selIds.map(id => State.duplicate(id, 20, 20));
      State.setSelection(newIds);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      History.push('Delete');
      State.deleteSelected();
      return;
    }

    if (e.key === 'Escape') { State.clearSel(); return; }

    // Arrow nudge
    const NUDGE = e.shiftKey ? 10 : 1;
    const delta = { ArrowLeft:{x:-NUDGE,y:0}, ArrowRight:{x:NUDGE,y:0},
                    ArrowUp:{x:0,y:-NUDGE},   ArrowDown:{x:0,y:NUDGE} }[e.key];
    if (delta && State.selIds.length) {
      e.preventDefault();
      History.push('Nudge');
      State.selIds.forEach(id => {
        const el = State.getEl(id);
        if (el && !el.locked) State.update(id, { x: el.x + delta.x, y: el.y + delta.y });
      });
    }

    // Tool shortcuts
    if (e.key === 'v' || e.key === 'V') State.tool = 'select';
    if (e.key === 'r' || e.key === 'R') State.tool = 'draw';
    if (e.key === 'h' || e.key === 'H') State.tool = 'hand';
  }
  function _onKeyUp(e) { _altDown = e.altKey; }

  // ── Mouse down ─────────────────────────────────────────────────────────────
  function _onDown(e) {
    if (e.button !== 0) return;

    // Pan: space+drag OR hand tool
    if (CanvasEng.isSpaceDown() || State.tool === 'hand') {
      CanvasEng.startPan(e.clientX, e.clientY);
      _drag = { type: 'pan' };
      return;
    }

    const worldPt = CanvasEng.screenToWorld(e.clientX, e.clientY);

    // Check resize handle first
    const handleEl = e.target.closest('[data-handle]');
    if (handleEl) {
      const boxEl = handleEl.closest('[data-id]');
      if (!boxEl) return;
      const id  = boxEl.dataset.id;
      const el  = State.getEl(id);
      if (!el || el.locked) return;
      e.stopPropagation();
      History.push('Resize');
      _drag = {
        type: 'resize',
        handle: handleEl.dataset.handle,
        id,
        origEl:  { x:el.x, y:el.y, w:el.width, h:el.height },
        startPt: { ...worldPt },
      };
      return;
    }

    // Check element div
    const boxEl = e.target.closest('[data-id]');
    if (boxEl && State.tool === 'select') {
      const id = boxEl.dataset.id;
      const el = State.getEl(id);
      if (!el || el.locked) return;
      e.stopPropagation();

      // Alt+drag = duplicate
      if (_altDown) {
        History.push('Duplicate');
        const newId = State.duplicate(id, 0, 0);
        State.setSelection([newId]);
      } else if (!State.selIds.includes(id)) {
        if (e.shiftKey) State.addToSel(id);
        else State.setSelection([id]);
      }

      History.push('Move');
      _drag = {
        type: 'move',
        ids:  [...State.selIds],
        startPt: { ...worldPt },
        origins: State.selIds.map(sid => {
          const sel = State.getEl(sid);
          return { id: sid, x: sel.x, y: sel.y };
        }),
      };
      return;
    }

    // Draw mode
    if (State.tool === 'draw') {
      History.push('Draw');
      const snapped = { x: SnapEng.toGrid(worldPt.x), y: SnapEng.toGrid(worldPt.y) };
      const newId = State.add({
        name: 'Frame', type: 'custom',
        x: snapped.x, y: snapped.y, width: 2, height: 2,
        fill: '#EFF6FF', stroke: '#60A5FA', strokeWidth: 2,
      });
      State.setSelection([newId]);
      _drag = { type: 'draw', id: newId, startPt: snapped };
      return;
    }

    // Rubber-band selection (select tool, empty area)
    if (State.tool === 'select') {
      if (!e.shiftKey) State.clearSel();
      _drag = { type: 'rubber', startPt: { ...worldPt }, rect: null };
      _showRubber(worldPt.x, worldPt.y, 0, 0);
    }
  }

  // ── Mouse move ─────────────────────────────────────────────────────────────
  function _onMove(e) {
    if (!_drag) return;

    if (_drag.type === 'pan') { CanvasEng.movePan(e.clientX, e.clientY); return; }

    const wp  = CanvasEng.screenToWorld(e.clientX, e.clientY);

    switch (_drag.type) {
      case 'move': {
        const dx = wp.x - _drag.startPt.x;
        const dy = wp.y - _drag.startPt.y;
        const skipIds = new Set(_drag.ids);
        _drag.origins.forEach(({ id, x, y }) => {
          const candidate = { ...State.getEl(id), x: x + dx, y: y + dy };
          const snapped   = SnapEng.snap(candidate, skipIds);
          State.update(id, { x: snapped.x, y: snapped.y });
          _drawGuides(snapped.guides);
        });
        break;
      }

      case 'resize': {
        const { handle, origEl, startPt } = _drag;
        const dx = wp.x - startPt.x;
        const dy = wp.y - startPt.y;
        let { x, y, w, h } = { x:origEl.x, y:origEl.y, w:origEl.w, h:origEl.h };

        if (handle.includes('e')) w  = Math.max(10, origEl.w + dx);
        if (handle.includes('s')) h  = Math.max(10, origEl.h + dy);
        if (handle.includes('w')) { x = origEl.x + dx; w = Math.max(10, origEl.w - dx); }
        if (handle.includes('n')) { y = origEl.y + dy; h = Math.max(10, origEl.h - dy); }

        State.update(_drag.id, {
          x: Math.round(x), y: Math.round(y),
          width: Math.round(w), height: Math.round(h),
        });
        break;
      }

      case 'draw': {
        const sx = _drag.startPt.x, sy = _drag.startPt.y;
        const x = Math.min(sx, wp.x), y = Math.min(sy, wp.y);
        const w = Math.abs(wp.x - sx), h = Math.abs(wp.y - sy);
        State.update(_drag.id, {
          x: Math.round(x), y: Math.round(y),
          width: Math.max(2, Math.round(w)),
          height: Math.max(2, Math.round(h)),
        });
        break;
      }

      case 'rubber': {
        const sx = _drag.startPt.x, sy = _drag.startPt.y;
        const x = Math.min(sx, wp.x), y = Math.min(sy, wp.y);
        const w = Math.abs(wp.x - sx), h = Math.abs(wp.y - sy);
        _drag.rect = { x, y, w, h };
        _showRubber(x, y, w, h);
        break;
      }
    }
  }

  // ── Mouse up ───────────────────────────────────────────────────────────────
  function _onUp(e) {
    if (!_drag) return;

    if (_drag.type === 'pan')    { CanvasEng.endPan(); }
    if (_drag.type === 'rubber') { _finishRubber(_drag.rect); _hideRubber(); }
    if (_drag.type === 'draw')   {
      const el = State.getEl(_drag.id);
      if (el && (el.width < 5 || el.height < 5)) State.remove(_drag.id);
      // Switch back to select after drawing
      State.tool = 'select';
    }

    _clearGuides();
    _drag = null;
  }

  // ── Rubber-band ────────────────────────────────────────────────────────────
  let _rubberEl = null;
  function _showRubber(x, y, w, h) {
    if (!_rubberEl) {
      _rubberEl = document.createElement('div');
      _rubberEl.id = 'rubber-band';
      _content.appendChild(_rubberEl);
    }
    Object.assign(_rubberEl.style, {
      display:'block', left:`${x}px`, top:`${y}px`,
      width:`${w}px`, height:`${h}px`,
    });
  }
  function _hideRubber() {
    if (_rubberEl) { _rubberEl.style.display = 'none'; }
  }
  function _finishRubber(rect) {
    if (!rect) return;
    const selected = [];
    State.getAllEls().forEach(el => {
      if (el.x >= rect.x && el.y >= rect.y &&
          el.x + el.width  <= rect.x + rect.w &&
          el.y + el.height <= rect.y + rect.h) {
        selected.push(el.id);
      }
    });
    if (selected.length) State.setSelection(selected);
  }

  // ── Snap guides ────────────────────────────────────────────────────────────
  let _guideEls = [];
  function _drawGuides(guides) {
    _clearGuides();
    if (!guides || !guides.length) return;

    guides.forEach(g => {
      const el = document.createElement('div');
      el.className = 'snap-guide' + (g.type === 'spacing' ? ' snap-guide--spacing' : '');
      if (g.axis === 'x') {
        Object.assign(el.style, { left:`${g.pos}px`, top:'-9999px',
          width:'1px', height:'99999px' });
      } else if (g.axis === 'y') {
        Object.assign(el.style, { top:`${g.pos}px`, left:'-9999px',
          height:'1px', width:'99999px' });
      } else if (g.type === 'spacing' && g.axis === 'x') {
        Object.assign(el.style, { left:`${g.x1}px`, top:`${g.y - 0.5}px`,
          width:`${g.x2 - g.x1}px`, height:'1px' });
      } else if (g.type === 'spacing' && g.axis === 'y') {
        Object.assign(el.style, { top:`${g.y1}px`, left:`${g.x - 0.5}px`,
          height:`${g.y2 - g.y1}px`, width:'1px' });
      }
      _content.appendChild(el);
      _guideEls.push(el);
    });
  }
  function _clearGuides() {
    _guideEls.forEach(el => el.remove());
    _guideEls = [];
  }

  // ── Double-click: rename ───────────────────────────────────────────────────
  function _onDblClick(e) {
    const boxEl = e.target.closest('[data-id]');
    if (!boxEl) return;
    const id = boxEl.dataset.id;
    const el = State.getEl(id);
    if (!el) return;

    const label = boxEl.querySelector('.box-label');
    if (!label) return;

    label.contentEditable = 'true';
    label.focus();
    const range = document.createRange();
    range.selectNodeContents(label);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    const commit = () => {
      label.contentEditable = 'false';
      const newName = label.textContent.trim() || el.name;
      State.update(id, { name: newName });
      label.removeEventListener('blur', commit);
      label.removeEventListener('keydown', keyHandle);
    };
    const keyHandle = ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); label.blur(); }
      if (ev.key === 'Escape') { label.textContent = el.name; label.blur(); }
    };
    label.addEventListener('blur', commit);
    label.addEventListener('keydown', keyHandle);
  }

  // ── Toolbox drop ───────────────────────────────────────────────────────────
  /**
   * Called by toolbox when a type-item is dropped on the canvas.
   * @param {Object} typeDef  { type, name, fill, stroke, defaultW, defaultH }
   * @param {number} clientX  Drop position (screen)
   * @param {number} clientY
   */
  function dropFromToolbox(typeDef, clientX, clientY) {
    const wp = CanvasEng.screenToWorld(clientX, clientY);
    const w  = typeDef.defaultW || 200;
    const h  = typeDef.defaultH || 150;
    History.push('Add from toolbox');
    const id = State.add({
      type:        typeDef.type,
      name:        typeDef.name,
      x:           wp.x - w / 2,
      y:           wp.y - h / 2,
      width:       w,
      height:      h,
      fill:        typeDef.fill,
      stroke:      typeDef.stroke,
      strokeWidth: 2,
    });
    State.setSelection([id]);
  }

  return { init, dropFromToolbox };
})();
