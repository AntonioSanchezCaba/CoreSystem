'use strict';
/**
 * CoreSystem Workspace — Toolbar
 * Top bar: tool selection, zoom controls, grid/snap toggles, undo/redo,
 * generate/export buttons, dark mode, project save/load.
 */
const Toolbar = (() => {
  let _el = null;

  const TOOLS = [
    { id:'select', icon:'↖',  label:'Select (V)', key:'V' },
    { id:'draw',   icon:'▭',  label:'Rectangle (R)', key:'R' },
    { id:'hand',   icon:'✋', label:'Hand (H)', key:'H' },
  ];

  function init(toolbarEl) {
    _el = toolbarEl;
    _el.innerHTML = _html();
    _bind();
    _syncTool('select');
    _syncUndoRedo({ canUndo:false, canRedo:false });
    _syncAlign([]);

    State.on('tool:change',    id => _syncTool(id));
    State.on('history:change', _syncUndoRedo);
    State.on('canvas:transform', _syncZoom);
    State.on('sel:change',     _syncAlign);
  }

  function _html() {
    return `
<div class="tb-group">
  <div class="tb-logo">
    <span class="tb-logo__mark">⬡</span>
    <span class="tb-logo__text">CoreSystem</span>
    <span class="tb-logo__sub">Visual Workspace</span>
  </div>
</div>

<div class="tb-sep"></div>

<div class="tb-group tb-tools" id="tb-tools">
  ${TOOLS.map(t => `
    <button class="tb-tool" data-tool="${t.id}" title="${t.label}">
      <span class="tb-tool__icon">${t.icon}</span>
      <span class="tb-tool__label">${t.id}</span>
    </button>`).join('')}
</div>

<div class="tb-sep"></div>

<div class="tb-group">
  <button class="tb-btn" id="tb-undo" title="Undo (Ctrl+Z)">↩ Undo</button>
  <button class="tb-btn" id="tb-redo" title="Redo (Ctrl+Y)">↪ Redo</button>
</div>

<div class="tb-sep"></div>

<div class="tb-group">
  <button class="tb-btn tb-btn--icon" data-zoom="out" title="Zoom out">−</button>
  <span class="tb-zoom-label" id="tb-zoom-lbl">100%</span>
  <button class="tb-btn tb-btn--icon" data-zoom="in" title="Zoom in">+</button>
  <button class="tb-btn tb-btn--sm" data-zoom="fit" title="Fit to window">Fit</button>
  <button class="tb-btn tb-btn--sm" data-zoom="reset" title="100%">1:1</button>
</div>

<div class="tb-sep"></div>

<div class="tb-group">
  <label class="tb-toggle" title="Toggle grid (G)">
    <input type="checkbox" id="tb-grid" ${State.gridVisible ? 'checked' : ''}>
    <span>Grid</span>
  </label>
  <label class="tb-toggle" title="Toggle snap (S)">
    <input type="checkbox" id="tb-snap" ${State.snapEnabled ? 'checked' : ''}>
    <span>Snap</span>
  </label>
</div>

<div class="tb-sep"></div>

<div class="tb-group tb-group--align" id="tb-align-group" title="Align (select 2+ elements)">
  <button class="tb-btn tb-btn--icon tb-align-btn" data-align="left"    title="Align left edges">⊢</button>
  <button class="tb-btn tb-btn--icon tb-align-btn" data-align="centerH" title="Center horizontally">↔</button>
  <button class="tb-btn tb-btn--icon tb-align-btn" data-align="right"   title="Align right edges">⊣</button>
  <div class="tb-align-sep"></div>
  <button class="tb-btn tb-btn--icon tb-align-btn" data-align="top"     title="Align top edges">⊤</button>
  <button class="tb-btn tb-btn--icon tb-align-btn" data-align="centerV" title="Center vertically">↕</button>
  <button class="tb-btn tb-btn--icon tb-align-btn" data-align="bottom"  title="Align bottom edges">⊥</button>
  <div class="tb-align-sep"></div>
  <button class="tb-btn tb-btn--icon tb-align-btn" data-align="distH"   title="Distribute horizontally (3+)">⇔</button>
  <button class="tb-btn tb-btn--icon tb-align-btn" data-align="distV"   title="Distribute vertically (3+)">⇕</button>
</div>

<div class="tb-sep"></div>

<div class="tb-group tb-group--actions">
  <button class="tb-btn tb-btn--accent" id="tb-analyze" title="Analyze layout structure">⚙ Analyze</button>
  <button class="tb-btn tb-btn--primary" id="tb-generate" title="Generate code">⟨/⟩ Code</button>
  <button class="tb-btn tb-btn--success" id="tb-export" title="Export ZIP">⬇ Export</button>
  <button class="tb-btn tb-btn--ghost" id="tb-preview" title="Preview">▶ Preview</button>
  <button class="tb-btn tb-btn--ghost" id="tb-3d" title="View floor plan in 3D">⬲ 3D</button>
</div>

<div class="tb-group tb-group--right">
  <button class="tb-btn tb-btn--icon" id="tb-dark" title="Toggle dark mode">◑</button>
  <button class="tb-btn tb-btn--icon" id="tb-save" title="Save layout">💾</button>
  <button class="tb-btn tb-btn--icon" id="tb-clear" title="Clear canvas">🗑</button>
</div>`;
  }

  function _bind() {
    // Tools
    _el.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        State.tool = btn.dataset.tool;
      });
    });

    // Undo / Redo
    _el.querySelector('#tb-undo')?.addEventListener('click', () => History.undo());
    _el.querySelector('#tb-redo')?.addEventListener('click', () => History.redo());

    // Zoom
    _el.querySelectorAll('[data-zoom]').forEach(btn => {
      btn.addEventListener('click', () => {
        switch(btn.dataset.zoom) {
          case 'in':    CanvasEng.zoomIn();    break;
          case 'out':   CanvasEng.zoomOut();   break;
          case 'fit':   CanvasEng.fitToScreen();break;
          case 'reset': CanvasEng.zoomReset(); break;
        }
        _syncZoom();
      });
    });

    // Grid toggle
    _el.querySelector('#tb-grid')?.addEventListener('change', e => {
      State.gridVisible = e.target.checked;
      CanvasEng.toggleGrid();
    });

    // Snap toggle
    _el.querySelector('#tb-snap')?.addEventListener('change', e => {
      State.snapEnabled = e.target.checked;
    });

    // Actions
    _el.querySelector('#tb-analyze')?.addEventListener('click', () => {
      Analyzer.analyze();
      _toast('Layout analyzed ✓', 'success');
    });

    _el.querySelector('#tb-generate')?.addEventListener('click', () => {
      Workspace.openCodeModal();
    });

    _el.querySelector('#tb-export')?.addEventListener('click', () => {
      CodeGen.downloadZip('my-layout');
      _toast('Downloading ZIP…', 'success');
    });

    _el.querySelector('#tb-preview')?.addEventListener('click', () => {
      Workspace.openPreview();
    });

    _el.querySelector('#tb-3d')?.addEventListener('click', () => {
      Workspace.openRoom3D();
    });

    _el.querySelector('#tb-dark')?.addEventListener('click', () => {
      const isDark = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = isDark ? '' : 'dark';
    });

    _el.querySelector('#tb-save')?.addEventListener('click', () => {
      const json = State.toJSON();
      localStorage.setItem('cs-workspace-save', json);
      _toast('Saved ✓', 'success');
    });

    _el.querySelector('#tb-clear')?.addEventListener('click', () => {
      if (confirm('Clear canvas? This cannot be undone.')) { State.reset(); }
    });

    // Alignment & Distribution
    _el.querySelectorAll('[data-align]').forEach(btn => {
      btn.addEventListener('click', () => {
        History.push('Align');
        switch(btn.dataset.align) {
          case 'left':    State.alignLeft();     break;
          case 'centerH': State.alignCenterH();  break;
          case 'right':   State.alignRight();    break;
          case 'top':     State.alignTop();      break;
          case 'centerV': State.alignCenterV();  break;
          case 'bottom':  State.alignBottom();   break;
          case 'distH':   State.distributeH();   break;
          case 'distV':   State.distributeV();   break;
        }
      });
    });

    // Keyboard shortcut for grid
    window.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === 'g' || e.key === 'G') {
        const visible = CanvasEng.toggleGrid();
        const cb = _el.querySelector('#tb-grid');
        if (cb) cb.checked = visible;
      }
    });
  }

  function _syncTool(id) {
    _el?.querySelectorAll('[data-tool]').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.tool === id);
    });
  }

  function _syncUndoRedo({ canUndo, canRedo }) {
    const u = _el?.querySelector('#tb-undo');
    const r = _el?.querySelector('#tb-redo');
    if (u) u.disabled = !canUndo;
    if (r) r.disabled = !canRedo;
  }

  function _syncZoom() {
    const lbl = _el?.querySelector('#tb-zoom-lbl');
    if (lbl) lbl.textContent = `${Math.round(State.zoom * 100)}%`;
  }

  function _syncAlign(ids) {
    if (!_el) return;
    const n = (ids || []).length;
    _el.querySelectorAll('.tb-align-btn').forEach(btn => {
      const isDistrib = btn.dataset.align === 'distH' || btn.dataset.align === 'distV';
      const needed    = isDistrib ? 3 : 2;
      btn.disabled    = n < needed;
    });
  }

  function _toast(msg, type = '') {
    const t = document.createElement('div');
    t.className = `ws-toast ws-toast--${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-visible'));
    setTimeout(() => { t.classList.remove('is-visible'); setTimeout(() => t.remove(), 300); }, 2200);
  }

  return { init };
})();
