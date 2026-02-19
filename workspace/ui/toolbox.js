'use strict';
/**
 * CoreSystem Workspace — Toolbox
 * Left panel with predefined box type categories.
 * Items can be dragged onto the canvas OR clicked to place at center.
 */
const Toolbox = (() => {

  // ── Box type definitions ──────────────────────────────────────────────────
  const TYPES = [
    {
      category: 'Layout',
      items: [
        { type:'header',    name:'Header',    icon:'⊟', fill:'#DBEAFE', stroke:'#2563EB', defaultW:1200, defaultH:80 },
        { type:'navbar',    name:'Navbar',    icon:'≡',  fill:'#1E293B', stroke:'#3B82F6', defaultW:1200, defaultH:64, fillText:'#f8fafc' },
        { type:'footer',    name:'Footer',    icon:'⊠', fill:'#FEF3C7', stroke:'#D97706', defaultW:1200, defaultH:80 },
        { type:'sidebar',   name:'Sidebar',   icon:'▯',  fill:'#DCFCE7', stroke:'#16A34A', defaultW:260,  defaultH:600 },
        { type:'main',      name:'Main',      icon:'▬',  fill:'#F8FAFC', stroke:'#94A3B8', defaultW:900,  defaultH:600 },
        { type:'section',   name:'Section',   icon:'▭',  fill:'#F1F5F9', stroke:'#64748B', defaultW:1200, defaultH:240 },
        { type:'container', name:'Container', icon:'□',  fill:'#F0F9FF', stroke:'#0EA5E9', defaultW:800,  defaultH:400 },
      ]
    },
    {
      category: 'Content',
      items: [
        { type:'hero',         name:'Hero',         icon:'★',  fill:'#EDE9FE', stroke:'#7C3AED', defaultW:1200, defaultH:480 },
        { type:'carousel',     name:'Carousel',     icon:'⟷',  fill:'#FCE7F3', stroke:'#DB2777', defaultW:1200, defaultH:340 },
        { type:'card-grid',    name:'Card Grid',    icon:'⊞', fill:'#FFF7ED', stroke:'#EA580C', defaultW:1200, defaultH:320 },
        { type:'features',     name:'Feature Grid', icon:'❖',  fill:'#F0FDF4', stroke:'#15803D', defaultW:1200, defaultH:400 },
        { type:'pricing',      name:'Pricing',      icon:'$',  fill:'#FFFBEB', stroke:'#CA8A04', defaultW:1200, defaultH:520 },
        { type:'testimonials', name:'Testimonials', icon:'💬', fill:'#F0F9FF', stroke:'#0369A1', defaultW:1200, defaultH:320 },
        { type:'faq',          name:'FAQ',          icon:'?',  fill:'#FDF4FF', stroke:'#9333EA', defaultW:1200, defaultH:440 },
        { type:'gallery',      name:'Gallery',      icon:'⊡', fill:'#F1F5F9', stroke:'#475569', defaultW:1200, defaultH:440 },
        { type:'form',         name:'Form',         icon:'✏',  fill:'#F8FAFC', stroke:'#94A3B8', defaultW:480,  defaultH:520 },
        { type:'cta',          name:'CTA',          icon:'→',  fill:'#3B82F6', stroke:'#1D4ED8', defaultW:1200, defaultH:220, fillText:'#fff' },
      ]
    },
    {
      category: 'Special',
      items: [
        { type:'custom',  name:'Custom Box', icon:'□', fill:'#FFFFFF', stroke:'#CBD5E1', defaultW:240,  defaultH:160 },
        { type:'overlay', name:'Overlay',    icon:'⊚', fill:'rgba(0,0,0,0.4)', stroke:'#374151', defaultW:1200, defaultH:900 },
        { type:'modal',   name:'Modal',      icon:'⊟', fill:'#FFFFFF', stroke:'#6B7280', defaultW:560,  defaultH:440 },
        { type:'card',    name:'Card',       icon:'▬', fill:'#FFFFFF', stroke:'#E2E8F0', defaultW:340,  defaultH:220 },
      ]
    },
  ];

  let _el     = null;
  let _ghost  = null;  // drag ghost element
  let _dragDef = null; // type being dragged

  // ── Init ───────────────────────────────────────────────────────────────────
  function init(panelEl) {
    _el = panelEl;
    _el.innerHTML = _render();
    _bindItems();
    _bindGhostEvents();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function _render() {
    const sections = TYPES.map(cat => `
<div class="toolbox__category">
  <div class="toolbox__cat-label">${cat.category}</div>
  <div class="toolbox__items">
    ${cat.items.map(item => `
      <div class="toolbox__item" data-type="${item.type}"
           draggable="true"
           title="Drag to canvas or click to place">
        <span class="toolbox__item-icon"
              style="background:${item.fill};border:2px solid ${item.stroke};color:${item.fillText||''}">
          ${item.icon}
        </span>
        <span class="toolbox__item-name">${item.name}</span>
      </div>`).join('')}
  </div>
</div>`).join('');

    return `
<div class="toolbox__header">
  <span>Components</span>
  <input class="toolbox__search" type="search" placeholder="Filter…" id="toolbox-search">
</div>
<div class="toolbox__body" id="toolbox-body">
  ${sections}
</div>`;
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  function _bindItems() {
    // Search filter
    document.getElementById('toolbox-search')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.toolbox__item').forEach(item => {
        const name = item.querySelector('.toolbox__item-name')?.textContent.toLowerCase() || '';
        item.style.display = !q || name.includes(q) ? '' : 'none';
      });
      document.querySelectorAll('.toolbox__category').forEach(cat => {
        const visible = [...cat.querySelectorAll('.toolbox__item')]
          .some(i => i.style.display !== 'none');
        cat.style.display = visible ? '' : 'none';
      });
    });

    // Mouse drag from toolbox → canvas
    _el.addEventListener('mousedown', e => {
      const itemEl = e.target.closest('.toolbox__item');
      if (!itemEl) return;
      const typeDef = _findType(itemEl.dataset.type);
      if (!typeDef) return;

      _dragDef = typeDef;
      _createGhost(typeDef, e.clientX, e.clientY);
    });

    // Click-to-place (no significant move)
    _el.addEventListener('click', e => {
      const itemEl = e.target.closest('.toolbox__item');
      if (!itemEl) return;
      const typeDef = _findType(itemEl.dataset.type);
      if (!typeDef) return;
      _placeAtCenter(typeDef);
    });
  }

  // ── Ghost drag ─────────────────────────────────────────────────────────────
  function _createGhost(typeDef, cx, cy) {
    if (_ghost) _ghost.remove();
    _ghost = document.createElement('div');
    _ghost.className = 'toolbox__ghost';
    _ghost.textContent = typeDef.name;
    _ghost.style.cssText = `
      position:fixed;pointer-events:none;z-index:99999;
      padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;
      background:${typeDef.fill};border:2px solid ${typeDef.stroke};
      color:${typeDef.fillText||'#1e293b'};
      box-shadow:0 8px 24px rgba(0,0,0,.25);
      transform:translate(-50%,-50%);
    `;
    document.body.appendChild(_ghost);
    _moveGhost(cx, cy);
  }

  function _moveGhost(cx, cy) {
    if (_ghost) {
      _ghost.style.left = cx + 'px';
      _ghost.style.top  = cy + 'px';
    }
  }

  function _destroyGhost() {
    if (_ghost) { _ghost.remove(); _ghost = null; }
    _dragDef = null;
  }

  function _bindGhostEvents() {
    window.addEventListener('mousemove', e => {
      if (!_dragDef) return;
      _moveGhost(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', e => {
      if (!_dragDef) return;
      const vp = document.getElementById('canvas-viewport');
      if (vp) {
        const rect = vp.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top  && e.clientY <= rect.bottom) {
          DragEng.dropFromToolbox(_dragDef, e.clientX, e.clientY);
        }
      }
      _destroyGhost();
    });
  }

  // ── Place at canvas center ─────────────────────────────────────────────────
  function _placeAtCenter(typeDef) {
    const vp = document.getElementById('canvas-viewport');
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    DragEng.dropFromToolbox(typeDef, cx, cy);
  }

  function _findType(typeId) {
    for (const cat of TYPES) {
      const found = cat.items.find(i => i.type === typeId);
      if (found) return found;
    }
    return null;
  }

  // Expose type definitions for other modules (code gen coloring, etc.)
  function getTypeDef(typeId) { return _findType(typeId); }
  function getAllTypes() { return TYPES.flatMap(c => c.items); }

  return { init, getTypeDef, getAllTypes };
})();
