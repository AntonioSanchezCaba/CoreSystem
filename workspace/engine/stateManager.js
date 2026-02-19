'use strict';
/**
 * CoreSystem Workspace — State Manager
 * Central singleton for all application state.
 * All mutations go through here and emit reactive events.
 */
const State = (() => {
  // ── Internal state ────────────────────────────────────────────────────────
  let _elements    = new Map(); // id → element
  let _rootIds     = [];        // z-ordered root IDs (last = top)
  let _selIds      = [];        // selected element IDs
  let _zoom        = 1;
  let _panX        = 120;
  let _panY        = 80;
  let _gridSize    = 20;
  let _gridVisible = true;
  let _snapEnabled = true;
  let _tool        = 'select'; // 'select' | 'draw' | 'hand'
  let _artW        = 1440;
  let _artH        = 900;
  let _idSeq       = 1;
  let _subs        = {};

  // ── Pub / Sub ─────────────────────────────────────────────────────────────
  function on(ev, fn)  { (_subs[ev] = _subs[ev] || []).push(fn); }
  function off(ev, fn) { _subs[ev] = (_subs[ev] || []).filter(f => f !== fn); }
  function emit(ev, d) { (_subs[ev] || []).slice().forEach(fn => fn(d)); }

  // ── ID generator ──────────────────────────────────────────────────────────
  function _gid() { return 'el_' + (_idSeq++).toString(36) + '_' + (Date.now() % 1e6).toString(36); }

  // ── Element factory ───────────────────────────────────────────────────────
  function _makeEl(def) {
    return {
      id:          _gid(),
      name:        def.name        || 'Box',
      type:        def.type        || 'custom',
      x:           def.x          ?? 100,
      y:           def.y          ?? 100,
      width:       def.width      ?? 200,
      height:      def.height     ?? 150,
      zIndex:      _rootIds.length,
      parentId:    null,
      childIds:    [],
      locked:      false,
      hidden:      false,
      fill:        def.fill       || '#FFFFFF',
      stroke:      def.stroke     || '#CBD5E1',
      strokeWidth: def.strokeWidth ?? 2,
      borderRadius:def.borderRadius|| 0,
      opacity:     def.opacity    ?? 1,
      htmlTag:     def.htmlTag    || _tagFor(def.type),
      cssClass:    def.cssClass   || '',
      display:     def.display    || 'block',
      flexDir:     'row',
      gridCols:    3,
      gap:         16,
      padding:     { top:0, right:0, bottom:0, left:0 },
      margin:      { top:0, right:0, bottom:0, left:0 },
      ...def,
      id: _gid(), // override any passed id
    };
  }

  function _tagFor(type) {
    const map = {
      header:'header', footer:'footer', sidebar:'aside',
      main:'main',     section:'section', nav:'nav',
      hero:'section',  card:'article',    form:'form',
      modal:'dialog',  navbar:'nav',
    };
    return map[type] || 'div';
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  function add(def) {
    const el = _makeEl(def);
    _elements.set(el.id, el);
    _rootIds.push(el.id);
    emit('el:add', el.id);
    emit('elements:change', { type:'add', id:el.id });
    return el.id;
  }

  function update(id, patch) {
    const el = _elements.get(id);
    if (!el) return;
    Object.assign(el, patch);
    emit('el:update', id);
    emit('elements:change', { type:'update', id });
  }

  function remove(id) {
    if (!_elements.has(id)) return;
    _elements.delete(id);
    _rootIds  = _rootIds.filter(r => r !== id);
    _selIds   = _selIds.filter(s => s !== id);
    emit('el:delete', id);
    emit('elements:change', { type:'delete', id });
    emit('sel:change', [..._selIds]);
  }

  function duplicate(id, dx = 20, dy = 20) {
    const src = _elements.get(id);
    if (!src) return null;
    // Deep-clone without id/zIndex
    const def = { ...src, id: undefined, x: src.x + dx, y: src.y + dy,
                  name: src.name + ' copy', childIds: [] };
    return add(def);
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function setSelection(ids) {
    _selIds = Array.isArray(ids) ? [...ids] : (ids ? [ids] : []);
    emit('sel:change', [..._selIds]);
  }
  function addToSel(id) {
    if (!_selIds.includes(id)) { _selIds.push(id); emit('sel:change', [..._selIds]); }
  }
  function clearSel() { _selIds = []; emit('sel:change', []); }
  function selectAll() { _selIds = [..._rootIds]; emit('sel:change', [..._selIds]); }
  function deleteSelected() { [..._selIds].forEach(id => remove(id)); }

  // ── Z-order ───────────────────────────────────────────────────────────────
  function _reindex() {
    _rootIds.forEach((id, i) => { const el = _elements.get(id); if (el) el.zIndex = i; });
  }
  function bringToFront(id) {
    _rootIds = _rootIds.filter(r => r !== id); _rootIds.push(id); _reindex();
    emit('elements:change', { type:'reorder' });
  }
  function sendToBack(id) {
    _rootIds = _rootIds.filter(r => r !== id); _rootIds.unshift(id); _reindex();
    emit('elements:change', { type:'reorder' });
  }
  function bringForward(id) {
    const i = _rootIds.indexOf(id);
    if (i < _rootIds.length - 1) {
      [_rootIds[i], _rootIds[i+1]] = [_rootIds[i+1], _rootIds[i]]; _reindex();
      emit('elements:change', { type:'reorder' });
    }
  }
  function sendBackward(id) {
    const i = _rootIds.indexOf(id);
    if (i > 0) {
      [_rootIds[i], _rootIds[i-1]] = [_rootIds[i-1], _rootIds[i]]; _reindex();
      emit('elements:change', { type:'reorder' });
    }
  }

  // ── Serialization ─────────────────────────────────────────────────────────
  function toJSON() {
    return JSON.stringify({
      v: 2,
      elements: [..._elements.values()],
      rootIds: _rootIds,
      zoom: _zoom, panX: _panX, panY: _panY,
    });
  }
  function fromJSON(json) {
    try {
      const d = JSON.parse(json);
      _elements = new Map(d.elements.map(e => [e.id, e]));
      _rootIds  = d.rootIds;
      _selIds   = [];
      _zoom = d.zoom || 1; _panX = d.panX || 120; _panY = d.panY || 80;
      emit('elements:change', { type:'reset' });
    } catch(e) { console.error('State.fromJSON failed', e); }
  }
  // Internal restore used by HistoryManager only
  function __restore(snap) {
    _elements = new Map(snap.elements.map(e => [e.id, { ...e }]));
    _rootIds  = [...snap.rootIds];
    _selIds   = [...snap.selIds];
    emit('elements:change', { type:'reset' });
    emit('sel:change', [..._selIds]);
  }
  function __snapshot() {
    return {
      elements: [..._elements.values()].map(e => ({ ...e })),
      rootIds:  [..._rootIds],
      selIds:   [..._selIds],
    };
  }

  function reset() {
    _elements = new Map(); _rootIds = []; _selIds = [];
    emit('elements:change', { type:'reset' }); emit('sel:change', []);
  }

  // ── Accessors ─────────────────────────────────────────────────────────────
  return {
    get zoom()        { return _zoom; },        set zoom(v)       { _zoom = Math.min(8, Math.max(0.1, v)); },
    get panX()        { return _panX; },        set panX(v)       { _panX = v; },
    get panY()        { return _panY; },        set panY(v)       { _panY = v; },
    get gridSize()    { return _gridSize; },    set gridSize(v)   { _gridSize = v; },
    get gridVisible() { return _gridVisible; }, set gridVisible(v){ _gridVisible = v; },
    get snapEnabled() { return _snapEnabled; }, set snapEnabled(v){ _snapEnabled = v; },
    get tool()        { return _tool; },
    set tool(v)       { _tool = v; emit('tool:change', v); },
    get artW()        { return _artW; },
    get artH()        { return _artH; },
    get selIds()      { return [..._selIds]; },
    get rootIds()     { return [..._rootIds]; },
    get elements()    { return _elements; },

    on, off, emit,
    add, update, remove, duplicate,
    setSelection, addToSel, clearSel, selectAll, deleteSelected,
    bringToFront, sendToBack, bringForward, sendBackward,
    toJSON, fromJSON, reset,
    getEl: id => _elements.get(id),
    getAllEls: () => [..._elements.values()],
    __restore, __snapshot,
  };
})();
