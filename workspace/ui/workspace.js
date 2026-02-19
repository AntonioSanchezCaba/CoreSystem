'use strict';
/**
 * CoreSystem Workspace — Main Coordinator
 * Initializes all engines and UI modules.
 * Manages element rendering, context menu, code modal, preview modal.
 */
const Workspace = (() => {

  // ── Element div registry ───────────────────────────────────────────────────
  const _divs = new Map(); // id → div
  let _content = null;

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    const viewport  = document.getElementById('canvas-viewport');
    _content        = document.getElementById('canvas-content');
    const gridEl    = document.getElementById('canvas-grid');
    const toolbarEl = document.getElementById('app-toolbar');
    const toolboxEl = document.getElementById('app-toolbox');
    const layersEl  = document.getElementById('app-layers');
    const propsEl   = document.getElementById('app-props');

    // Engine init
    CanvasEng.init(viewport, _content, gridEl);
    DragEng.init(viewport, _content);

    // UI init
    Toolbar.init(toolbarEl);
    Toolbox.init(toolboxEl);
    LayersPanel.init(layersEl);
    PropsPanel.init(propsEl);

    // Reactive rendering
    State.on('el:add',          _addDiv);
    State.on('el:update',       _updateDiv);
    State.on('el:delete',       _removeDiv);
    State.on('elements:change', ({ type }) => {
      if (type === 'reset') _fullRedraw();
      if (type === 'reorder') _syncZIndices();
    });

    // Context menu
    _initContextMenu();

    // Code modal
    _initCodeModal();

    // Preview modal
    _initPreviewModal();

    // Restore saved state
    const saved = localStorage.getItem('cs-workspace-save');
    if (saved) {
      try { State.fromJSON(saved); } catch(e) { console.warn('Could not restore save', e); }
    }

    // Seed if empty
    if (!State.getAllEls().length) _seedLayout();

    // Fit canvas after initial paint
    requestAnimationFrame(() => CanvasEng.fitToScreen());
  }

  // ── Element div lifecycle ──────────────────────────────────────────────────
  function _makeDiv(id) {
    const el  = State.getEl(id);
    if (!el || !_content) return;

    const div = document.createElement('div');
    div.className  = 'box-el';
    div.dataset.id = id;
    _content.appendChild(div);
    _divs.set(id, div);
    _syncDiv(id, div, el);

    // Click selects
    div.addEventListener('mousedown', e => {
      if (e.target.closest('[data-handle]')) return;
      e.stopPropagation();
    });
  }

  function _addDiv(id)    { _makeDiv(id); }
  function _removeDiv(id) {
    const div = _divs.get(id);
    if (div) { div.remove(); _divs.delete(id); }
  }
  function _updateDiv(id) {
    const div = _divs.get(id);
    const el  = State.getEl(id);
    if (div && el) _syncDiv(id, div, el);
  }

  function _syncDiv(id, div, el) {
    const typeDef = Toolbox.getTypeDef(el.type);

    Object.assign(div.style, {
      left:            `${el.x}px`,
      top:             `${el.y}px`,
      width:           `${el.width}px`,
      height:          `${el.height}px`,
      backgroundColor: el.fill || 'transparent',
      border:          `${el.strokeWidth || 2}px solid ${el.stroke || '#CBD5E1'}`,
      borderRadius:    `${el.borderRadius || 0}px`,
      opacity:         el.opacity ?? 1,
      zIndex:          el.zIndex,
      display:         el.hidden ? 'none' : 'flex',
    });

    // Label
    let label = div.querySelector('.box-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'box-label';
      div.appendChild(label);
    }
    label.textContent = el.name;
    label.style.borderColor = el.stroke || '#CBD5E1';

    // Type badge
    let badge = div.querySelector('.box-badge');
    if (!badge && typeDef) {
      badge = document.createElement('div');
      badge.className = 'box-badge';
      div.appendChild(badge);
    }
    if (badge) {
      badge.textContent = typeDef ? typeDef.icon : '▭';
      badge.style.color  = el.stroke || '#94A3B8';
    }

    div.classList.toggle('is-locked', !!el.locked);
  }

  function _fullRedraw() {
    // Remove all divs, re-add all
    _divs.forEach(div => div.remove());
    _divs.clear();
    State.rootIds.forEach(id => _makeDiv(id));
    ResizeEng.syncSelection(State.selIds);
  }

  function _syncZIndices() {
    _divs.forEach((div, id) => {
      const el = State.getEl(id);
      if (el) div.style.zIndex = el.zIndex;
    });
  }

  // ── Seed starter layout ────────────────────────────────────────────────────
  function _seedLayout() {
    State.add({ type:'navbar', name:'Navbar',
      x:0, y:0, width:1440, height:64,
      fill:'#1E293B', stroke:'#3B82F6', strokeWidth:0 });
    State.add({ type:'hero', name:'Hero',
      x:0, y:64, width:1440, height:480,
      fill:'#EDE9FE', stroke:'#7C3AED', strokeWidth:0 });
    State.add({ type:'card', name:'Card 1',
      x:80, y:620, width:320, height:220,
      fill:'#FFFFFF', stroke:'#E2E8F0', strokeWidth:1, borderRadius:8 });
    State.add({ type:'card', name:'Card 2',
      x:440, y:620, width:320, height:220,
      fill:'#FFFFFF', stroke:'#E2E8F0', strokeWidth:1, borderRadius:8 });
    State.add({ type:'card', name:'Card 3',
      x:800, y:620, width:320, height:220,
      fill:'#FFFFFF', stroke:'#E2E8F0', strokeWidth:1, borderRadius:8 });
    State.add({ type:'footer', name:'Footer',
      x:0, y:920, width:1440, height:80,
      fill:'#FEF3C7', stroke:'#D97706', strokeWidth:0 });
  }

  // ── Context menu ───────────────────────────────────────────────────────────
  function _initContextMenu() {
    const menu = document.getElementById('ctx-menu');
    if (!menu) return;

    document.getElementById('canvas-viewport')?.addEventListener('contextmenu', e => {
      e.preventDefault();
      const boxEl = e.target.closest('[data-id]');
      const id = boxEl?.dataset.id;
      if (id && !State.selIds.includes(id)) State.setSelection([id]);

      menu.dataset.targetId = id || '';
      Object.assign(menu.style, {
        display: 'block', left: `${e.clientX}px`, top: `${e.clientY}px`
      });
    });

    document.addEventListener('click', () => menu.style.display = 'none');

    menu.addEventListener('click', e => {
      const item = e.target.closest('[data-ctx]');
      if (!item) return;
      menu.style.display = 'none';
      const id = menu.dataset.targetId;
      const el = id ? State.getEl(id) : null;

      switch(item.dataset.ctx) {
        case 'front':     if(id) State.bringToFront(id); break;
        case 'back':      if(id) State.sendToBack(id);   break;
        case 'fwd':       if(id) State.bringForward(id); break;
        case 'bwd':       if(id) State.sendBackward(id); break;
        case 'dup':       if(id) { History.push('Duplicate'); State.duplicate(id, 20, 20); } break;
        case 'lock':      if(el) State.update(id, { locked: !el.locked }); break;
        case 'hide':      if(el) State.update(id, { hidden: !el.hidden }); break;
        case 'analyze':   Analyzer.analyze(); break;
        case 'delete':    if(id) { History.push('Delete'); State.remove(id); } break;
        case 'select-all': State.selectAll(); break;
      }
    });
  }

  // ── Code Modal ─────────────────────────────────────────────────────────────
  function _initCodeModal() {
    const modal   = document.getElementById('modal-code');
    if (!modal) return;

    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('is-open');
    });
    modal.querySelector('[data-close]')?.addEventListener('click', () => {
      modal.classList.remove('is-open');
    });

    // Tab switching
    modal.addEventListener('click', e => {
      const tab = e.target.closest('[data-tab]');
      if (!tab) return;
      modal.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      modal.querySelectorAll('[data-tab-pane]').forEach(p => {
        p.classList.toggle('is-active', p.dataset.tabPane === tab.dataset.tab);
      });
    });

    // Copy button
    modal.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pane  = btn.closest('[data-tab-pane]');
        const code  = pane?.querySelector('code')?.textContent || '';
        navigator.clipboard?.writeText(code).then(() => {
          btn.textContent = '✓ Copied!';
          setTimeout(() => btn.textContent = '⎘ Copy', 1500);
        });
      });
    });

    // Download individual file
    modal.querySelectorAll('[data-download]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.download;
        const pane = modal.querySelector(`[data-tab-pane="${type}"]`);
        const code = pane?.querySelector('code')?.textContent || '';
        const names = { html:'index.html', css:'styles.css', js:'script.js' };
        const types = { html:'text/html', css:'text/css', js:'text/javascript' };
        const blob = new Blob([code], { type: types[type] || 'text/plain' });
        const a = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(blob), download: names[type] || 'file.txt'
        });
        a.click();
      });
    });
  }

  function openCodeModal() {
    const modal = document.getElementById('modal-code');
    if (!modal) return;

    const { html, css, js } = CodeGen.generate();

    const _fmt = code => code.replace(/</g,'&lt;').replace(/>/g,'&gt;');

    modal.querySelector('[data-tab-pane="html"] code').innerHTML = _fmt(html);
    modal.querySelector('[data-tab-pane="css"]  code').innerHTML = _fmt(css);
    const jsPre = modal.querySelector('[data-tab-pane="js"]');
    if (jsPre) jsPre.querySelector('code').innerHTML = _fmt(js || '/* No JS needed */');

    // Activate first tab
    modal.querySelector('[data-tab="html"]')?.click();
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  // ── Preview Modal ──────────────────────────────────────────────────────────
  function _initPreviewModal() {
    const modal = document.getElementById('modal-preview');
    if (!modal) return;

    modal.addEventListener('click', e => {
      if (e.target === modal) _closePreview();
    });
    modal.querySelector('[data-close]')?.addEventListener('click', _closePreview);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        modal.classList.contains('is-open') && _closePreview();
        document.getElementById('modal-code')?.classList.remove('is-open');
      }
    });

    // Viewport size buttons
    modal.querySelectorAll('[data-vp]').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('[data-vp]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const [w, h] = btn.dataset.vp.split('x').map(Number);
        _setPreviewViewport(w, h, modal);
      });
    });
  }

  function openPreview() {
    const modal  = document.getElementById('modal-preview');
    const iframe = document.getElementById('preview-iframe');
    if (!modal || !iframe) return;

    const html = CodeGen.generatePreview();
    iframe.srcdoc = html;

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    _setPreviewViewport(1440, 900, modal);
  }

  function _closePreview() {
    const modal  = document.getElementById('modal-preview');
    const iframe = document.getElementById('preview-iframe');
    modal?.classList.remove('is-open');
    if (iframe) iframe.srcdoc = '';
    document.body.style.overflow = '';
  }

  function _setPreviewViewport(w, h, modal) {
    const iframe = modal?.querySelector('#preview-iframe');
    if (!iframe) return;
    const wrap = iframe.parentElement;
    const maxW = (wrap?.clientWidth  || window.innerWidth)  - 40;
    const maxH = (wrap?.clientHeight || window.innerHeight) - 40;
    const scale = Math.min(1, maxW / w, maxH / h);
    Object.assign(iframe.style, {
      width: `${w}px`, height: `${h}px`,
      transform: `scale(${scale})`,
      transformOrigin: 'top center',
    });
  }

  return { init, openCodeModal, openPreview };
})();
