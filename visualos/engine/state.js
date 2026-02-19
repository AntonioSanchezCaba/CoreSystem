/**
 * Visual Layout OS — Application State
 * Central single source of truth for all canvas elements and UI state.
 * Mutations always go through these methods so that history and events work correctly.
 */
const AppState = (() => {
  'use strict';

  let _idCounter = 0;
  const _genId = () => `el_${(++_idCounter).toString(36)}_${Date.now().toString(36)}`;

  // ── Core state (mutable, not frozen) ─────────────────────────────────────
  let elements = new Map();  // id → ElementDef
  let rootIds  = [];         // ordered top-level element IDs

  // UI state
  let activeTool   = 'select'; // 'select' | 'frame'
  let selection    = new Set();
  let zoom         = 1.0;
  let panX         = 0;
  let panY         = 0;
  let gridVisible  = true;
  let snapEnabled  = true;
  let showRulers   = true;
  let isDarkMode   = false;
  let artboardW    = 1440;
  let artboardH    = 900;
  let layoutTree   = null;  // set by LayoutAnalyzer

  // ── Element factory ───────────────────────────────────────────────────────
  function createElement(overrides = {}) {
    return {
      id:           _genId(),
      name:         'Frame',
      type:         'frame',
      x:            0,
      y:            0,
      width:        200,
      height:       120,
      parentId:     null,
      childIds:     [],
      // Style
      fill:         '#DBEAFE',
      fillOpacity:  1,
      stroke:       '#93C5FD',
      strokeWidth:  1,
      opacity:      1,
      borderRadius: 0,
      // Constraints
      constraints:  { h: 'left', v: 'top' },
      // State flags
      locked:       false,
      hidden:       false,
      // Detected semantic (filled by LayoutAnalyzer)
      role:         null,  // 'header'|'footer'|'sidebar'|'hero'|'section'|'card'|'carousel'|'nav'
      htmlTag:      null,  // 'header'|'main'|'nav'|'aside'|'section'|'footer'|'div'
      cssClass:     null,
      layoutStrategy: null, // 'flex-row'|'flex-col'|'grid'|'absolute'
      ...overrides
    };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function addElement(def, parentId = null) {
    const el = createElement(def);
    el.parentId = parentId;
    elements.set(el.id, el);

    if (parentId && elements.has(parentId)) {
      elements.get(parentId).childIds.push(el.id);
    } else {
      rootIds.push(el.id);
    }

    EventBus.emit(EventBus.EVENTS.ELEMENT_ADD, el);
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
    return el;
  }

  function updateElement(id, patch) {
    const el = elements.get(id);
    if (!el || el.locked) return false;
    Object.assign(el, patch);
    EventBus.emit(EventBus.EVENTS.ELEMENT_UPDATE, { id, patch, el });
    return true;
  }

  function deleteElement(id) {
    const el = elements.get(id);
    if (!el) return;

    // Recursively delete children first
    [...el.childIds].forEach(cid => deleteElement(cid));

    // Remove from parent
    if (el.parentId) {
      const parent = elements.get(el.parentId);
      if (parent) parent.childIds = parent.childIds.filter(c => c !== id);
    } else {
      rootIds = rootIds.filter(rid => rid !== id);
    }

    elements.delete(id);
    selection.delete(id);

    EventBus.emit(EventBus.EVENTS.ELEMENT_DELETE, id);
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
    EventBus.emit(EventBus.EVENTS.SELECTION_CHANGE, selection);
  }

  function deleteSelected() {
    if (!selection.size) return;
    HistoryManager.push('Delete');
    [...selection].forEach(id => deleteElement(id));
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function setSelection(ids) {
    selection = new Set(Array.isArray(ids) ? ids : [ids].filter(Boolean));
    EventBus.emit(EventBus.EVENTS.SELECTION_CHANGE, selection);
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  function addToSelection(id) {
    selection.add(id);
    EventBus.emit(EventBus.EVENTS.SELECTION_CHANGE, selection);
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  function clearSelection() {
    if (!selection.size) return;
    selection.clear();
    EventBus.emit(EventBus.EVENTS.SELECTION_CHANGE, selection);
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  function selectAll() {
    selection = new Set(elements.keys());
    EventBus.emit(EventBus.EVENTS.SELECTION_CHANGE, selection);
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  // ── Ordering ──────────────────────────────────────────────────────────────
  function bringForward(id) {
    const el = elements.get(id);
    if (!el) return;
    const arr = el.parentId ? elements.get(el.parentId).childIds : rootIds;
    const i = arr.indexOf(id);
    if (i < arr.length - 1) { [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; }
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  function sendBackward(id) {
    const el = elements.get(id);
    if (!el) return;
    const arr = el.parentId ? elements.get(el.parentId).childIds : rootIds;
    const i = arr.indexOf(id);
    if (i > 0) { [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; }
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  function bringToFront(id) {
    const el = elements.get(id);
    if (!el) return;
    const arr = el.parentId ? elements.get(el.parentId).childIds : rootIds;
    const i = arr.indexOf(id);
    if (i !== -1) arr.push(arr.splice(i, 1)[0]);
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  function sendToBack(id) {
    const el = elements.get(id);
    if (!el) return;
    const arr = el.parentId ? elements.get(el.parentId).childIds : rootIds;
    const i = arr.indexOf(id);
    if (i > 0) arr.unshift(arr.splice(i, 1)[0]);
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  // ── Duplicate ─────────────────────────────────────────────────────────────
  function duplicateElement(id, offsetX = 20, offsetY = 20) {
    const src = elements.get(id);
    if (!src) return null;
    const copy = createElement({
      ...src,
      id: undefined, // will be regenerated
      name: src.name + ' Copy',
      x: src.x + offsetX,
      y: src.y + offsetY,
      childIds: [],
    });
    elements.set(copy.id, copy);
    if (src.parentId && elements.has(src.parentId)) {
      elements.get(src.parentId).childIds.push(copy.id);
    } else {
      rootIds.push(copy.id);
    }
    // Recursively duplicate children
    src.childIds.forEach(cid => {
      const childCopy = duplicateElement(cid, 0, 0);
      if (childCopy) {
        // Re-parent to copy
        const origChild = elements.get(childCopy.id);
        if (origChild) { origChild.parentId = copy.id; copy.childIds.push(origChild.id); }
        // Remove from rootIds if it got added
        rootIds = rootIds.filter(r => r !== childCopy.id);
      }
    });
    return copy;
  }

  // ── Getters (safe copies) ─────────────────────────────────────────────────
  function getElement(id)  { return elements.get(id) || null; }
  function getAll()        { return elements; }
  function getRoots()      { return rootIds.map(id => elements.get(id)).filter(Boolean); }
  function getSelected()   { return [...selection].map(id => elements.get(id)).filter(Boolean); }
  function isSelected(id)  { return selection.has(id); }
  function getSelectionIds(){ return [...selection]; }
  function getChildrenOf(id){ return (elements.get(id)?.childIds || []).map(cid => elements.get(cid)).filter(Boolean); }

  /** Returns absolute position of element (accounting for nested parents) */
  function getAbsoluteRect(id) {
    const el = elements.get(id);
    if (!el) return null;
    let x = el.x, y = el.y;
    let parent = el.parentId ? elements.get(el.parentId) : null;
    while (parent) {
      x += parent.x; y += parent.y;
      parent = parent.parentId ? elements.get(parent.parentId) : null;
    }
    return { x, y, width: el.width, height: el.height };
  }

  // ── Viewport ──────────────────────────────────────────────────────────────
  function setZoom(z) { zoom = Math.max(0.1, Math.min(4, z)); EventBus.emit(EventBus.EVENTS.CANVAS_ZOOM, zoom); }
  function setPan(x, y) { panX = x; panY = y; EventBus.emit(EventBus.EVENTS.CANVAS_PAN, { panX, panY }); }
  function setTool(t) { activeTool = t; EventBus.emit(EventBus.EVENTS.TOOL_CHANGE, t); }

  // ── Serialization ─────────────────────────────────────────────────────────
  function toJSON() {
    return JSON.stringify({
      version: '3.0',
      artboardW, artboardH,
      elements: [...elements.entries()].map(([id, el]) => ({ ...el })),
      rootIds,
      tokens: TokenSystem.getAll()
    }, null, 2);
  }

  function fromJSON(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    elements.clear();
    rootIds = data.rootIds || [];
    (data.elements || []).forEach(el => elements.set(el.id, el));
    artboardW = data.artboardW || 1440;
    artboardH = data.artboardH || 900;
    if (data.tokens) TokenSystem.setMany(data.tokens);
    selection.clear();
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
  }

  function reset() {
    elements.clear(); rootIds = []; selection.clear();
    _idCounter = 0;
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
    EventBus.emit(EventBus.EVENTS.SELECTION_CHANGE, selection);
  }

  // ── Expose the mutable state references needed by engine modules ──────────
  return {
    // Direct mutable refs (used by engine modules carefully)
    get elements() { return elements; },
    set elements(v) { elements = v; },
    get rootIds()  { return rootIds; },
    set rootIds(v) { rootIds = v; },
    get selection(){ return selection; },
    set selection(v){ selection = v; },
    get activeTool(){ return activeTool; },
    get zoom()     { return zoom; },
    get panX()     { return panX; },
    get panY()     { return panY; },
    get gridVisible(){ return gridVisible; },
    set gridVisible(v){ gridVisible = v; EventBus.emit(EventBus.EVENTS.CANVAS_RENDER); },
    get snapEnabled(){ return snapEnabled; },
    set snapEnabled(v){ snapEnabled = v; },
    get showRulers(){ return showRulers; },
    set showRulers(v){ showRulers = v; EventBus.emit(EventBus.EVENTS.CANVAS_RENDER); },
    get isDarkMode(){ return isDarkMode; },
    set isDarkMode(v){ isDarkMode = v; document.documentElement.setAttribute('data-theme', v ? 'dark' : 'light'); },
    get artboardW() { return artboardW; },
    get artboardH() { return artboardH; },
    get layoutTree(){ return layoutTree; },
    set layoutTree(v){ layoutTree = v; },

    // Methods
    createElement, addElement, updateElement, deleteElement, deleteSelected,
    setSelection, addToSelection, clearSelection, selectAll,
    bringForward, sendBackward, bringToFront, sendToBack,
    duplicateElement, getElement, getAll, getRoots, getSelected,
    isSelected, getSelectionIds, getChildrenOf, getAbsoluteRect,
    setZoom, setPan, setTool, toJSON, fromJSON, reset,
  };
})();
