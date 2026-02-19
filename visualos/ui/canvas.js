/**
 * Visual Layout OS — Canvas UI
 * Handles all mouse interactions on the drawing canvas:
 *   - Draw (rectangle tool)
 *   - Select / rubber-band multi-select
 *   - Drag (move selected elements)
 *   - Resize (8 handles)
 *   - Alt+drag duplicate
 *   - Scroll-to-zoom + Space+drag pan
 *   - Context menu
 */
const CanvasUI = (() => {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let _canvas = null;      // wrapper element (overflow:hidden)
  let _artboardWrap = null;// inner artboard-wrap (transform target for zoom/pan)
  let _artboard = null;    // artboard div (element parent)

  const MODE = { SELECT:'select', DRAW:'draw', HAND:'hand' };
  let _mode     = MODE.SELECT;
  let _dragging = null;  // { type:'move'|'resize'|'rubber', ... }
  let _spaceDown = false;
  let _altDown   = false;

  // Mouse coords in artboard space
  function _toArtboard(clientX, clientY) {
    const rect = _artboard.getBoundingClientRect();
    const zoom = AppState.zoom || 1;
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top)  / zoom,
    };
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init(canvasEl, artboardWrapEl, artboardEl) {
    _canvas       = canvasEl;
    _artboardWrap = artboardWrapEl;
    _artboard     = artboardEl;

    _canvas.addEventListener('mousedown', _onMouseDown);
    window.addEventListener('mousemove', _onMouseMove);
    window.addEventListener('mouseup',   _onMouseUp);
    _canvas.addEventListener('wheel',    _onWheel, { passive:false });
    window.addEventListener('keydown',   _onKeyDown);
    window.addEventListener('keyup',     _onKeyUp);
    _artboard.addEventListener('contextmenu', _onContextMenu);

    // Listen to tool changes from toolbar
    EventBus.on(EventBus.EVENTS.TOOL_CHANGE, tool => { _mode = tool; });
  }

  // ── Mouse Down ─────────────────────────────────────────────────────────────
  function _onMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();

    // Space+drag = pan (hand mode)
    if (_spaceDown || _mode === MODE.HAND) {
      _dragging = { type:'pan', startX:e.clientX, startY:e.clientY,
                    panX: AppState.panX, panY: AppState.panY };
      _canvas.style.cursor = 'grabbing';
      return;
    }

    const ap = _toArtboard(e.clientX, e.clientY);

    // Check if clicking a resize handle
    const handleEl = e.target.closest('[data-handle]');
    if (handleEl) {
      const id  = handleEl.dataset.elId;
      const pos = handleEl.dataset.handle;
      const el  = AppState.getElement(id);
      if (!el || el.locked) return;
      HistoryManager.push('Resize');
      _dragging = {
        type:    'resize',
        id, pos,
        startAP: { ...ap },
        origEl:  { x:el.x, y:el.y, width:el.width, height:el.height },
        parent:  el.parentId ? AppState.getAbsoluteRect(el.parentId) : { x:0, y:0 }
      };
      return;
    }

    // Check if clicking an existing element div
    const elDiv = e.target.closest('[data-el-id]');
    if (elDiv && _mode === MODE.SELECT) {
      const id = elDiv.dataset.elId;
      const el = AppState.getElement(id);
      if (!el || el.locked) return;

      // Alt+drag = duplicate
      if (_altDown) {
        HistoryManager.push('Duplicate');
        const newId = AppState.duplicateElement(id, 0, 0);
        AppState.setSelection([newId]);
      }

      if (!AppState.selectionIds.includes(id)) {
        if (e.shiftKey) {
          AppState.addToSelection(id);
        } else {
          AppState.setSelection([id]);
        }
      }

      HistoryManager.push('Move');
      _dragging = {
        type:    'move',
        ids:     [...AppState.selectionIds],
        startAP: { ...ap },
        origins: AppState.selectionIds.map(sid => {
          const sel = AppState.getElement(sid);
          return { id:sid, x:sel.x, y:sel.y };
        }),
      };
      return;
    }

    // Draw mode — start drawing a new rectangle
    if (_mode === MODE.DRAW) {
      HistoryManager.push('Draw');
      const newId = AppState.addElement({
        x: Math.round(ap.x), y: Math.round(ap.y),
        width: 1, height: 1,
        name: `Frame ${AppState.getAll().size + 1}`,
      });
      AppState.setSelection([newId]);
      _dragging = {
        type:    'draw',
        id:      newId,
        startAP: { ...ap },
      };
      return;
    }

    // Select mode, click on empty = rubber-band
    if (_mode === MODE.SELECT) {
      AppState.setSelection([]);
      _dragging = {
        type:    'rubber',
        startAP: { ...ap },
        rect:    null,
      };
      _showRubberBand(ap.x, ap.y, 0, 0);
    }
  }

  // ── Mouse Move ─────────────────────────────────────────────────────────────
  function _onMouseMove(e) {
    if (!_dragging) return;
    const ap  = _toArtboard(e.clientX, e.clientY);
    const dx  = ap.x - _dragging.startAP?.x || 0;
    const dy  = ap.y - _dragging.startAP?.y || 0;

    switch (_dragging.type) {
      case 'pan': {
        const newPanX = _dragging.panX + (e.clientX - _dragging.startX);
        const newPanY = _dragging.panY + (e.clientY - _dragging.startY);
        AppState.setPan(newPanX, newPanY);
        EventBus.emit(EventBus.EVENTS.CANVAS_ZOOM, { zoom:AppState.zoom, panX:newPanX, panY:newPanY });
        break;
      }

      case 'move': {
        // Collect all rects for snapping
        const allRects = _allSnappableRects(_dragging.ids);
        _dragging.origins.forEach(({ id, x, y }) => {
          const candidate = { ...AppState.getElement(id), x: x + dx, y: y + dy };
          const snapped   = SnappingEngine.snap(candidate, allRects, new Set(_dragging.ids));
          const offsetX   = snapped.x - candidate.x + dx;
          const offsetY   = snapped.y - candidate.y + dy;
          AppState.updateElement(id, { x: x + dx + (offsetX - dx), y: y + dy + (offsetY - dy) });
        });
        break;
      }

      case 'resize': {
        const { origEl, pos, parent } = _dragging;
        let { x, y, width, height } = origEl;

        // Convert mouse to parent-relative coordinates
        const relX = ap.x - parent.x;
        const relY = ap.y - parent.y;

        if (pos.includes('e')) width  = Math.max(1, origEl.width  + dx);
        if (pos.includes('s')) height = Math.max(1, origEl.height + dy);
        if (pos.includes('w')) { x = origEl.x + dx; width  = Math.max(1, origEl.width  - dx); }
        if (pos.includes('n')) { y = origEl.y + dy; height = Math.max(1, origEl.height - dy); }

        const oldSize = { width: origEl.width, height: origEl.height };
        const newSize = { width: Math.round(width), height: Math.round(height) };
        AppState.updateElement(_dragging.id, {
          x: Math.round(x), y: Math.round(y),
          width: newSize.width, height: newSize.height
        });
        ConstraintEngine.propagateResize(_dragging.id, oldSize, newSize);
        break;
      }

      case 'draw': {
        const x = Math.min(_dragging.startAP.x, ap.x);
        const y = Math.min(_dragging.startAP.y, ap.y);
        const w = Math.abs(ap.x - _dragging.startAP.x);
        const h = Math.abs(ap.y - _dragging.startAP.y);
        AppState.updateElement(_dragging.id, {
          x: Math.round(x), y: Math.round(y),
          width: Math.max(1, Math.round(w)),
          height: Math.max(1, Math.round(h)),
        });
        break;
      }

      case 'rubber': {
        const x = Math.min(_dragging.startAP.x, ap.x);
        const y = Math.min(_dragging.startAP.y, ap.y);
        const w = Math.abs(ap.x - _dragging.startAP.x);
        const h = Math.abs(ap.y - _dragging.startAP.y);
        _showRubberBand(x, y, w, h);
        _dragging.rect = { x, y, width:w, height:h };
        break;
      }
    }

    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  // ── Mouse Up ───────────────────────────────────────────────────────────────
  function _onMouseUp(e) {
    if (!_dragging) return;

    if (_dragging.type === 'rubber' && _dragging.rect) {
      _finishRubberBand(_dragging.rect);
    }

    if (_dragging.type === 'draw') {
      // Switch back to select after drawing
      const el = AppState.getElement(_dragging.id);
      if (el && (el.width < 4 || el.height < 4)) {
        // Tiny click → delete and cancel
        AppState.deleteElement(_dragging.id);
      } else {
        LayoutAnalyzer.analyze();
      }
      EventBus.emit(EventBus.EVENTS.TOOL_CHANGE, MODE.SELECT);
      ToolbarUI.setActiveTool(MODE.SELECT);
    }

    _hideRubberBand();
    RenderEngine.clearGuides();
    _dragging = null;
    _canvas.style.cursor = '';
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  // ── Rubber-band ────────────────────────────────────────────────────────────
  let _rubberEl = null;
  function _showRubberBand(x, y, w, h) {
    if (!_rubberEl) {
      _rubberEl = document.createElement('div');
      _rubberEl.className = 'rubber-band';
      _artboard.appendChild(_rubberEl);
    }
    Object.assign(_rubberEl.style, {
      display: 'block',
      left:    `${x}px`, top: `${y}px`,
      width:   `${w}px`, height: `${h}px`,
    });
  }
  function _hideRubberBand() {
    if (_rubberEl) _rubberEl.style.display = 'none';
  }

  function _finishRubberBand(rect) {
    const selected = [];
    AppState.getAll().forEach((el, id) => {
      const abs = AppState.getAbsoluteRect(id);
      if (abs.x >= rect.x && abs.y >= rect.y &&
          abs.x + abs.width  <= rect.x + rect.width &&
          abs.y + abs.height <= rect.y + rect.height) {
        selected.push(id);
      }
    });
    if (selected.length) AppState.setSelection(selected);
  }

  // ── Wheel Zoom ────────────────────────────────────────────────────────────
  function _onWheel(e) {
    e.preventDefault();
    const delta   = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.min(4, Math.max(0.1, (AppState.zoom || 1) + delta));
    AppState.setZoom(newZoom);
    EventBus.emit(EventBus.EVENTS.CANVAS_ZOOM, { zoom:newZoom, panX:AppState.panX, panY:AppState.panY });
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────
  function _onKeyDown(e) {
    _spaceDown = (e.code === 'Space');
    _altDown   = e.altKey;

    // Prevent space from scrolling
    if (e.code === 'Space') e.preventDefault();

    // Delete / Backspace = delete selected
    if ((e.key === 'Delete' || e.key === 'Backspace') &&
        !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      HistoryManager.push('Delete');
      AppState.deleteSelected();
      EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
    }

    // Undo / Redo
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z' && !e.shiftKey) { HistoryManager.undo(); }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { HistoryManager.redo(); }

    // Arrow nudge
    const NUDGE = e.shiftKey ? 10 : 1;
    const nudge = { ArrowLeft:{x:-NUDGE,y:0}, ArrowRight:{x:NUDGE,y:0},
                    ArrowUp:{x:0,y:-NUDGE},   ArrowDown:{x:0,y:NUDGE} }[e.key];
    if (nudge && AppState.selectionIds.length) {
      e.preventDefault();
      HistoryManager.push('Nudge');
      AppState.selectionIds.forEach(id => {
        const el = AppState.getElement(id);
        if (el && !el.locked) AppState.updateElement(id, { x:el.x+nudge.x, y:el.y+nudge.y });
      });
      EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
    }

    // Select all
    if (ctrl && e.key === 'a') { e.preventDefault(); AppState.selectAll(); EventBus.emit(EventBus.EVENTS.CANVAS_RENDER); }

    // Duplicate (Ctrl+D)
    if (ctrl && e.key === 'd') {
      e.preventDefault();
      HistoryManager.push('Duplicate');
      const newIds = AppState.selectionIds.map(id => AppState.duplicateElement(id, 20, 20));
      AppState.setSelection(newIds);
      EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
    }

    // Escape = deselect
    if (e.key === 'Escape') AppState.setSelection([]);
  }

  function _onKeyUp(e) {
    _spaceDown = false;
    _altDown   = e.altKey;
    _canvas.style.cursor = '';
  }

  // ── Context Menu ───────────────────────────────────────────────────────────
  function _onContextMenu(e) {
    e.preventDefault();
    const ap = _toArtboard(e.clientX, e.clientY);
    const elDiv = e.target.closest('[data-el-id]');
    const id = elDiv ? elDiv.dataset.elId : null;
    if (id && !AppState.selectionIds.includes(id)) AppState.setSelection([id]);

    EventBus.emit(EventBus.EVENTS.CONTEXT_MENU, { clientX:e.clientX, clientY:e.clientY, targetId: id });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _allSnappableRects(excludeIds) {
    const rects = [];
    AppState.getAll().forEach((el, id) => {
      if (excludeIds.includes(id)) return;
      const abs = AppState.getAbsoluteRect(id);
      if (abs) rects.push({ ...abs, id });
    });
    return rects;
  }

  return { init };
})();
