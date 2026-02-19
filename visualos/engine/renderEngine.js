/**
 * Visual Layout OS — Render Engine
 * DOM-based canvas renderer. Manages artboard element divs, selection handles,
 * snap guide overlays, rulers, and zoom/pan transforms.
 */
const RenderEngine = (() => {
  'use strict';

  // ── DOM references (set by init) ───────────────────────────────────────────
  let _artboard   = null;
  let _guidesLayer = null;
  let _rulerH     = null;
  let _rulerV     = null;

  // ── Element div registry ───────────────────────────────────────────────────
  const _divs = new Map(); // id → div

  // ── Initialization ─────────────────────────────────────────────────────────
  function init(artboardEl, guidesEl, rulerHEl, rulerVEl) {
    _artboard    = artboardEl;
    _guidesLayer = guidesEl;
    _rulerH      = rulerHEl;
    _rulerV      = rulerVEl;

    EventBus.on(EventBus.EVENTS.CANVAS_RENDER,    render);
    EventBus.on(EventBus.EVENTS.SNAP_GUIDES,       renderGuides);
    EventBus.on(EventBus.EVENTS.CANVAS_ZOOM,       applyZoom);
    EventBus.on(EventBus.EVENTS.SELECTION_CHANGE,  _updateSelectionHandles);
    EventBus.on(EventBus.EVENTS.ELEMENT_ADD,       (id) => _syncElement(id));
    EventBus.on(EventBus.EVENTS.ELEMENT_UPDATE,    (id) => _syncElement(id));
    EventBus.on(EventBus.EVENTS.ELEMENT_DELETE,    (id) => _removeDiv(id));

    render();
  }

  // ── Full render pass ───────────────────────────────────────────────────────
  function render() {
    if (!_artboard) return;

    const all = AppState.getAll();

    // Remove divs for deleted elements
    _divs.forEach((div, id) => {
      if (!all.has(id)) _removeDiv(id);
    });

    // Add/update elements in z-order (rootIds + childIds depth-first)
    _renderOrder(AppState.rootIds).forEach(id => _syncElement(id));

    _updateSelectionHandles();
    _renderRulers();
  }

  // Returns elements in render order (parent before children)
  function _renderOrder(ids) {
    const order = [];
    function walk(id) {
      order.push(id);
      const el = AppState.getElement(id);
      if (el) el.childIds.forEach(walk);
    }
    ids.forEach(walk);
    return order;
  }

  // ── Create / update element div ────────────────────────────────────────────
  function _syncElement(id) {
    const el = AppState.getElement(id);
    if (!el) { _removeDiv(id); return; }

    let div = _divs.get(id);
    if (!div) {
      div = document.createElement('div');
      div.dataset.elId = id;
      div.classList.add('canvas-el');
      _artboard.appendChild(div);
      _divs.set(id, div);
    }

    const abs = AppState.getAbsoluteRect(id);

    // Positioning — always absolute within artboard
    Object.assign(div.style, {
      position:        'absolute',
      left:            `${abs.x}px`,
      top:             `${abs.y}px`,
      width:           `${el.width}px`,
      height:          `${el.height}px`,
      backgroundColor: el.fill && el.fill !== 'transparent'
                         ? _rgba(el.fill, el.fillOpacity ?? 1)
                         : 'transparent',
      border:          el.strokeWidth > 0 && el.stroke
                         ? `${el.strokeWidth}px solid ${el.stroke}`
                         : 'none',
      borderRadius:    `${el.borderRadius || 0}px`,
      opacity:         el.opacity ?? 1,
      display:         el.hidden ? 'none' : 'block',
      cursor:          el.locked ? 'not-allowed' : 'move',
      userSelect:      'none',
      pointerEvents:   el.locked ? 'none' : 'auto',
      zIndex:          AppState.getZIndex(id),
    });

    // Role indicator label (debug; removed in production export)
    if (el.role && !div.querySelector('.el-label')) {
      const label = document.createElement('span');
      label.className = 'el-label';
      label.textContent = el.role;
      div.appendChild(label);
    } else if (el.role && div.querySelector('.el-label')) {
      div.querySelector('.el-label').textContent = el.role;
    }

    div.classList.toggle('is-locked', !!el.locked);
    div.classList.toggle('is-hidden', !!el.hidden);
    div.classList.toggle('is-selected', AppState.selectionIds.includes(id));
  }

  function _removeDiv(id) {
    const div = _divs.get(id);
    if (div) { div.remove(); _divs.delete(id); }
  }

  // ── Selection handles (8 per selected element) ─────────────────────────────
  const HANDLES = ['nw','n','ne','e','se','s','sw','w'];
  let   _handleEls = []; // array of {div, pos}

  function _updateSelectionHandles() {
    // Remove old handles
    _handleEls.forEach(({ div }) => div.remove());
    _handleEls = [];

    const ids = AppState.selectionIds;
    if (!ids.length) return;

    ids.forEach(id => {
      const el  = AppState.getElement(id);
      const abs = AppState.getAbsoluteRect(id);
      if (!el || !abs) return;

      // Selection outline
      const outline = _divs.get(id);
      if (outline) outline.classList.add('is-selected');

      // 8 resize handles
      HANDLES.forEach(pos => {
        const h = document.createElement('div');
        h.className = `resize-handle handle-${pos}`;
        h.dataset.handle = pos;
        h.dataset.elId   = id;
        _positionHandle(h, pos, abs);
        _artboard.appendChild(h);
        _handleEls.push({ div: h, pos, id });
      });

      // Size label
      const sizeLabel = document.createElement('div');
      sizeLabel.className = 'size-label';
      sizeLabel.textContent = `${Math.round(el.width)} × ${Math.round(el.height)}`;
      Object.assign(sizeLabel.style, {
        left: `${abs.x}px`,
        top:  `${abs.y - 22}px`,
      });
      _artboard.appendChild(sizeLabel);
      _handleEls.push({ div: sizeLabel, pos: 'label', id });
    });
  }

  function _positionHandle(h, pos, abs) {
    const S = 8; // handle size px
    const positions = {
      nw: { left: abs.x - S/2,               top: abs.y - S/2 },
      n:  { left: abs.x + abs.width/2 - S/2, top: abs.y - S/2 },
      ne: { left: abs.x + abs.width  - S/2,  top: abs.y - S/2 },
      e:  { left: abs.x + abs.width  - S/2,  top: abs.y + abs.height/2 - S/2 },
      se: { left: abs.x + abs.width  - S/2,  top: abs.y + abs.height - S/2 },
      s:  { left: abs.x + abs.width/2 - S/2, top: abs.y + abs.height - S/2 },
      sw: { left: abs.x - S/2,               top: abs.y + abs.height - S/2 },
      w:  { left: abs.x - S/2,               top: abs.y + abs.height/2 - S/2 },
    };
    const p = positions[pos];
    Object.assign(h.style, {
      position: 'absolute',
      left: `${p.left}px`,
      top:  `${p.top}px`,
      width:  `${S}px`,
      height: `${S}px`,
    });
  }

  // ── Snap guide overlays ────────────────────────────────────────────────────
  let _guideTimeout = null;

  function renderGuides(guides) {
    if (!_guidesLayer) return;
    _guidesLayer.innerHTML = '';

    if (!guides || !guides.length) return;

    const artW = AppState.artboardW;
    const artH = AppState.artboardH;

    guides.forEach(g => {
      const line = document.createElement('div');
      line.className = `snap-guide snap-guide--${g.type}`;

      if (g.axis === 'x') {
        // Vertical guide line
        Object.assign(line.style, {
          position: 'absolute',
          left:   `${g.pos}px`,
          top:    '0',
          width:  '1px',
          height: `${artH}px`,
        });
      } else if (g.axis === 'y') {
        // Horizontal guide line
        Object.assign(line.style, {
          position: 'absolute',
          left:   '0',
          top:    `${g.pos}px`,
          width:  `${artW}px`,
          height: '1px',
        });
      } else if (g.type === 'spacing') {
        // Equal-spacing dashed indicator
        Object.assign(line.style, {
          position: 'absolute',
          left:   `${g.x1}px`,
          top:    g.axis === 'x' ? `${g.y}px` : `${g.y1}px`,
          width:  g.axis === 'x' ? `${g.x2 - g.x1}px` : '1px',
          height: g.axis === 'x' ? '1px' : `${g.y2 - g.y1}px`,
        });
        line.classList.add('snap-guide--spacing');
      }

      _guidesLayer.appendChild(line);
    });

    // Auto-clear guides after 800ms idle
    clearTimeout(_guideTimeout);
    _guideTimeout = setTimeout(() => {
      if (_guidesLayer) _guidesLayer.innerHTML = '';
    }, 800);
  }

  // ── Zoom / Pan ─────────────────────────────────────────────────────────────
  function applyZoom({ zoom, panX, panY }) {
    if (!_artboard) return;
    const parent = _artboard.parentElement;
    if (parent) {
      parent.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
      parent.style.transformOrigin = '0 0';
    }
    _renderRulers();
  }

  // ── Rulers ────────────────────────────────────────────────────────────────
  function _renderRulers() {
    if (!_rulerH || !_rulerV) return;
    const zoom  = AppState.zoom  || 1;
    const panX  = AppState.panX  || 0;
    const panY  = AppState.panY  || 0;
    const gridSize = 50; // ruler tick every 50 logical px

    _rulerH.innerHTML = '';
    _rulerV.innerHTML = '';

    const viewW = _rulerH.clientWidth  || 1200;
    const viewH = _rulerV.clientHeight || 800;

    // Horizontal
    for (let lx = 0; lx * zoom + panX < viewW; lx += gridSize) {
      const screenX = lx * zoom + panX;
      const tick = document.createElement('span');
      tick.className = 'ruler-tick';
      tick.style.left = `${screenX}px`;
      tick.textContent = lx;
      _rulerH.appendChild(tick);
    }

    // Vertical
    for (let ly = 0; ly * zoom + panY < viewH; ly += gridSize) {
      const screenY = ly * zoom + panY;
      const tick = document.createElement('span');
      tick.className = 'ruler-tick';
      tick.style.top = `${screenY}px`;
      tick.textContent = ly;
      _rulerV.appendChild(tick);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _rgba(hex, opacity) {
    if (!hex || hex === 'transparent') return 'transparent';
    if (opacity === 1) return hex;
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function getDivById(id) { return _divs.get(id) || null; }

  function clearGuides() {
    if (_guidesLayer) _guidesLayer.innerHTML = '';
  }

  return { init, render, renderGuides, applyZoom, clearGuides, getDivById };
})();
