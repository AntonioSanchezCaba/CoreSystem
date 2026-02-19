/**
 * Visual Layout OS — Toolbar UI
 * Top bar: tool buttons, zoom controls, grid/snap toggles, undo/redo, export.
 */
const ToolbarUI = (() => {
  'use strict';

  const TOOLS = [
    { id:'select', icon:'↖', label:'Select (V)',  key:'v' },
    { id:'draw',   icon:'▭',  label:'Rectangle (R)', key:'r' },
    { id:'hand',   icon:'✋', label:'Hand (H)',   key:'h' },
  ];

  let _el = null;

  function init(toolbarEl) {
    _el = toolbarEl;
    _el.innerHTML = _render();
    _bindEvents();
    _updateUndoRedo();

    EventBus.on(EventBus.EVENTS.TOOL_CHANGE, id => setActiveTool(id));
    EventBus.on(EventBus.EVENTS.HISTORY_CHANGE, _updateUndoRedo);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function _render() {
    return `
<div class="toolbar__group">
  <a href="../index.html" class="toolbar__logo">⬡ CoreSystem</a>
</div>
<div class="toolbar__group toolbar__tools">
  ${TOOLS.map(t => `
    <button class="toolbar__tool ${t.id === 'select' ? 'is-active' : ''}"
            data-tool="${t.id}" title="${t.label}">
      <span>${t.icon}</span>
    </button>`).join('')}
</div>
<div class="toolbar__group">
  <button class="toolbar__btn" data-action="undo" title="Undo (Ctrl+Z)">↩</button>
  <button class="toolbar__btn" data-action="redo" title="Redo (Ctrl+Y)">↪</button>
</div>
<div class="toolbar__group">
  <button class="toolbar__btn toolbar__btn--icon" data-action="zoom-out" title="Zoom out">−</button>
  <span class="toolbar__zoom-label" data-zoom-display>100%</span>
  <button class="toolbar__btn toolbar__btn--icon" data-action="zoom-in" title="Zoom in">+</button>
  <button class="toolbar__btn toolbar__btn--sm" data-action="zoom-fit" title="Fit to screen">Fit</button>
</div>
<div class="toolbar__group">
  <label class="toolbar__toggle" title="Toggle grid">
    <input type="checkbox" data-toggle="grid" ${AppState.gridVisible ? 'checked' : ''}>
    <span>Grid</span>
  </label>
  <label class="toolbar__toggle" title="Toggle snapping">
    <input type="checkbox" data-toggle="snap" ${AppState.snapEnabled ? 'checked' : ''}>
    <span>Snap</span>
  </label>
</div>
<div class="toolbar__group">
  <button class="toolbar__btn" data-action="analyze" title="Run layout analysis">⚙ Analyze</button>
  <button class="toolbar__btn toolbar__btn--primary" data-action="export" title="Export ZIP">⬇ Export</button>
  <button class="toolbar__btn" data-action="preview" title="Preview output">▶ Preview</button>
</div>
<div class="toolbar__group toolbar__group--right">
  <button class="toolbar__btn toolbar__btn--icon" data-action="dark-toggle" title="Toggle dark mode">◑</button>
</div>`;
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  function _bindEvents() {
    _el.addEventListener('click', e => {
      const tool = e.target.closest('[data-tool]');
      if (tool) {
        setActiveTool(tool.dataset.tool);
        EventBus.emit(EventBus.EVENTS.TOOL_CHANGE, tool.dataset.tool);
        return;
      }

      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      switch (btn.dataset.action) {
        case 'undo':
          HistoryManager.undo();
          break;
        case 'redo':
          HistoryManager.redo();
          break;
        case 'zoom-in':
          _adjustZoom(0.1);
          break;
        case 'zoom-out':
          _adjustZoom(-0.1);
          break;
        case 'zoom-fit':
          _fitToScreen();
          break;
        case 'analyze':
          LayoutAnalyzer.analyze();
          LayersPanelUI.refresh();
          _showToast('Layout analyzed ✓');
          break;
        case 'export':
          ExportEngine.exportZip('my-layout');
          break;
        case 'preview':
          PreviewModeUI.open();
          break;
        case 'dark-toggle':
          _toggleDarkMode();
          break;
      }
    });

    _el.addEventListener('change', e => {
      const toggle = e.target.closest('[data-toggle]');
      if (!toggle) return;
      if (toggle.dataset.toggle === 'grid') {
        AppState.gridVisible = e.target.checked;
        document.getElementById('vlos-artboard')
          ?.classList.toggle('show-grid', e.target.checked);
      }
      if (toggle.dataset.toggle === 'snap') {
        AppState.snapEnabled = e.target.checked;
      }
    });

    // Keyboard shortcuts for tools
    window.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
      const tool = TOOLS.find(t => t.key === e.key.toLowerCase());
      if (tool) {
        setActiveTool(tool.id);
        EventBus.emit(EventBus.EVENTS.TOOL_CHANGE, tool.id);
      }
    });
  }

  function setActiveTool(id) {
    _el.querySelectorAll('[data-tool]').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.tool === id);
    });
  }

  function _adjustZoom(delta) {
    const newZoom = Math.min(4, Math.max(0.1, (AppState.zoom || 1) + delta));
    AppState.setZoom(newZoom);
    EventBus.emit(EventBus.EVENTS.CANVAS_ZOOM, { zoom:newZoom, panX:AppState.panX, panY:AppState.panY });
    _updateZoomDisplay(newZoom);
  }

  function _fitToScreen() {
    const canvas = document.getElementById('vlos-canvas');
    if (!canvas) return;
    const cW = canvas.clientWidth  - 80;
    const cH = canvas.clientHeight - 80;
    const zoom = Math.min(cW / AppState.artboardW, cH / AppState.artboardH, 1);
    const panX = (cW - AppState.artboardW * zoom) / 2 + 40;
    const panY = (cH - AppState.artboardH * zoom) / 2 + 40;
    AppState.setZoom(zoom);
    AppState.setPan(panX, panY);
    EventBus.emit(EventBus.EVENTS.CANVAS_ZOOM, { zoom, panX, panY });
    _updateZoomDisplay(zoom);
  }

  function _updateZoomDisplay(zoom) {
    const label = _el.querySelector('[data-zoom-display]');
    if (label) label.textContent = `${Math.round(zoom * 100)}%`;
  }

  function _updateUndoRedo() {
    const undoBtn = _el?.querySelector('[data-action="undo"]');
    const redoBtn = _el?.querySelector('[data-action="redo"]');
    if (undoBtn) undoBtn.disabled = !HistoryManager.canUndo();
    if (redoBtn) redoBtn.disabled = !HistoryManager.canRedo();
  }

  function _toggleDarkMode() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = isDark ? '' : 'dark';
  }

  function _showToast(msg) {
    const t = document.createElement('div');
    t.className = 'vlos-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('is-visible'), 10);
    setTimeout(() => { t.classList.remove('is-visible'); setTimeout(() => t.remove(), 300); }, 2500);
  }

  return { init, setActiveTool };
})();
