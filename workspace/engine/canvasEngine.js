'use strict';
/**
 * CoreSystem Workspace — Canvas Engine
 * Manages the infinite-style canvas: zoom, pan, grid rendering,
 * coordinate transforms between screen ↔ world space.
 */
const CanvasEng = (() => {
  let _viewport = null;  // #canvas-viewport (overflow:hidden)
  let _content  = null;  // #canvas-content  (transform target)
  let _gridEl   = null;  // #canvas-grid     (SVG grid overlay)
  let _spaceDown  = false;
  let _panDrag    = null; // { startX, startY, startPanX, startPanY }
  let _touchState = null; // { type: 'pan'|'pinch', ... }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init(viewportEl, contentEl, gridEl) {
    _viewport = viewportEl;
    _content  = contentEl;
    _gridEl   = gridEl;

    // Wheel → zoom
    _viewport.addEventListener('wheel', _onWheel, { passive: false });

    // Space → pan mode
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        _spaceDown = true;
        _viewport.classList.add('mode-hand');
      }
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'Space') {
        _spaceDown = false;
        if (State.tool !== 'hand') _viewport.classList.remove('mode-hand');
      }
    });

    // Tool change → cursor
    State.on('tool:change', t => {
      _viewport.classList.toggle('mode-hand', t === 'hand');
      _viewport.classList.toggle('mode-draw', t === 'draw');
      _viewport.classList.toggle('mode-select', t === 'select');
    });
    _viewport.classList.add('mode-select');

    _applyTransform();
    _renderGrid();

    // Redraw grid on pan/zoom
    State.on('canvas:transform', _renderGrid);

    // Touch events for mobile pan + pinch-to-zoom
    _viewport.addEventListener('touchstart',  _onTouchStart,  { passive: false });
    _viewport.addEventListener('touchmove',   _onTouchMove,   { passive: false });
    _viewport.addEventListener('touchend',    _onTouchEnd,    { passive: false });
    _viewport.addEventListener('touchcancel', _onTouchEnd,    { passive: false });
  }

  // ── Touch helpers ──────────────────────────────────────────────────────────
  function _touchDist(t0, t1) {
    return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  }
  function _touchMid(t0, t1) {
    return { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
  }

  function _onTouchStart(e) {
    if (e.touches.length === 1) {
      // Single finger: delegate to DragEng via synthetic-coord pan when hand tool is active
      // Two-finger pan / pinch handled here only
      const t = e.touches[0];
      if (State.tool === 'hand') {
        e.preventDefault();
        startPan(t.clientX, t.clientY);
        _touchState = { type: 'pan' };
      }
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      _touchState = {
        type:      'pinch',
        startDist: _touchDist(t0, t1),
        startZoom: State.zoom,
        startMid:  _touchMid(t0, t1),
        startPanX: State.panX,
        startPanY: State.panY,
      };
      // End any ongoing pan when second finger lands
      if (_panDrag) endPan();
    }
  }

  function _onTouchMove(e) {
    if (!_touchState) return;
    e.preventDefault();

    if (_touchState.type === 'pan' && e.touches.length === 1) {
      const t = e.touches[0];
      movePan(t.clientX, t.clientY);

    } else if (_touchState.type === 'pinch' && e.touches.length === 2) {
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist  = _touchDist(t0, t1);
      const mid   = _touchMid(t0, t1);
      const rect  = _viewport.getBoundingClientRect();

      // Compute new zoom
      const newZoom = Math.min(8, Math.max(0.05,
        _touchState.startZoom * (dist / _touchState.startDist)
      ));

      // Zoom towards the midpoint between fingers
      const pivotX = mid.x - rect.left;
      const pivotY = mid.y - rect.top;
      const midStartX = _touchState.startMid.x - rect.left;
      const midStartY = _touchState.startMid.y - rect.top;

      // pan = pivot - (pivot - startPan) * (newZoom / startZoom) + translation delta
      State.panX = pivotX - (midStartX - _touchState.startPanX) * (newZoom / _touchState.startZoom) + (mid.x - _touchState.startMid.x);
      State.panY = pivotY - (midStartY - _touchState.startPanY) * (newZoom / _touchState.startZoom) + (mid.y - _touchState.startMid.y);
      State.zoom  = newZoom;

      _applyTransform();
      _renderGrid();
      State.emit('canvas:transform');
    }
  }

  function _onTouchEnd(e) {
    if (!_touchState) return;
    if (_touchState.type === 'pan') endPan();
    _touchState = null;
  }

  function isTouchActive() { return !!_touchState; }

  // ── Zoom ───────────────────────────────────────────────────────────────────
  function _onWheel(e) {
    e.preventDefault();
    const rect = _viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const FACTOR = e.deltaY < 0 ? 1.08 : 0.926;
    const newZoom = Math.min(8, Math.max(0.05, State.zoom * FACTOR));

    // Zoom towards cursor
    State.panX = mouseX - (mouseX - State.panX) * (newZoom / State.zoom);
    State.panY = mouseY - (mouseY - State.panY) * (newZoom / State.zoom);
    State.zoom = newZoom;

    _applyTransform();
    _renderGrid();
    State.emit('canvas:transform');
  }

  // ── Pan ────────────────────────────────────────────────────────────────────
  function startPan(clientX, clientY) {
    _panDrag = { startX: clientX, startY: clientY,
                 startPanX: State.panX, startPanY: State.panY };
    _viewport.classList.add('is-panning');
  }
  function movePan(clientX, clientY) {
    if (!_panDrag) return;
    State.panX = _panDrag.startPanX + (clientX - _panDrag.startX);
    State.panY = _panDrag.startPanY + (clientY - _panDrag.startY);
    _applyTransform();
    _renderGrid();
  }
  function endPan() {
    _panDrag = null;
    _viewport.classList.remove('is-panning');
  }
  function isPanning() { return !!_panDrag; }
  function isSpaceDown() { return _spaceDown; }

  // ── Coordinate transforms ──────────────────────────────────────────────────
  function screenToWorld(sx, sy) {
    const rect = _viewport.getBoundingClientRect();
    return {
      x: (sx - rect.left - State.panX) / State.zoom,
      y: (sy - rect.top  - State.panY) / State.zoom,
    };
  }
  function worldToScreen(wx, wy) {
    const rect = _viewport.getBoundingClientRect();
    return {
      x: wx * State.zoom + State.panX + rect.left,
      y: wy * State.zoom + State.panY + rect.top,
    };
  }

  // ── Apply CSS transform ────────────────────────────────────────────────────
  function _applyTransform() {
    if (!_content) return;
    _content.style.transform = `translate(${State.panX}px,${State.panY}px) scale(${State.zoom})`;
  }

  // ── Fit to screen ──────────────────────────────────────────────────────────
  function fitToScreen() {
    if (!_viewport) return;
    const vW = _viewport.clientWidth  - 120;
    const vH = _viewport.clientHeight - 120;
    const zoom = Math.min(vW / State.artW, vH / State.artH, 1);
    State.zoom = zoom;
    State.panX = (_viewport.clientWidth  - State.artW * zoom) / 2;
    State.panY = (_viewport.clientHeight - State.artH * zoom) / 2;
    _applyTransform();
    _renderGrid();
  }

  function zoomIn()  { _zoomBy(1.2); }
  function zoomOut() { _zoomBy(1/1.2); }
  function zoomReset() { State.zoom = 1; _applyTransform(); _renderGrid(); }
  function _zoomBy(f) {
    State.zoom = Math.min(8, Math.max(0.05, State.zoom * f));
    _applyTransform(); _renderGrid();
  }

  // ── Grid rendering ─────────────────────────────────────────────────────────
  function _renderGrid() {
    if (!_gridEl) return;
    _gridEl.style.display = State.gridVisible ? '' : 'none';

    const gs  = State.gridSize * State.zoom; // grid cell in screen pixels
    const ox  = (State.panX % gs + gs) % gs; // offset for pattern repeat
    const oy  = (State.panY % gs + gs) % gs;

    // Use CSS background-image pattern (very efficient)
    if (State.gridVisible) {
      _viewport.style.setProperty('--grid-size', `${gs}px`);
      _viewport.style.setProperty('--grid-ox', `${ox}px`);
      _viewport.style.setProperty('--grid-oy', `${oy}px`);
    }
  }

  function toggleGrid() {
    State.gridVisible = !State.gridVisible;
    _renderGrid();
    return State.gridVisible;
  }

  return {
    init, fitToScreen, zoomIn, zoomOut, zoomReset,
    startPan, movePan, endPan, isPanning, isSpaceDown, isTouchActive,
    screenToWorld, worldToScreen, toggleGrid,
  };
})();
