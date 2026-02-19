/**
 * Visual Layout OS — Preview Mode UI
 * Opens a modal with an iframe displaying the compiled layout.
 * Includes responsive size switcher and export button.
 */
const PreviewModeUI = (() => {
  'use strict';

  let _modal   = null;
  let _iframe  = null;
  let _isOpen  = false;

  function init() {
    _modal = document.getElementById('vlos-preview-modal');
    _iframe = document.getElementById('vlos-preview-iframe');
    if (!_modal) return;

    _modal.addEventListener('click', e => {
      if (e.target === _modal) close();
    });

    _modal.addEventListener('click', e => {
      const btn = e.target.closest('[data-preview-action]');
      if (!btn) return;
      switch (btn.dataset.previewAction) {
        case 'close':   close(); break;
        case 'export':  ExportEngine.exportZip('my-layout'); break;
        case 'size': {
          const { w, h } = btn.dataset;
          _setViewport(parseInt(w), parseInt(h));
          _modal.querySelectorAll('[data-preview-action="size"]').forEach(b =>
            b.classList.toggle('is-active', b === btn));
          break;
        }
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _isOpen) close();
    });
  }

  function open() {
    if (!_modal || !_iframe) return;

    // Ensure layout is analyzed
    LayoutAnalyzer.analyze();

    const html = ExportEngine.generatePreviewHTML();
    _iframe.srcdoc = html;

    _modal.classList.add('is-open');
    _isOpen = true;
    document.body.style.overflow = 'hidden';

    // Default: desktop size
    _setViewport(AppState.artboardW, AppState.artboardH);
  }

  function close() {
    if (!_modal) return;
    _modal.classList.remove('is-open');
    _isOpen = false;
    document.body.style.overflow = '';
    if (_iframe) _iframe.srcdoc = '';
  }

  function _setViewport(w, h) {
    if (!_iframe) return;
    const maxW = window.innerWidth  * 0.85;
    const maxH = window.innerHeight * 0.80;
    const scale = Math.min(1, maxW / w, maxH / h);
    Object.assign(_iframe.style, {
      width:     `${w}px`,
      height:    `${h}px`,
      transform: `scale(${scale})`,
      transformOrigin: 'top center',
    });
  }

  return { init, open, close };
})();
